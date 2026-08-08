# -*- coding: utf-8 -*-
"""桌面《27考研择校宝典_录取数据表.xlsx》→ 老站 kaoyan_data.js

字段映射到老站 records 25 列格式（见 COLUMNS）。
省份/院校层级：从旧 kaoyan_data.js 提取（school → province / tier）。
进复试人数：Excel 无此列，按 复录比 × 招生人数 四舍五入推算。
输出：kaoyan_data.js（records + columns + schoolStats + meta + schoolColleges）
"""
import json
import math
import re
import openpyxl

XLSX = r'C:/Users/51366/Desktop/27考研择校宝典_录取数据表.xlsx'
OLD = 'kaoyan_data.js'

# 进复试 / 拟录取 两侧的"科目"列名重复，按显式列索引读取
COL = {
    'school': 0, 'college': 1, 'majorName': 2, 'enroll': 3, 'ratio': 4,
    'reExMax': 5, 'reExMin': 6, 'reExAvg': 7, 'reExPolAvg': 8,
    'engSubject': 9, 'reExEngAvg': 10, 'mathSubject': 11, 'reExMathAvg': 12,
    'proSubject': 13, 'reExProAvg': 14,
    'luMax': 15, 'luMin': 16, 'luAvg': 17, 'luPolAvg': 18,
    'luEngAvg': 20, 'luMathAvg': 22, 'luProAvg': 24,
}

COLUMNS = ["province", "school", "college", "majorCode", "majorName",
           "enterNum", "admitNum", "ratio",
           "enterMax", "enterMin", "enterMid", "enterAvg",
           "admitMax", "admitMin", "admitAvg", "admitMid",
           "courseMax", "courseMin", "courseAvg", "courseMid",
           "mathAvg", "math", "english", "course2", "tier"]


def num(v):
    if v is None:
        return None
    s = str(v).strip()
    if s == '' or s == '-':
        return None
    try:
        return float(s)
    except ValueError:
        return None


def code_of(name):
    m = re.search(r'\d{6}', str(name or ''))
    return m.group(0) if m else ''


def r1(x):
    return None if x is None else round(x, 1)


def r2(x):
    return None if x is None else round(x, 2)


# ---------- 旧数据映射：school → province / tier ----------
old_text = open(OLD, encoding='utf-8').read()
old = json.loads(old_text[old_text.index('=') + 1: old_text.rstrip().rindex(';')])
prov_map, tier_map = {}, {}
for rec in old['records']:
    if rec[1] not in prov_map:
        prov_map[rec[1]] = rec[0]
    if rec[1] not in tier_map:
        tier_map[rec[1]] = rec[24] or '双非'

# ---------- 读 Excel ----------
wb = openpyxl.load_workbook(XLSX, read_only=True)
ws = wb.worksheets[0]
rows = list(ws.iter_rows(values_only=True))
wb.close()
header = rows[0]
data_rows = [r for r in rows[1:] if r[COL['school']] not in (None, '')]
print('Excel 数据行:', len(data_rows))

records = []
for r in data_rows:
    school = str(r[COL['school']]).strip()
    college = str(r[COL['college']]).strip() if r[COL['college']] is not None else ''
    major = str(r[COL['majorName']]).strip() if r[COL['majorName']] is not None else ''
    ratio = num(r[COL['ratio']])
    enroll = num(r[COL['enroll']])
    enter = round(ratio * enroll) if (ratio is not None and enroll is not None) else None

    reExAvg = num(r[COL['reExAvg']])
    luAvg = num(r[COL['luAvg']])
    proAvg = num(r[COL['reExProAvg']])

    records.append([
        prov_map.get(school, '未知'), school, college, code_of(major), major,
        enter, enroll, ratio,
        num(r[COL['reExMax']]), num(r[COL['reExMin']]), reExAvg, reExAvg,
        num(r[COL['luMax']]), num(r[COL['luMin']]), luAvg, luAvg,
        None, None, proAvg, proAvg,
        num(r[COL['reExMathAvg']]),
        str(r[COL['mathSubject']]).strip() if r[COL['mathSubject']] is not None else '',
        str(r[COL['engSubject']]).strip() if r[COL['engSubject']] is not None else '',
        str(r[COL['proSubject']]).strip() if r[COL['proSubject']] is not None else '',
        tier_map.get(school, '双非'),
    ])

