# -*- coding: utf-8 -*-
"""
从 parse_zxb.py 的结构化结果生成站点 kaoyan_data.js（控制类）。

记录字段（与站点一致，25 列）：
省份, 学校, 学院, 专业代码, 专业方向,
进复试, 拟录取, 复录比,
复试[最高,最低,平均,中位], 录取[最高,最低,平均,中位],
专业课[最高,最低,平均,中位], 数学平均,
数学科目, 英语科目, 业务课二, 层级
"""

import json, re, os

PARSED = os.environ.get('ZXB_PARSED', r'C:\Users\51366\AppData\Local\Temp\zxb_parsed.json')
XLSX26 = r'C:\Users\51366\Desktop\新建文件夹 (3)\data_files\26.xlsx'
OUT = r'C:\Users\51366\kaoyan-site-template\kaoyan_data.js'

schools = json.load(open(PARSED, encoding='utf-8'))
college_count = {s['学校']: len(s.get('学院') or []) for s in schools}

prov_map = {}
try:
    import pandas as pd
    df = pd.read_excel(XLSX26)
    for _, r in df.iterrows():
        prov_map.setdefault(str(r['招生单位']).strip(), str(r['所在地']).strip())
except Exception as e:
    print('省份表读取失败:', e)


FALLBACK_PROV = {
    '中国矿业大学（徐州）': '江苏省',
    '中国科学院沈阳自动化研究所': '辽宁省',
    '华北电力大学（保定）': '河北省',
    '华北电力大学（北京）': '北京市',
    '国防科技大学': '湖南省',
    '广东工业大学': '广东省',
}


def prov_full(p):
    m = re.search(r'[（(]?\d+[）)]?(.+)$', p or '')
    s = (m.group(1) if m else p or '').strip()
    table = {'北京': '北京市', '上海': '上海市', '天津': '天津市', '重庆': '重庆市',
             '河北': '河北省', '山西': '山西省', '内蒙古': '内蒙古自治区', '辽宁': '辽宁省',
             '吉林': '吉林省', '黑龙江': '黑龙江省', '江苏': '江苏省', '浙江': '浙江省',
             '安徽': '安徽省', '福建': '福建省', '江西': '江西省', '山东': '山东省',
             '河南': '河南省', '湖北': '湖北省', '湖南': '湖南省', '广东': '广东省',
             '广西': '广西壮族自治区', '海南': '海南省', '四川': '四川省', '贵州': '贵州省',
             '云南': '云南省', '西藏': '西藏自治区', '陕西': '陕西省', '甘肃': '甘肃省',
             '青海': '青海省', '宁夏': '宁夏回族自治区', '新疆': '新疆维吾尔自治区'}
    for k, v in table.items():
        if s.startswith(k):
            return v
    return s


def code_of_name(title):
    t = title
    if '控制科学与工程' in t: return '081100'
    if '控制工程' in t: return '085406'
    if '机器人科学与工程' in t: return '0811J1'
    if '机器人工程' in t: return '085510'
    if '人工智能' in t: return '085410'
    if '仪器科学与技术' in t: return '080400'
    if '仪器仪表工程' in t: return '085407'
    if '电气工程' in t: return '085801' if '专硕' in t else '080800'
    if '电子信息' in t: return '085400'
    if '机械' in t: return '085500' if '专硕' in t else '080200'
    if '矿业工程' in t: return '085705'
    if '交通运输' in t: return '086100' if '专硕' in t else '082300'
    if '航空宇航' in t: return '082500'
    if '能源动力' in t: return '085800'
    if '无人系统' in t: return '089902'
    if '控制' in t: return '081100'
    if '低空技术' in t: return '089903'
    return ''


DIR_MARKERS = ['本部', '秦皇岛', '佛山', '深圳', '苏州', '郑州', '威海', '中控', '具身智能',
               '创新班', '实验班', '校企联培', '校区', '研究院', '基地', '联培', '一志愿',
               '工业智能', '超精密', '微系统', '能源动力', '智能选矿']


def clean_name(n):
    """清理专业名称：去掉代码、学硕/专硕、【】、注、尾随数字等"""
    n = re.sub(r'^[0-9A-Za-z]{5,6}\s*', '', n)
    n = re.sub(r'（(?:学术|专业)学位）', '', n)
    n = re.sub(r'【[^】]*】', '', n)
    n = re.sub(r'^[\u4e00-\u9fa5（）()]+(?:学院|学部|研究院|系)[：:]?', '', n)
    n = re.sub(r'注[:：]?.*$', '', n)
    n = re.sub(r'^(?:学硕|专硕)\s*', '', n)
    n = re.sub(r'\s*[①②③④⑤]\s*\d{3}.*$', '', n)
    n = re.sub(r'\s*\d+\s*\(全日制\).*$', '', n)
    n = re.sub(r'（全日制）', '', n)
    n = re.sub(r'\s*\d+\s*$', '', n)
    n = re.sub(r'【\d+】', '', n)
    return n.strip()


