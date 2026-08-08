# -*- coding: utf-8 -*-
"""
从 27择校宝典原始数据/data_reports/*.parquet 生成站点 zexiaobao_data.js（择校宝分数分布）。

每个 parquet 文件 = 某校某学院某专业的复试名单：
  初试分/专业课/数学/录取状态(True=录取)
输出 window.ZEXIAO_DATA = [{school, majors: [{major, year, college_info,
  source_scores(进复试名单初试分), ref_scores(录取名单初试分),
  major_scores(专业课), math_scores(数学), course1, course2, foreign_language}]}]

科目信息取自 data_files/26_more.xlsx，学院名优先用 Word 宝典解析结果。
"""

import pandas as pd
import json, os, re, glob

REPORTS = r'C:\Users\51366\Desktop\新建文件夹 (3)\27择校宝典原始数据\data_reports'
MORE = r'C:\Users\51366\Desktop\新建文件夹 (3)\data_files\26_more.xlsx'
PARSED = os.environ.get('ZXB_PARSED', r'C:\Users\51366\AppData\Local\Temp\zxb_parsed.json')
OUT = r'C:\Users\51366\kaoyan-site-template\zexiaobao_data.js'


def norm(s):
    s = re.sub(r'（[^）]*）', '', str(s))
    s = re.sub(r'\([^)]*\)', '', s)
    return s.replace('学院', '').replace('学部', '').replace('研究院', '').replace('系', '').strip()


# 科目映射：26_more（学校, 学院, 专业代码 -> 业务课一/业务课二/外语）
more = pd.read_excel(MORE, sheet_name='Sheet1 ')
courses = {}
for _, r in more.iterrows():
    key = (str(r['院校名称']).strip(), norm(str(r['所属院系'])), str(r['专业代码']).strip())
    courses.setdefault(key, {'数学': str(r['业务课一']), '英语': str(r['外语']), '业务课二': str(r['业务课二'])})

# Word 宝典学院名（带代码）与科目兜底
zxb_colleges = {}
zxb_subs = {}
if os.path.exists(PARSED):
    for s in json.load(open(PARSED, encoding='utf-8')):
        for p in s['专业']:
            if p['学院']:
                zxb_colleges.setdefault((s['学校'], norm(p['学院'])), p['学院'])
            if p['科目']:
                zxb_subs.setdefault((s['学校'], norm(p['学院']), p['代码']), p['科目'])


def math_name(sub):
    for k, v in sub.items():
        if k.startswith('30'):
            return {'301': '(301)数学（一）', '302': '(302)数学（二）', '303': '(303)数学（三）'}.get(k, f'({k}){v}')
    return ''


def eng_name(sub):
    for k, v in sub.items():
        if k.startswith('20'):
            return {'201': '(201)英语（一）', '204': '(204)英语（二）'}.get(k, f'({k}){v}')
    return ''


def course2_name(sub):
    for k, v in sub.items():
        if k.startswith('8'):
            return f'({k}){v}'
    return ''


schools = {}
for f in glob.glob(os.path.join(REPORTS, '**', '*.parquet'), recursive=True):
    rel = os.path.relpath(f, REPORTS)
    school, fn = rel.split(os.sep)
    m = re.match(r'(.+?)_\(([^)]+)\)(.+)\.parquet', fn)
    if not m:
        continue
    college, code, majorname = m.group(1), m.group(2), m.group(3)
    try:
        df = pd.read_parquet(f, columns=['初试分', '专业课', '数学', '录取状态'])
    except Exception:
        continue
    source = [float(x) for x in df['初试分'].dropna().tolist()]
    ref = [float(x) for x in df[df['录取状态'] == True]['初试分'].dropna().tolist()]
    major_scores = [float(x) for x in df['专业课'].dropna().tolist()]
    math_scores = [float(x) for x in df['数学'].dropna().tolist()]
    if not source:
        continue
    # 科目
    ckey = (school, norm(college), code)
    sub = zxb_subs.get(ckey, {})
    c1 = math_name(sub) or (courses.get(ckey, {}).get('数学') or '')
    c2 = course2_name(sub) or (courses.get(ckey, {}).get('业务课二') or '')
    en = eng_name(sub) or (courses.get(ckey, {}).get('英语') or '')
    # 学院名优先用 Word 宝典（带代码），否则用 parquet 文件名
    college_disp = zxb_colleges.get((school, norm(college)), college)
    mj = {
        'major': f'({code}){majorname}', 'year': '2026年一志愿',
        'college_info': f'{school}/{college_disp}',
        'source_scores': source, 'ref_scores': ref,
        'major_scores': major_scores, 'math_scores': math_scores,
        'course1': c1, 'course2': c2, 'foreign_language': en
    }
    schools.setdefault(school, []).append(mj)

out = [{'school': s, 'majors': ms} for s, ms in sorted(schools.items())]

with open(OUT, 'w', encoding='utf-8') as fh:
    fh.write('window.ZEXIAO_DATA = ')
    fh.write(json.dumps(out, ensure_ascii=False))
    fh.write(';\n')

print('学校数:', len(out))
print('专业条数:', sum(len(s['majors']) for s in out))
print('已写入:', OUT)