# ---------- schoolStats（镜像 index.js applyFilter 的聚合口径） ----------
grouped = {}
for rec in records:
    prov, school, college = rec[0], rec[1], rec[2]
    enterNum, admitNum = rec[5] or 0, rec[6] or 0
    enterAvg, admitAvg, courseAvg = rec[11] or 0, rec[14] or 0, rec[18] or 0
    tier = rec[24]
    k = prov + '|' + school
    ratio = rec[7]
    g = grouped.setdefault(k, {'province': prov, 'school': school, 'tier': tier,
                               'college': set(), 'n': 0, 'e': 0, 'a': 0,
                               'avg_e': 0.0, 'avg_a': 0.0, 'avg_p': 0.0,
                               'se': 0.0, 'sa': 0.0, 'sp': 0.0, 'ratios': [], 'ne': 0, 'na': 0, 'np': 0})
    if rec[11] is not None: g['ne'] += 1
    if rec[14] is not None: g['na'] += 1
    if rec[18] is not None: g['np'] += 1
    g['college'].add(college)
    g['n'] += 1
    g['e'] += enterNum
    g['a'] += admitNum
    g['avg_e'] += enterAvg * enterNum
    g['avg_a'] += admitAvg * admitNum
    g['avg_p'] += courseAvg * admitNum
    g['se'] += enterAvg
    g['sa'] += admitAvg
    g['sp'] += courseAvg
    if ratio is not None and ratio > 0:
        g['ratios'].append(ratio)

schoolStats = []
for g in grouped.values():
    e, a, n = g['e'], g['a'], g['n']
    schoolStats.append({
        '省份/自治区': g['province'], '学校': g['school'], 'tier': g['tier'],
        'college': len(g['college']), 'count': n, 'enter': e, 'admit': a,
        'avgEnter': r1(g['avg_e'] / e) if e else (r1(g['se'] / g['ne']) if g['ne'] else None),
        'avgAdmit': r1(g['avg_a'] / a) if a else (r1(g['sa'] / g['na']) if g['na'] else None),
        'avgCourse': r1(g['avg_p'] / a) if a else (r1(g['sp'] / g['np']) if g['np'] else None),
        'ratio': r2(e / a) if (e and a) else (r2(sum(g['ratios']) / len(g['ratios'])) if g['ratios'] else None),
    })
schoolStats.sort(key=lambda s: s['tier'])

# ---------- meta ----------
colleges_by_school = {}
for rec in records:
    colleges_by_school.setdefault(rec[1], set()).add(rec[2])
school_colleges = {k: sorted(v) for k, v in colleges_by_school.items()}

meta = {
    'total': len(records),
    'schools': len(grouped),
    'provinces': len({rec[0] for rec in records}),
    'majors': len({(rec[3] or rec[4]) for rec in records}),
    'enter': sum(rec[5] or 0 for rec in records),
    'admit': sum(rec[6] or 0 for rec in records),
}

data = {
    'records': records,
    'columns': COLUMNS,
    'schoolStats': schoolStats,
    'meta': meta,
    'schoolColleges': school_colleges,
}

js = 'window.KAOYAN_DATA = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n'
open(OLD, 'w', encoding='utf-8').write(js)

print('记录:', meta['total'], '学校:', meta['schools'], '省份:', meta['provinces'], '专业:', meta['majors'])
print('进复试合计:', meta['enter'], '拟录取合计:', meta['admit'])
print('写入完成:', OLD)