def base_name(title):
    t = re.sub(r'^[一二三四五六七八九十]+、', '', title)
    t = re.sub(r'26?考研?', '', t)
    t = t.replace('录取情况分析', '').replace('一志愿', '')
    t = re.sub(r'（(?:学术|专业)学位）', '', t)
    m = re.match(r'^(.+?)(?:（.+?）)?(?:学硕|专硕)$', t)
    name = m.group(1) if m else t
    name = clean_name(name)
    return name


def direction_of(title):
    """标题中的方向/校区标记（排除学院名误判）"""
    t = title.replace('录取情况分析', '')
    for m in re.finditer(r'（(.+?)）', t):
        g = m.group(1)
        if g in DIR_MARKERS or any(k in g for k in ['联培', '创新', '实验班']):
            return g
    return ''


def clean_title(title):
    """从录取分析标题生成专业方向名：去编号/26考研/录取情况分析/计划数字/学硕专硕后缀，学院前缀转括号"""
    t = re.sub(r'^(?:\d+|[一二三四五六七八九十]+)、', '', title)
    t = re.sub(r'26 ?考研?', '', t)
    t = t.replace('录取情况分析', '').replace('一志愿', '')
    t = re.sub(r'（(?:学术|专业)学位）', '', t)
    t = re.sub(r'[\s　]*\d+(\+\d+)+\s*', '', t)
    t = re.sub(r'[\s　]*\d+$', '', t)
    t = re.sub(r'[\s　]*（\d+）$', '', t)
    t = re.sub(r'(学硕|专硕)$', '', t)
    t = t.strip()
    m = re.match(r'^(.+?(?:学院|学部|研究院|系))(.+)$', t)
    if m and len(m.group(1)) <= 12:
        t = m.group(2).strip() + '（' + m.group(1) + '）'
    return t


def fmt_college(c):
    if not c:
        return ''
    c = c.rstrip('：:')
    m = re.match(r'^(\d{3})\s*(.+)$', c)
    return f'({m.group(1)}){m.group(2)}' if m else c
    t = re.sub(r'^[一二三四五六七八九十]+、', '', title)
    t = re.sub(r'26?考研?', '', t)
    t = t.replace('一志愿', '')
    m = re.match(r'^(.+?)(?:（.+?）)?(?:学硕|专硕)$', t)
    if m:
        return m.group(1).strip()
    return t.strip()


def fmt_college(c):
    if not c:
        return ''
    m = re.match(r'^(\d{3})\s*(.+)$', c)
    return f'({m.group(1)}){m.group(2)}' if m else c


def math_code(sub):
    for k, v in sub.items():
        if k.startswith('30'):
            return {'301': '(301)数学（一）', '302': '(302)数学（二）', '303': '(303)数学（三）'}.get(k, f'({k}){v}')
    return ''


def eng_code(sub):
    for k, v in sub.items():
        if k.startswith('20'):
            return {'201': '(201)英语（一）', '204': '(204)英语（二）'}.get(k, f'({k}){v}')
    return ''


def course_code(sub):
    for k, v in sub.items():
        if k.startswith('8'):
            return f'({k}){v}'
    return ''


def sane(v, lo=100, hi=500):
    """初试分合理性：100-500 之外视为解析错误"""
    return v if (v is not None and lo <= v <= hi) else None


def enter_avg_from_brackets(a):
    """从分数段表重算复试平均(复试分列 × 人数 加权)。"""
    pairs = []
    for row in a.get('分数段') or []:
        m = re.match(r'^(\d{3})-(\d{3})$', str(row[0]))
        if not m:
            continue
        lo, hi = int(m.group(1)), int(m.group(2))
        cnt = None
        if len(row) > 1:
            try:
                cnt = float(row[1])
            except (TypeError, ValueError):
                cnt = None
        score = None
        for cell in row[2:]:
            if cell is None or str(cell).strip() in ('', '100%'):
                continue
            try:
                v = float(cell)
            except (TypeError, ValueError):
                continue
            if lo <= v <= hi:
                score = v
                break
        if cnt and cnt > 0 and score is not None:
            pairs.append((score, cnt))
    if pairs:
        return round(sum(s * c for s, c in pairs) / sum(c for _, c in pairs), 1)
    return None


