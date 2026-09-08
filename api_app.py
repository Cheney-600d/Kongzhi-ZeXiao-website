# -*- coding: utf-8 -*-
"""生产环境 API 入口（FastAPI + Uvicorn）。

用法：
    uvicorn api_app:app --host 0.0.0.0 --port 8000

静态文件建议交给 Nginx，本应用提供 /api/* JSON 接口和后台导入接口。
"""
import base64
import binascii
import datetime
import hmac
import json
import os
import pathlib
import re
import sys

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response

BASE_DIR = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR / '数据库'))

import api as admission_api  # noqa: E402
import db_config  # noqa: E402
import import_admission  # noqa: E402
import import_content  # noqa: E402
import import_subjects  # noqa: E402
import content_admin  # noqa: E402

ADMIN_TOKEN = os.environ.get('KAOYAN_ADMIN_TOKEN', '').strip()
MAX_IMPORT_BYTES = 12 * 1024 * 1024
MAX_IMPORT_BODY_BYTES = 17 * 1024 * 1024

app = FastAPI(title='控制考研择校网站 API', version='1.0.0')


@app.get('/')
def root():
    return {'ok': True, 'service': 'kaoyan-site-api'}


@app.get('/api/health')
def health():
    """供 Nginx、systemd 和云平台探活使用，不触碰业务数据。"""
    return {'code': 0, 'data': {'status': 'ok', 'service': 'kaoyan-site-api'}}


@app.post('/api/analytics/click')
async def analytics_click(request: Request):
    raw = await request.body()
    if len(raw) > 4096:
        return JSONResponse({'code': 1, 'msg': '请求内容过大'}, status_code=400)
    try:
        payload = json.loads(raw.decode('utf-8'))
        return JSONResponse(
            {'code': 0, 'data': content_admin.record_public_click(payload)},
            status_code=201,
        )
    except (ValueError, TypeError, json.JSONDecodeError) as exc:
        return JSONResponse({'code': 1, 'msg': str(exc)}, status_code=400)


@app.get('/api/{path:path}')
async def api_route(path: str, request: Request):
    full_path = '/api/' + path
    params = dict(request.query_params)
    if full_path == '/api/school-content':
        return {'code': 0, 'data': {'items': content_admin.public_modules(params.get('school', ''))}}
    if full_path == '/api/exam-resources':
        return {'code': 0, 'data': {'items': content_admin.public_global_modules('exam_resources')}}
    if full_path == '/api/site-media':
        return {'code': 0, 'data': {'items': content_admin.public_site_media()}}
    if full_path == '/api/heat-rankings':
        try:
            data = content_admin.public_heat_rankings(
                params.get('period', ''), params.get('scope', 'all'), params.get('limit', 20)
            )
            return {'code': 0, 'data': data}
        except ValueError as exc:
            return JSONResponse({'code': 1, 'msg': str(exc)}, status_code=400)
    match = re.fullmatch(r'/api/schools/([^/]+)/content-modules', full_path)
    if match:
        return {'code': 0, 'data': {'items': content_admin.public_modules(match.group(1))}}
    if full_path.startswith('/api/admin/'):
        status, payload, headers = content_admin.dispatch(
            'GET', full_path, params, request.headers, b'', request.client.host if request.client else ''
        )
        return JSONResponse(payload, status_code=status, headers=headers)
    status, body, _ctype = admission_api.dispatch(full_path, params)
    return Response(content=body, status_code=status, media_type='application/json; charset=utf-8')


@app.post('/api/admin/import-admission')
async def admin_import(request: Request):
    # 生产入口不允许无 Token 暴露高权限导入接口。
    if not ADMIN_TOKEN:
        return JSONResponse(
            {'code': 1, 'msg': '服务器未配置 KAOYAN_ADMIN_TOKEN，导入接口已禁用'},
            status_code=503,
        )
    supplied_token = request.headers.get('X-Admin-Token', '')
    if not supplied_token or not hmac.compare_digest(supplied_token, ADMIN_TOKEN):
        return JSONResponse({'code': 1, 'msg': 'unauthorized'}, status_code=401)

    try:
        try:
            body_length = int(request.headers.get('Content-Length', '0'))
        except ValueError:
            return JSONResponse({'code': 1, 'msg': 'Content-Length 无效'}, status_code=400)
        if body_length < 0:
            return JSONResponse({'code': 1, 'msg': 'Content-Length 无效'}, status_code=400)
        if body_length > MAX_IMPORT_BODY_BYTES:
            return JSONResponse({'code': 1, 'msg': '上传文件不能超过 12 MB'}, status_code=413)
        raw = await request.body()
        if len(raw) > MAX_IMPORT_BODY_BYTES:
            return JSONResponse({'code': 1, 'msg': '上传文件不能超过 12 MB'}, status_code=413)
        req = json.loads(raw.decode('utf-8'))
        filename = os.path.basename(str(req.get('filename', 'upload.xlsx')))
        if not filename.lower().endswith('.xlsx'):
            filename += '.xlsx'
        b64 = str(req.get('base64', ''))
        if not b64:
            return JSONResponse({'code': 1, 'msg': '缺少 base64 文件内容'}, status_code=400)
        try:
            content = base64.b64decode(b64, validate=True)
        except (binascii.Error, ValueError) as exc:
            raise ValueError('Base64 文件内容无效') from exc
        if len(content) > MAX_IMPORT_BYTES:
            return JSONResponse({'code': 1, 'msg': '上传文件不能超过 12 MB'}, status_code=413)
        raw_dir = pathlib.Path(
            os.environ.get('KAOYAN_RAW_DIR', '') or BASE_DIR / '数据库' / 'raw'
        ).expanduser().resolve()
        raw_dir.mkdir(parents=True, exist_ok=True)
        stamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        save_path = raw_dir / f'{stamp}_{filename}'
        save_path.write_bytes(content)

        if db_config.is_mysql():
            info = import_admission.import_mysql_from_config(save_path)
            try:
                subj_info = import_subjects.import_subjects_to_mysql()
            except Exception as e:
                subj_info = {'error': str(e)}
            try:
                content_info = import_content.import_content_to_mysql()
            except Exception as e:
                content_info = {'error': str(e)}
        else:
            info = import_admission.import_excel_to_db(save_path, write_csv=False)
            try:
                subj_info = import_subjects.import_subjects_to_db(write_csv=False)
            except Exception as e:
                subj_info = {'error': str(e)}
            try:
                content_info = import_content.import_content_to_db(write_csv=False)
            except Exception as e:
                content_info = {'error': str(e)}

        return {
            'code': 0,
            'data': {
                'records': info['records'],
                'schools': info['schools'],
                'majors': info['majors'],
                'saved_as': save_path.name,
                'subjects': subj_info,
                'content': content_info,
            },
        }
    except Exception as e:
        return JSONResponse({'code': 1, 'msg': str(e)}, status_code=400)


@app.api_route('/api/admin/{path:path}', methods=['POST', 'PATCH', 'DELETE'])
async def content_admin_route(path: str, request: Request):
    full_path = '/api/admin/' + path
    raw = await request.body()
    status, payload, headers = content_admin.dispatch(
        request.method,
        full_path,
        dict(request.query_params),
        request.headers,
        raw,
        request.client.host if request.client else '',
    )
    return JSONResponse(payload, status_code=status, headers=headers)
