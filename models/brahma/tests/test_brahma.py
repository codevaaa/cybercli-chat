from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

MODEL_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(MODEL_DIR / "src"))
sys.path.insert(0, str(MODEL_DIR))

from brahma.prepare_data import deterministic_split, opencode_row, pass_ratio
from brahma.project_workflow import parse_files
from brahma.skills import retrieve_skills
from brahma.training_utils import require_smoke_report
from builder import project_runner


class DataCurationTests(unittest.TestCase):
    def test_opencode_accepts_high_test_score_and_records_revision(self):
        row = {
            "id": "fixture-1", "input": "Implement a robust parser for this user-provided value.",
            "output": "def parse_value(value):\n    return str(value).strip()", "average_test_score": 1.0,
            "tests_execution_status": ["pass", "pass", "pass"],
        }
        result = opencode_row(row, "pinned-sha")
        self.assertEqual(result["revision"], "pinned-sha")
        self.assertEqual(result["split"], deterministic_split("fixture-1"))
        self.assertIsNone(opencode_row({**row, "average_test_score": 0.5}, "pinned-sha"))
        self.assertIsNone(opencode_row({**row, "tests_execution_status": ["pass", "fail"]}, "pinned-sha"))

    def test_pass_ratio_accepts_dataset_json_strings(self):
        self.assertAlmostEqual(pass_ratio('["pass", "passed", "fail"]'), 2 / 3)

    def test_data_download_is_gated_on_finite_backward_smoke(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            report = Path(temp_dir) / "smoke.json"
            report.write_text(json.dumps({"success": True, "finite_loss": True, "backward_ok": False}))
            with self.assertRaises(RuntimeError):
                require_smoke_report(report)


class BuilderGuardTests(unittest.TestCase):
    def test_model_output_must_use_exact_generated_file_map(self):
        valid = {"files": {name: "source" for name in project_workflow_paths()}}
        self.assertEqual(set(parse_files(json.dumps(valid))), set(valid["files"]))
        with self.assertRaises(ValueError):
            parse_files(json.dumps({"files": {"../escape": "bad"}}))

    def test_workspace_writer_rejects_path_traversal(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            workspaces = Path(temp_dir) / "workspaces"
            workspaces.mkdir()
            with patch.object(project_runner, "WORKSPACES", workspaces):
                with self.assertRaises(project_runner.ProjectValidationError):
                    project_runner.write_project("a" * 32, {"../escape.txt": "no"})
                self.assertFalse((Path(temp_dir) / "escape.txt").exists())

    def test_docker_command_has_no_network_and_only_project_mount(self):
        command = project_runner.docker_command(Path("D:/fixture/project"), ["npm", "test"], image="fixture-image")
        self.assertIn("--network=none", command)
        self.assertIn("--read-only", command)
        self.assertIn("--cap-drop=ALL", command)
        self.assertIn("--pids-limit=96", command)
        self.assertEqual(command.count("--mount"), 1)
        with self.assertRaises(project_runner.ProjectValidationError):
            project_runner.docker_command(Path("."), ["npm", "run", "arbitrary"])

    def test_skill_retrieval_uses_only_approved_pinned_sources(self):
        found = retrieve_skills("secure react frontend Node backend patterns")
        identifiers = {item["id"] for item in found}
        self.assertIn("wshobson/agents/nodejs-backend-patterns", identifiers)
        self.assertNotIn("anthropics/skills/frontend-design", identifiers)
        self.assertLessEqual(sum(len(item["content"]) for item in found), 5000)


def project_workflow_paths():
    from brahma.project_workflow import REQUIRED_GENERATED
    return REQUIRED_GENERATED


if __name__ == "__main__":
    unittest.main()
