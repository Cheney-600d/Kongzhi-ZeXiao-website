# -*- coding: utf-8 -*-
"""
解析《27考研择校宝典》Word 文档（控制类）为结构化 JSON。

用法：
  1. 先把 docx 文本抽取出来（见下），或直接改 TEXT 指向已抽取文本
  2. python parse_zxb.py

抽取文本（一次性，需要 99MB XML 解码）：
  python -c "
  import zipfile, re
  z = zipfile.ZipFile(r'桌面上docx路径')
  xml = z.read('word/document.xml').decode('utf-8', errors='replace')
  paras = []
  for p in re.findall(r'<w:p[ >].*?</w:p>', xml, flags=re.S):
      paras.append(''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>', p)))
  open(r'zxb_text.txt', 'w', encoding='utf-8').write('\\n'.join(paras))
  "

输出：zxb_parsed.json（每校一节：简介/学院/学科评估/专业/复试线/历年招生/录取分析）
"""

import re, json, os, sys

TEXT = os.environ.get('ZXB_TEXT', r'C:\Users\51366\AppData\Local\Temp\zxb_text.txt')
OUT = os.environ.get('ZXB_OUT', r'C:\Users\51366\AppData\Local\Temp\zxb_parsed.json')

lines = [l.rstrip() for l in open(TEXT, encoding='utf-8').read().split('\n')]
N = len(lines)


def num(s):
    if s is None:
        return None
    s = str(s).replace('..', '.').replace('．', '.').strip()
    m = re.search(r'-?\d+(?:\.\d+)?', s)
    return float(m.group(0)) if m else None


# ---------- 目录与章节定位 ----------
toc_start = next(i for i, l in enumerate(lines) if l.strip() == '目录')
toc_end = next(i for i in range(toc_start + 1, N) if lines[i].strip() == '27考研万人教育全程班详情')
school_names, school_tier = [], {}
tier = None
for i in range(toc_start + 1, toc_end):
    l = lines[i].strip()
    if l.startswith('一、985院校'):
        tier = '985'; continue
    if l.startswith('二、211院校'):
        tier = '211'; continue
    if l.startswith('三、普通院校'):
        tier = '双非'; continue
    if l.startswith(('27考研', '万人教育', '控制院校', '最新考情', '26考研', '《致')):
        continue
    m = re.match(r'^(.+?)(\d+)$', l)
    if m and tier:
        school_names.append(m.group(1))
        school_tier[m.group(1)] = tier

body985 = next(i for i in range(toc_end, N) if lines[i].strip() == '一、985院校')
sections = []
prev = body985 + 1
for name in school_names:
    for i in range(prev, min(prev + 3000, N)):
        if lines[i].strip() == name:
            sections.append((name, i))
            prev = i + 1
            break


def nxt(idx, stop):
    i = idx
    while i < stop and not lines[i].strip():
        i += 1
    return i


def find_sec(titles, from_i, end):
    for j in range(from_i, min(from_i + 400, end)):
        if lines[j].strip() in titles:
            return j
    return None


