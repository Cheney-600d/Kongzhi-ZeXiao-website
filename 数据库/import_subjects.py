# -*- coding: utf-8 -*-
"""专业课科目/参考书数据导入脚本。

数据源：raw/subjects_books_raw.json（从 考研专业课院校查询.html 提取）。
会写入 admission.db 的表：
  - subject_meta      专业课元信息（名称、背景渐变、排序）
  - exam_subjects     学校-专业课-层次-代码-地区
  - reference_books   学校-初试参考书目
并回填 schools.province / schools.tier（若 schools 表存在）。
"""
import csv
import json
import pathlib
import sqlite3

JSON_PATH = pathlib.Path(__file__).with_name('raw') / 'subjects_books_raw.json'


def _conn():
    conn = sqlite3.connect(pathlib.Path(__file__).with_name('admission.db'))
    conn.row_factory = sqlite3.Row
    return conn


def read_subject_data():
    data = json.loads(JSON_PATH.read_text(encoding='utf-8'))
    return data['homeSubjects'], data.get('schoolIndex', {}), data.get('schoolBooks', {})


def import_subjects_to_db(write_csv=True):
    """导入专业课数据，返回统计 dict。"""
    home_subjects, school_index, school_books = read_subject_data()
    conn = _conn()
    try:
        cur = conn.cursor()
        cur.execute('DROP TABLE IF EXISTS exam_subjects')
        cur.execute('DROP TABLE IF EXISTS reference_books')
        cur.execute('DROP TABLE IF EXISTS subject_meta')
        cur.execute('''CREATE TABLE subject_meta (
            subject_name TEXT PRIMARY KEY,
            bg_gradient TEXT,
            sort_order INTEGER NOT NULL DEFAULT 0
        )''')
        cur.execute('''CREATE TABLE exam_subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject_name TEXT NOT NULL,
            school_name TEXT NOT NULL,
            tier TEXT NOT NULL,
            region TEXT,
            codes_json TEXT,
            UNIQUE(subject_name, school_name, tier)
        )''')
        cur.execute('''CREATE TABLE reference_books (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            school_name TEXT NOT NULL,
            book_text TEXT NOT NULL,
            sort_order INTEGER NOT NULL DEFAULT 0
        )''')

        subject_rows = []
        book_rows = []
        for i, subj in enumerate(home_subjects):
            name = subj.get('name', '')
            bg = subj.get('bgGradient', '')
            cur.execute('INSERT INTO subject_meta(subject_name, bg_gradient, sort_order) VALUES (?, ?, ?)', (name, bg, i))
            for tier, schools in (subj.get('tier') or {}).items():
                for sch in schools:
                    subject_rows.append((name, sch.get('name', ''), tier, sch.get('region', ''), json.dumps(sch.get('codes', []), ensure_ascii=False)))

        for school, books in school_books.items():
            for j, b in enumerate(books):
                book_rows.append((school, b, j))

        cur.executemany('INSERT INTO exam_subjects(subject_name, school_name, tier, region, codes_json) VALUES (?, ?, ?, ?, ?)', subject_rows)
        cur.executemany('INSERT INTO reference_books(school_name, book_text, sort_order) VALUES (?, ?, ?)', book_rows)

        # 回填 schools.province / tier（如果 schools 表存在）
        try:
            for school in school_index:
                entries = school_index[school] or []
                if entries:
                    region = entries[0].get('region', '')
                    tier = entries[0].get('tier', '')
                    if region or tier:
                        cur.execute('UPDATE schools SET province=?, tier=? WHERE name=?', (region, tier, school))
        except sqlite3.OperationalError:
            pass

        conn.commit()

        if write_csv:
            with open(pathlib.Path(__file__).with_name('exam_subjects.csv'), 'w', newline='', encoding='utf-8-sig') as f:
                w = csv.writer(f)
                w.writerow(['subject_name', 'school_name', 'tier', 'region', 'codes'])
                for r in subject_rows:
                    w.writerow([r[0], r[1], r[2], r[3], r[4]])
            with open(pathlib.Path(__file__).with_name('reference_books.csv'), 'w', newline='', encoding='utf-8-sig') as f:
                w = csv.writer(f)
                w.writerow(['school_name', 'book_text'])
                for r in book_rows:
                    w.writerow([r[0], r[1]])

        return {'subjects': len(home_subjects), 'exam_subject_rows': len(subject_rows), 'book_rows': len(book_rows)}
    finally:
        conn.close()


if __name__ == '__main__':
    info = import_subjects_to_db(write_csv=True)
    print(f"subjects OK: {info['subjects']} 门专业课, {info['exam_subject_rows']} 条学校-科目, {info['book_rows']} 条参考书目")
