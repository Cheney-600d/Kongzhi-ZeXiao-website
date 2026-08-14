# -*- coding: utf-8 -*-
"""
从 zxb_parsed.json 生成 school_detail/<学校>.html（控制类院校详情独立页）。
页面：学校简介/学院/学科评估 → 专业信息表（计划/实际录取/科目）→ 复试线表 →
历年招生表 → 录取情况分析（进复试/录取/复录比/分数 + 分数段直方图）。
图表用本地 vendor/chart-4.5.1.umd.min.js，完全离线。
"""

import json, os, re, html

PARSED = os.environ.get('ZXB_PARSED', r'C:\Users\51366\AppData\Local\Temp\zxb_parsed.json')
OUT_DIR = r'C:\Users\51366\kaoyan-site-template\school_detail'
ZEXIAO_JS = os.environ.get('ZEXIAO_JS', r'C:\Users\51366\kaoyan-site-template\zexiaobao_data.js')

schools = json.load(open(PARSED, encoding='utf-8'))

# 载入 parquet 个人分数（用于补全详情页缺失的均分）
try:
    zsrc = open(ZEXIAO_JS, encoding='utf-8').read()
    ZDATA = json.loads(zsrc.replace('window.ZEXIAO_DATA = ', '').rstrip().rstrip(';'))
except Exception:
    ZDATA = []


def zexiao_stats(school, code):
    hits = []
    for s in ZDATA:
        if s['school'] != school:
            continue
        for m in s['majors']:
            mm = re.match(r'^\(([^)]+)\)', m.get('major', ''))
            if mm and mm.group(1) == code:
                hits.append(m)
    if len(hits) != 1:
        return None
    m = hits[0]

    def st(arr):
        arr = [x for x in (arr or []) if isinstance(x, (int, float)) and 100 <= x <= 500]
        return (max(arr), min(arr), sum(arr) / len(arr)) if arr else None

    return {'enter': st(m.get('source_scores')), 'admit': st(m.get('ref_scores')),
            'course': st(m.get('major_scores')), 'math': st(m.get('math_scores'))}


def zexiao_scores(school, title):
    """按 (学校, 方向标题) 匹配 parquet 个人数学/专业课分数。
    优先按标题中的专业代码匹配,否则按专业名称出现在标题中匹配。"""
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
    """从 Word 分数段取每段的数学/专业课均分(用于无 parquet 学校的分布兜底)。"""
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


def band_chart(cid, title, labels, values, color):
    """按总分段展示数学/专业课均分的分布图(Word 分数段兜底)。"""
    return f"""<div style="margin-top:10px">
<div style="font-size:13px;font-weight:600;color:#a92122;margin-bottom:4px">{title}</div>
<div style="height:160px;"><canvas id="{cid}"></canvas></div>
</div>
<script>
try {{
  var c3 = document.getElementById('{cid}');
  new Chart(c3, {{
    type: 'bar',
    data: {{
      labels: {json.dumps(labels, ensure_ascii=False)},
      datasets: [{{ label: '均分', data: {json.dumps(values)}, backgroundColor: '{color}' }}]
    }},
    options: {{ responsive: true, plugins: {{ legend: {{ display: false }} }}, scales: {{ y: {{ beginAtZero: true }} }} }}
  }});
}} catch(e) {{ console.error(e); }}
</script>"""


