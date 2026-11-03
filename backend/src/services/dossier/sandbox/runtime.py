"""Trusted preview host and contract tests; never copied into generated source."""
import base64
import ast
import hashlib
import hmac
import http.client
import importlib.util
import json
import os
from pathlib import Path
import secrets
import sqlite3
import sys
import tempfile
import time
from data_runtime import migrate, password_hash, PASSWORD_POLICY, session_signature
from contextlib import contextmanager
from http.server import BaseHTTPRequestHandler, HTTPServer

ROOT = Path('/workspace')
DB = ROOT / 'app.sqlite'
PORT = 8000


def localize_html(value):
    widget = '''<aside id="codeva-language"><label for="codeva-language-select">Language / भाषा</label><select id="codeva-language-select" aria-label="Language"><option value="en">English</option><option value="hi">हिन्दी</option></select></aside><script>
window.codevaSetLanguage=function(language){document.documentElement.lang=language;document.querySelectorAll('[data-i18n-en][data-i18n-hi]').forEach(function(node){node.textContent=node.getAttribute('data-i18n-'+language)});try{localStorage.setItem('codeva-app-language',language)}catch(e){}};
document.getElementById('codeva-language-select').onchange=function(){window.codevaSetLanguage(this.value)};
try{var saved=localStorage.getItem('codeva-app-language');if(saved==='hi'){document.getElementById('codeva-language-select').value=saved;window.codevaSetLanguage(saved)}}catch(e){}
</script>'''
    return value.replace('</body>', widget + '</body>') if '</body>' in value else value + widget


def login_html():
    return localize_html('''<!doctype html><h1 data-i18n-en="Project preview login" data-i18n-hi="प्रोजेक्ट प्रीव्यू लॉग इन">Project preview login</h1><p data-i18n-en="Demo users: sample-a, sample-b. Demo password: Demo-2026!" data-i18n-hi="डेमो उपयोगकर्ता: sample-a, sample-b. डेमो पासवर्ड: Demo-2026!">Demo users: sample-a, sample-b. Demo password: Demo-2026!</p><form id="login"><label><span data-i18n-en="User" data-i18n-hi="उपयोगकर्ता">User</span><input name="name" aria-label="User"></label><label><span data-i18n-en="Password" data-i18n-hi="पासवर्ड">Password</span><input name="password" type="password" aria-label="Password"></label><button data-i18n-en="Log in" data-i18n-hi="लॉग इन">Log in</button></form><script>login.onsubmit=async e=>{e.preventDefault();let r=await fetch("login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(Object.fromEntries(new FormData(login)))});if(r.ok)location.reload();else alert(document.documentElement.lang==='hi'?"अमान्य लॉग इन":"Invalid login")}</script>''')


@contextmanager
def database(file):
    connection = sqlite3.connect(file)
    try:
        with connection:
            yield connection
    finally:
        connection.close()


def seed():
    validate_backend_contract()
    return migrate(ROOT, DB)


def validate_backend_contract():
    contract_file = ROOT / 'backend/contract.json'
    if not contract_file.exists():
        return  # Phase-1 dossiers use the immutable default contract.
    contract = json.loads(contract_file.read_text())
    expected = {'entity': 'rows', 'path': '/rows', 'fields': ['id', 'owner', 'title'], 'owner_only': True, 'login_required': True}
    if contract != expected:
        raise ValueError('Backend contract disagrees with the approved schema or permission rules')


def session_key():
    directory = ROOT / '.runtime'
    directory.mkdir(exist_ok=True)
    key = directory / 'session.key'
    try:
        with key.open('xb') as stream:
            stream.write(secrets.token_bytes(32))
        key.chmod(0o600)
    except FileExistsError:
        pass
    return key.read_bytes()


def safe_path(name):
    if not isinstance(name, str) or len(name) > 180 or name.startswith('/') or '\\' in name or any(p in ['', '.', '..'] for p in name.split('/')):
        raise ValueError('Invalid generated path')
    result = ROOT / name
    if result.is_symlink() or any(p.is_symlink() for p in result.parents if p != ROOT.parent):
        raise ValueError('Symlink not permitted')
    if name == 'app.sqlite' or name.startswith('.git/') or name.startswith('.runtime/'):
        raise ValueError('Reserved path')
    return result


