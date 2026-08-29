# -*- coding: utf-8 -*-
"""院校内容运营：本地管理员会话、模块 CRUD、媒体上传与公开视频元数据。"""
from __future__ import annotations

import base64
import datetime as dt
import hashlib
import hmac
import html.parser
import ipaddress
import json
import mimetypes
import os
import pathlib
import re
import secrets
import socket
import sqlite3
import threading
import urllib.parse
import urllib.request
from http.cookies import SimpleCookie


BASE_DIR = pathlib.Path(__file__).resolve().parent.parent
DB_PATH = pathlib.Path(os.environ.get('KAOYAN_SQLITE_PATH', '') or BASE_DIR / '数据库' / 'admission.db').expanduser().resolve()
UPLOAD_DIR = pathlib.Path(os.environ.get('KAOYAN_UPLOAD_DIR', '') or BASE_DIR / 'uploads' / 'content').expanduser().resolve()
COOKIE_NAME = 'kaoyan_admin_session'
SESSION_TTL = dt.timedelta(hours=8)
MAX_IMAGE_BYTES = 5 * 1024 * 1024
PBKDF2_ROUNDS = 240_000
TRUSTED_MEDIA_HOSTS = ('bilibili.com', 'b23.tv', 'hdslb.com', 'biliimg.com')
PROXY_FAKE_IP_RANGES = (ipaddress.ip_network('198.18.0.0/15'),)

_SESSIONS: dict[str, dict] = {}
_LOCK = threading.RLock()
_ADMIN_ENV_SYNC_KEY: tuple[str, str, str] | None = None


def _now() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()


class _AutoClosingConnection(sqlite3.Connection):
    """提交或回滚后立即关闭，避免 Windows 下长期占用数据库文件。"""

    def __exit__(self, exc_type, exc_value, traceback):
        try:
            return super().__exit__(exc_type, exc_value, traceback)
        finally:
            self.close()


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=20, factory=_AutoClosingConnection)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys = ON')
    return conn


def _hash_password(password: str, salt: bytes | None = None) -> tuple[str, str]:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, PBKDF2_ROUNDS)
    return salt.hex(), digest.hex()


def _verify_password(password: str, salt_hex: str, digest_hex: str) -> bool:
    _salt, candidate = _hash_password(password, bytes.fromhex(salt_hex))
    return hmac.compare_digest(candidate, digest_hex)


