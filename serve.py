# -*- coding: utf-8 -*-
"""本地开发服务器：静态文件 + 录取数据库 API + 管理导入 + 禁用缓存头。"""
import base64
import datetime
import http.server
import json
import os
import socketserver
import sys
import urllib.parse

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(BASE_DIR)
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000

# 把 数据库/ 目录加入 import path，便于直接 import api 和 import_admission
sys.path.insert(0, os.path.join(BASE_DIR, '数据库'))
import api as admission_api
import import_admission
import import_content
import import_subjects
import db_config

ADMIN_TOKEN = os.environ.get('KAOYAN_ADMIN_TOKEN', '').strip()


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def _send_json(self, status, obj):
        data = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _is_loopback(self):
        addr = self.client_address[0] if self.client_address else ''
        return addr in ('127.0.0.1', '::1', 'localhost')

    def _admin_authorized(self):
        if ADMIN_TOKEN:
            return self.headers.get('X-Admin-Token', '') == ADMIN_TOKEN
        return self._is_loopback()

    def do_GET(self):
        parsed = urllib.parse.urlsplit(self.path)
        if parsed.path.startswith('/api/'):
            params = {}
            for k, v in urllib.parse.parse_qs(parsed.query).items():
                if isinstance(v, list):
                    params[k] = v[0]
                else:
                    params[k] = v
            for k in ('year', 'page', 'page_size'):
                if k in params:
                    try:
                        params[k] = int(params[k])
                    except ValueError:
                        del params[k]
            status, body, ctype = admission_api.dispatch(parsed.path, params)
            data = body.encode('utf-8')
            self.send_response(status)
            self.send_header('Content-Type', ctype)
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return
        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlsplit(self.path)
        if parsed.path == '/api/admin/import-admission':
            if not self._admin_authorized():
                self._send_json(401, {'code': 1, 'msg': 'unauthorized'})
                return
            try:
                length = int(self.headers.get('Content-Length', '0'))
                raw = self.rfile.read(length) if length else b''
                req = json.loads(raw.decode('utf-8'))
                filename = os.path.basename(str(req.get('filename', 'upload.xlsx')))
                if not filename.lower().endswith('.xlsx'):
                    filename += '.xlsx'
                b64 = str(req.get('base64', ''))
                if not b64:
                    raise ValueError('缺少 base64 文件内容')
                content = base64.b64decode(b64)
                raw_dir = os.path.join(BASE_DIR, '数据库', 'raw')
                os.makedirs(raw_dir, exist_ok=True)
                stamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
                save_path = os.path.join(raw_dir, f'{stamp}_{filename}')
                with open(save_path, 'wb') as f:
                    f.write(content)
                if db_config.is_mysql():
                    info = import_admission.import_mysql_from_config(save_path)
                    try:
                        subj_info = import_subjects.import_subjects_to_mysql()
                    except Exception as subj_e:
                        subj_info = {'error': str(subj_e)}
                    try:
                        content_info = import_content.import_content_to_mysql()
                    except Exception as content_e:
                        content_info = {'error': str(content_e)}
                else:
                    info = import_admission.import_excel_to_db(save_path, write_csv=True)
                    try:
                        subj_info = import_subjects.import_subjects_to_db(write_csv=False)
                    except Exception as subj_e:
                        subj_info = {'error': str(subj_e)}
                    try:
                        content_info = import_content.import_content_to_db(write_csv=False)
                    except Exception as content_e:
                        content_info = {'error': str(content_e)}
                self._send_json(200, {'code': 0, 'data': {
                    'records': info['records'],
                    'schools': info['schools'],
                    'majors': info['majors'],
                    'saved_as': os.path.basename(save_path),
                    'subjects': subj_info,
                    'content': content_info,
                }})
            except Exception as e:
                self._send_json(400, {'code': 1, 'msg': str(e)})
            return
        self._send_json(404, {'code': 1, 'msg': 'not found'})

    def log_message(self, *args):
        pass


with socketserver.ThreadingTCPServer(('', PORT), NoCacheHandler) as httpd:
    print(f'serving on http://127.0.0.1:{PORT} (no-cache)', flush=True)
    if ADMIN_TOKEN:
        print('admin import auth: KAOYAN_ADMIN_TOKEN enabled', flush=True)
    else:
        print('admin import auth: loopback only (set KAOYAN_ADMIN_TOKEN to require token)', flush=True)
    httpd.serve_forever()
