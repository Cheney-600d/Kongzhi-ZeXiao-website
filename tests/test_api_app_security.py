# -*- coding: utf-8 -*-
"""生产 API 安全边界回归测试。"""
import os
import pathlib
import shutil
import sys
import tempfile

from fastapi.testclient import TestClient

REPO = pathlib.Path(__file__).resolve().parent.parent
PASS = 0
FAIL = 0


def check(label, condition):
    global PASS, FAIL
    if condition:
        PASS += 1
        print(f'  PASS  {label}')
    else:
        FAIL += 1
        print(f'  FAIL  {label}')


def main():
    with tempfile.TemporaryDirectory() as folder:
        runtime = pathlib.Path(folder)
        database = runtime / 'admission.db'
        shutil.copy2(REPO / '数据库' / 'admission.db', database)
        os.environ['KAOYAN_SQLITE_PATH'] = str(database)
        os.environ['KAOYAN_UPLOAD_DIR'] = str(runtime / 'uploads')
        os.environ['KAOYAN_RAW_DIR'] = str(runtime / 'raw')
        os.environ['KAOYAN_ADMIN_TOKEN'] = 'test-token-123'
        sys.path.insert(0, str(REPO))

        import api_app

        client = TestClient(api_app.app)
        response = client.post(
            '/api/admin/import-admission',
            headers={
                'X-Admin-Token': 'test-token-123',
                'Content-Length': str(api_app.MAX_IMPORT_BODY_BYTES + 1),
            },
            content=b'{}',
        )
        check('生产导入接口在读取正文前拒绝超大请求', response.status_code == 413)

        response = client.post(
            '/api/admin/import-admission',
            headers={'X-Admin-Token': 'test-token-123'},
            json={'filename': 'bad.xlsx', 'base64': 'not-valid-base64!'},
        )
        check('生产导入接口拒绝非法 Base64', response.status_code == 400 and 'Base64' in response.json().get('msg', ''))

    print(f'\n{PASS} passed, {FAIL} failed')
    return 1 if FAIL else 0


if __name__ == '__main__':
    raise SystemExit(main())