def init_db() -> None:
    global _ADMIN_ENV_SYNC_KEY
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    with _LOCK, _connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS admin_users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              username TEXT NOT NULL UNIQUE,
              password_salt TEXT NOT NULL,
              password_hash TEXT NOT NULL,
              display_name TEXT NOT NULL,
              role TEXT NOT NULL DEFAULT 'school_editor',
              status TEXT NOT NULL DEFAULT 'active',
              last_login_at TEXT,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS admin_user_schools (
              user_id INTEGER NOT NULL,
              school_id INTEGER NOT NULL,
              PRIMARY KEY (user_id, school_id),
              FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE,
              FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS media_assets (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              kind TEXT NOT NULL,
              storage_key TEXT NOT NULL UNIQUE,
              mime_type TEXT NOT NULL,
              size_bytes INTEGER NOT NULL,
              source_url TEXT,
              checksum TEXT NOT NULL,
              created_by INTEGER,
              created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS school_content_modules (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              school_id INTEGER NOT NULL,
              type TEXT NOT NULL,
              title TEXT NOT NULL,
              description TEXT NOT NULL DEFAULT '',
              link_url TEXT NOT NULL DEFAULT '',
              cover_url TEXT NOT NULL DEFAULT '',
              cover_asset_id INTEGER,
              config_json TEXT NOT NULL DEFAULT '{}',
              sort_order INTEGER NOT NULL DEFAULT 0,
              status TEXT NOT NULL DEFAULT 'draft',
              publish_at TEXT,
              unpublish_at TEXT,
              updated_by INTEGER,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
              FOREIGN KEY (cover_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL
            );
            CREATE INDEX IF NOT EXISTS idx_school_content_public
              ON school_content_modules(school_id, status, sort_order);
            CREATE TABLE IF NOT EXISTS global_content_modules (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              section_key TEXT NOT NULL,
              type TEXT NOT NULL,
              title TEXT NOT NULL,
              description TEXT NOT NULL DEFAULT '',
              link_url TEXT NOT NULL DEFAULT '',
              cover_url TEXT NOT NULL DEFAULT '',
              cover_asset_id INTEGER,
              config_json TEXT NOT NULL DEFAULT '{}',
              sort_order INTEGER NOT NULL DEFAULT 0,
              status TEXT NOT NULL DEFAULT 'draft',
              publish_at TEXT,
              unpublish_at TEXT,
              updated_by INTEGER,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              FOREIGN KEY (cover_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL
            );
            CREATE INDEX IF NOT EXISTS idx_global_content_public
              ON global_content_modules(section_key, status, sort_order);
            CREATE TABLE IF NOT EXISTS content_audit_logs (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER,
              school_id INTEGER,
              object_type TEXT NOT NULL,
              object_id INTEGER,
              action TEXT NOT NULL,
              change_json TEXT NOT NULL DEFAULT '{}',
              request_ip TEXT,
              created_at TEXT NOT NULL
            );
            """
        )
        env_username = os.environ.get('KAOYAN_ADMIN_USER')
        env_password = os.environ.get('KAOYAN_ADMIN_PASSWORD')
        if (env_username is None) != (env_password is None):
            raise RuntimeError('KAOYAN_ADMIN_USER 与 KAOYAN_ADMIN_PASSWORD 必须同时配置')

        # 云端可以用环境变量覆盖仓库内已有数据库的默认管理员，而不必手改 SQLite。
        if env_username is not None and env_password is not None:
            username = env_username.strip()
            password = env_password
            if not username or not password:
                raise RuntimeError('后台管理员用户名和密码不能为空')
            sync_key = (str(DB_PATH), username, hashlib.sha256(password.encode('utf-8')).hexdigest())
            row = conn.execute('SELECT * FROM admin_users WHERE username=?', (username,)).fetchone()
            if _ADMIN_ENV_SYNC_KEY == sync_key and row and row['status'] == 'active' and row['role'] == 'super_admin':
                row = None
                credentials_already_synced = True
            else:
                credentials_already_synced = False
            if not row:
                if not credentials_already_synced:
                    row = conn.execute(
                        "SELECT * FROM admin_users WHERE role='super_admin' ORDER BY id LIMIT 1"
                    ).fetchone()
            now = _now()
            if row:
                password_matches = _verify_password(password, row['password_salt'], row['password_hash'])
                if row['username'] != username or not password_matches or row['status'] != 'active' or row['role'] != 'super_admin':
                    salt, digest = _hash_password(password)
                    conn.execute(
                        'UPDATE admin_users SET username=?,password_salt=?,password_hash=?,role=?,status=?,updated_at=? WHERE id=?',
                        (username, salt, digest, 'super_admin', 'active', now, row['id']),
                    )
            elif not credentials_already_synced:
                salt, digest = _hash_password(password)
                conn.execute(
                    'INSERT INTO admin_users(username,password_salt,password_hash,display_name,role,status,created_at,updated_at) '
                    'VALUES(?,?,?,?,?,?,?,?)',
                    (username, salt, digest, '内容管理员', 'super_admin', 'active', now, now),
                )
            _ADMIN_ENV_SYNC_KEY = sync_key
        elif not conn.execute('SELECT 1 FROM admin_users LIMIT 1').fetchone():
            username = 'admin'
            password = 'admin123'
            salt, digest = _hash_password(password)
            now = _now()
            conn.execute(
                'INSERT INTO admin_users(username,password_salt,password_hash,display_name,role,status,created_at,updated_at) '
                'VALUES(?,?,?,?,?,?,?,?)',
                (username, salt, digest, '内容管理员', 'super_admin', 'active', now, now),
            )
        _seed_demo_modules(conn)


def _seed_demo_modules(conn: sqlite3.Connection) -> None:
    school = conn.execute('SELECT id FROM schools WHERE name=?', ('浙江工业大学',)).fetchone()
    if not school:
        return
    school_id = int(school['id'])
    if conn.execute('SELECT 1 FROM school_content_modules WHERE school_id=? LIMIT 1', (school_id,)).fetchone():
        return
    now = _now()
    rows = [
        (
            school_id, 'video', '控制考研阿祖 · 院校信息更新',
            '持续更新控制类考研择校、专业课与复试经验。',
            'https://space.bilibili.com/589801594',
            '../专业课选择/images/平台图标/avatar_azhu.jpg',
            json.dumps({'platform': '哔哩哔哩', 'duration': '', 'cta': '查看视频主页'}, ensure_ascii=False),
            10, 'published', now, now,
        ),
        (
            school_id, 'qr_group', '2027考研交流群',
            '进群备注：报考方向 + 本科院校。', '', '',
            json.dumps({'cta': '扫码加入', 'expires_at': '2026-12-31'}, ensure_ascii=False),
            20, 'draft', now, now,
        ),
        (
            school_id, 'link', '学院招生信息',
            '招生目录、导师介绍、复试细则与最新通知。',
            'https://www.zjut.edu.cn/', '',
            json.dumps({'cta': '前往学院官网'}, ensure_ascii=False),
            30, 'published', now, now,
        ),
    ]
    conn.executemany(
        'INSERT INTO school_content_modules '
        '(school_id,type,title,description,link_url,cover_url,config_json,sort_order,status,created_at,updated_at) '
        'VALUES(?,?,?,?,?,?,?,?,?,?,?)',
        rows,
    )


def _json_body(raw: bytes) -> dict:
    if not raw:
        return {}
    value = json.loads(raw.decode('utf-8'))
    if not isinstance(value, dict):
        raise ValueError('请求体必须是 JSON 对象')
    return value


def _cookie_token(cookie_header: str) -> str:
    cookie = SimpleCookie()
    try:
        cookie.load(cookie_header or '')
    except Exception:
        return ''
    morsel = cookie.get(COOKIE_NAME)
    return morsel.value if morsel else ''


def get_session(headers) -> dict | None:
    token = _cookie_token(headers.get('Cookie', ''))
    if not token:
        return None
    with _LOCK:
        session = _SESSIONS.get(token)
        if not session:
            return None
        if session['expires_at'] <= dt.datetime.now(dt.timezone.utc):
            _SESSIONS.pop(token, None)
            return None
        return dict(session)


def login(username: str, password: str) -> tuple[dict, str]:
    init_db()
    with _connect() as conn:
        row = conn.execute('SELECT * FROM admin_users WHERE username=? AND status=?', (username, 'active')).fetchone()
        if not row or not _verify_password(password, row['password_salt'], row['password_hash']):
            raise PermissionError('用户名或密码错误')
        conn.execute('UPDATE admin_users SET last_login_at=?,updated_at=? WHERE id=?', (_now(), _now(), row['id']))
    token = secrets.token_urlsafe(32)
    csrf = secrets.token_urlsafe(24)
    session = {
        'token': token,
        'csrf': csrf,
        'user_id': int(row['id']),
        'username': row['username'],
        'display_name': row['display_name'],
        'role': row['role'],
        'expires_at': dt.datetime.now(dt.timezone.utc) + SESSION_TTL,
    }
    with _LOCK:
        _SESSIONS[token] = session
    return session, token


def logout(headers) -> None:
    token = _cookie_token(headers.get('Cookie', ''))
    if token:
        with _LOCK:
            _SESSIONS.pop(token, None)


def _require_session(method: str, headers) -> dict:
    session = get_session(headers)
    if not session:
        raise PermissionError('请先登录')
    if method not in ('GET', 'HEAD'):
        supplied = headers.get('X-CSRF-Token', '')
        if not supplied or not hmac.compare_digest(supplied, session['csrf']):
            raise PermissionError('CSRF 校验失败，请刷新后台后重试')
    return session


def _can_manage_school(conn: sqlite3.Connection, session: dict, school_id: int) -> bool:
    if session['role'] == 'super_admin':
        return True
    return bool(conn.execute(
        'SELECT 1 FROM admin_user_schools WHERE user_id=? AND school_id=?',
        (session['user_id'], school_id),
    ).fetchone())


def _module_dict(row: sqlite3.Row) -> dict:
    item = dict(row)
    try:
        item['config'] = json.loads(item.pop('config_json') or '{}')
    except json.JSONDecodeError:
        item['config'] = {}
        item.pop('config_json', None)
    return item


def list_schools(session: dict) -> list[dict]:
    with _connect() as conn:
        if session['role'] == 'super_admin':
            rows = conn.execute('SELECT id,name,province,tier FROM schools ORDER BY name').fetchall()
        else:
            rows = conn.execute(
                'SELECT s.id,s.name,s.province,s.tier FROM schools s '
                'JOIN admin_user_schools aus ON aus.school_id=s.id '
                'WHERE aus.user_id=? ORDER BY s.name',
                (session['user_id'],),
            ).fetchall()
    return [dict(r) for r in rows]


def list_modules(session: dict, school_id: int) -> list[dict]:
    with _connect() as conn:
        if not _can_manage_school(conn, session, school_id):
            raise PermissionError('没有该院校的管理权限')
        rows = conn.execute(
            'SELECT * FROM school_content_modules WHERE school_id=? ORDER BY sort_order,id',
            (school_id,),
        ).fetchall()
    return [_module_dict(r) for r in rows]


ALLOWED_TYPES = {'video', 'qr_group', 'image', 'link', 'rich_text'}
ALLOWED_STATUS = {'draft', 'published', 'archived'}


def _module_values(body: dict, existing: dict | None = None) -> dict:
    existing = existing or {}
    module_type = str(body.get('type', existing.get('type', 'link')))
    if module_type not in ALLOWED_TYPES:
        raise ValueError('不支持的模块类型')
    status = str(body.get('status', existing.get('status', 'draft')))
    if status not in ALLOWED_STATUS:
        raise ValueError('不支持的发布状态')
    title = str(body.get('title', existing.get('title', ''))).strip()
    if not title:
        raise ValueError('模块标题不能为空')
    config = body.get('config', existing.get('config', {}))
    if not isinstance(config, dict):
        raise ValueError('config 必须是对象')
    return {
        'type': module_type,
        'title': title[:160],
        'description': str(body.get('description', existing.get('description', '')))[:1000],
        'link_url': str(body.get('link_url', existing.get('link_url', '')))[:2000],
        'cover_url': str(body.get('cover_url', existing.get('cover_url', '')))[:2000],
        'config_json': json.dumps(config, ensure_ascii=False),
        'sort_order': int(body.get('sort_order', existing.get('sort_order', 0)) or 0),
        'status': status,
        'publish_at': body.get('publish_at', existing.get('publish_at')) or None,
        'unpublish_at': body.get('unpublish_at', existing.get('unpublish_at')) or None,
    }


def _audit(conn, session, school_id, object_id, action, change, request_ip):
    conn.execute(
        'INSERT INTO content_audit_logs(user_id,school_id,object_type,object_id,action,change_json,request_ip,created_at) '
        'VALUES(?,?,?,?,?,?,?,?)',
        (session['user_id'], school_id, 'school_content_module', object_id, action,
         json.dumps(change, ensure_ascii=False), request_ip, _now()),
    )


def create_module(session: dict, school_id: int, body: dict, request_ip: str) -> dict:
    values = _module_values(body)
    with _LOCK, _connect() as conn:
        if not _can_manage_school(conn, session, school_id):
            raise PermissionError('没有该院校的管理权限')
        if 'sort_order' not in body:
            row = conn.execute('SELECT COALESCE(MAX(sort_order),0)+10 AS next FROM school_content_modules WHERE school_id=?', (school_id,)).fetchone()
            values['sort_order'] = int(row['next'])
        now = _now()
        cur = conn.execute(
            'INSERT INTO school_content_modules '
            '(school_id,type,title,description,link_url,cover_url,config_json,sort_order,status,publish_at,unpublish_at,updated_by,created_at,updated_at) '
            'VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            (school_id, values['type'], values['title'], values['description'], values['link_url'],
             values['cover_url'], values['config_json'], values['sort_order'], values['status'],
             values['publish_at'], values['unpublish_at'], session['user_id'], now, now),
        )
        module_id = int(cur.lastrowid)
        _audit(conn, session, school_id, module_id, 'create', values, request_ip)
        row = conn.execute('SELECT * FROM school_content_modules WHERE id=?', (module_id,)).fetchone()
    return _module_dict(row)


def update_module(session: dict, module_id: int, body: dict, request_ip: str) -> dict:
    with _LOCK, _connect() as conn:
        row = conn.execute('SELECT * FROM school_content_modules WHERE id=?', (module_id,)).fetchone()
        if not row:
            raise LookupError('模块不存在')
        existing = _module_dict(row)
        school_id = int(row['school_id'])
        if not _can_manage_school(conn, session, school_id):
            raise PermissionError('没有该院校的管理权限')
        values = _module_values(body, existing)
        conn.execute(
            'UPDATE school_content_modules SET type=?,title=?,description=?,link_url=?,cover_url=?,config_json=?,sort_order=?,status=?,publish_at=?,unpublish_at=?,updated_by=?,updated_at=? WHERE id=?',
            (values['type'], values['title'], values['description'], values['link_url'], values['cover_url'],
             values['config_json'], values['sort_order'], values['status'], values['publish_at'],
             values['unpublish_at'], session['user_id'], _now(), module_id),
        )
        _audit(conn, session, school_id, module_id, 'update', body, request_ip)
        updated = conn.execute('SELECT * FROM school_content_modules WHERE id=?', (module_id,)).fetchone()
    return _module_dict(updated)


def delete_module(session: dict, module_id: int, request_ip: str) -> None:
    with _LOCK, _connect() as conn:
        row = conn.execute('SELECT school_id,title FROM school_content_modules WHERE id=?', (module_id,)).fetchone()
        if not row:
            raise LookupError('模块不存在')
        if not _can_manage_school(conn, session, int(row['school_id'])):
            raise PermissionError('没有该院校的管理权限')
        _audit(conn, session, int(row['school_id']), module_id, 'delete', {'title': row['title']}, request_ip)
        conn.execute('DELETE FROM school_content_modules WHERE id=?', (module_id,))


def reorder_modules(session: dict, school_id: int, ordered_ids: list, request_ip: str) -> list[dict]:
    ids = [int(x) for x in ordered_ids]
    with _LOCK, _connect() as conn:
        if not _can_manage_school(conn, session, school_id):
            raise PermissionError('没有该院校的管理权限')
        actual = {int(r['id']) for r in conn.execute('SELECT id FROM school_content_modules WHERE school_id=?', (school_id,)).fetchall()}
        if set(ids) != actual:
            raise ValueError('排序列表与当前模块不一致，请刷新后重试')
        for index, module_id in enumerate(ids, start=1):
            conn.execute('UPDATE school_content_modules SET sort_order=?,updated_by=?,updated_at=? WHERE id=?', (index * 10, session['user_id'], _now(), module_id))
        _audit(conn, session, school_id, None, 'reorder', {'ordered_ids': ids}, request_ip)
    return list_modules(session, school_id)


def set_publish_state(session: dict, module_id: int, status: str, request_ip: str) -> dict:
    if status not in ('published', 'draft'):
        raise ValueError('发布状态无效')
    return update_module(session, module_id, {'status': status, 'publish_at': _now() if status == 'published' else None}, request_ip)


def _section_key(value: str) -> str:
    key = re.sub(r'[^a-z0-9_-]+', '', str(value or '').strip().lower())
    if not key:
        raise ValueError('专区标识不能为空')
    return key[:64]


def _audit_global(conn, session, section_key, object_id, action, change, request_ip):
    conn.execute(
        'INSERT INTO content_audit_logs(user_id,school_id,object_type,object_id,action,change_json,request_ip,created_at) '
        'VALUES(?,?,?,?,?,?,?,?)',
        (session['user_id'], None, 'global_content_module', object_id, action,
         json.dumps({'section_key': section_key, **change}, ensure_ascii=False), request_ip, _now()),
    )


def list_global_modules(session: dict, section_key: str) -> list[dict]:
    key = _section_key(section_key)
    with _connect() as conn:
        rows = conn.execute(
            'SELECT * FROM global_content_modules WHERE section_key=? ORDER BY sort_order,id',
            (key,),
        ).fetchall()
    return [_module_dict(r) for r in rows]


def create_global_module(session: dict, section_key: str, body: dict, request_ip: str) -> dict:
    key = _section_key(section_key)
    values = _module_values(body)
    with _LOCK, _connect() as conn:
        if 'sort_order' not in body:
            row = conn.execute(
                'SELECT COALESCE(MAX(sort_order),0)+10 AS next FROM global_content_modules WHERE section_key=?',
                (key,),
            ).fetchone()
            values['sort_order'] = int(row['next'])
        now = _now()
        cur = conn.execute(
            'INSERT INTO global_content_modules '
            '(section_key,type,title,description,link_url,cover_url,config_json,sort_order,status,publish_at,unpublish_at,updated_by,created_at,updated_at) '
            'VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            (key, values['type'], values['title'], values['description'], values['link_url'],
             values['cover_url'], values['config_json'], values['sort_order'], values['status'],
             values['publish_at'], values['unpublish_at'], session['user_id'], now, now),
        )
        module_id = int(cur.lastrowid)
        _audit_global(conn, session, key, module_id, 'create', values, request_ip)
        row = conn.execute('SELECT * FROM global_content_modules WHERE id=?', (module_id,)).fetchone()
    return _module_dict(row)


def update_global_module(session: dict, module_id: int, body: dict, request_ip: str) -> dict:
    with _LOCK, _connect() as conn:
        row = conn.execute('SELECT * FROM global_content_modules WHERE id=?', (module_id,)).fetchone()
        if not row:
            raise LookupError('模块不存在')
        existing = _module_dict(row)
        section_key = str(row['section_key'])
        values = _module_values(body, existing)
        conn.execute(
            'UPDATE global_content_modules SET type=?,title=?,description=?,link_url=?,cover_url=?,config_json=?,sort_order=?,status=?,publish_at=?,unpublish_at=?,updated_by=?,updated_at=? WHERE id=?',
            (values['type'], values['title'], values['description'], values['link_url'], values['cover_url'],
             values['config_json'], values['sort_order'], values['status'], values['publish_at'],
             values['unpublish_at'], session['user_id'], _now(), module_id),
        )
        _audit_global(conn, session, section_key, module_id, 'update', body, request_ip)
        updated = conn.execute('SELECT * FROM global_content_modules WHERE id=?', (module_id,)).fetchone()
    return _module_dict(updated)


def delete_global_module(session: dict, module_id: int, request_ip: str) -> None:
    with _LOCK, _connect() as conn:
        row = conn.execute('SELECT section_key,title FROM global_content_modules WHERE id=?', (module_id,)).fetchone()
        if not row:
            raise LookupError('模块不存在')
        _audit_global(conn, session, row['section_key'], module_id, 'delete', {'title': row['title']}, request_ip)
        conn.execute('DELETE FROM global_content_modules WHERE id=?', (module_id,))


def reorder_global_modules(session: dict, section_key: str, ordered_ids: list, request_ip: str) -> list[dict]:
    key = _section_key(section_key)
    ids = [int(x) for x in ordered_ids]
    with _LOCK, _connect() as conn:
        actual = {int(r['id']) for r in conn.execute(
            'SELECT id FROM global_content_modules WHERE section_key=?', (key,)
        ).fetchall()}
        if set(ids) != actual:
            raise ValueError('排序列表与当前模块不一致，请刷新后重试')
        for index, module_id in enumerate(ids, start=1):
            conn.execute(
                'UPDATE global_content_modules SET sort_order=?,updated_by=?,updated_at=? WHERE id=?',
                (index * 10, session['user_id'], _now(), module_id),
            )
        _audit_global(conn, session, key, None, 'reorder', {'ordered_ids': ids}, request_ip)
    return list_global_modules(session, key)


def set_global_publish_state(session: dict, module_id: int, status: str, request_ip: str) -> dict:
    if status not in ('published', 'draft'):
        raise ValueError('发布状态无效')
    return update_global_module(
        session, module_id,
        {'status': status, 'publish_at': _now() if status == 'published' else None},
        request_ip,
    )


def _image_kind(data: bytes) -> tuple[str, str]:
    if data.startswith(b'\x89PNG\r\n\x1a\n'):
        return '.png', 'image/png'
    if data.startswith(b'\xff\xd8\xff'):
        return '.jpg', 'image/jpeg'
    if data[:4] == b'RIFF' and data[8:12] == b'WEBP':
        return '.webp', 'image/webp'
    raise ValueError('仅支持 PNG、JPEG、WebP 图片')


def save_image_bytes(data: bytes, kind: str, created_by: int | None, source_url: str = '') -> dict:
    if not data or len(data) > MAX_IMAGE_BYTES:
        raise ValueError('图片不能为空且不能超过 5MB')
    ext, mime = _image_kind(data)
    checksum = hashlib.sha256(data).hexdigest()
    filename = f'{kind}-{checksum[:20]}{ext}'
    target = UPLOAD_DIR / filename
    if not target.exists():
        target.write_bytes(data)
    with _LOCK, _connect() as conn:
        existing = conn.execute('SELECT * FROM media_assets WHERE checksum=? AND kind=?', (checksum, kind)).fetchone()
        if existing:
            asset_id = int(existing['id'])
        else:
            cur = conn.execute(
                'INSERT INTO media_assets(kind,storage_key,mime_type,size_bytes,source_url,checksum,created_by,created_at) VALUES(?,?,?,?,?,?,?,?)',
                (kind, filename, mime, len(data), source_url, checksum, created_by, _now()),
            )
            asset_id = int(cur.lastrowid)
    return {'id': asset_id, 'url': f'/uploads/content/{filename}', 'mime_type': mime, 'size_bytes': len(data)}


def upload_image(session: dict, body: dict) -> dict:
    encoded = str(body.get('base64', ''))
    if ',' in encoded:
        encoded = encoded.split(',', 1)[1]
    try:
        data = base64.b64decode(encoded, validate=True)
    except Exception as exc:
        raise ValueError('图片 base64 无效') from exc
    kind = str(body.get('kind', 'image'))
    if kind not in ('image', 'qr_code', 'video_cover'):
        kind = 'image'
    return save_image_bytes(data, kind, session['user_id'])


def _validate_public_url(url: str) -> urllib.parse.SplitResult:
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme not in ('http', 'https') or not parsed.hostname:
        raise ValueError('请输入有效的 http/https 链接')
    host = parsed.hostname.lower()
    if host in ('localhost',) or host.endswith('.local'):
        raise ValueError('不允许访问本机或内网地址')
    try:
        infos = socket.getaddrinfo(host, parsed.port or (443 if parsed.scheme == 'https' else 80), type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise ValueError('无法解析视频域名') from exc
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            trusted_host = any(host == suffix or host.endswith('.' + suffix) for suffix in TRUSTED_MEDIA_HOSTS)
            trusted_proxy_ip = any(ip in network for network in PROXY_FAKE_IP_RANGES)
            if trusted_host and trusted_proxy_ip:
                continue
            raise ValueError('不允许访问本机或内网地址')
    return parsed


class _MetaParser(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.meta = {}
        self.title = ''
        self._in_title = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag.lower() == 'meta':
            key = attrs.get('property') or attrs.get('name')
            content = attrs.get('content')
            if key and content:
                self.meta[key.lower()] = content.strip()
        elif tag.lower() == 'title':
            self._in_title = True

    def handle_endtag(self, tag):
        if tag.lower() == 'title':
            self._in_title = False

    def handle_data(self, data):
        if self._in_title:
            self.title += data


def _platform(host: str) -> str:
    if 'bilibili.com' in host or host == 'b23.tv':
        return '哔哩哔哩'
    if 'youtube.com' in host or host == 'youtu.be':
        return 'YouTube'
    if 'v.qq.com' in host:
        return '腾讯视频'
    if 'ixigua.com' in host:
        return '西瓜视频'
    return '视频'


def _format_duration(seconds) -> str:
    try:
        total = max(0, int(seconds))
    except (TypeError, ValueError):
        return ''
    hours, remainder = divmod(total, 3600)
    minutes, secs = divmod(remainder, 60)
    return f'{hours}:{minutes:02d}:{secs:02d}' if hours else f'{minutes}:{secs:02d}'


def _bilibili_preview(session: dict, url: str, parsed: urllib.parse.SplitResult) -> dict | None:
    host = (parsed.hostname or '').lower()
    if not (host == 'b23.tv' or host == 'bilibili.com' or host.endswith('.bilibili.com')):
        return None
    match = re.search(r'/video/(BV[0-9A-Za-z]{10})', parsed.path, re.IGNORECASE)
    if not match:
        return None
    bvid = match.group(1)
    api_url = 'https://api.bilibili.com/x/web-interface/view?' + urllib.parse.urlencode({'bvid': bvid})
    _validate_public_url(api_url)
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
        'Accept': 'application/json,text/plain,*/*',
        'Referer': 'https://www.bilibili.com/',
    }
    api_req = urllib.request.Request(api_url, headers=headers)
    with urllib.request.urlopen(api_req, timeout=10) as response:
        _validate_public_url(response.geturl())
        raw = response.read(2 * 1024 * 1024 + 1)
    if len(raw) > 2 * 1024 * 1024:
        raise ValueError('B 站视频信息过大，无法读取')
    try:
        payload = json.loads(raw.decode('utf-8'))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError('B 站返回的视频信息无法解析') from exc
    data = payload.get('data') or {}
    if payload.get('code') != 0 or not data:
        raise ValueError(str(payload.get('message') or '未找到该 B 站视频'))
    image_url = str(data.get('pic') or '').strip()
    cover_url = ''
    asset_id = None
    if image_url:
        if image_url.startswith('http://'):
            image_url = 'https://' + image_url[7:]
        _validate_public_url(image_url)
        image_req = urllib.request.Request(image_url, headers={
            'User-Agent': headers['User-Agent'],
            'Accept': 'image/*',
            'Referer': 'https://www.bilibili.com/',
        })
        with urllib.request.urlopen(image_req, timeout=10) as image_response:
            _validate_public_url(image_response.geturl())
            image_data = image_response.read(MAX_IMAGE_BYTES + 1)
        asset = save_image_bytes(image_data, 'video_cover', session['user_id'], image_url)
        cover_url, asset_id = asset['url'], asset['id']
    return {
        'url': f'https://www.bilibili.com/video/{bvid}/',
        'title': str(data.get('title') or 'B 站视频')[:160],
        'cover_url': cover_url,
        'cover_asset_id': asset_id,
        'platform': '哔哩哔哩',
        'duration': _format_duration(data.get('duration')),
    }


def video_preview(session: dict, body: dict) -> dict:
    url = str(body.get('url', '')).strip()
    parsed = _validate_public_url(url)
    bilibili = _bilibili_preview(session, url, parsed)
    if bilibili:
        return bilibili
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
    })
    with urllib.request.urlopen(req, timeout=10) as response:
        final_url = response.geturl()
        _validate_public_url(final_url)
        raw = response.read(2 * 1024 * 1024 + 1)
        if len(raw) > 2 * 1024 * 1024:
            raise ValueError('目标页面过大，无法读取元数据')
        charset = response.headers.get_content_charset() or 'utf-8'
    parser = _MetaParser()
    parser.feed(raw.decode(charset, errors='replace'))
    title = parser.meta.get('og:title') or parser.meta.get('twitter:title') or parser.title.strip() or '视频内容'
    image_url = parser.meta.get('og:image') or parser.meta.get('twitter:image') or ''
    cover_url = ''
    asset_id = None
    if image_url:
        image_url = urllib.parse.urljoin(final_url, image_url)
        _validate_public_url(image_url)
        image_req = urllib.request.Request(image_url, headers={'User-Agent': req.headers['User-agent'], 'Accept': 'image/*'})
        with urllib.request.urlopen(image_req, timeout=10) as image_response:
            _validate_public_url(image_response.geturl())
            image_data = image_response.read(MAX_IMAGE_BYTES + 1)
        asset = save_image_bytes(image_data, 'video_cover', session['user_id'], image_url)
        cover_url, asset_id = asset['url'], asset['id']
    return {
        'url': final_url,
        'title': title[:160],
        'cover_url': cover_url,
        'cover_asset_id': asset_id,
        'platform': _platform(parsed.hostname or ''),
        'duration': parser.meta.get('video:duration') or parser.meta.get('og:video:duration') or '',
    }


def public_modules(school_identifier: str) -> list[dict]:
    init_db()
    now = _now()
    with _connect() as conn:
        if str(school_identifier).isdigit():
            school = conn.execute('SELECT id,name FROM schools WHERE id=?', (int(school_identifier),)).fetchone()
        else:
            school = conn.execute('SELECT id,name FROM schools WHERE name=?', (school_identifier,)).fetchone()
        if not school:
            return []
        rows = conn.execute(
            """SELECT id,school_id,type,title,description,link_url,cover_url,config_json,sort_order,status,publish_at,unpublish_at,updated_at
               FROM school_content_modules
               WHERE school_id=? AND status='published'
                 AND (publish_at IS NULL OR publish_at<=?)
                 AND (unpublish_at IS NULL OR unpublish_at>?)
               ORDER BY sort_order,id""",
            (school['id'], now, now),
        ).fetchall()
    items = [_module_dict(r) for r in rows]
    today = dt.date.today().isoformat()
    return [
        item for item in items
        if not (
            item.get('type') == 'qr_group'
            and item.get('config', {}).get('expires_at')
            and item['config']['expires_at'] < today
        )
    ]


def public_global_modules(section_key: str) -> list[dict]:
    init_db()
    key = _section_key(section_key)
    now = _now()
    with _connect() as conn:
        rows = conn.execute(
            """SELECT id,section_key,type,title,description,link_url,cover_url,config_json,sort_order,status,publish_at,unpublish_at,updated_at
               FROM global_content_modules
               WHERE section_key=? AND status='published'
                 AND (publish_at IS NULL OR publish_at<=?)
                 AND (unpublish_at IS NULL OR unpublish_at>?)
               ORDER BY sort_order,id""",
            (key, now, now),
        ).fetchall()
    return [_module_dict(row) for row in rows]


def _ok(data=None, **extra):
    payload = {'code': 0, 'data': data if data is not None else {}}
    payload.update(extra)
    return payload


def _session_cookie(token: str, max_age: int) -> str:
    cookie = f'{COOKIE_NAME}={token}; Path=/; HttpOnly; SameSite=Lax; Max-Age={max_age}'
    if os.environ.get('KAOYAN_COOKIE_SECURE', '').strip().lower() in {'1', 'true', 'yes', 'on'}:
        cookie += '; Secure'
    return cookie


def dispatch(method: str, path: str, query: dict, headers, raw_body: bytes, request_ip: str = ''):
    """返回 (status, payload, extra_headers)，供 serve.py 与 FastAPI 共用。"""
    init_db()
    try:
        body = _json_body(raw_body) if method in ('POST', 'PATCH', 'PUT', 'DELETE') else {}
        if path == '/api/admin/login' and method == 'POST':
            session, token = login(str(body.get('username', '')), str(body.get('password', '')))
            cookie = _session_cookie(token, int(SESSION_TTL.total_seconds()))
            return 200, _ok({'user': {k: session[k] for k in ('user_id','username','display_name','role')}, 'csrf_token': session['csrf']}), {'Set-Cookie': cookie}
        if path == '/api/admin/logout' and method == 'POST':
            _require_session(method, headers)
            logout(headers)
            return 200, _ok(), {'Set-Cookie': _session_cookie('', 0)}
        if path == '/api/admin/me' and method == 'GET':
            session = _require_session(method, headers)
            return 200, _ok({'user': {k: session[k] for k in ('user_id','username','display_name','role')}, 'csrf_token': session['csrf']}), {}

        session = _require_session(method, headers)
        if path == '/api/admin/schools' and method == 'GET':
            return 200, _ok({'items': list_schools(session)}), {}
        match = re.fullmatch(r'/api/admin/schools/(\d+)/modules', path)
        if match and method == 'GET':
            school_id = int(match.group(1))
            return 200, _ok({'items': list_modules(session, school_id)}), {}
        if match and method == 'POST':
            return 201, _ok(create_module(session, int(match.group(1)), body, request_ip)), {}
        match = re.fullmatch(r'/api/admin/modules/(\d+)', path)
        if match and method == 'PATCH':
            return 200, _ok(update_module(session, int(match.group(1)), body, request_ip)), {}
        if match and method == 'DELETE':
            delete_module(session, int(match.group(1)), request_ip)
            return 200, _ok(), {}
        match = re.fullmatch(r'/api/admin/modules/(\d+)/(publish|unpublish)', path)
        if match and method == 'POST':
            status = 'published' if match.group(2) == 'publish' else 'draft'
            return 200, _ok(set_publish_state(session, int(match.group(1)), status, request_ip)), {}
        if path == '/api/admin/modules/reorder' and method == 'POST':
            items = reorder_modules(session, int(body.get('school_id')), body.get('ordered_ids') or [], request_ip)
            return 200, _ok({'items': items}), {}
        if path == '/api/admin/global-modules' and method == 'GET':
            return 200, _ok({'items': list_global_modules(session, query.get('section', 'exam_resources'))}), {}
        if path == '/api/admin/global-modules' and method == 'POST':
            section = body.get('section_key') or query.get('section', 'exam_resources')
            return 201, _ok(create_global_module(session, section, body, request_ip)), {}
        match = re.fullmatch(r'/api/admin/global-modules/(\d+)', path)
        if match and method == 'PATCH':
            return 200, _ok(update_global_module(session, int(match.group(1)), body, request_ip)), {}
        if match and method == 'DELETE':
            delete_global_module(session, int(match.group(1)), request_ip)
            return 200, _ok(), {}
        match = re.fullmatch(r'/api/admin/global-modules/(\d+)/(publish|unpublish)', path)
        if match and method == 'POST':
            status = 'published' if match.group(2) == 'publish' else 'draft'
            return 200, _ok(set_global_publish_state(session, int(match.group(1)), status, request_ip)), {}
        if path == '/api/admin/global-modules/reorder' and method == 'POST':
            items = reorder_global_modules(
                session, body.get('section_key', 'exam_resources'), body.get('ordered_ids') or [], request_ip
            )
            return 200, _ok({'items': items}), {}
        if path == '/api/admin/media/upload' and method == 'POST':
            return 201, _ok(upload_image(session, body)), {}
        if path == '/api/admin/media/video-preview' and method == 'POST':
            return 200, _ok(video_preview(session, body)), {}
        return 404, {'code': 1, 'msg': 'not found'}, {}
    except PermissionError as exc:
        return 401, {'code': 1, 'msg': str(exc)}, {}
    except LookupError as exc:
        return 404, {'code': 1, 'msg': str(exc)}, {}
    except (ValueError, json.JSONDecodeError) as exc:
        return 400, {'code': 1, 'msg': str(exc)}, {}
    except Exception as exc:
        return 500, {'code': 1, 'msg': str(exc)}, {}


init_db()
