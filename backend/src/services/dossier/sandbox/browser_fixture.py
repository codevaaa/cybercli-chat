"""Test-only local preview with fixed trusted source. Never loads model output."""
import importlib.util
import json
from pathlib import Path
import tempfile
import threading
import sys

spec = importlib.util.spec_from_file_location('runtime', Path(__file__).with_name('runtime.py'))
runtime = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runtime)

with tempfile.TemporaryDirectory() as directory:
    runtime.ROOT = Path(directory)
    runtime.DB = runtime.ROOT / 'app.sqlite'
    runtime.seed()
    source = r'''import html
def render(user, rows):
 notes = ''.join('<li>' + html.escape(row['title']) + '</li>' for row in rows)
 return '<!doctype html><title>Owner notes</title><h1 data-i18n-en="Owner notes" data-i18n-hi="मेरे नोट्स">Owner notes</h1><ul>' + notes + '</ul><button data-i18n-en="View notes" data-i18n-hi="नोट्स देखें" onclick="const r=document.getElementById(\'result\');r.setAttribute(\'data-i18n-en\',\'Notes opened\');r.setAttribute(\'data-i18n-hi\',\'नोट्स खुले\');window.codevaSetLanguage(document.documentElement.lang||\'en\')">View notes</button><p id="result" data-i18n-en="Ready" data-i18n-hi="तैयार">Ready</p>'
'''
    runtime.control('write', {'files': [{'path': 'features.py', 'content': source}]})
    server = runtime.HTTPServer(('127.0.0.1', 0), runtime.App)
    runtime.PORT = server.server_port
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    print(json.dumps({'ready': True}), flush=True)
    try:
        for line in sys.stdin:
            payload = json.loads(line)
            print(json.dumps(runtime.request(payload)), flush=True)
    finally:
        server.shutdown()
        server.server_close()
        thread.join()
