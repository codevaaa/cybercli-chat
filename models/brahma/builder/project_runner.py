from __future__ import annotations

import json
import os
import re
import subprocess
import uuid
from pathlib import Path, PurePosixPath

from brahma.paths import MODEL_DIR

WORKSPACES = MODEL_DIR / "builder" / "workspaces"
MAX_FILES = 500
MAX_FILE_BYTES = 1_000_000
MAX_PROJECT_BYTES = 20_000_000
ALLOWED_DEPENDENCIES = {
    "react": "19.1.0", "react-dom": "19.1.0", "vite": "6.3.5", "typescript": "5.8.3",
    "@vitejs/plugin-react": "4.4.1", "express": "5.1.0", "vitest": "3.1.3",
    "@types/express": "5.0.6", "@types/node": "22.15.21", "@types/react": "19.1.3", "@types/react-dom": "19.1.3",
}
ALLOWED_SCRIPT_VALUES = {
    "build": "tsc -p tsconfig.app.json && tsc -p tsconfig.server.json && vite build",
    "test": "vitest run",
}


class ProjectValidationError(ValueError):
    pass


def new_workspace_id() -> str:
    return uuid.uuid4().hex


def _workspace_path(project_id: str) -> Path:
    if not re.fullmatch(r"[a-f0-9]{32}", project_id):
        raise ProjectValidationError("Invalid project id")
    root = WORKSPACES / project_id
    if not root.resolve().is_relative_to(WORKSPACES.resolve()):
        raise ProjectValidationError("Project path escapes workspace root")
    return root


def write_project(project_id: str, files: dict[str, str]) -> Path:
    if not files or len(files) > MAX_FILES:
        raise ProjectValidationError(f"Project must include 1 to {MAX_FILES} text files")
    root = _workspace_path(project_id)
    root.mkdir(parents=True, exist_ok=False)
    total_bytes = 0
    try:
        for relative, content in files.items():
            path = PurePosixPath(relative)
            if path.is_absolute() or not path.parts or any(part in {"", ".", ".."} for part in path.parts):
                raise ProjectValidationError(f"Unsafe project path: {relative}")
            if "\\" in relative or relative.startswith("~") or any(part.startswith(".") for part in path.parts):
                raise ProjectValidationError(f"Hidden or platform-specific paths are not allowed: {relative}")
            if Path(path.name).suffix.lower() in {".env", ".pem", ".key", ".pfx", ".p12"}:
                raise ProjectValidationError(f"Sensitive file type is not allowed: {relative}")
            if not isinstance(content, str):
                raise ProjectValidationError(f"Project file must be text: {relative}")
            encoded = content.encode("utf-8")
            if len(encoded) > MAX_FILE_BYTES:
                raise ProjectValidationError(f"Project file exceeds {MAX_FILE_BYTES} bytes: {relative}")
            total_bytes += len(encoded)
            if total_bytes > MAX_PROJECT_BYTES:
                raise ProjectValidationError("Project exceeds the 20 MiB total size limit")
            target = root.joinpath(*path.parts)
            if not target.resolve().is_relative_to(root.resolve()):
                raise ProjectValidationError(f"Project path escapes workspace: {relative}")
            target.parent.mkdir(parents=True, exist_ok=True)
            if target.exists() or target.is_symlink():
                raise ProjectValidationError(f"Duplicate or linked path: {relative}")
            target.write_text(content, encoding="utf-8", newline="\n")
        return root
    except Exception:
        # Keep partial outputs for inspection and repair; never recursively erase user files.
        raise


def update_project(root: Path, files: dict[str, str]) -> None:
    root = root.resolve(strict=True)
    if not root.is_relative_to(WORKSPACES.resolve()):
        raise ProjectValidationError("Project root is outside the managed workspace")
    if not files or len(files) > MAX_FILES:
        raise ProjectValidationError(f"Repair must include 1 to {MAX_FILES} text files")
    total_bytes = 0
    for relative, content in files.items():
        path = PurePosixPath(relative)
        if path.is_absolute() or not path.parts or any(part in {"", ".", ".."} for part in path.parts):
            raise ProjectValidationError(f"Unsafe repair path: {relative}")
        if "\\" in relative or any(part.startswith(".") for part in path.parts):
            raise ProjectValidationError(f"Hidden or platform-specific paths are not allowed: {relative}")
        encoded = content.encode("utf-8")
        if len(encoded) > MAX_FILE_BYTES:
            raise ProjectValidationError(f"Repair file exceeds {MAX_FILE_BYTES} bytes: {relative}")
        total_bytes += len(encoded)
        target = root.joinpath(*path.parts)
        if not target.resolve().is_relative_to(root) or target.is_symlink():
            raise ProjectValidationError(f"Repair path escapes the project: {relative}")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8", newline="\n")
    if sum(item.stat().st_size for item in root.rglob("*") if item.is_file()) > MAX_PROJECT_BYTES:
        raise ProjectValidationError("Project exceeds the 20 MiB total size limit")


