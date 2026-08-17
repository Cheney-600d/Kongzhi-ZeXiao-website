# -*- coding: utf-8 -*-
"""院校录取数据库查询 API（本地开发用，stdl sqlite3，无第三方依赖）。

可以直接被 serve.py 调用，也可以导入到 Flask/FastAPI 项目里使用。
"""
import json
import pathlib
import sqlite3

DB_PATH = pathlib.Path(__file__).with_name('admission.db')


def _conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _json_default(v):
    return str(v)


def to_json(obj):
    return json.dumps(obj, ensure_ascii=False, default=_json_default)


def query_schools(q=None, limit=200):
    """院校列表，支持模糊搜索校名。"""
    conn = _conn()
    try:
        sql = 'SELECT id, name FROM schools'
        args = []
        if q:
            sql += ' WHERE name LIKE ?'
            args.append(f'%{q}%')
        sql += ' ORDER BY name LIMIT ?'
        args.append(int(limit))
        rows = conn.execute(sql, args).fetchall()
        items = [{'id': r['id'], 'name': r['name']} for r in rows]
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


def query_admissions(school=None, major_code=None, year=2027, page=1, page_size=20):
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
        school_count = conn.execute('SELECT COUNT(*) FROM schools').fetchone()[0]
        major_count = conn.execute('SELECT COUNT(*) FROM majors').fetchone()[0]
        record_count = conn.execute('SELECT COUNT(*) FROM admissions').fetchone()[0]
        top_schools = [dict(r) for r in conn.execute(
            '''SELECT s.name, COUNT(*) AS c FROM admissions a
               JOIN schools s ON s.id=a.school_id
               GROUP BY s.name ORDER BY c DESC, s.name LIMIT 5''').fetchall()]
        return {'code': 0, 'data': {
            'school_count': school_count,
            'major_count': major_count,
            'record_count': record_count,
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


ROUTES = {
    '/api/schools': query_schools,
    '/api/majors': query_majors,
    '/api/admissions': query_admissions,
    '/api/summary': query_summary,
    '/api/subjects': query_subjects,
    '/api/exam-subjects': query_exam_subjects,
    '/api/books': query_books,
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