def parse_analysis(t, end):
    """一段录取情况分析：进复试/录取/复录比/最高最低平均分/分数段（含各科均分）"""
    sec = {'标题': lines[t].strip(), '复试最高': None, '复试最低': None, '复试平均': None,
           '录取最高': None, '录取最低': None, '录取平均': None, '进复试': None, '录取': None, '复录比': None,
           '分数段': [], '政治均分': None, '英语均分': None, '数学均分': None, '专业课均分': None, '总分均分': None,
           '有复试人数列': True, '_layout': None}
    # 标题被换行拆成"…录取情况 / 分析"时拼接
    if sec['标题'].endswith('录取情况'):
        nxtline = next((lines[u].strip() for u in range(t + 1, min(t + 3, end)) if lines[u].strip()), '')
        if nxtline == '分析':
            sec['标题'] = sec['标题'] + '分析'
    for u in range(t + 1, min(t + 130, end)):
        ll = lines[u].strip()
        if not ll:
            continue
        if re.match(r'^(?:\d+|[一二三四五六七八九十]+)、', ll):
            break
        # 转置格式：行标签 + 3 个值（最高/最低/平均）
        if ll == '进入复试人员初试成绩':
            vals = [lines[v].strip() for v in range(u + 1, min(u + 6, end))
                    if lines[v].strip() and not re.match(r'^[一二三四五六七八九十]+、', lines[v].strip())][:3]
            if len(vals) == 3:
                sec['复试最高'] = num(vals[0]); sec['复试最低'] = num(vals[1]); sec['复试平均'] = num(vals[2])
            continue
        if ll == '已录取人员初试成绩':
            vals = [lines[v].strip() for v in range(u + 1, min(u + 6, end))
                    if lines[v].strip() and not re.match(r'^[一二三四五六七八九十]+、', lines[v].strip())][:3]
            if len(vals) == 3:
                sec['录取最高'] = num(vals[0]); sec['录取最低'] = num(vals[1]); sec['录取平均'] = num(vals[2])
            continue
        g = re.search(r'进入复试人员初试成绩(最高|最低|平均)分[：:]?\s*([\d.]+)', ll)
        if g:
            sec[{'最高': '复试最高', '最低': '复试最低', '平均': '复试平均'}[g.group(1)]] = num(g.group(2))
        g = re.search(r'已录取人员初试成绩(最高|最低|平均)分[：:]?\s*([\d.]+)', ll)
        if g:
            sec[{'最高': '录取最高', '最低': '录取最低', '平均': '录取平均'}[g.group(1)]] = num(g.group(2))
        g = re.search(r'一志愿\s*(\d+)人\s*进复试', ll) or re.search(r'进入?复试(\d+)人', ll)
        if g:
            sec['进复试'] = int(g.group(1))
        g = re.search(r'(?:实际共?|拟)录取(\d+)人', ll)
        if g:
            sec['录取'] = int(g.group(1))
        g = re.search(r'复录比[为是]?\s*[：:]?\s*(?:\d+\s*[:：]\s*)?([\d.]+)', ll)
        if g:
            sec['复录比'] = num(g.group(1))
        # 列式转置表：标签行 + 值行（如沈阳工业大学）
        if ll == '学科' and lines[u + 1].strip() == '一志愿拟录取人数':
            v = u + 5
            while v < end and not lines[v].strip():
                v += 1
            row = [lines[v + k].strip() for k in range(5)]
            if len(row) >= 5 and re.match(r'^\d+$', row[1]):
                sec['录取'] = int(row[1])
                sec['录取最高'] = num(row[2]); sec['录取最低'] = num(row[3]); sec['录取平均'] = num(row[4])
        if ll == '一志愿进复试人数' and lines[u + 1].strip() == '一志愿进复试最高分':
            v = u + 5
            while v < end and not lines[v].strip():
                v += 1
            row = [lines[v + k].strip() for k in range(4)]
            if len(row) >= 4 and re.match(r'^\d+$', row[0]):
                sec['进复试'] = int(row[0])
                sec['复试最高'] = num(row[1]); sec['复试最低'] = num(row[2]); sec['复试平均'] = num(row[3])
        # 个人分数列表："初试成绩分别为：386、382、357、339、330"
        g = re.search(r'初试成绩分别为[：:]\s*([\d、，\s]+)', ll)
        if g:
            vals = [num(x) for x in re.split(r'[、，,\s]+', g.group(1).strip()) if re.match(r'^\d', x)]
            if vals:
                sec['录取最高'] = max(vals); sec['录取最低'] = min(vals)
                sec['录取平均'] = round(sum(vals) / len(vals), 1)
        # 单个考生："初试总分282分"
        g = re.search(r'初试(?:成绩)?总分\s*(\d+)\s*分', ll)
        if g and sec['录取平均'] is None:
            sec['录取最高'] = sec['录取最低'] = sec['录取平均'] = num(g.group(1))
        if g and sec['复试平均'] is None and sec['录取'] == 0:
            sec['复试最高'] = sec['复试最低'] = sec['复试平均'] = num(g.group(1))
        # 紧凑格式：一志愿进入复试14人，实际共录取7人，…初试成绩最高分431，最低分330，平均分380，复录比1:2
        if re.search(r'实际共?录取\d+人', ll) and '已录取人员' not in ll:
            g = re.search(r'最高分[：:]?\s*([\d.]+)', ll)
            if g:
                sec['录取最高'] = num(g.group(1))
            g = re.search(r'最低分[：:]?\s*([\d.]+)', ll)
            if g:
                sec['录取最低'] = num(g.group(1))
            g = re.search(r'平均分[：:]?\s*([\d.]+)', ll)
            if g:
                sec['录取平均'] = num(g.group(1))
            # 紧凑格式只有一组分数（进入复试/录取共用），复试与录取同步
            if sec['复试平均'] is None:
                sec['复试最高'] = sec['录取最高']
                sec['复试最低'] = sec['录取最低']
                sec['复试平均'] = sec['录取平均']
        if re.match(r'^(\d{3})-(\d{3})$', ll) or ll == '总计':
            cells = [ll]
            for v in range(u + 1, min(u + 11, end)):
                cc = lines[v].strip()
                if re.match(r'^\d+(\.\d+)?%?$', cc) or cc == '':
                    cells.append(cc)
                    if len(cells) >= 11:
                        break
                else:
                    break
            clean = [c for c in cells if c != '']
            if sec['_layout'] is None:
                head = '\n'.join(lines[max(t, u - 18):u])
                sec['_layout'] = 'A' if ('复试人数' in head and '录取人数' in head) else 'B'
                sec['有复试人数列'] = (sec['_layout'] == 'A')
            if ll == '总计':
                # A: [总计, 复试, 录取, 百分比, 政治, 英语, 数学, 专业课, 总分均分, 备注]
                # B: [总计, 录取, 政治, 英语, 数学, 专业课, 总分均分, 备注]
                if sec['_layout'] == 'A' and len(clean) >= 9:
                    if re.match(r'^\d+$', clean[1]):
                        sec['进复试'] = int(clean[1])
                    if re.match(r'^\d+$', clean[2]):
                        sec['录取'] = int(clean[2])
                    sec['政治均分'] = num(clean[4]); sec['英语均分'] = num(clean[5])
                    sec['数学均分'] = num(clean[6]); sec['专业课均分'] = num(clean[7])
                    sec['总分均分'] = num(clean[8])
                elif sec['_layout'] == 'B' and len(clean) >= 7:
                    if re.match(r'^\d+$', clean[1]):
                        sec['录取'] = int(clean[1])
                    # B: [分数段, 录取, 政治, 英语, 数学, 专业课, 总分(, 备注)]
                    sec['政治均分'] = num(clean[2]); sec['英语均分'] = num(clean[3])
                    sec['数学均分'] = num(clean[4]); sec['专业课均分'] = num(clean[5])
                    sec['总分均分'] = num(clean[6]) if len(clean) >= 7 else None
            else:
                sec['分数段'].append(cells)
    # 分数段求和兜底（无"实际录取X人"总结、无总计行时）
    if sec['录取'] is None and sec['分数段']:
        aidx = 2 if sec.get('有复试人数列', True) else 1
        total = sum(int(r[aidx]) for r in sec['分数段'] if len(r) > aidx and re.match(r'^\d+$', r[aidx]))
        if total:
            sec['录取'] = total
    if sec['进复试'] is None and sec['分数段'] and sec.get('有复试人数列', True):
        total = sum(int(r[1]) for r in sec['分数段'] if len(r) > 1 and re.match(r'^\d+$', r[1]))
        if total:
            sec['进复试'] = total
    # 无总计行时，用分数段按人数加权计算各科均分（口径：各科均分来自进复试名单）
    if sec['专业课均分'] is None and sec['分数段']:
        layout = sec.get('_layout', 'A')
        if layout == 'A':
            idx_score, idx_w = 4, 1
        else:
            idx_score, idx_w = 2, 1

        def wavg(col):
            s = 0
            d = 0
            for r in sec['分数段']:
                if len(r) > col and re.match(r'^\d+(\.\d+)?$', r[col]):
                    w = int(r[idx_w]) if (len(r) > idx_w and re.match(r'^\d+$', r[idx_w]) and int(r[idx_w]) > 0) else 1
                    s += w * num(r[col])
                    d += w
            return round(s / d, 1) if d else None

        sec['政治均分'] = sec['政治均分'] or wavg(idx_score)
        sec['英语均分'] = sec['英语均分'] or wavg(idx_score + 1)
        sec['数学均分'] = sec['数学均分'] or wavg(idx_score + 2)
        sec['专业课均分'] = sec['专业课均分'] or wavg(idx_score + 3)
        sec['总分均分'] = sec['总分均分'] or wavg(idx_score + 4)
    return sec


