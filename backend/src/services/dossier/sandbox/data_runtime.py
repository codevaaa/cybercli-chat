"""Data-owned versioned migrations. Backend handlers only read this schema."""
import hashlib
import json
import sqlite3
from pathlib import Path

PASSWORD_POLICY = {'id': 'pbkdf2-sha256-v1', 'rounds': 210000, 'salt_bytes': 16}
SESSION_POLICY = {'id': 'hmac-sha256-v1', 'token_bytes': 32, 'stored': 'sha256'}
CRYPTO_VERSIONS = [dict(version=1, password=PASSWORD_POLICY, session=SESSION_POLICY)]


def session_signature(key, value):
    """Single future-library swap point; no cryptanalysis or attack functions."""
    import hmac
    return hmac.new(key, value.encode(), hashlib.sha256).hexdigest()


def password_hash(value, salt):
    return hashlib.pbkdf2_hmac('sha256', value.encode(), salt.encode(), PASSWORD_POLICY['rounds']).hex()


def migrate(root, file, down=False):
    root = Path(root)
    root.mkdir(exist_ok=True)
    migration_file = root / 'data/migration.json'
    config = json.loads(migration_file.read_text()) if migration_file.exists() else {'version': 1, 'fields': ['id', 'owner', 'title'], 'seed_rows': []}
    if config.get('version') != 1 or config.get('fields') != ['id', 'owner', 'title']:
        raise ValueError('Data migration is outside the approved schema')
    rows = config.get('seed_rows', [])
    if not isinstance(rows, list) or len(rows) > 20 or any(not isinstance(r, dict) or type(r.get('id')) is not int or r['id'] < 100 or r.get('owner') not in [1, 2] or not isinstance(r.get('title'), str) or len(r['title']) > 200 for r in rows):
        raise ValueError('Invalid Data seed rows')
    db = sqlite3.connect(file)
    try:
        with db:
            db.execute('BEGIN IMMEDIATE')
            if down:
                expected = ['requests', 'sessions', 'rows', 'users', 'schema_versions']
                down_file = root / 'data/down.json'
                down_config = json.loads(down_file.read_text()) if down_file.exists() else {'version': 1, 'tables': expected}
                if down_config.get('version') != 1 or down_config.get('tables') != expected:
                    raise ValueError('Down migration is outside the approved schema')
                for table in down_config['tables']:
                    db.execute('DROP TABLE IF EXISTS ' + table)
                return {'exit_code': 0, 'tests': ['down_migration'], 'version': 0}
            db.execute('CREATE TABLE IF NOT EXISTS schema_versions(version INTEGER PRIMARY KEY)')
            db.execute('CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,name TEXT UNIQUE,salt TEXT,password_hash TEXT)')
            db.execute('CREATE TABLE IF NOT EXISTS rows(id INTEGER PRIMARY KEY,owner INTEGER,title TEXT)')
            db.execute('CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user INTEGER)')
            db.execute('CREATE TABLE IF NOT EXISTS requests(owner INTEGER,key TEXT,body_hash TEXT,result TEXT,PRIMARY KEY(owner,key))')
            for uid, name in [(1, 'sample-a'), (2, 'sample-b')]:
                salt = 'demo-fixture-' + name
                # Explicit demo fixture only. The generated app never stores a password.
                db.execute('INSERT OR IGNORE INTO users VALUES(?,?,?,?)', (uid, name, salt, password_hash('Demo-2026!', salt)))
                previous = hashlib.pbkdf2_hmac('sha256', b'Demo-2026!', salt.encode(), 100000).hex()
                db.execute('UPDATE users SET password_hash=? WHERE id=? AND name=? AND password_hash=?', (password_hash('Demo-2026!', salt), uid, name, previous))
                for offset in [1, 2]:
                    db.execute('INSERT OR IGNORE INTO rows VALUES(?,?,?)', (uid * 10 + offset, uid, name + ' row ' + str(offset)))
            for row in rows:
                db.execute('INSERT OR IGNORE INTO rows VALUES(?,?,?)', (row['id'], row['owner'], row['title']))
            db.execute('INSERT OR IGNORE INTO schema_versions VALUES(1)')
            return {'exit_code': 0, 'tests': ['migration'], 'version': 1, 'rows': db.execute('SELECT count(*) FROM rows').fetchone()[0]}
    finally:
        db.close()