def admit_bounds(a):
    """从分数段表推导录取最高/最低的近似边界"""
    hi = lo = None
    for row in a['分数段']:
        m = re.match(r'^(\d{3})-(\d{3})$', row[0])
        if not m:
            continue
        aidx = 2 if a.get('有复试人数列', True) else 1
        if len(row) > aidx and row[aidx] and re.match(r'^\d+$', row[aidx]) and int(row[aidx]) > 0:
            b_lo, b_hi = int(m.group(1)), int(m.group(2))
            lo = b_lo if lo is None else min(lo, b_lo)
            hi = b_hi if hi is None else max(hi, b_hi)
    return lo, hi


VALID_MAJOR_CODES = {
    '081100', '081101', '081102', '081103', '081104', '081105', '0811J1', '0811J2', '0811J9',
    '085406', '085400', '085410', '085510', '085407', '080400', '080800', '085801',
    '085500', '080200', '080202', '0802J1', '0802J2', '085705', '086100', '082300',
    '082500', '082501', '082600', '085800', '089902', '089903', '140500', '085808',
    '085503', '085504', '086101', '086102', '086104', '08100Z1', '082302', '083700',
    '0837J1', '089901', '085403', '085408', '085409', '083100', '0808J1', '0808Z1',
    '085509', '085510', '1404J7', '0802J3'
}


records = []
used_keys = set()

for sch in schools:
    sname = sch['学校']
    tier = sch['层级']
    prov = prov_full(prov_map.get(sname, '')) or FALLBACK_PROV.get(sname, '')
    major_index = {}
    for p in sch['专业']:
        major_index.setdefault(p['代码'], []).append(p)

    covered_codes = set()
    for a in sch['录取分析']:
        title = a['标题']
        code = ''
        college = ''
        subs = {}
        matched_name = ''
        nm = base_name(title)
        for p in sch['专业']:
            pname = clean_name(p['名称'])
            if pname and (pname in title or (nm and nm in pname)):
                code = p['代码']; college = p['学院']; subs = p['科目']; matched_name = pname
                break
        if not code:
            code = code_of_name(title)
        covered_codes.add(code)
        dname = clean_title(title) or (matched_name or nm or code_of_name(title))
        key = (sname, code, dname, fmt_college(college))
        if key in used_keys:
            continue
        used_keys.add(key)
        enter_max, enter_min, enter_avg = sane(a['复试最高']), sane(a['复试最低']), sane(a['复试平均'])
        if enter_avg is not None and enter_max is not None and enter_min is not None and not (enter_min <= enter_avg <= enter_max):
            re_avg = sane(enter_avg_from_brackets(a), 100, 500)
            enter_avg = re_avg if (re_avg is not None and enter_min <= re_avg <= enter_max) else None
        ad_max, ad_min = sane(a['录取最高']), sane(a['录取最低'])
        ad_avg = sane(a['录取平均'])
        if ad_avg is not None and ad_max is not None and ad_min is not None and not (ad_min <= ad_avg <= ad_max):
            # 宝典"已录取平均"与最高/最低矛盾 → 用分数段总计的总分均分
            ad_avg = sane(a['总分均分'])
            if ad_avg is None or (ad_max is not None and ad_min is not None and not (ad_min <= ad_avg <= ad_max)):
                b_lo, b_hi = admit_bounds(a)
                ad_min, ad_max = b_lo, b_hi
        elif ad_avg is None:
            ad_avg = sane(a['总分均分'])
        if ad_avg is not None and ad_max is not None and ad_avg > ad_max:
            b_lo, b_hi = admit_bounds(a)
            ad_max = b_hi if b_hi is not None else ad_max
        if ad_avg is not None and ad_min is not None and ad_avg < ad_min:
            b_lo, b_hi = admit_bounds(a)
            ad_min = b_lo if b_lo is not None else ad_min
        records.append([
            prov, sname, fmt_college(college), code, dname,
            a['进复试'], a['录取'], a['复录比'],
            enter_max, enter_min, enter_avg, enter_avg,
            ad_max, ad_min, ad_avg, ad_avg,
            None, None, sane(a['专业课均分'], 40, 200), None, sane(a['数学均分']),
            math_code(subs), eng_code(subs), course_code(subs), tier
        ])

    for code, plist in major_index.items():
        if code in covered_codes:
            continue
        for p in plist:
            dname = clean_name(p['名称'])
            if not dname:
                continue
            pcode = code if code in VALID_MAJOR_CODES else (code_of_name(dname) if code_of_name(dname) in VALID_MAJOR_CODES else '')
            if not pcode:
                continue
            key = (sname, pcode, dname, fmt_college(p['学院']))
            if key in used_keys:
                continue
            used_keys.add(key)
            admit = p['实际录取'] if p['实际录取'] is not None else p['招生计划']
            records.append([
                prov, sname, fmt_college(p['学院']), pcode, dname,
                None, admit, None,
                None, None, None, None,
                None, None, None, None,
                None, None, None, None, None,
                math_code(p['科目']), eng_code(p['科目']), course_code(p['科目']), tier
            ])

