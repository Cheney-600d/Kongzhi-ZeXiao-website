# -*- coding: utf-8 -*-
"""API 函数直连测试（无需启动服务器）。

用法：
    python tests/test_api.py
"""
import pathlib
import sys

REPO = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / '数据库'))

import api  # noqa: E402

PASS = 0
FAIL = 0


def check(label, cond):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f'  PASS  {label}')
    else:
        FAIL += 1
        print(f'  FAIL  {label}')


def main():
    print('== /api/summary ==')
    r = api.query_summary()
    check('code == 0', r['code'] == 0)
    d = r['data']
    check('school_count >= 132', d['school_count'] >= 132)
    check('major_count >= 150', d['major_count'] >= 150)
    check('record_count >= 500', d['record_count'] >= 500)
    check('province_count >= 27', d['province_count'] >= 27)
    check('subject_count >= 7', d['subject_count'] >= 7)
    check('top_schools 有 5 条', len(d['top_schools']) == 5)

    print('== /api/subjects ==')
    r = api.query_subjects()
    check('code == 0', r['code'] == 0)
    items = r['data']['items']
    check('共 7 门专业课', len(items) == 7)
    check('每门都有 name/tier/bgGradient', all(s.get('name') and 'tier' in s and 'bgGradient' in s for s in items))

    print('== /api/schools ==')
    r = api.query_schools(q='上海')
    check('code == 0', r['code'] == 0)
    items = r['data']['items']
    check('上海搜索结果 >= 1', len(items) >= 1)
    check('返回 province/tier/logo_url', all(s.get('province') and s.get('tier') and s.get('logo_url') for s in items))

    print('== /api/books ==')
    r = api.query_books(school='清华大学')
    check('code == 0', r['code'] == 0)
    check('清华书目 >= 1', len(r['data']['books']) >= 1)

    print('== /api/admissions ==')
    r = api.query_admissions(school='清华大学', year='2027', page=1, page_size=5)
    check('code == 0', r['code'] == 0)
    check('分页返回 <= 5 条', len(r['data']['items']) <= 5)
    check('total >= 1', r['data']['total'] >= 1)

    print('== /api/posts ==')
    r = api.query_posts(page=1, page_size=3)
    check('code == 0', r['code'] == 0)
    check('经验贴 total >= 126', r['data']['total'] >= 126)
    check('分页返回 <= 3 条', len(r['data']['items']) <= 3)
    r = api.query_posts(q='南京', page=1, page_size=3)
    check('q=南京 total >= 1', r['data']['total'] >= 1)

    print('== /api/jobs ==')
    r = api.query_jobs(page=1, page_size=3)
    check('code == 0', r['code'] == 0)
    check('岗位 total >= 136', r['data']['total'] >= 136)
    check('返回岗位带 types 数组', isinstance(r['data']['items'][0].get('types'), list))
    r = api.query_jobs(industry='工业自动化', page=1, page_size=3)
    check('industry=工业自动化 total >= 1', r['data']['total'] >= 1)

    print('== /api/resources ==')
    r = api.query_resources()
    check('code == 0', r['code'] == 0)
    check('资料分类 total >= 8', r['data']['total'] >= 8)
    check('每个分类带 images 数组', all(isinstance(x.get('images'), list) for x in r['data']['items']))

    print(f'\n{PASS} passed, {FAIL} failed')
    return 1 if FAIL else 0


if __name__ == '__main__':
    raise SystemExit(main())