def hist_chart(cid, title, scores, color):
    """生成 10 分一档的分数分布直方图 HTML+script。"""
    if not scores:
        return f'<div style="font-size:13px;color:#999;margin-top:8px">{title}：暂无数据</div>'
    lo = int(min(scores) // 10 * 10)
    hi = int(max(scores) // 10 * 10)
    labels, counts = [], []
    for v in range(lo, hi + 1, 10):
        labels.append(f'{v}-{v + 9}')
        counts.append(sum(1 for x in scores if v <= x < v + 10))
    counts[-1] += sum(1 for x in scores if x >= hi + 10)
    return f"""<div style="margin-top:10px">
<div style="font-size:13px;font-weight:600;color:#a92122;margin-bottom:4px">{title}</div>
<div style="height:160px;"><canvas id="{cid}"></canvas></div>
</div>
<script>
try {{
  var c2 = document.getElementById('{cid}');
  new Chart(c2, {{
    type: 'bar',
    data: {{
      labels: {json.dumps(labels, ensure_ascii=False)},
      datasets: [{{ label: '人数', data: {json.dumps(counts)}, backgroundColor: '{color}' }}]
    }},
    options: {{ responsive: true, plugins: {{ legend: {{ display: false }} }}, scales: {{ y: {{ beginAtZero: true, ticks: {{ precision: 0 }} }} }} }}
  }});
}} catch(e) {{ console.error(e); }}
</script>"""


# 用 parquet 补全分析段缺失的均分
filled = 0
for sch in schools:
    for a in sch['录取分析']:
        m = re.search(r'(\d{5,6}|[0-9A-Za-z]{5,6})', a['标题'])
        code = m.group(1) if m else ''
        if not code:
            continue
        z = zexiao_stats(sch['学校'], code)
        if not z:
            continue
        if a['复试平均'] is None and z['enter']:
            a['复试最高'], a['复试最低'], a['复试平均'] = z['enter'][0], z['enter'][1], round(z['enter'][2], 1)
        if a['录取平均'] is None and z['admit']:
            a['录取最高'], a['录取最低'], a['录取平均'] = z['admit'][0], z['admit'][1], round(z['admit'][2], 1)
        if a['专业课均分'] is None and z['course']:
            a['专业课均分'] = round(z['course'][2], 1)
        if a['数学均分'] is None and z['math']:
            a['数学均分'] = round(z['math'][2], 1)
        filled += 1
print('parquet 补全详情页分析段:', filled)


def esc(s):
    return html.escape(str(s if s is not None else ''))


def grade_of(s):
    return s['层级'] or ''


def major_table(sch):
    rows = []
    for p in sch['专业']:
        subs = '；'.join(f'{k} {v}' for k, v in p['科目'].items())
        rows.append(f"<tr><td>{esc(p['学院'])}</td><td>{esc(p['代码'])}</td><td>{esc(p['名称'])}</td>"
                    f"<td>{esc(p['招生计划'])}</td><td>{esc(p['实际录取'])}</td><td>{esc(p['变化'])}</td>"
                    f"<td>{esc(subs)}</td><td>{esc(p['备注'])}</td></tr>")
    return '\n'.join(rows)


def scoreline_table(sch):
    rows = []
    for r in sch['复试线']:
        rows.append(f"<tr><td>{esc(r['学院'])}</td><td>{esc(r['学科'])}</td><td>{esc(r['政治'])}</td>"
                    f"<td>{esc(r['英语'])}</td><td>{esc(r['业务课一'])}</td><td>{esc(r['业务课二'])}</td><td>{esc(r['总分'])}</td></tr>")
    return '\n'.join(rows)


def history_table(sch):
    if not sch['历年招生']:
        return '<p>暂无历年招生数据</p>'
    rows = []
    for row in sch['历年招生']:
        rows.append('<tr>' + ''.join(f'<td>{esc(c)}</td>' for c in row) + '</tr>')
    return '<table><tr>' + ''.join(f'<th>{"年份" if i == 0 else "专业" + str(i)}</th>' for i in range(len(sch['历年招生'][0]))) + '</tr>' + ''.join(rows) + '</table>'


def analysis_blocks(sch):
    blocks = []
    for idx, a in enumerate(sch['录取分析']):
        bands = a['分数段']
        labels = [b[0] for b in bands]
        enter_vals = [b[1] if len(b) > 1 else 0 for b in bands]
        admit_vals = [b[2] if len(b) > 2 else 0 for b in bands]
        chart_id = f'chart-{idx}'
        zs = zexiao_scores(sch['学校'], a['标题'])
        wd = word_band_dist(a)
        if (zs or {}).get('math') or (zs or {}).get('course'):
            math_block = hist_chart(f'{chart_id}-math', '数学分数分布', (zs or {}).get('math'), 'rgba(99,124,154,0.7)')
            course_block = hist_chart(f'{chart_id}-course', '专业课分数分布', (zs or {}).get('course'), 'rgba(201,138,61,0.7)')
        elif wd:
            math_block = band_chart(f'{chart_id}-math', '数学分数分布（按总分段均分）', wd['labels'], wd['math'], 'rgba(99,124,154,0.7)')
            course_block = band_chart(f'{chart_id}-course', '专业课分数分布（按总分段均分）', wd['labels'], wd['course'], 'rgba(201,138,61,0.7)')
        else:
            math_block = '<div style="font-size:13px;color:#999;margin-top:8px">数学分数分布：暂无数据</div>'
            course_block = '<div style="font-size:13px;color:#999;margin-top:8px">专业课分数分布：暂无数据</div>'
        stat_line = (f"进复试 <b>{esc(a['进复试'])}</b> 人 · 实际录取 <b>{esc(a['录取'])}</b> 人 · "
                     f"复录比 <b>{esc(a['复录比'])}</b>")
        score_line = (f"复试初试：最高 {esc(a['复试最高'])} / 最低 {esc(a['复试最低'])} / 平均 {esc(a['复试平均'])}　|　"
                      f"录取初试：最高 {esc(a['录取最高'])} / 最低 {esc(a['录取最低'])} / 平均 {esc(a['录取平均'])}")
        if a['专业课均分'] is not None:
            score_line += f"　|　专业课均分 {esc(a['专业课均分'])} · 数学均分 {esc(a['数学均分'])}"
        sub_avg = [f"{k} {esc(v)}" for k, v in [('政治', a['政治均分']), ('英语', a['英语均分']), ('数学', a['数学均分']), ('专业课', a['专业课均分'])] if v is not None]
        avg_line = f'<p class="subavg">各科均分：{" · ".join(sub_avg)}</p>' if sub_avg else ''
        band_rows = ''
        for b in bands:
            band_rows += '<tr>' + ''.join(f'<td>{esc(c)}</td>' for c in b) + '</tr>'
        band_table = (f'<table><thead><tr><th>分数段</th><th>复试人数</th><th>录取人数</th>'
                      f'<th>录取率</th><th>政治</th><th>英语</th><th>数学</th><th>专业课</th><th>总分均分</th><th>备注</th></tr></thead>'
                      f'<tbody>{band_rows}</tbody></table>') if band_rows else ''
        blocks.append(f"""
<div class="card">
  <h3>{esc(a['标题'])}</h3>
  <p class="stat">{stat_line}</p>
  <p class="score">{score_line}</p>
  {avg_line}
  {band_table}
  <div style="height:220px;"><canvas id="{chart_id}"></canvas></div>
  {math_block}
  {course_block}
</div>
<script>
try {{
  var ctx = document.getElementById('{chart_id}');
  new Chart(ctx, {{
    type: 'bar',
    data: {{
      labels: {json.dumps(labels, ensure_ascii=False)},
      datasets: [
        {{ label: '复试人数', data: {json.dumps(enter_vals)}, backgroundColor: 'rgba(99,124,154,0.7)' }},
        {{ label: '录取人数', data: {json.dumps(admit_vals)}, backgroundColor: 'rgba(169,33,34,0.7)' }}
      ]
    }},
    options: {{ responsive: true, plugins: {{ legend: {{ position: 'top' }} }} }}
  }});
}} catch(e) {{ console.error(e); }}
</script>""")
    return '\n'.join(blocks)


def render(sch):
    title = f"{sch['学校']} - 控制类考研院校详情"
    intro = sch['简介'] or '暂无简介'
    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(title)}</title>
<script src="../vendor/chart-4.5.1.umd.min.js"></script>
<style>
body{{font-family:'Noto Sans SC',system-ui,sans-serif;background:#f7eceb;color:#2d2d3d;margin:0;padding:0;line-height:1.6}}
.wrap{{max-width:1100px;margin:0 auto;padding:20px}}
header{{background:linear-gradient(135deg,#a92122,#a92122);color:#fff;padding:28px 20px;text-align:center}}
header h1{{margin:0 0 6px;font-size:1.8rem}}
.meta{{font-size:13px;opacity:.9}}
.intro{{max-width:900px;margin:14px auto 0;font-size:14px;background:rgba(255,255,255,.12);padding:10px 14px;border-radius:10px}}
h2{{border-left:4px solid #a92122;padding-left:10px;margin-top:28px;font-size:1.2rem}}
.card{{background:#fff;border-radius:12px;padding:16px;margin:12px 0;box-shadow:0 4px 12px rgba(169,33,34,.2)}}
.card h3{{margin:0 0 8px;font-size:1.05rem;color:#a92122}}
.stat{{font-size:14px;margin:4px 0}}
.score{{font-size:13px;color:#555;margin:4px 0 10px}}
.subavg{{font-size:14px;font-weight:600;color:#a92122;margin:6px 0;padding:6px 10px;background:#f7eceb;border-radius:6px}}
table{{width:100%;border-collapse:collapse;font-size:13px;margin:8px 0}}
th,td{{border:1px solid #e5e7eb;padding:6px 8px;text-align:left}}
th{{background:#f7eceb;white-space:nowrap}}
footer{{text-align:center;color:#999;font-size:12px;padding:20px}}
</style>
</head>
<body>
<header>
  <h1>{esc(sch['学校'])}</h1>
  <div class="meta">{esc(grade_of(sch))} · {esc(sch['学科评估'] or '学科评估见官方')} · 控制类考研</div>
  <div class="intro">{esc(intro)}</div>
</header>
<div class="wrap">
  <h2>一、学院与专业</h2>
  <div class="card">
    <table><thead><tr><th>学院</th><th>专业代码</th><th>专业名称</th><th>招生计划</th><th>26实际录取</th><th>较25变化</th><th>初试科目</th><th>备注</th></tr></thead>
    <tbody>{major_table(sch)}</tbody></table>
  </div>
  <h2>二、26考研复试分数线</h2>
  <div class="card">
    <table><thead><tr><th>学院</th><th>学科</th><th>政治</th><th>英语</th><th>业务课一</th><th>业务课二</th><th>总分</th></tr></thead>
    <tbody>{scoreline_table(sch)}</tbody></table>
  </div>
  <h2>三、历年招生人数</h2>
  <div class="card">{history_table(sch)}</div>
  <h2>四、26考研录取情况分析</h2>
  {analysis_blocks(sch)}
  <footer>数据来源：《27考研择校宝典_版8》（控制类）· 仅供参考，最终以院校官方为准</footer>
</div>
</body>
</html>"""


os.makedirs(OUT_DIR, exist_ok=True)
count = 0
for sch in schools:
    if not sch['专业'] and not sch['录取分析']:
        continue
    fn = os.path.join(OUT_DIR, sch['学校'] + '.html')
    with open(fn, 'w', encoding='utf-8') as f:
        f.write(render(sch))
    count += 1

print('生成学校详情页:', count, '个')
print('输出目录:', OUT_DIR)
