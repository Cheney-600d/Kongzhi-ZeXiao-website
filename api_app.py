# -*- coding: utf-8 -*-
"""生产环境 API 入口（FastAPI + Uvicorn）。

用法：
    uvicorn api_app:app --host 0.0.0.0 --port 8000

静态文件建议交给 Nginx，本应用提供 /api/* JSON 接口和后台导入接口。
"""
import base64
import datetime
import json
import os
import pathlib
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

ADMIN_TOKEN = os.environ.get('KAOYAN_ADMIN_TOKEN', '').strip()

app = FastAPI(title='控制考研择校网站 API', version='1.0.0')


@app.get('/')
def root():
    return {'ok': True, 'service': 'kaoyan-site-api'}


@app.get('/api/{path:path}')
async def api_route(path: str, request: Request):
    full_path = '/api/' + path
    params = dict(request.query_params)
    status, body, _ctype = admission_api.dispatch(full_path, params)
    return Response(content=body, status_code=status, media_type='application/json; charset=utf-8')


@app.post('/api/admin/import-admission')
async def admin_import(request: Request):
    # 鉴权：设置 KAOYAN_ADMIN_TOKEN 后必须携带 X-Admin-Token
    if ADMIN_TOKEN and request.headers.get('X-Admin-Token', '') != ADMIN_TOKEN:
        return JSONResponse({'code': 1, 'msg': 'unauthorized'}, status_code=401)

    try:
        req = await request.json()
        filename = os.path.basename(str(req.get('filename', 'upload.xlsx')))
        if not filename.lower().endswith('.xlsx'):
            filename += '.xlsx'
        b64 = str(req.get('base64', ''))
        if not b64:
            return JSONResponse({'code': 1, 'msg': '缺少 base64 文件内容'}, status_code=400)
        content = base64.b64decode(b64)
        raw_dir = BASE_DIR / '数据库' / 'raw'
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
            info = import_admission.import_excel_to_db(save_path, write_csv=True)
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
