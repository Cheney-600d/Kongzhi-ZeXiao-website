# -*- coding: utf-8 -*-
"""院校录取数据库查询 API（支持 SQLite / MySQL 双数据源）。

环境变量优先于 config.json，生产环境建议通过 KAOYAN_DB_* 变量配置。
"""
import json
import pathlib
import sqlite3

import db_config

DB_PATH = db_config.sqlite_path()
DB_TYPE = 'mysql' if db_config.is_mysql() else 'sqlite'
_MYSQL = db_config.mysql_config()


class _Db:
    """轻量封装：统一 sqlite3 与 pymysql 的 execute/close。"""

    def __init__(self, impl):
        self.impl = impl

    def execute(self, sql, args=None):
        args = args or []
        if DB_TYPE == 'mysql':
            sql = sql.replace('?', '%s')
            cur = self.impl.cursor()
            cur.execute(sql, args)
            return cur
        return self.impl.execute(sql, args)

    def close(self):
        self.impl.close()


def _conn():
    if DB_TYPE == 'mysql':
        try:
            import pymysql
        except ImportError as e:
            raise RuntimeError('config.json 中 db_type=mysql，但未安装 PyMySQL。请先执行 pip install pymysql') from e
        return _Db(pymysql.connect(
            host=_MYSQL.get('host', '127.0.0.1'),
            port=int(_MYSQL.get('port', 3306)),
            user=_MYSQL.get('user', 'root'),
            password=_MYSQL.get('password', ''),
            database=_MYSQL.get('database', 'kaoyan_admission'),
            charset=_MYSQL.get('charset', 'utf8mb4'),
            cursorclass=pymysql.cursors.DictCursor,
        ))
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return _Db(conn)


def _json_default(v):
    return str(v)


def to_json(obj):
    return json.dumps(obj, ensure_ascii=False, default=_json_default)


def query_schools(q=None, limit=200):
    """院校列表，支持模糊搜索校名。"""
    conn = _conn()
    try:
        sql = 'SELECT id, name, province, tier, logo_url FROM schools'
        args = []
        if q:
            sql += ' WHERE name LIKE ?'
            args.append(f'%{q}%')
        sql += ' ORDER BY name LIMIT ?'
        args.append(int(limit))
        rows = conn.execute(sql, args).fetchall()
        items = [{'id': r['id'], 'name': r['name'], 'province': r['province'], 'tier': r['tier'], 'logo_url': r['logo_url']} for r in rows]
        return {'code': 0, 'data': {'items': items, 'total': len(items)}}
    finally:
        conn.close()


def query_majors(school=None, code=None):
    """专业方向列表；可按校名或专业代码过滤。"""
    conn = _conn()
    try:
        sql = """SELECT DISTINCT m.id, m.code, m.name, m.full_text
                 FROM majors m
                 JOIN admissions a ON a.major_id = m.id
                 JOIN schools s ON s.id = a.school_id
                 WHERE 1=1"""
        args = []
        if school:
            sql += ' AND s.name = ?'
            args.append(school)
        if code:
            sql += ' AND m.code = ?'
            args.append(code)
        sql += ' ORDER BY m.code, m.name'
        rows = conn.execute(sql, args).fetchall()
        items = [{'id': r['id'], 'code': r['code'], 'name': r['name'], 'full_text': r['full_text']} for r in rows]
        return {'code': 0, 'data': {'items': items, 'total': len(items)}}
    finally:
        conn.close()


def query_admissions(school=None, major_code=None, year=2026, page=1, page_size=20):
    """录取数据列表：校名/专业代码筛选 + 分页。"""
    page = max(1, int(page or 1))
    page_size = min(100, max(1, int(page_size or 20)))
    offset = (page - 1) * page_size
    conn = _conn()
    try:
        where = 'WHERE a.year = ?'
        args = [int(year)]
        if school:
            where += ' AND s.name = ?'
            args.append(school)
        if major_code:
            where += ' AND m.code = ?'
            args.append(major_code)

        count_sql = f'''SELECT COUNT(*) AS n FROM admissions a
                        JOIN schools s ON s.id = a.school_id
                        JOIN majors m ON m.id = a.major_id {where}'''
        total = conn.execute(count_sql, args).fetchone()['n']

        sql = f'''SELECT a.*, s.name AS school_name, m.code AS major_code, m.name AS major_name
                  FROM admissions a
                  JOIN schools s ON s.id = a.school_id
                  JOIN majors m ON m.id = a.major_id
                  {where}
                  ORDER BY s.name, m.code, a.college
                  LIMIT ? OFFSET ?'''
        rows = conn.execute(sql, args + [page_size, offset]).fetchall()
        items = [dict(r) for r in rows]
        return {
            'code': 0,
            'data': {
                'items': items,
                'page': page,
                'page_size': page_size,
                'total': total,
                'total_pages': (total + page_size - 1) // page_size,
            }
        }
    finally:
        conn.close()