uniq = records

# ---------- 用 ZEXIAO_DATA（parquet 个人分数）补全缺失的分数统计 ----------
ZXB_JS = os.environ.get('ZEXIAO_JS', r'C:\Users\51366\kaoyan-site-template\zexiaobao_data.js')
try:
    zsrc = open(ZXB_JS, encoding='utf-8').read()
    zdata = json.loads(zsrc.replace('window.ZEXIAO_DATA = ', '').rstrip().rstrip(';'))
except Exception:
    zdata = []


def norm_college(c):
    c = re.sub(r'^\(\d+\)', '', str(c))
    c = re.sub(r'[：:]$', '', c)
    c = re.sub(r'（[^）]*）', '', c)
    c = c.replace('学院', '').replace('学部', '').replace('研究院', '').replace('系', '').strip()
    return c


def zexiao_lookup(school, code, college):
    nc = norm_college(college)
    hits = []
    for s in zdata:
        if s['school'] != school:
            continue
        for m in s['majors']:
            mm = re.match(r'^\(([^)]+)\)(.+)', m.get('major', ''))
            if not mm or mm.group(1) != code:
                continue
            ci = m.get('college_info', '')
            ci_col = ci.split('/')[-1] if '/' in ci else ci
            if nc and nc not in norm_college(ci_col) and norm_college(ci_col) not in nc:
                continue
            hits.append(m)
    if len(hits) != 1:
        return None
    m = hits[0]

    def st(arr):
        arr = [x for x in (arr or []) if isinstance(x, (int, float)) and 100 <= x <= 500]
        return (len(arr), max(arr), min(arr), sum(arr) / len(arr)) if arr else None

    return {'enter': st(m.get('source_scores')), 'admit': st(m.get('ref_scores')),
            'course': st(m.get('major_scores')), 'math': st(m.get('math_scores'))}


# parquet 补分已移除(全权按 Word 宝典数据统计)

COLUMNS = ['province', 'school', 'college', 'majorCode', 'majorName', 'enterNum', 'admitNum', 'ratio',
           'enterMax', 'enterMin', 'enterMid', 'enterAvg', 'admitMax', 'admitMin', 'admitAvg', 'admitMid',
           'courseMax', 'courseMin', 'courseAvg', 'courseMid', 'mathAvg', 'math', 'english', 'course2', 'tier']


def mean(vals):
    vals = [v for v in vals if v is not None]
    return round(sum(vals) / len(vals), 1) if vals else None


def wmean(vals, weights):
    vw = [(v, w) for v, w in zip(vals, weights) if v is not None and w]
    if vw:
        return round(sum(v * w for v, w in vw) / sum(w for _, w in vw), 1)
    plain = [v for v in vals if v is not None]
    return round(sum(plain) / len(plain), 1) if plain else None


# ---- schoolStats（每校聚合） ----
by_school = {}
for r in uniq:
    by_school.setdefault(r[1], []).append(r)
school_stats = []
for sname, rs in by_school.items():
    colleges = [r[2] for r in rs if r[2]]
    enters = [r[5] for r in rs if r[5] is not None]
    admits = [r[6] for r in rs if r[6] is not None]
    enter_sum = sum(enters) if enters else None
    admit_sum = sum(admits) if admits else None
    ratio = round(enter_sum / admit_sum, 2) if (enter_sum and admit_sum) else None
    school_stats.append({
        '省份/自治区': rs[0][0], '学校': sname, 'college': college_count.get(sname) or len(set(colleges)), 'enter': enter_sum,
        'admit': admit_sum, 'count': len(rs), 'avgEnter': wmean([r[11] for r in rs], [r[5] or 0 for r in rs]),
        'avgAdmit': wmean([r[14] for r in rs], [r[6] or 0 for r in rs]),
        'avgCourse': wmean([r[18] for r in rs], [r[6] or 0 for r in rs]),
        'ratio': ratio, 'tier': rs[0][24]
    })
