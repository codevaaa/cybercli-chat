#!/usr/bin/env python3
"""
Secret Scanner — Scans files for potential hardcoded secrets.
Used by the security-audit skill to detect leaked credentials.

Usage: python scan_secrets.py <directory> [--json]
Exit code 0: No secrets found
Exit code 1: Secrets detected (findings printed)
"""
import sys
import os
import re
import json

# Patterns that indicate potential secrets
SECRET_PATTERNS = [
    (r'(?i)(api[_-]?key|apikey)\s*[:=]\s*["\']([^"\']{10,})["\']', 'API Key'),
    (r'(?i)(secret|password|passwd|pwd)\s*[:=]\s*["\']([^"\']{6,})["\']', 'Password/Secret'),
    (r'(?i)(token|access[_-]?token|auth[_-]?token)\s*[:=]\s*["\']([^"\']{10,})["\']', 'Token'),
    (r'(?i)(aws[_-]?access[_-]?key[_-]?id)\s*[:=]\s*["\']?(AKIA[0-9A-Z]{16})["\']?', 'AWS Access Key'),
    (r'(?i)(private[_-]?key)\s*[:=]\s*["\']([^"\']{20,})["\']', 'Private Key'),
    (r'-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----', 'Private Key File'),
    (r'(?i)mongodb(\+srv)?://[^\s]+:[^\s]+@', 'MongoDB Connection String'),
    (r'(?i)postgres(ql)?://[^\s]+:[^\s]+@', 'PostgreSQL Connection String'),
    (r'sk-[a-zA-Z0-9]{20,}', 'OpenAI API Key'),
    (r'ghp_[a-zA-Z0-9]{36}', 'GitHub Personal Token'),
    (r'ghr_[a-zA-Z0-9]{36}', 'GitHub Refresh Token'),
    (r'xoxb-[0-9]+-[0-9]+-[a-zA-Z0-9]+', 'Slack Bot Token'),
    (r'(?i)bearer\s+[a-zA-Z0-9\-._~+/]+=*', 'Bearer Token'),
]

# Files to skip
SKIP_DIRS = {'.git', 'node_modules', '__pycache__', '.venv', 'venv', 'dist', 'build', '.next'}
SKIP_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.lock'}

def scan_file(filepath):
    findings = []
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
        for line_num, line in enumerate(lines, 1):
            for pattern, secret_type in SECRET_PATTERNS:
                if re.search(pattern, line):
                    # Skip if it's clearly a placeholder
                    if any(placeholder in line.lower() for placeholder in ['example', 'placeholder', 'your_', 'xxx', 'changeme', '<your']):
                        continue
                    findings.append({
                        'file': filepath,
                        'line': line_num,
                        'type': secret_type,
                        'content': line.strip()[:80] + ('...' if len(line.strip()) > 80 else ''),
                    })
    except (IOError, UnicodeDecodeError):
        pass
    return findings

def scan_directory(directory):
    all_findings = []
    for root, dirs, files in os.walk(directory):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for filename in files:
            ext = os.path.splitext(filename)[1].lower()
            if ext in SKIP_EXTENSIONS:
                continue
            filepath = os.path.join(root, filename)
            findings = scan_file(filepath)
            all_findings.extend(findings)
    return all_findings

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python scan_secrets.py <directory> [--json]")
        sys.exit(2)

    target = sys.argv[1]
    output_json = '--json' in sys.argv

    if not os.path.exists(target):
        print(f"Error: Path '{target}' does not exist.")
        sys.exit(2)

    findings = scan_directory(target) if os.path.isdir(target) else scan_file(target)

    if output_json:
        print(json.dumps(findings, indent=2))
    else:
        if not findings:
            print("✅ No secrets detected.")
            sys.exit(0)
        print(f"🔴 Found {len(findings)} potential secret(s):\n")
        for f in findings:
            print(f"  [{f['type']}] {f['file']}:{f['line']}")
            print(f"    → {f['content']}\n")

    sys.exit(1 if findings else 0)
