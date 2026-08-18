# -*- coding: utf-8 -*-
"""内容数据导入脚本：经验贴 / 校招岗位 / 资料课程。

数据源：raw/content_raw.json（从 考研常识科普/posts-data.js、
就业相关/job-listing/job-listing.html、专业课选择/资料和课程.html 提取）。

写入 admission.db 的表：
  - experience_posts   考研经验贴
  - job_posts          校招岗位
  - course_resources   资料/课程图片画廊
"""
import csv
import json
import pathlib
import sqlite3
from db_config import mysql_connect

JSON_PATH = pathlib.Path(__file__).with_name('raw') / 'content_raw.json'


def _conn():
    conn = sqlite3.connect(pathlib.Path(__file__).with_name('admission.db'))
    conn.row_factory = sqlite3.Row
    return conn


def read_content_data():
    return json.loads(JSON_PATH.read_text(encoding='utf-8'))


def _list_csv(vals):
    if not vals:
        return ''
    return '|'.join(str(v) for v in vals)


def import_content_to_db(write_csv=True):
    data = read_content_data()
    posts = data.get('posts', [])
    jobs = data.get('jobs', [])
    resources = data.get('resources', [])

    conn = _conn()
    try:
        cur = conn.cursor()
        cur.execute('DROP TABLE IF EXISTS experience_posts')
        cur.execute('DROP TABLE IF EXISTS job_posts')
        cur.execute('DROP TABLE IF EXISTS course_resources')
        cur.execute('''CREATE TABLE experience_posts (
            id TEXT PRIMARY KEY,
            title TEXT,
            school TEXT,
            school_short TEXT,
            code TEXT,
            total TEXT,
            subject_score TEXT,
            author TEXT,
            year TEXT,
            level TEXT,
            category TEXT,
            undergrad TEXT,
            c1 TEXT,
            c2 TEXT,
            ct TEXT,
            yc1 TEXT,
            yc2 TEXT,
            lc TEXT
        )''')
        cur.execute('''CREATE TABLE job_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company TEXT NOT NULL,
            date TEXT,
            deadline TEXT,
            positions TEXT,
            note TEXT,
            apply_url TEXT,
            notice_url TEXT,
            types_json TEXT,
            industries_json TEXT,
            locations_json TEXT,
            grades_json TEXT,
            exam_json TEXT
        )''')
        cur.execute('''CREATE TABLE course_resources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            category TEXT,
            images_json TEXT,
            sort_order INTEGER NOT NULL DEFAULT 0
        )''')

        post_rows = []
        for p in posts:
            post_rows.append((
                p.get('id', ''),
                p.get('title', ''),
                p.get('school', ''),
                p.get('schoolShort', ''),
                p.get('code', ''),
                p.get('total', ''),
                p.get('subjectScore', ''),
                p.get('author', ''),
                p.get('year', ''),
                p.get('level', ''),
                p.get('category', ''),
                p.get('undergrad', ''),
                p.get('c1', ''),
                p.get('c2', ''),
                p.get('ct', ''),
                p.get('yc1', ''),
                p.get('yc2', ''),
                p.get('lc', ''),
            ))

        job_rows = []
        for j in jobs:
            job_rows.append((
                j.get('company', ''),
                j.get('date', ''),
                j.get('deadline', ''),
                j.get('positions', ''),
                j.get('note', ''),
                j.get('apply_url', ''),
                j.get('notice_url', ''),
                json.dumps(j.get('types', []), ensure_ascii=False),
                json.dumps(j.get('industries', []), ensure_ascii=False),
                json.dumps(j.get('locations', []), ensure_ascii=False),
                json.dumps(j.get('grades', []), ensure_ascii=False),
                json.dumps(j.get('exam', []), ensure_ascii=False),
            ))

        resource_rows = []
        for idx, r in enumerate(resources):
            resource_rows.append((
                r.get('title', ''),
                r.get('title', ''),
                json.dumps(r.get('images', []), ensure_ascii=False),
                idx,
            ))

        cur.executemany('''INSERT INTO experience_posts(
            id, title, school, school_short, code, total, subject_score, author, year,
            level, category, undergrad, c1, c2, ct, yc1, yc2, lc
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''', post_rows)
        cur.executemany('''INSERT INTO job_posts(
            company, date, deadline, positions, note, apply_url, notice_url,
            types_json, industries_json, locations_json, grades_json, exam_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''', job_rows)
        cur.executemany('''INSERT INTO course_resources(
            title, category, images_json, sort_order
        ) VALUES (?, ?, ?, ?)''', resource_rows)

        conn.commit()

        if write_csv:
            with open(pathlib.Path(__file__).with_name('experience_posts.csv'), 'w', newline='', encoding='utf-8-sig') as f:
                w = csv.writer(f)
                w.writerow(['id', 'title', 'school', 'school_short', 'code', 'total', 'subject_score',
                            'author', 'year', 'level', 'category', 'undergrad'])
                for p in post_rows:
                    w.writerow(list(p[:12]))
            with open(pathlib.Path(__file__).with_name('job_posts.csv'), 'w', newline='', encoding='utf-8-sig') as f:
                w = csv.writer(f)
                w.writerow(['company', 'date', 'deadline', 'positions', 'note', 'apply_url', 'notice_url',
                            'types', 'industries', 'locations', 'grades', 'exam'])
                for j in job_rows:
                    w.writerow([j[0], j[1], j[2], j[3], j[4], j[5], j[6],
                                _list_csv(json.loads(j[7])), _list_csv(json.loads(j[8])),
                                _list_csv(json.loads(j[9])), _list_csv(json.loads(j[10])),
                                _list_csv(json.loads(j[11]))])
            with open(pathlib.Path(__file__).with_name('course_resources.csv'), 'w', newline='', encoding='utf-8-sig') as f:
                w = csv.writer(f)
                w.writerow(['title', 'category', 'image_count', 'images'])
                for r in resource_rows:
                    imgs = json.loads(r[2])
                    w.writerow([r[0], r[1], len(imgs), '|'.join(imgs)])

        return {
            'posts': len(post_rows),
            'jobs': len(job_rows),
            'resources': len(resource_rows),
        }
    finally:
        conn.close()