def query_summary():
    """统计摘要：用于首页或调试。"""
    conn = _conn()
    try:
        school_count = conn.execute('SELECT COUNT(*) AS c FROM schools').fetchone()['c']
        major_count = conn.execute('SELECT COUNT(*) AS c FROM majors').fetchone()['c']
        record_count = conn.execute('SELECT COUNT(*) AS c FROM admissions').fetchone()['c']
        province_count = conn.execute("SELECT COUNT(DISTINCT province) AS c FROM schools WHERE province IS NOT NULL AND province <> ''").fetchone()['c']
        subject_count = conn.execute('SELECT COUNT(*) AS c FROM subject_meta').fetchone()['c']
        top_schools = [dict(r) for r in conn.execute(
            '''SELECT s.name, COUNT(*) AS c FROM admissions a
               JOIN schools s ON s.id=a.school_id
               GROUP BY s.name ORDER BY c DESC, s.name LIMIT 5''').fetchall()]
        return {'code': 0, 'data': {
            'school_count': school_count,
            'major_count': major_count,
            'record_count': record_count,
            'province_count': province_count,
            'subject_count': subject_count,
            'top_schools': top_schools,
        }}
    finally:
        conn.close()


def query_subjects():
    """专业课科目（homeSubjects 结构，前端首页科目卡片用）。"""
    conn = _conn()
    try:
        metas = {r['subject_name']: r for r in conn.execute('SELECT * FROM subject_meta').fetchall()}
        rows = conn.execute('''
            SELECT e.subject_name, e.tier, e.school_name, e.codes_json, e.region
            FROM exam_subjects e
            LEFT JOIN subject_meta m ON m.subject_name = e.subject_name
            ORDER BY COALESCE(m.sort_order, 0), e.subject_name,
                     CASE e.tier WHEN '985高校' THEN 0 WHEN '211高校' THEN 1 ELSE 2 END,
                     e.school_name
        ''').fetchall()
        items = []
        current = None
        for r in rows:
            if current is None or current['name'] != r['subject_name']:
                current = {
                    'name': r['subject_name'],
                    'tier': {},
                    'bgGradient': metas[r['subject_name']]['bg_gradient'] if r['subject_name'] in metas else ''
                }
                items.append(current)
            tier = r['tier'] or '未知'
            current['tier'].setdefault(tier, []).append({
                'name': r['school_name'],
                'codes': json.loads(r['codes_json'] or '[]'),
                'region': r['region'] or ''
            })
        return {'code': 0, 'data': {'items': items, 'total': len(items)}}
    finally:
        conn.close()


def query_exam_subjects(school=None):
    """学校-专业课扁平列表；可用 school 过滤。"""
    conn = _conn()
    try:
        sql = 'SELECT subject_name, school_name, tier, region, codes_json FROM exam_subjects'
        args = []
        if school:
            sql += ' WHERE school_name = ?'
            args.append(school)
        sql += " ORDER BY subject_name, CASE tier WHEN '985高校' THEN 0 WHEN '211高校' THEN 1 ELSE 2 END, school_name"
        rows = conn.execute(sql, args).fetchall()
        items = [{
            'subjectName': r['subject_name'],
            'schoolName': r['school_name'],
            'tier': r['tier'],
            'region': r['region'],
            'codes': json.loads(r['codes_json'] or '[]'),
        } for r in rows]
        return {'code': 0, 'data': {'items': items, 'total': len(items)}}
    finally:
        conn.close()


def query_books(school=None):
    """参考书目；可按 school 过滤。"""
    conn = _conn()
    try:
        sql = 'SELECT school_name, book_text FROM reference_books'
        args = []
        if school:
            sql += ' WHERE school_name = ?'
            args.append(school)
        sql += ' ORDER BY school_name, sort_order'
        rows = conn.execute(sql, args).fetchall()
        if school:
            books = [r['book_text'] for r in rows]
            return {'code': 0, 'data': {'school': school, 'books': books, 'total': len(books)}}
        grouped = {}
        for r in rows:
            grouped.setdefault(r['school_name'], []).append(r['book_text'])
        items = [{'school': k, 'books': v} for k, v in grouped.items()]
        return {'code': 0, 'data': {'items': items, 'total': len(items)}}
    finally:
        conn.close()