def parse_school(name, start, end):
    sch = {'学校': name, '层级': school_tier.get(name, ''), '简介': '', '学院': [], '学科评估': '',
           '专业': [], '复试线': [], '历年招生': [], '录取分析': []}
    i = start
    j = find_sec(['学校简介'], i, end)
    if j is not None:
        sch['简介'] = lines[nxt(j + 1, end)].strip()
    j = find_sec(['学院'], i, end)
    if j is not None:
        k = nxt(j + 1, end)
        cols = []
        while k < end:
            l = lines[k].strip()
            if not l:
                k += 1
                continue
            if re.match(r'^\(\d{3}\)[\s\u4e00-\u9fa5（）()、，]+$', l) or \
               re.match(r'^(?:\d{3})?[\u4e00-\u9fa5（）()]+(?:学院|学部|研究院|所|系)[、，]?$', l):
                cols.append(l.rstrip('、，'))
                k += 1
                continue
            break
        sch['学院'] = cols if cols else [x.strip() for x in re.split(r'[、，,]', lines[nxt(j + 1, end)].strip()) if x.strip()]
    j = find_sec(['控制学科评估排名'], i, end)
    if j is not None:
        sch['学科评估'] = lines[nxt(j + 1, end)].strip()
    # ---- 学科介绍（格式A：东北大学式；格式B：清华式） ----
    j = find_sec(['一、26考研学科介绍', '26考研学科介绍', '一、27考研学科介绍', '27考研学科介绍'], i, end)
    if j is not None:
        k = j + 1
        cur_col = ''
        while k < end:
            l = lines[k].strip()
            if not l:
                k += 1
                continue
            if re.match(r'^[一二三四五六七八九十]+、', l):
                break
            m_col = re.match(r'^(?:(\d{3})\s*)?([\u4e00-\u9fa5（）()]+(?:学院|学部|研究院|所|系))[:：]?', l)
            if m_col and '招生计划' not in l and '（' not in l and '注' not in l:
                cur_col = l
                k += 1
                continue
            m_a = re.match(r'^（([0-9A-Za-z]{5,})）(.+?)(【(.+?)】)?$', l)
            m_b = re.match(r'^(\d{6}|[0-9A-Za-z]{5,})[\s　]*([\u4e00-\u9fa5A-Za-z（）()]+?)(?:（(?:学术|专业)学位）)?\s*(\d+)?\s*人?\s*(（[^）]*）)?\s*(注.*)?$', l)
            major = None
            if m_a and m_a.group(2).strip() and '招生' not in m_a.group(2):
                bracket = m_a.group(4) or ''
                plan = re.search(r'招生计划为(\d+)', bracket)
                admit = re.search(r'实际录取人数?(\d+)人', bracket)
                chg = re.search(r'相比于25(增加|减少|不变)(\d*)人?', bracket)
                major = {'学院': cur_col, '代码': m_a.group(1), '名称': m_a.group(2).strip(),
                         '招生计划': int(plan.group(1)) if plan else None,
                         '实际录取': int(admit.group(1)) if admit else None,
                         '变化': (chg.group(1) + (chg.group(2) or '')) if chg else '', '科目': {}, '备注': ''}
            m_c = re.match(r'^(?:([\u4e00-\u9fa5（）()]+(?:学院|学部|研究院|所|系))[\s　]*)?（([0-9A-Za-z]{5,})）([\u4e00-\u9fa5A-Za-z（）()]+?)(?:[\s　]*【|（|$)', l)
            if m_c and m_c.group(3).strip() and not re.match(r'^\d+$', m_c.group(3).strip()):
                plan_c = re.search(r'【[^】]*】\s*(\d+)', l)
                major = {'学院': cur_col or m_c.group(1) or '', '代码': m_c.group(2), '名称': m_c.group(3).strip(),
                         '招生计划': int(plan_c.group(1)) if plan_c else None,
                         '实际录取': None, '变化': '', '科目': {}, '备注': ''}
            elif m_b and m_b.group(2).strip() and not re.match(r'^\d+$', m_b.group(2).strip()) \
                    and '方向' not in m_b.group(2) and '科目' not in m_b.group(2) and '计划' not in m_b.group(2):
                major = {'学院': cur_col, '代码': m_b.group(1), '名称': m_b.group(2).strip(),
                         '招生计划': int(m_b.group(3)) if m_b.group(3) else None,
                         '实际录取': None, '变化': m_b.group(4) or '', '科目': {}, '备注': m_b.group(5) or ''}
            if major:
                for t in range(k + 1, min(k + 18, end)):
                    ll = lines[t].strip()
                    m_sub = re.match(r'^[①②③④⑤]\s*(\d{3})\s*(.+)', ll)
                    if m_sub:
                        major['科目'][m_sub.group(1)] = m_sub.group(2).strip()
                sch['专业'].append(major)
                k += 1
                continue
            k += 1
    # ---- 复试分数线（合并单元格） ----
    j = find_sec(['二、26考研复试分数线', '26考研复试分数线', '二、27考研复试分数线', '27考研复试分数线'], i, end)
    if j is not None:
        hdr = None
        for t in range(j + 1, min(j + 40, end)):
            if lines[t].strip() == '学院' and lines[t + 1].strip() == '学科':
                hdr = t
                break
        if hdr is not None:
            t = hdr + 7
            cur_college = ''

            def is_college(x):
                x0 = re.sub(r'^\d{3}\s*', '', x)
                return any(x0 in c or c in x0 for c in sch['学院']) or x.endswith(('学院', '学部', '研究院', '系'))

            while t < end:
                while t < end and not lines[t].strip():
                    t += 1
                row = [lines[t + u].strip() for u in range(6)]
                if not row[0]:
                    break
                if is_college(row[0]) and not re.match(r'^\d+$', row[0]) and not row[0].endswith(('学硕', '专硕')):
                    cur_college = row[0]
                    t += 1
                    continue
                if re.match(r'^\d+$', row[0]) or all(re.match(r'^\d+$|^$', c) for c in row[1:]):
                    sch['复试线'].append({'学院': cur_college, '学科': row[0], '政治': row[1], '英语': row[2],
                                          '业务课一': row[3], '业务课二': row[4], '总分': row[5]})
                    t += 6
                else:
                    break
    # ---- 历年招生 ----
    j = find_sec(['三、招生人数（实际招生人数）', '招生人数（实际招生人数）', '三、27考研招生人数（实际招生人数）', '27考研招生人数（实际招生人数）'], i, end)
    if j is not None:
        t = j + 1
        while t < end:
            l = lines[t].strip()
            if not l:
                t += 1
                continue
            if re.match(r'^\d{4}$', l):
                row = [l]
                t += 1
                while t < end:
                    c = lines[t].strip()
                    if not c:
                        t += 1
                        continue
                    if re.match(r'^\d{4}$', c):
                        break
                    if re.match(r'^(\d+|-)$', c):
                        row.append(c)
                        t += 1
                    else:
                        break
                sch['历年招生'].append(row)
            else:
                t += 1
    # ---- 录取情况分析 ----
    for t in range(start, end):
        l = lines[t].strip()
        m = re.match(r'^(?:\d+|[一二三四五六七八九十]+)、\s*26 ?考研?(.+?)(?:一志愿)?录取情况分析$', l)
        if m:
            sch['录取分析'].append(parse_analysis(t, end))
            continue
        m2 = re.match(r'^(?:\d+|[一二三四五六七八九十]+)、\s*26 ?考研?(.+?)(?:一志愿)?录取情况$', l)
        if m2:
            sch['录取分析'].append(parse_analysis(t, end))
    return sch


schools = []
for idx, (name, start) in enumerate(sections):
    end = sections[idx + 1][1] if idx + 1 < len(sections) else N
    schools.append(parse_school(name, start, end))

json.dump(schools, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('保存:', OUT)
print('=== 统计 ===')
print('学校:', len(schools))
print('专业记录:', sum(len(s['专业']) for s in schools))
print('无专业记录:', [s['学校'] for s in schools if not s['专业']][:20])
print('复试线总数:', sum(len(s['复试线']) for s in schools))
print('历年招生总数:', sum(len(s['历年招生']) for s in schools))
print('录取分析段:', sum(len(s['录取分析']) for s in schools))
print('有学科评估:', sum(1 for s in schools if s['学科评估']))
