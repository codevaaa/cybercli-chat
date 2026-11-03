import importlib.util
import base64
import json
from pathlib import Path
import sqlite3
import tempfile
import threading
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('runtime', Path(__file__).with_name('runtime.py'))
runtime = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runtime)


class RuntimeContracts(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        runtime.ROOT = Path(self.temp.name)
        runtime.DB = runtime.ROOT / 'app.sqlite'
        runtime.seed()
        runtime.control('write', {'files': [{'path': 'features.py', 'content': 'def render(user, rows):\n return \'<!doctype html><title>Owner notes</title><h1 data-i18n-en="Owner notes" data-i18n-hi="मेरे नोट्स">Owner notes</h1><button>View notes</button>\''}]})
        self.server = runtime.HTTPServer(('127.0.0.1', 0), runtime.App)
        runtime.PORT = self.server.server_port
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.temp.cleanup()

    def test_real_local_contracts_wrong_password_isolation_seed_and_idempotency(self):
        first = runtime.contracts()
        second = runtime.contracts()
        self.assertEqual(first['exit_code'], 0)
        self.assertEqual(first['rows'], 4)
        self.assertEqual(first['rows'], second['rows'])
        self.assertIn('owner_isolation', first['tests'])

    def test_snapshot_restores_generated_code_and_sqlite_rows(self):
        snapshot = runtime.control('snapshot', {})
        runtime.control('write', {'files': [{'path': 'features.py', 'content': 'broken'}]})
        with runtime.database(runtime.DB) as db:
            db.execute('INSERT INTO rows VALUES(999,1,"regression")')
        runtime.control('restore', snapshot)
        self.assertIn('Owner notes', (runtime.ROOT / 'features.py').read_text())
        with runtime.database(runtime.DB) as db:
            self.assertEqual(db.execute('SELECT count(*) FROM rows').fetchone()[0], 4)

    def test_external_target_and_escape_are_rejected(self):
        for value in ['//external.invalid', 'https://external.invalid/', '/../root.py', '../root.py']:
            with self.assertRaises(ValueError):
                runtime.safe_path(value)
        with self.assertRaises(ValueError):
            runtime.request({'path': 'https://external.invalid/'})

    def test_login_validation_and_relative_preview_login(self):
        for value in ['[]', '{"name":{}}', 'not json']:
            self.assertEqual(runtime.request({'path': '/login', 'method': 'POST', 'body': value})['status'], 400)
        page = runtime.request({'path': '/'})
        self.assertEqual(page['status'], 401)
        self.assertIn('fetch("login"', base64.b64decode(page['body_base64']).decode())

    def test_real_owner_row_create_update_delete_and_cross_user_denial(self):
        cookies = []
        for name in ['sample-a', 'sample-b']:
            response = runtime.request({'path': '/login', 'method': 'POST', 'body': json.dumps({'name': name, 'password': 'Demo-2026!'})})
            cookies.append(response['headers']['Set-Cookie'].split(';')[0])
        def mutate(cookie, payload):
            return runtime.request({'path': '/rows', 'method': 'POST', 'headers': {'Cookie': cookie}, 'body': json.dumps(payload, ensure_ascii=False)})
        created = mutate(cookies[0], {'action': 'create', 'title': 'मेरा नया नोट 🌏'})
        self.assertEqual(created['status'], 200)
        row_id = json.loads(base64.b64decode(created['body_base64']))['id']
        for action in ['update', 'delete']:
            self.assertEqual(mutate(cookies[1], {'action': action, 'id': row_id, 'title': 'Other user'})['status'], 404)
        self.assertEqual(mutate(cookies[0], {'action': 'update', 'id': row_id, 'title': 'Updated'})['status'], 200)
        self.assertEqual(mutate(cookies[0], {'action': 'delete', 'id': row_id})['status'], 200)
        self.assertEqual(mutate('', {'action': 'create', 'title': 'Unauthenticated'})['status'], 401)
        for value in [{'action': 'delete', 'id': True}, {'action': 'create', 'title': []}, {'action': 'other'}]:
            self.assertEqual(mutate(cookies[0], value)['status'], 400)

    def test_migration_up_twice_down_and_seed_are_data_owned(self):
        first = runtime.control('migrate', {})
        second = runtime.control('migrate', {})
        self.assertEqual(first, second)
        self.assertEqual(first['rows'], 4)
        self.assertEqual(runtime.control('migrate', {'down': True})['version'], 0)
        self.assertEqual(runtime.control('migrate', {})['rows'], 4)

    def test_duplicate_retry_does_not_insert_twice_and_perf_budget_is_measured(self):
        self.assertEqual(runtime.duplicate_check()['exit_code'], 0)
        with runtime.database(runtime.DB) as db:
            self.assertEqual(db.execute('SELECT count(*) FROM rows').fetchone()[0], 4)
            tokens = db.execute('SELECT token FROM sessions').fetchall()
            self.assertTrue(all(len(row[0]) == 64 and '.' not in row[0] for row in tokens))
        self.assertEqual(runtime.performance_check(0.000001)['exit_code'], 1)
        self.assertEqual(runtime.performance_check(1000)['exit_code'], 0)

    def test_outside_configuration_fails_before_socket_creation(self):
        with patch('http.client.HTTPConnection') as socket:
            with self.assertRaises(ValueError):
                runtime.request({'path': '/', 'target': 'outside.invalid'})
            socket.assert_not_called()

    def test_backend_contract_is_consumed_and_invalid_down_cannot_drop_schema(self):
        runtime.control('write', {'files': [{'path': 'backend/contract.json', 'content': json.dumps({'entity': 'rows', 'path': '/wrong', 'fields': ['id', 'owner', 'title'], 'owner_only': True, 'login_required': True})}]})
        with self.assertRaisesRegex(ValueError, 'Backend contract'):
            runtime.seed()
        (runtime.ROOT / 'backend/contract.json').unlink()
        runtime.control('write', {'files': [{'path': 'data/down.json', 'content': '{"version":1,"tables":["users"]}'}]})
        with self.assertRaisesRegex(ValueError, 'Down migration'):
            runtime.control('migrate', {'down': True})
        with runtime.database(runtime.DB) as db:
            self.assertEqual(db.execute('SELECT count(*) FROM rows').fetchone()[0], 4)

    def test_contract_parses_without_execution_and_rejects_unused_or_unsupported_programs(self):
        def check(source):
            return runtime.control('contract', {'files': [{'path': 'frontend/features.py', 'content': source}]})
        self.assertEqual(check('import html\ndef render(user, rows): return html.escape("Notes")')['exit_code'], 0)
        for source in ['from flask import Flask\ndef render(user, rows): return "Notes"', 'def index(): return "Unused"', 'not valid python', 'from .templates import render\ndef render(user, rows): pass']:
            self.assertEqual(check(source)['exit_code'], 1)
        # A top-level raise would execute on import; validation must never run it.
        self.assertEqual(check('raise RuntimeError("Never execute validation")\ndef render(user, rows): return "Notes"')['exit_code'], 0)


if __name__ == '__main__':
    unittest.main()