def import_content_to_mysql():
    # 将内容数据（经验贴/岗位/资料）写入 MySQL（按 config.json 的 mysql 配置）
    data = read_content_data()
    posts = data.get('posts', [])
    jobs = data.get('jobs', [])
    resources = data.get('resources', [])
    conn = mysql_connect()
    try:
        cur = conn.cursor()
        cur.execute('DELETE FROM experience_posts')
        cur.execute('DELETE FROM job_posts')
        cur.execute('DELETE FROM course_resources')

        post_rows = []
        for p in posts:
            post_rows.append((
                p.get('id', ''), p.get('title', ''), p.get('school', ''), p.get('schoolShort', ''),
                p.get('code', ''), p.get('total', ''), p.get('subjectScore', ''), p.get('author', ''),
                p.get('year', ''), p.get('level', ''), p.get('category', ''), p.get('undergrad', ''),
                p.get('c1', ''), p.get('c2', ''), p.get('ct', ''), p.get('yc1', ''), p.get('yc2', ''), p.get('lc', ''),
            ))
        job_rows = []
        for j in jobs:
            job_rows.append((
                j.get('company', ''), j.get('date', ''), j.get('deadline', ''), j.get('positions', ''),
                j.get('note', ''), j.get('apply_url', ''), j.get('notice_url', ''),
                json.dumps(j.get('types', []), ensure_ascii=False),
                json.dumps(j.get('industries', []), ensure_ascii=False),
                json.dumps(j.get('locations', []), ensure_ascii=False),
                json.dumps(j.get('grades', []), ensure_ascii=False),
                json.dumps(j.get('exam', []), ensure_ascii=False),
            ))
        resource_rows = []
        for idx, r in enumerate(resources):
            resource_rows.append((r.get('title', ''), r.get('title', ''), json.dumps(r.get('images', []), ensure_ascii=False), idx))

        cur.executemany('''INSERT INTO experience_posts(
            id, title, school, school_short, code, total, subject_score, author, year,
            level, category, undergrad, c1, c2, ct, yc1, yc2, lc
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)''', post_rows)
        cur.executemany('''INSERT INTO job_posts(
            company, date, deadline, positions, note, apply_url, notice_url,
            types_json, industries_json, locations_json, grades_json, exam_json
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)''', job_rows)
        cur.executemany('''INSERT INTO course_resources(
            title, category, images_json, sort_order
        ) VALUES (%s, %s, %s, %s)''', resource_rows)

        conn.commit()
        return {'posts': len(post_rows), 'jobs': len(job_rows), 'resources': len(resource_rows)}
    finally:
        conn.close()

if __name__ == '__main__':
    import sys
    if '--mysql' in sys.argv:
        info = import_content_to_mysql()
        print(f"content MySQL OK: {info['posts']} 条经验贴, {info['jobs']} 条岗位, {info['resources']} 个资料分类")
    else:
        info = import_content_to_db(write_csv=True)
        print(f"content OK: {info['posts']} 条经验贴, {info['jobs']} 条岗位, {info['resources']} 个资料分类")