def query_posts(school=None, category=None, q=None, page=1, page_size=20):
    """考研经验贴列表：支持按学校、专业课、关键词筛选，分页。"""
    conn = _conn()
    try:
        page = max(int(page), 1)
        page_size = max(int(page_size), 1)
        where = []
        args = []
        if school:
            where.append('school LIKE ?')
            args.append(f'%{school}%')
        if category:
            where.append('category = ?')
            args.append(category)
        if q:
            where.append('(title LIKE ? OR school LIKE ? OR author LIKE ?)')
            args += [f'%{q}%', f'%{q}%', f'%{q}%']
        suffix = (' WHERE ' + ' AND '.join(where)) if where else ''
        total = conn.execute('SELECT COUNT(*) AS c FROM experience_posts' + suffix, args).fetchone()['c']
        offset = (page - 1) * page_size
        rows = conn.execute('SELECT * FROM experience_posts' + suffix + ' ORDER BY id LIMIT ? OFFSET ?',
                            args + [page_size, offset]).fetchall()
        items = [dict(r) for r in rows]
        return {'code': 0, 'data': {
            'items': items, 'page': page, 'page_size': page_size,
            'total': total, 'total_pages': (total + page_size - 1) // page_size,
        }}
    finally:
        conn.close()


def query_jobs(q=None, type=None, industry=None, location=None, grade=None, page=1, page_size=20):
    """校招岗位列表：支持公司/岗位关键词、类型、行业、城市、届别筛选，分页。"""
    conn = _conn()
    try:
        page = max(int(page), 1)
        page_size = max(int(page_size), 1)
        where = []
        args = []
        if q:
            where.append('(company LIKE ? OR positions LIKE ? OR note LIKE ?)')
            args += [f'%{q}%', f'%{q}%', f'%{q}%']
        if type:
            where.append('types_json LIKE ?')
            args.append(f'%{type}%')
        if industry:
            where.append('industries_json LIKE ?')
            args.append(f'%{industry}%')
        if location:
            where.append('locations_json LIKE ?')
            args.append(f'%{location}%')
        if grade:
            where.append('grades_json LIKE ?')
            args.append(f'%{grade}%')
        suffix = (' WHERE ' + ' AND '.join(where)) if where else ''
        total = conn.execute('SELECT COUNT(*) AS c FROM job_posts' + suffix, args).fetchone()['c']
        offset = (page - 1) * page_size
        rows = conn.execute('SELECT * FROM job_posts' + suffix + ' ORDER BY id LIMIT ? OFFSET ?',
                            args + [page_size, offset]).fetchall()
        items = []
        for r in rows:
            d = dict(r)
            for col in ('types', 'industries', 'locations', 'grades', 'exam'):
                d[col] = json.loads(d.pop(col + '_json', None) or '[]')
            items.append(d)
        return {'code': 0, 'data': {
            'items': items, 'page': page, 'page_size': page_size,
            'total': total, 'total_pages': (total + page_size - 1) // page_size,
        }}
    finally:
        conn.close()


def query_resources():
    """资料/课程画廊列表。"""
    conn = _conn()
    try:
        rows = conn.execute('SELECT title, category, images_json, sort_order FROM course_resources ORDER BY sort_order').fetchall()
        items = [{
            'title': r['title'],
            'category': r['category'],
            'images': json.loads(r['images_json'] or '[]'),
            'sort_order': r['sort_order'],
        } for r in rows]
        return {'code': 0, 'data': {'items': items, 'total': len(items)}}
    finally:
        conn.close()


ROUTES = {
    '/api/schools': query_schools,
    '/api/majors': query_majors,
    '/api/admissions': query_admissions,
    '/api/summary': query_summary,
    '/api/subjects': query_subjects,
    '/api/exam-subjects': query_exam_subjects,
    '/api/books': query_books,
    '/api/posts': query_posts,
    '/api/jobs': query_jobs,
    '/api/resources': query_resources,
}


def dispatch(path, query_params):
    """给 serve.py 用：path 形如 /api/admissions。"""
    if path in ROUTES:
        try:
            result = ROUTES[path](**query_params)
            return 200, to_json(result), 'application/json; charset=utf-8'
        except Exception as e:
            return 400, to_json({'code': 1, 'msg': str(e)}), 'application/json; charset=utf-8'
    return 404, to_json({'code': 1, 'msg': 'not found'}), 'application/json; charset=utf-8'