school_stats.sort(key=lambda x: -(x['admit'] or 0))

# ---- provinceStats / majorStats ----
prov = {}
for r in uniq:
    p = r[0] or '未知'
    prov.setdefault(p, set()).add(r[1])
province_stats = [{'省份/自治区': p, '学校数': len(ss), '专业数': sum(1 for r in uniq if (r[0] or '未知') == p)}
                  for p, ss in sorted(prov.items())]
majors = {}
for r in uniq:
    key = (r[3], r[4])
    majors.setdefault(key, set()).add(r[1])
major_stats = [{'专业名称': f'({k[0]}){k[1]}' if k[0] else k[1], '学校数': len(ss), '专业数': sum(1 for r in uniq if (r[3], r[4]) == k)}
               for k, ss in sorted(majors.items(), key=lambda x: -len(x[1]))]

# ---- scoreDist / ratioDist ----
score_dist = {'<300': 0, '300-319': 0, '320-339': 0, '340-359': 0, '360-379': 0, '380-399': 0, '400+': 0, '未知': 0}
for r in uniq:
    a = r[14]
    if a is None:
        score_dist['未知'] += 1
    elif a < 300:
        score_dist['<300'] += 1
    else:
        lo = int(a // 20 * 20)
        key = f'{lo}-{lo + 19}'
        score_dist[key] = score_dist.get(key, 0) + 1
ratio_dist = {'1.0(等额)': 0, '1.0-1.2': 0, '1.2-1.5': 0, '1.5-2.0': 0, '2.0+': 0, '未知': 0}
for r in uniq:
    rt = r[7]
    if rt is None:
        ratio_dist['未知'] += 1
    elif rt <= 1.0:
        ratio_dist['1.0(等额)'] += 1
    elif rt < 1.2:
        ratio_dist['1.0-1.2'] += 1
    elif rt < 1.5:
        ratio_dist['1.2-1.5'] += 1
    elif rt < 2.0:
        ratio_dist['1.5-2.0'] += 1
    else:
        ratio_dist['2.0+'] += 1

# ---- courseStats / mathDist / engDist ----
courses = {}
for r in uniq:
    c = r[23]
    if not c:
        continue
    m = re.match(r'^\((\d+)\)(.+)$', c)
    code = m.group(1) if m else c
    name = m.group(2) if m else c
    courses.setdefault(code, {'name': name, 'schools': set(), 'recs': []})
    courses[code]['schools'].add(r[1])
    courses[code]['recs'].append(r)
course_stats = [{'专业课代码': k, 'schoolCount': len(v['schools']), 'count': len(v['recs']),
                 'avgAdmit': mean([r[14] for r in v['recs']]), 'name': v['name']}
                for k, v in sorted(courses.items(), key=lambda x: -len(x[1]['recs']))]
math_dist = {}
eng_dist = {}
for r in uniq:
    mk = r[21] or '-'
    ek = r[22] or '-'
    math_dist[mk] = math_dist.get(mk, 0) + 1
    eng_dist[ek] = eng_dist.get(ek, 0) + 1

meta = {
    'total': len(uniq), 'schools': len(by_school), 'provinces': len(prov),
    'majors': len(majors), 'enter': sum(r[5] or 0 for r in uniq), 'admit': sum(r[6] or 0 for r in uniq)
}

# 宝典学院名(用于记录中学院缺失时补充)
school_colleges = {}
for sch in schools:
    cols = []
    for c in (sch.get('学院') or []):
        c = fmt_college(str(c).strip())
        if c and c not in cols:
            cols.append(c)
    if cols:
        school_colleges[sch['学校']] = cols

out = {
    'records': uniq, 'columns': COLUMNS, 'provinceStats': province_stats, 'majorStats': major_stats,
    'schoolStats': school_stats, 'scoreDist': score_dist, 'ratioDist': ratio_dist,
    'courseStats': course_stats, 'mathDist': math_dist, 'engDist': eng_dist, 'meta': meta,
    'schoolColleges': school_colleges
}

with open(OUT, 'w', encoding='utf-8') as f:
    f.write('window.KAOYAN_DATA = ')
    f.write(json.dumps(out, ensure_ascii=False))
    f.write(';\n')

print('生成记录数:', len(uniq))
print('学校数:', len(by_school), '| 省份:', len(prov), '| 专业:', len(majors))
print('代码分布:', {c: sum(1 for r in uniq if r[3] == c) for c in sorted(set(r[3] for r in uniq))})
print('已写入:', OUT)
