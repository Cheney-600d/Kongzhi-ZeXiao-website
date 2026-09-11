# -*- coding: utf-8 -*-
"""本地开发服务器：静态文件 + 录取数据库 API + 管理导入 + 禁用缓存头。"""
import base64
import binascii
import datetime
import http.server
import json
import os
import pathlib
import socketserver
import sys
import urllib.parse
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(BASE_DIR)
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
HOST = os.environ.get('HOST', '127.0.0.1').strip() or '127.0.0.1'
MAX_IMPORT_BYTES = 12 * 1024 * 1024
MAX_IMPORT_BODY_BYTES = 17 * 1024 * 1024
PUBLIC_STATIC_SUFFIXES = {
    '.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg',
    '.ico', '.woff', '.woff2', '.ttf', '.xml',
}
BLOCKED_STATIC_DIRS = {
    '.git', '__pycache__', 'deploy', 'design-output', 'docs', 'tests', 'tools',
}

# 把 数据库/ 目录加入 import path，便于直接 import api 和 import_admission
sys.path.insert(0, os.path.join(BASE_DIR, '数据库'))
import api as admission_api
import import_admission
import import_content
import import_subjects
import db_config
import content_admin

ADMIN_TOKEN = os.environ.get('KAOYAN_ADMIN_TOKEN', '').strip()


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def _send_json(self, status, obj, extra_headers=None):
        data = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        for key, value in (extra_headers or {}).items():
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(data)

    def _read_body(self):
        length = int(self.headers.get('Content-Length', '0'))
        return self.rfile.read(length) if length else b''

    def _static_path_allowed(self, url_path):
        target = pathlib.Path(self.translate_path(url_path)).resolve()
        try:
            relative = target.relative_to(pathlib.Path(BASE_DIR).resolve())
        except ValueError:
            return False
        parts = relative.parts
        if any(part.startswith('.') or part.casefold() in BLOCKED_STATIC_DIRS for part in parts):
            return False
        if parts and parts[0] == '数据库' and ('raw' in parts or relative.name == 'config.json'):
            return False
        if target.is_dir():
            return (target / 'index.html').is_file()
        return relative.name == 'robots.txt' or relative.suffix.lower() in PUBLIC_STATIC_SUFFIXES

    def list_directory(self, path):
        self.send_error(404)
        return None

    def _is_loopback(self):
        addr = self.client_address[0] if self.client_address else ''
        return addr in ('127.0.0.1', '::1', 'localhost')

    def _admin_authorized(self):
        session = content_admin.get_session(self.headers)
        if session and self.headers.get('X-CSRF-Token', '') == session.get('csrf'):
            return True
        if ADMIN_TOKEN:
            return self.headers.get('X-Admin-Token', '') == ADMIN_TOKEN
        return self._is_loopback()

    def _dispatch_content_admin(self, method, parsed, raw=b''):
        query = {k: v[0] if isinstance(v, list) else v for k, v in urllib.parse.parse_qs(parsed.query).items()}
        status, payload, extra = content_admin.dispatch(
            method,
            urllib.parse.unquote(parsed.path),
            query,
            self.headers,
            raw,
            self.client_address[0] if self.client_address else '',
        )
        self._send_json(status, payload, extra)

    def do_GET(self):
        parsed = urllib.parse.urlsplit(self.path)
        decoded_path = urllib.parse.unquote(parsed.path)
        school_detail_match = re.fullmatch(r'/school_detail/([^/]+)\.html', decoded_path)
        if school_detail_match and school_detail_match.group(1) not in ('index', 'route'):
            requested_file = self.translate_path(parsed.path)
            if not os.path.isfile(requested_file):
                school = school_detail_match.group(1)
                target = '/school_detail/route.html?school=' + urllib.parse.quote(school)
                self.send_response(302)
                self.send_header('Location', target)
                self.send_header('Content-Length', '0')
                self.end_headers()
                return
        if decoded_path == '/api/health':
            self._send_json(200, {'code': 0, 'data': {'status': 'ok', 'service': 'kaoyan-site-dev'}})
            return
        if decoded_path == '/api/school-content':
            params = urllib.parse.parse_qs(parsed.query)
            school = (params.get('school') or [''])[0]
            self._send_json(200, {'code': 0, 'data': {'items': content_admin.public_modules(school)}})
            return
        if decoded_path == '/api/exam-resources':
            self._send_json(200, {'code': 0, 'data': {'items': content_admin.public_global_modules('exam_resources')}})
            return
        if decoded_path == '/api/site-media':
            self._send_json(200, {'code': 0, 'data': {'items': content_admin.public_site_media()}})
            return
        if decoded_path == '/api/course-resources':
            self._send_json(200, {'code': 0, 'data': {'items': content_admin.public_course_resources()}})
            return
        if decoded_path == '/api/heat-rankings':
            params = urllib.parse.parse_qs(parsed.query)
            period = (params.get('period') or [''])[0]
            scope = (params.get('scope') or ['all'])[0]
            limit = (params.get('limit') or [20])[0]
            try:
                self._send_json(200, {'code': 0, 'data': content_admin.public_heat_rankings(period, scope, limit)})
            except ValueError as exc:
                self._send_json(400, {'code': 1, 'msg': str(exc)})
            return
        match = re.fullmatch(r'/api/schools/([^/]+)/content-modules', decoded_path)
        if match:
            self._send_json(200, {'code': 0, 'data': {'items': content_admin.public_modules(match.group(1))}})
            return
        if decoded_path.startswith('/api/admin/'):
            self._dispatch_content_admin('GET', parsed)
            return
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
        if not self._static_path_allowed(parsed.path):
            self.send_error(404)
            return
        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlsplit(self.path)
        decoded_path = urllib.parse.unquote(parsed.path)
        if decoded_path == '/api/analytics/click':
            try:
                raw = self._read_body()
                if len(raw) > 4096:
                    raise ValueError('请求内容过大')
                payload = json.loads(raw.decode('utf-8'))
                self._send_json(201, {'code': 0, 'data': content_admin.record_public_click(payload)})
            except (ValueError, TypeError, json.JSONDecodeError) as exc:
                self._send_json(400, {'code': 1, 'msg': str(exc)})
            return
        if parsed.path == '/api/admin/import-admission':
            if not self._admin_authorized():
                self._send_json(401, {'code': 1, 'msg': 'unauthorized'})
                return
            try:
                try:
                    body_length = int(self.headers.get('Content-Length', '0'))
                except ValueError as exc:
                    raise ValueError('Content-Length 无效') from exc
                if body_length < 0:
                    raise ValueError('Content-Length 无效')
                if body_length > MAX_IMPORT_BODY_BYTES:
                    self._send_json(413, {'code': 1, 'msg': '上传文件不能超过 12 MB'})
                    return
                raw = self._read_body()
                if len(raw) > MAX_IMPORT_BODY_BYTES:
                    self._send_json(413, {'code': 1, 'msg': '上传文件不能超过 12 MB'})
                    return
                req = json.loads(raw.decode('utf-8'))
                filename = os.path.basename(str(req.get('filename', 'upload.xlsx')))
                if not filename.lower().endswith('.xlsx'):
                    filename += '.xlsx'
                b64 = str(req.get('base64', ''))
                if not b64:
                    raise ValueError('缺少 base64 文件内容')
                try:
                    content = base64.b64decode(b64, validate=True)
                except (binascii.Error, ValueError) as exc:
                    raise ValueError('Base64 文件内容无效') from exc
                if len(content) > MAX_IMPORT_BYTES:
                    self._send_json(413, {'code': 1, 'msg': '上传文件不能超过 12 MB'})
                    return
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
        if parsed.path.startswith('/api/admin/'):
            self._dispatch_content_admin('POST', parsed, self._read_body())
            return
        self._send_json(404, {'code': 1, 'msg': 'not found'})

    def do_PATCH(self):
        parsed = urllib.parse.urlsplit(self.path)
        if parsed.path.startswith('/api/admin/'):
            self._dispatch_content_admin('PATCH', parsed, self._read_body())
            return
        self._send_json(404, {'code': 1, 'msg': 'not found'})

    def do_DELETE(self):
        parsed = urllib.parse.urlsplit(self.path)
        if parsed.path.startswith('/api/admin/'):
            self._dispatch_content_admin('DELETE', parsed, self._read_body())
            return
        self._send_json(404, {'code': 1, 'msg': 'not found'})

    def log_message(self, *args):
        pass


class LocalThreadingServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


with LocalThreadingServer((HOST, PORT), NoCacheHandler) as httpd:
    print(f'serving on http://{HOST}:{PORT} (no-cache, HOST={HOST})', flush=True)
    if ADMIN_TOKEN:
        print('admin import auth: KAOYAN_ADMIN_TOKEN enabled', flush=True)
    else:
        print('admin import auth: loopback only (set KAOYAN_ADMIN_TOKEN to require token)', flush=True)
    httpd.serve_forever()
