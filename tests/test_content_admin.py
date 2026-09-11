# -*- coding: utf-8 -*-
"""院校内容后台核心流程测试（使用临时数据库，不改正式数据）。"""
import base64
import io
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

        print('== 点击统计总览 ==')
        first_click = admin.record_public_click({
            'page_path': '/index.html', 'page_title': '择校首页',
            'target_type': 'button', 'target_label': '查看院校', 'target_path': '/index.html'
        })
        admin.record_public_click({
            'page_path': '/真题备考区.html', 'page_title': '真题备考区',
            'target_type': 'link', 'target_label': '领取真题资料', 'target_path': 'pan.baidu.com/example'
        })
        ignored_click = admin.record_public_click({
            'page_path': '/数据库/admin.html', 'page_title': '后台',
            'target_type': 'button', 'target_label': '保存'
        })
        check('公开页有效点击可以写入且后台点击被忽略', first_click.get('recorded') and not ignored_click.get('recorded'))
        status, body, _ = call('GET', '/api/admin/analytics/summary', headers={'Cookie': cookie})
        analytics = body.get('data', {})
        check('总览返回累计、日、周、月点击', status == 200 and analytics.get('metrics') == {
            'total': 2, 'today': 2, 'week': 2, 'month': 2
        })
        check('总览返回14日趋势与热门页面', len(analytics.get('daily', [])) == 14 and len(analytics.get('top_pages', [])) == 2)
        status, _, _ = call('GET', '/api/admin/analytics/summary')
        check('未登录无法读取点击统计', status == 401)

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
        conn = sqlite3.connect(admin.DB_PATH)
        try:
            last_action = conn.execute(
                'SELECT action FROM content_audit_logs WHERE object_type=? AND object_id=? ORDER BY id DESC LIMIT 1',
                ('school_content_module', module_id),
            ).fetchone()[0]
        finally:
            conn.close()
        check('模块发布记录使用明确的 publish 操作', last_action == 'publish')
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
        status, body, _ = call('GET', '/api/admin/schools', headers={'Cookie': cookie})
        managed_school = body.get('data', {}).get('items', [{}])[0]
        check('院校管理返回模块总数与发布状态', status == 200 and managed_school.get('module_count') == 2
              and managed_school.get('published_count') == 1 and managed_school.get('draft_count') == 1)
        conn = sqlite3.connect(admin.DB_PATH)
        try:
            conn.execute('INSERT OR IGNORE INTO admin_user_schools(user_id,school_id) VALUES(?,?)', (1, 1))
            conn.commit()
        finally:
            conn.close()
        limited_schools = admin.list_schools({'role': 'school_editor', 'user_id': 1})
        check('院校编辑账号只返回授权院校及其模块统计', len(limited_schools) == 1
              and limited_schools[0].get('module_count') == 2)

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

        editor_session = {'role': 'school_editor', 'user_id': 1}
        denied_actions = [
            ('读取全局模块', lambda: admin.list_global_modules(editor_session, 'exam_resources')),
            ('创建全局模块', lambda: admin.create_global_module(
                editor_session, 'exam_resources', {'type': 'link', 'title': '越权内容'}, '127.0.0.1'
            )),
            ('更新全局模块', lambda: admin.update_global_module(
                editor_session, exam_link_id, {'title': '越权修改'}, '127.0.0.1'
            )),
            ('删除全局模块', lambda: admin.delete_global_module(editor_session, exam_link_id, '127.0.0.1')),
            ('重排全局模块', lambda: admin.reorder_global_modules(
                editor_session, 'exam_resources', [exam_video_id, exam_link_id], '127.0.0.1'
            )),
            ('发布全局模块', lambda: admin.set_global_publish_state(
                editor_session, exam_link_id, 'published', '127.0.0.1'
            )),
        ]
        for label, action in denied_actions:
            try:
                action()
                denied = False
            except PermissionError:
                denied = True
            check(f'院校编辑无权{label}', denied)

        print('== 热度榜 Excel 导入 ==')
        import openpyxl
        conn = sqlite3.connect(admin.DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            catalog = admin.heat_rankings._school_catalog(conn)
        finally:
            conn.close()
        campus_match = admin.heat_rankings._match_school('华北电力大学', catalog)
        campus_candidates = {item['name'] for item in campus_match.get('candidates', [])}
        check('华北电力大学触发北京/保定人工确认', campus_match.get('status') == 'ambiguous'
              and campus_candidates == {'华北电力大学（北京）', '华北电力大学（保定）'})
        school_names = [item['name'] for item in catalog[:20]]
        workbook = openpyxl.Workbook()
        workbook.remove(workbook.active)
        sheet_defs = [
            ('总热度榜', ['总排名', '招生单位', '热度值', '高校类型'], '985院校'),
            ('985热度榜', ['排名', '招生单位', '热度值', '总排名'], None),
            ('211热度榜', ['排名', '招生单位', '热度值', '总排名'], None),
            ('普通院校热度榜', ['排名', '招生单位', '热度值', '总排名'], None),
        ]
        for sheet_name, headers, source_tier in sheet_defs:
            sheet = workbook.create_sheet(sheet_name)
            sheet.append(headers)
            for rank, school_name in enumerate(school_names, start=1):
                sheet.append([rank, school_name, 100 - rank, source_tier if source_tier else rank])
        output = io.BytesIO()
        workbook.save(output)
        workbook.close()
        encoded = base64.b64encode(output.getvalue()).decode('ascii')
        status, body, _ = call('POST', '/api/admin/heat-rankings/preview', {
            'period': '2026-08', 'filename': '8月热度榜单.xlsx', 'base64': encoded
        }, auth)
        preview = body.get('data', {})
        check('可解析四张榜单并生成80条预览', status == 200 and preview.get('summary', {}).get('rows') == 80)
        publish_groups = []
        for group in preview.get('groups', []):
            publish_groups.append({'scope': group['scope'], 'items': [{
                'rank': item['rank'], 'source_school_name': item['source_school_name'],
                'school_name': item['match']['school_name'], 'heat': item['heat'],
                'total_rank': item['total_rank'], 'source_tier': item['source_tier'],
            } for item in group['items']]})
        status, body, _ = call('POST', '/api/admin/heat-rankings/publish', {
            'period': preview.get('period'), 'filename': preview.get('filename'), 'groups': publish_groups
        }, auth)
        check('确认匹配后可发布四组前20名', status == 200 and body.get('data', {}).get('rows') == 80)
        public_heat = admin.public_heat_rankings('', 'all', 10)
        check('首页接口只返回最新总榜前10名', public_heat.get('period') == '202608' and len(public_heat.get('items', [])) == 10)

        print('== 图片与链接安全 ==')
        png = b'\x89PNG\r\n\x1a\n' + b'test-image-data'
        status, body, _ = call('POST', '/api/admin/media/upload', {
            'kind': 'qr_code', 'base64': base64.b64encode(png).decode('ascii')
        }, auth)
        check('可以上传群二维码图片', status == 201 and body['data']['url'].endswith('.png'))
        uploaded_url = body.get('data', {}).get('url')
        status, body, _ = call('GET', '/api/admin/site-media', headers={'Cookie': cookie})
        check('媒体资源返回两个二维码与两个海报槽位', status == 200 and len(body.get('data', {}).get('items', [])) == 4)
        status, body, _ = call('PATCH', '/api/admin/site-media/home_qr_27', {
            'title': '27考研测试群', 'image_url': uploaded_url, 'link_url': '', 'enabled': True
        }, auth)
        check('首页二维码可替换并立即发布', status == 200 and body.get('data', {}).get('image_url') == uploaded_url)
        public_media = admin.public_site_media()
        check('公开媒体接口读取已发布首页资源', any(
            item['slot_key'] == 'home_qr_27' and item['title'] == '27考研测试群' for item in public_media
        ))
        status, body, _ = call('GET', '/api/admin/course-resources', headers={'Cookie': cookie})
        resource_items = body.get('data', {}).get('items', [])
        check('后台返回九个资料与课程配置槽位', status == 200 and len(resource_items) == 9)
        status, body, _ = call('PATCH', '/api/admin/course-resources/baodian_s', {
            'title': '新版宝典S', 'description': '新版资料说明',
            'cover_url': uploaded_url, 'images': [uploaded_url, '/uploads/content/detail.png'], 'enabled': True
        }, auth)
        updated_resource = body.get('data', {})
        check('资料卡封面和整组图库可替换', status == 200 and updated_resource.get('title') == '新版宝典S'
              and updated_resource.get('images') == [uploaded_url, '/uploads/content/detail.png'])
        public_resources = admin.public_course_resources()
        check('资料课程配置发布后同步到公开接口', any(
            item['slot_key'] == 'baodian_s' and item['cover_url'] == uploaded_url for item in public_resources
        ))
        status, _, _ = call('PATCH', '/api/admin/course-resources/baodian_s', {
            'images': [], 'enabled': True
        }, auth)
        check('展示中的资料卡不允许空图库', status == 400)
        try:
            admin.list_course_resources({'role': 'school_editor', 'user_id': 1})
            resource_denied = False
        except PermissionError:
            resource_denied = True
        check('院校编辑账号无权配置全站资料课程', resource_denied)
        status, body, _ = call('POST', '/api/admin/media/video-preview', {
            'url': 'http://127.0.0.1/private-video'
        }, auth)
        check('视频封面抓取阻止内网地址', status == 400 and '内网' in body.get('msg', ''))

        redirect_blocked = False
        try:
            admin._ValidatingRedirectHandler().redirect_request(
                admin.urllib.request.Request('https://example.com/video'),
                None, 302, 'Found', {}, 'http://127.0.0.1/internal-service'
            )
        except ValueError as error:
            redirect_blocked = '内网' in str(error)
        check('HTTP 跳转在请求内网前被阻止', redirect_blocked)

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
                mock.patch.object(admin, '_open_public_url', side_effect=fake_responses):
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

        print('== 发布记录 ==')
        status, body, _ = call('GET', '/api/admin/audit-logs', headers={'Cookie': cookie}, query={'page_size': '100'})
        audit_items = body.get('data', {}).get('items', [])
        check('发布记录接口返回模块、媒体与榜单操作', status == 200
              and any(item['object_type'] == 'school_content_module' and item['action'] == 'publish' for item in audit_items)
              and any(item['object_type'] == 'site_media_slot' and item['action'] == 'publish' for item in audit_items)
              and any(item['object_type'] == 'course_resource_slot' and item['action'] == 'publish' for item in audit_items)
              and any(item['object_type'] == 'heat_ranking_batch' and item['action'] == 'publish' for item in audit_items))
        status, body, _ = call('GET', '/api/admin/audit-logs', headers={'Cookie': cookie}, query={'object_type': 'site_media_slot'})
        check('发布记录支持按内容类型筛选', status == 200 and body.get('data', {}).get('total') == 1)

    admin.DB_PATH = previous_db
    admin.UPLOAD_DIR = previous_upload
    admin._SESSIONS.clear()
    print(f'\n{PASS} passed, {FAIL} failed')
    return 1 if FAIL else 0


if __name__ == '__main__':
    raise SystemExit(main())
