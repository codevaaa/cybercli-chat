"""Build an owned snapshot ZIP and a copyable git repo; never run generated code."""
import base64
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import zipfile


def export(payload):
    with tempfile.TemporaryDirectory(prefix='codeva-export-') as directory:
        root = Path(directory) / 'project'
        root.mkdir()
        for file in payload['snapshot']['files']:
            name = file['path']
            if name.startswith('/') or '\\' in name or any(part in ['', '.', '..', '.git', '.runtime'] for part in name.split('/')):
                raise ValueError('Invalid export path')
            target = root / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(file['content'], encoding='utf-8')
        if payload['snapshot'].get('database_base64'):
            (root / 'app.sqlite').write_bytes(base64.b64decode(payload['snapshot']['database_base64'], validate=True))
        (root / 'README.md').write_text(payload['readme'], encoding='utf-8')
        (root / 'judge-lines.json').write_text(json.dumps(payload['judge'], ensure_ascii=False, indent=2), encoding='utf-8')
        (root / 'spec.json').write_text(json.dumps(payload['spec'], ensure_ascii=False, indent=2), encoding='utf-8')
        (root / 'prompt_original.txt').write_bytes(payload['prompt_original'].encode('utf-8'))
        for name in ['runtime.py', 'data_runtime.py']:
            (root / name).write_bytes(Path(__file__).with_name(name).read_bytes())
        (root / 'run.py').write_text("from pathlib import Path\nimport runtime\nruntime.ROOT = Path(__file__).resolve().parent\nruntime.DB = runtime.ROOT / 'app.sqlite'\nruntime.seed()\nruntime.HTTPServer(('127.0.0.1', 8000), runtime.App).serve_forever()\n", encoding='utf-8')
        (root / '.gitignore').write_text('app.sqlite\n.runtime/\n__pycache__/\n', encoding='utf-8')
        env = dict(os.environ, GIT_CONFIG_NOSYSTEM='1', GIT_CONFIG_GLOBAL=os.devnull, GIT_TEMPLATE_DIR='')
        for key in list(env):
            if key.startswith('GIT_CONFIG_KEY_') or key.startswith('GIT_CONFIG_VALUE_') or key == 'GIT_CONFIG_COUNT':
                del env[key]
        command = ['git', '-c', 'core.hooksPath=', '-c', 'commit.gpgSign=false', '-c', 'user.name=Codeva export', '-c', 'user.email=export@codeva.invalid']
        for args in [['init'], ['add', '.'], ['commit', '-m', 'Owned dossier snapshot']]:
            subprocess.run(command + args, cwd=root, env=env, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=15)
        archive = Path(directory) / 'snapshot.zip'
        with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as output:
            for file in root.rglob('*'):
                if file.is_file() and not file.is_symlink():
                    output.write(file, file.relative_to(root))
        return archive.read_bytes()


if __name__ == '__main__':
    sys.stdout.buffer.write(export(json.load(sys.stdin)))
