# -*- coding: utf-8 -*-
"""院校内容后台核心流程测试（使用临时数据库，不改正式数据）。"""
import base64
import json
import os
import pathlib
import sqlite3
import sys
import tempfile
from unittest import mock

REPO = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / '数据库'))

import content_admin as admin  # noqa: E402

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


def call(method, path, body=None, headers=None, query=None):
    raw = json.dumps(body or {}, ensure_ascii=False).encode('utf-8') if method in ('POST', 'PATCH', 'DELETE') else b''
    return admin.dispatch(method, path, query or {}, headers or {}, raw, '127.0.0.1')


def main():
    global PASS, FAIL
    previous_db = admin.DB_PATH
    previous_upload = admin.UPLOAD_DIR
    with tempfile.TemporaryDirectory() as folder:
        temp_root = pathlib.Path(folder)
        admin.DB_PATH = temp_root / 'admission.db'
        admin.UPLOAD_DIR = temp_root / 'uploads'
        admin._SESSIONS.clear()
        conn = sqlite3.connect(admin.DB_PATH)
        try:
            conn.execute(
                'CREATE TABLE schools(id INTEGER PRIMARY KEY, name TEXT NOT NULL, province TEXT, tier TEXT, logo_url TEXT)'
            )
            conn.execute(
                'INSERT INTO schools(id,name,province,tier,logo_url) VALUES(?,?,?,?,?)',
                (1, '测试大学', '浙江', '双一流', ''),
            )
            conn.commit()
        finally:
            conn.close()
        admin.init_db()

        print('== 登录与会话 ==')
        status, body, _ = call('POST', '/api/admin/login', {'username': 'admin', 'password': 'wrong'})
        check('错误密码 → 401', status == 401)
        status, body, extra = call('POST', '/api/admin/login', {'username': 'admin', 'password': 'admin123'})
        check('默认管理员可以登录', status == 200 and body['data']['user']['role'] == 'super_admin')
        cookie = extra.get('Set-Cookie', '').split(';', 1)[0]
        csrf = body['data']['csrf_token']
        auth = {'Cookie': cookie, 'X-CSRF-Token': csrf}
        status, body, _ = call('GET', '/api/admin/me', headers={'Cookie': cookie})
        check('会话可读取', status == 200 and body['data']['user']['username'] == 'admin')
        status, body, _ = call('GET', '/api/admin/schools', headers={'Cookie': cookie})
        check('管理员可读取院校', status == 200 and body['data']['items'][0]['name'] == '测试大学')

        print('== 模块 CRUD 与发布 ==')
        status, body, _ = call('POST', '/api/admin/schools/1/modules', {
            'type': 'video',
            'title': '测试视频',
            'description': '用于验证视频模块',
            'link_url': 'https://www.bilibili.com/video/BV1xx',
            'cover_url': '/uploads/content/cover.png',
            'config': {'platform': '哔哩哔哩', 'cta': '立即观看'},
        }, auth)
        module_id = body.get('data', {}).get('id')
        check('可以新增视频模块', status == 201 and module_id)
        check('草稿不出现在公开接口', admin.public_modules('测试大学') == [])

        status, body, _ = call('PATCH', f'/api/admin/modules/{module_id}', {
            'title': '更新后的视频标题',
        }, auth)
        check('可以自动保存编辑内容', status == 200 and body['data']['title'] == '更新后的视频标题')
        status, body, _ = call('POST', f'/api/admin/modules/{module_id}/publish', {}, auth)
        check('可以发布模块', status == 200 and body['data']['status'] == 'published')
        public_items = admin.public_modules('测试大学')
        check('已发布模块出现在院校页接口', len(public_items) == 1 and public_items[0]['id'] == module_id)

        status, body, _ = call('POST', '/api/admin/schools/1/modules', {
            'type': 'link', 'title': '学院官网', 'link_url': 'https://example.com'
        }, auth)
        second_id = body.get('data', {}).get('id')
        status, body, _ = call('POST', '/api/admin/modules/reorder', {
            'school_id': 1, 'ordered_ids': [second_id, module_id]
        }, auth)
        check('可以拖拽排序并持久化', status == 200 and [x['id'] for x in body['data']['items']] == [second_id, module_id])

        print('== 真题备考区配置 ==')
        status, body, _ = call('POST', '/api/admin/global-modules', {
            'section_key': 'exam_resources', 'type': 'link', 'title': '领取真题资料',
            'link_url': 'https://pan.baidu.com/s/example', 'config': {'cta': '领取资料'}
        }, auth)
        exam_link_id = body.get('data', {}).get('id')
        check('可以新增百度云资料模块', status == 201 and exam_link_id)
        status, body, _ = call('POST', '/api/admin/global-modules', {
            'section_key': 'exam_resources', 'type': 'video', 'title': '真题配套讲解',
            'link_url': 'https://www.bilibili.com/video/BV1xx',
            'config': {'video_items': [
                {'url': 'https://www.bilibili.com/video/BV1xx', 'title': '第一讲', 'platform': '哔哩哔哩'},
                {'url': 'https://www.bilibili.com/video/BV2yy', 'title': '第二讲', 'platform': '哔哩哔哩'},
            ]}
        }, auth)
        exam_video_id = body.get('data', {}).get('id')
        check('可以新增真题讲解视频模块', status == 201 and exam_video_id)
        check('真题讲解支持保存视频列表', len(body.get('data', {}).get('config', {}).get('video_items', [])) == 2)
        status, body, _ = call('POST', f'/api/admin/global-modules/{exam_link_id}/publish', {}, auth)
        check('可以发布真题资料模块', status == 200 and body['data']['status'] == 'published')
        public_exam = admin.public_global_modules('exam_resources')
        check('公开真题接口只返回已发布模块', [item['id'] for item in public_exam] == [exam_link_id])
        status, body, _ = call('POST', '/api/admin/global-modules/reorder', {
            'section_key': 'exam_resources', 'ordered_ids': [exam_video_id, exam_link_id]
        }, auth)
        check('真题模块排序可持久化', status == 200 and [x['id'] for x in body['data']['items']] == [exam_video_id, exam_link_id])

        print('== 图片与链接安全 ==')
        png = b'\x89PNG\r\n\x1a\n' + b'test-image-data'
        status, body, _ = call('POST', '/api/admin/media/upload', {
            'kind': 'qr_code', 'base64': base64.b64encode(png).decode('ascii')
        }, auth)
        check('可以上传群二维码图片', status == 201 and body['data']['url'].endswith('.png'))
        status, body, _ = call('POST', '/api/admin/media/video-preview', {
            'url': 'http://127.0.0.1/private-video'
        }, auth)
        check('视频封面抓取阻止内网地址', status == 400 and '内网' in body.get('msg', ''))

        fake_dns = [(admin.socket.AF_INET, admin.socket.SOCK_STREAM, 6, '', ('198.18.0.26', 443))]

        class FakeResponse:
            def __init__(self, url, data):
                self.url = url
                self.data = data

            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def geturl(self):
                return self.url

            def read(self, limit=-1):
                return self.data if limit < 0 else self.data[:limit]

        bili_payload = json.dumps({'code': 0, 'data': {
            'bvid': 'BV1x1KD6KEwq',
            'title': '上海交通大学章节重点划分',
            'pic': 'http://i0.hdslb.com/bfs/archive/test.jpg',
            'duration': 2758,
        }}, ensure_ascii=False).encode('utf-8')
        fake_jpeg = b'\xff\xd8\xff\xe0' + b'test-bilibili-cover'
        fake_responses = [
            FakeResponse('https://api.bilibili.com/x/web-interface/view?bvid=BV1x1KD6KEwq', bili_payload),
            FakeResponse('https://i0.hdslb.com/bfs/archive/test.jpg', fake_jpeg),
        ]
        with mock.patch.object(admin.socket, 'getaddrinfo', return_value=fake_dns), \
                mock.patch.object(admin.urllib.request, 'urlopen', side_effect=fake_responses):
            status, body, _ = call('POST', '/api/admin/media/video-preview', {
                'url': 'https://www.bilibili.com/video/BV1x1KD6KEwq/?spm_id_from=333.1387.search'
            }, auth)
        preview = body.get('data', {})
        check('代理环境下可获取 B 站视频标题和封面', status == 200 and preview.get('platform') == '哔哩哔哩'
              and preview.get('duration') == '45:58' and preview.get('cover_url', '').endswith('.jpg'))

        blocked_untrusted = False
        with mock.patch.object(admin.socket, 'getaddrinfo', return_value=fake_dns):
            try:
                admin._validate_public_url('https://example.com/video')
            except ValueError as error:
                blocked_untrusted = '内网' in str(error)
        check('代理保留地址不会对非可信域名放行', blocked_untrusted)

        status, _, _ = call('DELETE', f'/api/admin/modules/{second_id}', {}, auth)
        check('可以删除草稿模块', status == 200)
        status, _, _ = call('DELETE', f'/api/admin/global-modules/{exam_video_id}', {}, auth)
        check('可以删除真题草稿模块', status == 200)

        print('== 生产环境凭据与 Cookie ==')
        with mock.patch.dict(os.environ, {
            'KAOYAN_ADMIN_USER': 'cloud-admin',
            'KAOYAN_ADMIN_PASSWORD': 'cloud-password-for-test',
            'KAOYAN_COOKIE_SECURE': '1',
        }):
            status, body, extra = call('POST', '/api/admin/login', {
                'username': 'cloud-admin', 'password': 'cloud-password-for-test'
            })
            check('环境变量可覆盖已有默认管理员', status == 200 and body['data']['user']['username'] == 'cloud-admin')
            check('HTTPS 模式设置 Secure Cookie', '; Secure' in extra.get('Set-Cookie', ''))

    admin.DB_PATH = previous_db
    admin.UPLOAD_DIR = previous_upload
    admin._SESSIONS.clear()
    print(f'\n{PASS} passed, {FAIL} failed')
    return 1 if FAIL else 0


if __name__ == '__main__':
    raise SystemExit(main())
