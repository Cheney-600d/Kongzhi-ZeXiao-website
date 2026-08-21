# -*- coding: utf-8 -*-
"""全站功能审查脚本：检查 JS 报错、横向溢出、空标题、坏图。

用法：
    python tests/site_audit.py                 # 手机端全量 + 桌面端主要页
    python tests/site_audit.py --desktop-all   # 手机端 + 桌面端全量
    python tests/site_audit.py --main-only     # 只检查主要功能页
"""
import argparse
import json
import pathlib
import sys
import time
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parent.parent
BASE_URL = 'http://127.0.0.1:8767/'

MAIN_PAGES = [
    'index.html',
    '改考院校.html',
    '院校PK.html',
    'heat_compare.html',
    '控制院校生源地图.html',
    '专业课选择/考研专业课院校查询.html',
    '专业课选择/资料和课程.html',
    '复试全攻略/index.html',
    '复试全攻略/01-timeline.html',
    '复试全攻略/02-competitiveness.html',
    '复试全攻略/03-written-exam.html',
    '复试全攻略/04-interview.html',
    '复试全攻略/05-interview-questions.html',
    '复试全攻略/06-mentor.html',
    '复试全攻略/07-projects.html',
    '复试全攻略/08-project-packaging.html',
    '复试全攻略/09-professional-questions.html',
    '复试全攻略/10-tiaoji.html',
    '复试全攻略/面试题库.html',
    '就业相关/job-listing/job-listing.html',
    '就业相关/career-analysis/career-analysis.html',
    '就业相关/career-analysis/role-tech-stack.html',
    '就业相关/就业去向index.html',
    '考研常识科普/index.html',
    '考研常识科普/experience.html',
    '数据库/admin.html',
    'school_detail/index.html',
]


def collect_pages():
    pages = []
    for p in sorted(ROOT.rglob('*.html')):
        if 'vendor' in p.parts:
            continue
        if p.name in ('mobile-preview.html', '移动端实时预览.html'):
            continue
        rel = p.relative_to(ROOT).as_posix()
        pages.append(rel)
    return pages


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--desktop-all', action='store_true')
    ap.add_argument('--main-only', action='store_true')
    args = ap.parse_args()

    from playwright.sync_api import sync_playwright

    main_set = set(MAIN_PAGES)
    if args.main_only:
        rels = MAIN_PAGES
    else:
        rels = collect_pages()

    results = []
    start_time = time.time()
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.set_default_timeout(15000)
        errors = []
        page.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))
        page.on('console', lambda msg: errors.append('console: ' + msg.text) if msg.type == 'error' else None)

        for idx, rel in enumerate(rels, 1):
            url = BASE_URL + urllib.parse.quote(rel, safe='/')
            is_main = rel in main_set
            viewports = [('mobile', {'width': 390, 'height': 844})]
            if is_main or args.desktop_all:
                viewports.append(('desktop', {'width': 1280, 'height': 800}))
            for label, viewport in viewports:
                page.set_viewport_size(viewport)
                errors.clear()
                try:
                    page.goto(url, wait_until='domcontentloaded', timeout=20000)
                    if is_main:
                        page.wait_for_timeout(300)
                        page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
                        page.wait_for_timeout(200)
                        page.evaluate('window.scrollTo(0, 0)')
                        page.wait_for_timeout(150)
                    else:
                        page.wait_for_timeout(120)
                    info = page.evaluate('''() => {
                        const broken = [];
                        for (const img of document.images) {
                            const raw = img.getAttribute('src');
                            if (!raw) continue;
                            if (img.complete && img.naturalWidth === 0) {
                                const cs = getComputedStyle(img);
                                if (cs.display !== 'none' && cs.visibility !== 'hidden') {
                                    broken.push(img.getAttribute('src') || img.src);
                                }
                            }
                        }
                        return {
                            title: document.title,
                            textLen: document.body.innerText.length,
                            overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
                            brokenImgs: broken,
                            forms: document.forms.length,
                            links: document.links.length,
                        };
                    }''')
                    info['errors'] = list(errors)
                    info['page'] = rel
                    info['viewport'] = label
                    results.append(info)
                except Exception as e:
                    results.append({'page': rel, 'viewport': label, 'title': '', 'textLen': 0,
                                    'overflow': None, 'brokenImgs': [], 'errors': ['LOAD: ' + str(e)],
                                    'forms': 0, 'links': 0})
            if idx % 25 == 0:
                print(f'{idx}/{len(rels)} done, {time.time()-start_time:.0f}s')

        browser.close()

    # summary
    bad = []
    for r in results:
        issues = []
        if r.get('overflow'):
            issues.append('overflow')
        if not r.get('title'):
            issues.append('no-title')
        if (r.get('textLen') or 0) < 30:
            issues.append('empty-text')
        if r.get('brokenImgs'):
            issues.append(f"brokenImgs({len(r['brokenImgs'])})")
        if r.get('errors'):
            issues.append(f"errors({len(r['errors'])})")
        if issues:
            bad.append({**r, 'issues': issues})

    report = {
        'generated_at': time.strftime('%Y-%m-%d %H:%M:%S'),
        'pages_checked': len(results),
        'issues': bad,
        'results': results,
    }
    out = pathlib.Path(r'D:\deepseek harness workspace\site_audit_report.json')
    out.write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'checked {len(results)} page-views, issues {len(bad)}, report {out}')
    for b in bad[:60]:
        print('ISSUE', b['viewport'], b['page'], b['issues'])
        if b.get('errors'):
            print('   err:', b['errors'][:3])
        if b.get('brokenImgs'):
            print('   img:', b['brokenImgs'][:5])


if __name__ == '__main__':
    main()
