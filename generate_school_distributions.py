# -*- coding: utf-8 -*-
"""生成 school_distributions.js: 每校每方向的总分段分布 + 数学/专业课分数分布。
供首页 SPA 详情面板(renderDetail)渲染各方向分数分布图。
"""
import json, os, re, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

PARSED = os.environ.get('ZXB_PARSED', r'C:\Users\51366\AppData\Local\Temp\zxb_parsed.json')
ZEXIAO_JS = r'C:\Users\51366\kaoyan-site-template\zexiaobao_data.js'
OUT = r'C:\Users\51366\kaoyan-site-template\school_distributions.js'

schools = json.load(open(PARSED, encoding='utf-8'))
zs = open(ZEXIAO_JS, encoding='utf-8').read()
ZDATA = json.loads(zs.replace('window.ZEXIAO_DATA = ', '').rstrip().rstrip(';'))

# ---- 复用 generate_school_detail_pages 的匹配逻辑 ----
def zexiao_scores(school, title):
    m_code = re.search(r'(\d{5,6}|[0-9A-Za-z]{5,6})', title or '')
    code = m_code.group(1) if m_code else ''
    math_all, course_all = [], []
    for s in ZDATA:
        if s['school'] != school:
            continue
        for m in s['majors']:
            mm = re.match(r'^\(([^)]+)\)\s*(.*)', m.get('major', ''))
            mcode = mm.group(1) if mm else ''
            mname = mm.group(2).strip() if mm and mm.group(2) else ''
            hit = False
            if code and mcode == code:
                hit = True
            elif mname and mname in (title or ''):
                hit = True
            elif code and mcode and mcode in (title or ''):
                hit = True
            if hit:
                math_all += [x for x in (m.get('math_scores') or []) if isinstance(x, (int, float)) and 50 <= x <= 200]
                course_all += [x for x in (m.get('major_scores') or []) if isinstance(x, (int, float)) and 40 <= x <= 200]
    if not math_all and not course_all:
        return None
    return {'math': math_all, 'course': course_all}


def word_band_dist(a):
    bands = a.get('分数段') or []
    labels, math_vals, course_vals = [], [], []
    for b in bands:
        if len(b) >= 8:
            lo = re.match(r'^(\d{3})-(\d{3})$', str(b[0]))
            if not lo:
                continue
            labels.append(str(b[0]))
            math_vals.append(round(float(b[6]), 1) if re.match(r'^\d+(\.\d+)?$', str(b[6])) else 0)
            course_vals.append(round(float(b[7]), 1) if re.match(r'^\d+(\.\d+)?$', str(b[7])) else 0)
    if not labels:
        return None
    return {'labels': labels, 'math': math_vals, 'course': course_vals}


def total_dist(a):
    bands = a.get('分数段') or []
    labels, enter, admit = [], [], []
    for b in bands:
        labels.append(str(b[0]))
        enter.append(int(b[1]) if len(b) > 1 and str(b[1]).isdigit() else 0)
        admit.append(int(b[2]) if len(b) > 2 and str(b[2]).isdigit() else 0)
    return {'labels': labels, 'enter': enter, 'admit': admit} if labels else None


def hist_scores(scores, bin_size=10):
    if not scores:
        return None
    lo = int(min(scores) // bin_size * bin_size)
    hi = int(max(scores) // bin_size * bin_size)
    labels, counts = [], []
    for v in range(lo, hi + 1, bin_size):
        labels.append(f'{v}-{v + 9}')
        counts.append(sum(1 for x in scores if v <= x < v + 10))
    counts[-1] += sum(1 for x in scores if x >= hi + 10)
    return {'labels': labels, 'counts': counts}


out = {}
total_dirs = 0
for sch in schools:
    dists = []
    for a in sch.get('录取分析') or []:
        td = total_dist(a)
        wb = word_band_dist(a)
        zs2 = zexiao_scores(sch['学校'], a.get('标题', ''))
        mathDist = courseDist = None
        if zs2 and zs2.get('math'):
            mathDist = {'type': 'hist', **hist_scores(zs2['math'])}
        elif wb:
            mathDist = {'type': 'band', 'labels': wb['labels'], 'values': wb['math']}
        if zs2 and zs2.get('course'):
            courseDist = {'type': 'hist', **hist_scores(zs2['course'])}
        elif wb:
            courseDist = {'type': 'band', 'labels': wb['labels'], 'values': wb['course']}
        dists.append({
            'title': a.get('标题', ''),
            'total': td,
            'math': mathDist,
            'course': courseDist,
        })
        total_dirs += 1
    if dists:
        out[sch['学校']] = dists

with open(OUT, 'w', encoding='utf-8') as f:
    f.write('window.SCHOOL_DIST = ')
    f.write(json.dumps(out, ensure_ascii=False))
    f.write(';\n')

print('分布数据文件生成:', OUT)
print('学校数:', len(out), ', 方向数:', total_dirs)