def request(payload):
    if set(payload) - {'path', 'method', 'headers', 'body'}:
        raise ValueError('External target configuration is not accepted')
    path = payload.get('path', '/')
    if not path.startswith('/') or path.startswith('//') or '\\' in path or any(ord(c) < 32 for c in path):
        raise ValueError('Only relative preview paths are allowed')
    method = payload.get('method', 'GET')
    if method not in ['GET', 'POST']:
        raise ValueError('Method not permitted')
    conn = http.client.HTTPConnection('127.0.0.1', PORT, timeout=8)
    headers = {k: v for k, v in payload.get('headers', {}).items() if k.lower() in ['cookie', 'content-type', 'idempotency-key']}
    conn.request(method, path, payload.get('body', '').encode('utf-8'), headers)
    response = conn.getresponse()
    data = response.read(2 * 1024 * 1024 + 1)
    if len(data) > 2 * 1024 * 1024:
        raise ValueError('Preview response too large')
    result = {'status': response.status, 'headers': dict(response.getheaders()), 'body_base64': base64.b64encode(data).decode()}
    conn.close()
    return result


class App(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def reply(self, code, value, content_type='application/json', cookie=None):
        data = (json.dumps(value) if content_type == 'application/json' else value).encode()
        self.send_response(code)
        self.send_header('Content-Type', content_type + '; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        if cookie:
            self.send_header('Set-Cookie', cookie)
        self.end_headers()
        self.wfile.write(data)

    def user(self):
        token = next((p.strip().split('=', 1)[1] for p in self.headers.get('Cookie', '').split(';') if p.strip().startswith('app_session=')), '')
        with database(DB) as db:
            parts = token.split('.')
            if len(parts) != 2 or not hmac.compare_digest(session_signature(session_key(), parts[0]), parts[1]):
                return None
            result = db.execute('SELECT user FROM sessions WHERE token=?', (hashlib.sha256(token.encode()).hexdigest(),)).fetchone()
            return result[0] if result else None

    def do_POST(self):
        validate_backend_contract()
        if self.path not in ['/login', '/rows']:
            return self.reply(404, {'error': 'Not found'})
        try:
            length = int(self.headers.get('Content-Length', 0))
        except ValueError:
            return self.reply(400, {'error': 'Invalid login'})
        if length < 0 or length > 4096:
            return self.reply(413, {'error': 'Too large'})
        try:
            payload = json.loads(self.rfile.read(length))
        except (ValueError, TypeError):
            return self.reply(400, {'error': 'Invalid login'})
        if not isinstance(payload, dict):
            return self.reply(400, {'error': 'Invalid login'})
        if self.path == '/rows':
            uid = self.user()
            if not uid:
                return self.reply(401, {'error': 'Login required'})
            action = payload.get('action')
            if action not in ['create', 'update', 'delete']:
                return self.reply(400, {'error': 'Invalid row action'})
            title = payload.get('title')
            if action != 'delete' and (not isinstance(title, str) or not title.strip() or len(title) > 200):
                return self.reply(400, {'error': 'Title must contain 1-200 characters'})
            if action != 'create' and (type(payload.get('id')) is not int or payload['id'] <= 0):
                return self.reply(400, {'error': 'Invalid row id'})
            with database(DB) as db:
                key = self.headers.get('Idempotency-Key')
                if key is not None and (not key or len(key) > 80 or not all(c.isalnum() or c in '-_' for c in key)):
                    return self.reply(400, {'error': 'Invalid idempotency key'})
                body_hash = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
                db.execute('BEGIN IMMEDIATE')
                if key:
                    existing = db.execute('SELECT body_hash,result FROM requests WHERE owner=? AND key=?', (uid, key)).fetchone()
                    if existing:
                        return self.reply(200, json.loads(existing[1])) if existing[0] == body_hash else self.reply(409, {'error': 'Idempotency key was already used for a different request'})
                if action == 'create':
                    row_id = db.execute('INSERT INTO rows(owner,title) VALUES(?,?)', (uid, title)).lastrowid
                else:
                    row_id = payload['id']
                    query = db.execute('DELETE FROM rows WHERE id=? AND owner=?', (row_id, uid)) if action == 'delete' else db.execute('UPDATE rows SET title=? WHERE id=? AND owner=?', (title, row_id, uid))
                    if query.rowcount != 1:
                        return self.reply(404, {'error': 'Row not found'})
                result = {'id': row_id, 'action': action}
                if key:
                    db.execute('INSERT INTO requests VALUES(?,?,?,?)', (uid, key, body_hash, json.dumps(result)))
            return self.reply(200, result)
        if not isinstance(payload.get('name'), str) or not isinstance(payload.get('password'), str):
            return self.reply(400, {'error': 'Invalid login'})
        with database(DB) as db:
            row = db.execute('SELECT id,salt,password_hash FROM users WHERE name=?', (payload.get('name'),)).fetchone()
            actual = password_hash(str(payload.get('password', '')), row[1] if row else 'missing')
            if not row or not hmac.compare_digest(actual, row[2]):
                return self.reply(401, {'error': 'Invalid login'})
            nonce = secrets.token_hex(32)
            token = nonce + '.' + session_signature(session_key(), nonce)
            db.execute('INSERT INTO sessions VALUES(?,?)', (hashlib.sha256(token.encode()).hexdigest(), row[0]))
        self.reply(200, {'user': row[0]}, cookie='app_session=' + token + '; HttpOnly; SameSite=Strict; Path=/')

    def do_GET(self):
        delay = ROOT / '.runtime/slow.json'
        if delay.exists() and self.path.startswith('/rows'):
            time.sleep(min(1, max(0, json.loads(delay.read_text()).get('milliseconds', 0) / 1000)))
        if self.path == '/health':
            return self.reply(200, {'ok': True})
        uid = self.user()
        if not uid:
            return self.reply(401, login_html(), 'text/html')
        with database(DB) as db:
            rows = [{'id': r[0], 'owner': r[1], 'title': r[2]} for r in db.execute('SELECT id,owner,title FROM rows WHERE owner=?', (uid,))]
        if self.path == '/rows' or self.path.startswith('/rows?'):
            return self.reply(200, {'rows': rows})
        if self.path != '/':
            return self.reply(404, {'error': 'Not found'})
        try:
            module_path = safe_path('frontend/features.py') if (ROOT / 'frontend/features.py').exists() else safe_path('features.py')
            if not module_path.exists():
                return self.reply(503, 'Builder has not written features.py', 'text/plain')
            spec = importlib.util.spec_from_file_location('generated_features', module_path)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            html = module.render({'id': uid}, rows)
            if not isinstance(html, str):
                raise ValueError('render must return HTML')
            self.reply(200, localize_html(html), 'text/html')
        except Exception:
            self.reply(500, 'Generated app failed to render', 'text/plain')


def contracts():
    seed()
    bad = request({'path': '/login', 'method': 'POST', 'headers': {'Content-Type': 'application/json'}, 'body': json.dumps({'name': 'sample-a', 'password': 'wrong'})})
    assert bad['status'] == 401, 'Wrong password entered app'
    cookies = []
    for name in ['sample-a', 'sample-b']:
        login = request({'path': '/login', 'method': 'POST', 'headers': {'Content-Type': 'application/json'}, 'body': json.dumps({'name': name, 'password': 'Demo-2026!'})})
        assert login['status'] == 200, 'Sample login failed'
        cookies.append(login['headers']['Set-Cookie'].split(';')[0])
    def body(r):
        return base64.b64decode(r['body_base64']).decode()
    a = json.loads(body(request({'path': '/rows', 'headers': {'Cookie': cookies[0]}})))['rows']
    b = json.loads(body(request({'path': '/rows?owner=1', 'headers': {'Cookie': cookies[1]}})))['rows']
    assert a and b and all(r['owner'] == 2 for r in b), 'Cross-user access or missing sample rows'
    for action in ['update', 'delete']:
        forbidden = request({'path': '/rows', 'method': 'POST', 'headers': {'Cookie': cookies[1], 'Content-Type': 'application/json'}, 'body': json.dumps({'action': action, 'id': a[0]['id'], 'title': 'Not my row'})})
        assert forbidden['status'] == 404, 'Cross-user row mutation'
    with database(DB) as db:
        before = db.execute('SELECT count(*) FROM rows').fetchone()[0]
    seed()
    with database(DB) as db:
        after = db.execute('SELECT count(*) FROM rows').fetchone()[0]
        assert db.execute('SELECT count(*) FROM users').fetchone()[0] >= 2
    assert before == after, 'Retry duplicated rows'
    page = request({'path': '/', 'headers': {'Cookie': cookies[0]}})
    assert page['status'] == 200 and len(body(page).strip()) > 40, 'Empty or failed preview'
    assert 'data-i18n-en=' in body(page) and 'data-i18n-hi=' in body(page), 'Generated app is missing English/Hindi UI strings'
    # Remove test sessions, leaving seed rows stable across repeated tests.
    with database(DB) as db:
        for cookie in cookies:
            db.execute('DELETE FROM sessions WHERE token=?', (hashlib.sha256(cookie.split('=', 1)[1].encode()).hexdigest(),))
    return {'exit_code': 0, 'tests': ['wrong_password', 'owner_isolation', 'owner_mutation_isolation', 'sample_data', 'idempotent_seed', 'nonempty_preview', 'bilingual_strings'], 'rows': after, 'output': 'Trusted preview-origin contract tests completed'}


def preview_login():
    result = request({'path': '/login', 'method': 'POST', 'body': json.dumps({'name': 'sample-a', 'password': 'Demo-2026!'})})
    assert result['status'] == 200, 'Preview login failed'
    return result['headers']['Set-Cookie'].split(';')[0]


def performance_check(budget):
    cookie = preview_login()
    started = time.perf_counter()
    result = request({'path': '/rows', 'headers': {'Cookie': cookie}})
    elapsed = (time.perf_counter() - started) * 1000
    return {'exit_code': 0 if result['status'] == 200 and elapsed <= budget else 1, 'tests': ['list_endpoint_budget'], 'elapsed_ms': elapsed, 'budget_ms': budget, 'output': 'Measured owned list endpoint'}


def duplicate_check():
    cookie = preview_login()
    key = 'resilience-' + secrets.token_hex(12)
    body = json.dumps({'action': 'create', 'title': 'resilience temporary row'})
    args = {'path': '/rows', 'method': 'POST', 'body': body, 'headers': {'Cookie': cookie, 'Idempotency-Key': key}}
    first, second = request(args), request(args)
    assert first['status'] == second['status'] == 200 and first['body_base64'] == second['body_base64'], 'Duplicate request inserted twice'
    row_id = json.loads(base64.b64decode(first['body_base64']))['id']
    with database(DB) as db:
        assert db.execute('SELECT count(*) FROM rows WHERE id=?', (row_id,)).fetchone()[0] == 1
        db.execute('DELETE FROM rows WHERE id=?', (row_id,))
        db.execute('DELETE FROM requests WHERE key=?', (key,))
    return {'exit_code': 0, 'tests': ['duplicate_request'], 'output': 'Identical requests returned one stored row id'}


def control(action, payload):
    if action == 'contract':
        # Parse/compile without importing or executing proposed model code.
        try:
            file = next(f for f in payload['files'] if f['path'] == 'frontend/features.py')
            tree = ast.parse(file['content'], filename=file['path'])
            allowed = {'html', 'json', 're', 'math', 'datetime', 'collections', 'functools', 'itertools', 'typing', 'decimal', 'statistics'}
            for node in ast.walk(tree):
                imports = [a.name.split('.')[0] for a in node.names] if isinstance(node, ast.Import) else [node.module.split('.')[0]] if isinstance(node, ast.ImportFrom) and node.module and not node.level else []
                if isinstance(node, ast.ImportFrom) and (node.level or not node.module) or any(name not in allowed for name in imports):
                    raise ValueError('Frontend import is outside the supported render contract')
            render = next((n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == 'render'), None)
            if not render or [arg.arg for arg in render.args.args] != ['user', 'rows']:
                raise ValueError('Frontend must export render(user, rows)')
            compile(tree, file['path'], 'exec')
            return {'exit_code': 0, 'tests': ['frontend_render_contract'], 'output': 'Proposed render compiles without importing or executing it'}
        except (SyntaxError, ValueError, KeyError, StopIteration) as error:
            return {'exit_code': 1, 'tests': ['frontend_render_contract'], 'output': str(error)}
    if action == 'write':
        changed = []
        for file in payload['files']:
            destination = safe_path(file['path'])
            destination.parent.mkdir(parents=True, exist_ok=True)
            before = destination.read_text(encoding='utf-8') if destination.exists() else ''
            destination.write_text(file['content'], encoding='utf-8')
            changed.append({'path': file['path'], 'before': before, 'after': file['content']})
        return changed
    if action == 'read':
        return [{'path': str(p.relative_to(ROOT)), 'content': p.read_text(encoding='utf-8')} for p in ROOT.rglob('*') if p.is_file() and not p.is_symlink() and p.suffix in ['.py', '.html', '.css', '.js', '.json', '.md']][:100]
    if action == 'request':
        return request(payload)
    if action == 'test':
        return contracts()
    if action == 'migrate':
        return migrate(ROOT, DB, payload.get('down') is True)
    if action == 'perf':
        return performance_check(payload['budget_ms'])
    if action == 'security':
        if payload:
            raise ValueError('Security tool has no target configuration')
        result = contracts()
        cookie = preview_login()
        page = request({'path': '/', 'headers': {'Cookie': cookie}})
        text = base64.b64decode(page['body_base64']).decode()
        assert not any(value in text for value in ['password_hash', 'session.key', 'PRIVATE KEY']), 'Secret in preview response'
        return dict(result, tests=result['tests'] + ['no_secret_response', 'login_required'])
    if action == 'resilience':
        if payload or str(ROOT) != '/workspace':
            raise ValueError('Resilience requires the isolated container workspace')
        duplicate_check()
        # Only the container's bounded /tmp tmpfs is filled; never the host disk.
        with tempfile.TemporaryDirectory(dir='/tmp') as directory:
            scratch = Path(directory) / 'fill'
            failed = False
            try:
                with scratch.open('wb') as stream:
                    for _ in range(40):
                        stream.write(bytes(1024 * 1024))
                    stream.flush()
            except OSError as error:
                if error.errno != 28:
                    raise
                failed = True
            assert failed, 'Sandbox scratch disk was not bounded to 32MB'
            assert request({'path': '/health'})['status'] == 200, 'App failed during scratch disk exhaustion'
        # A real delayed response uses this preview's handler only.
        delay = ROOT / '.runtime/slow.json'
        delay.write_text('{"milliseconds":300}')
        try:
            slowed = performance_check(100)
            assert slowed['exit_code'] == 1, 'Slow-network case did not exceed the budget'
        finally:
            delay.unlink(missing_ok=True)
        assert request({'path': '/health'})['status'] == 200, 'Preview did not recover'
        return {'exit_code': 0, 'tests': ['slow_network', 'full_scratch_disk', 'duplicate_request'], 'output': 'Owned preview recovered after bounded sandbox faults'}
    if action == 'snapshot':
        with tempfile.TemporaryDirectory() as directory:
            temp = Path(directory) / 'snapshot.sqlite'
            with database(DB) as src, database(temp) as target:
                src.backup(target)
            return {'files': control('read', {}), 'database_base64': base64.b64encode(temp.read_bytes()).decode()}
    if action == 'restore':
        for file in control('read', {}):
            safe_path(file['path']).unlink()
        control('write', {'files': payload['files']})
        DB.write_bytes(base64.b64decode(payload['database_base64'], validate=True))
        return {'restored': True}
    raise ValueError('Unknown operation')


if __name__ == '__main__':
    action = sys.argv[1]
    if action == 'serve':
        seed()
        HTTPServer(('127.0.0.1', PORT), App).serve_forever()
    else:
        try:
            print(json.dumps(control(action, json.loads(sys.stdin.read() or '{}'))))
        except Exception as error:
            print(json.dumps({'exit_code': 1, 'output': str(error)}))
            sys.exit(1)