def _validate_project(root: Path) -> None:
    root = root.resolve(strict=True)
    if not root.is_relative_to(WORKSPACES.resolve()):
        raise ProjectValidationError("Project root is outside the managed workspace")
    for path in root.rglob("*"):
        if {"node_modules", "dist", "dist-server"}.intersection(path.relative_to(root).parts):
            continue
        if path.is_symlink() or not path.resolve().is_relative_to(root):
            raise ProjectValidationError(f"Symlink or escaping path is not allowed: {path.relative_to(root)}")
    package_file = root / "package.json"
    lock_file = root / "package-lock.json"
    if not package_file.is_file() or not lock_file.is_file():
        raise ProjectValidationError("Generated React/Node projects must include package.json and package-lock.json")
    try:
        package = json.loads(package_file.read_text(encoding="utf-8"))
        lock = json.loads(lock_file.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise ProjectValidationError("Project package metadata is not valid JSON") from exc
    if lock.get("lockfileVersion", 0) < 3 or lock.get("name") != package.get("name"):
        raise ProjectValidationError("package-lock.json must be a matching npm v3 lockfile")
    scripts = package.get("scripts", {})
    if scripts.get("build") != ALLOWED_SCRIPT_VALUES["build"] or scripts.get("test") != ALLOWED_SCRIPT_VALUES["test"]:
        raise ProjectValidationError("Only the fixed Vite build and Vitest test scripts are permitted")
    if any(value not in ALLOWED_SCRIPT_VALUES.values() for value in scripts.values()):
        raise ProjectValidationError("Generated npm scripts may only use the builder's fixed allowlist")
    dependencies = {**package.get("dependencies", {}), **package.get("devDependencies", {})}
    for name, version in dependencies.items():
        if name not in ALLOWED_DEPENDENCIES or version != ALLOWED_DEPENDENCIES[name]:
            raise ProjectValidationError(f"Dependency is not allowlisted and pinned: {name}@{version}")
    if set(dependencies) != set(ALLOWED_DEPENDENCIES):
        raise ProjectValidationError("Generated projects must use the complete pinned full-stack dependency set")
    lock_deps = lock.get("packages", {})
    root_lock_deps = lock_deps.get("", {}).get("dependencies", {}) | lock_deps.get("", {}).get("devDependencies", {})
    if root_lock_deps != dependencies:
        raise ProjectValidationError("Lockfile root dependencies do not match package.json")


def docker_command(project_root: Path, command: list[str], image: str | None = None) -> list[str]:
    image = image or os.environ.get("BRAHMA_BUILDER_IMAGE", "codevaa-brahma-builder:node22")
    allowed = {
        ("npm", "ci", "--offline", "--ignore-scripts", "--no-audit", "--no-fund"),
        ("npm", "test"),
        ("npm", "run", "build"),
    }
    if tuple(command) not in allowed:
        raise ProjectValidationError("Runner command is not in the isolated builder allowlist")
    return [
        "docker", "run", "--rm", "--network=none", "--read-only", "--cap-drop=ALL",
        "--security-opt=no-new-privileges:true", "--pids-limit=96", "--memory=2g", "--cpus=2",
        "--user=1000:1000", "--tmpfs=/tmp:rw,noexec,nosuid,size=256m",
        "--mount", f"type=bind,src={project_root.resolve()},dst=/workspace,rw",
        "--workdir=/workspace", "--env=HOME=/home/node", "--env=npm_config_cache=/home/node/.npm",
        image, *command,
    ]


def _run_step(root: Path, command: list[str], timeout_seconds: int = 180) -> dict:
    invocation = docker_command(root, command)
    try:
        completed = subprocess.run(invocation, check=False, capture_output=True, text=True, timeout=timeout_seconds)
        return {"command": command, "exit_code": completed.returncode,
                "stdout": completed.stdout[-40000:], "stderr": completed.stderr[-40000:]}
    except FileNotFoundError:
        return {"command": command, "exit_code": 127, "stdout": "", "stderr": "Docker CLI is not installed."}
    except subprocess.TimeoutExpired as exc:
        return {"command": command, "exit_code": 124, "stdout": str(exc.stdout or "")[-40000:],
                "stderr": f"Step timed out after {timeout_seconds} seconds."}


def run_project(project_id: str) -> dict:
    root = _workspace_path(project_id)
    _validate_project(root)
    steps = [
        _run_step(root, ["npm", "ci", "--offline", "--ignore-scripts", "--no-audit", "--no-fund"]),
    ]
    if steps[-1]["exit_code"] == 0:
        steps.append(_run_step(root, ["npm", "test"]))
    if steps[-1]["exit_code"] == 0:
        steps.append(_run_step(root, ["npm", "run", "build"]))
    passed = len(steps) == 3 and all(item["exit_code"] == 0 for item in steps)
    return {
        "project_id": project_id,
        "success": passed,
        "steps": steps,
        "preview_file": str(root / "dist" / "index.html") if passed and (root / "dist" / "index.html").is_file() else None,
        "workspace": str(root),
        "network": "none",
        "host_mounts": [str(root)],
        "bounded_repairs": 2,
    }
