# -*- coding: utf-8 -*-
"""390px 手机端页面溢出回归测试（需安装 playwright 及 chromium）。

用法：
    pip install -r requirements-dev.txt
    python -m playwright install chromium
    python tests/test_mobile_pages.py

若未安装 playwright，本脚本会跳过。
"""
import os
import pathlib
import socket
import subprocess
import sys
import time

REPO = pathlib.Path(__file__).resolve().parent.parent
SERVER = REPO / 'serve.py'
PORT = 8797
PASS = 0
FAIL = 0
SKIP = False


def check(label, cond):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f'  PASS  {label}')
    else:
        FAIL += 1
        print(f'  FAIL  {label}')


def wait_port(port, timeout=20.0):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with socket.create_connection(('127.0.0.1', port), timeout=0.5):
                return True
        except OSError:
            time.sleep(0.3)
    return False


def main():
    global SKIP
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print('SKIP: 未安装 playwright（pip install -r requirements-dev.txt）')
        return 0

    proc = subprocess.Popen(
        [sys.executable, str(SERVER), str(PORT)],
        cwd=str(REPO),
        env={**os.environ, 'KAOYAN_ADMIN_TOKEN': ''},
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    if not wait_port(PORT):
        proc.kill()
        raise RuntimeError(f'serve.py 在端口 {PORT} 未就绪')

    try:
        with sync_playwright() as p:
            try:
                browser = p.chromium.launch(headless=True)
            except Exception as e:
                print(f'SKIP: chromium 未安装（python -m playwright install chromium）: {e}')
                SKIP = True
                return 0

            page = browser.new_page(viewport={'width': 390, 'height': 844})

            print('== 首页 ==')
            page.goto(f'http://127.0.0.1:{PORT}/专业课选择/考研专业课院校查询.html', wait_until='networkidle', timeout=30000)
            page.wait_for_timeout(800)
            home = page.evaluate('''() => ({
                cards: document.querySelectorAll('#subjectGrid .subject-card, #subjectGrid > div').length,
                overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
            })''')
            check('首页科目卡片 >= 7', home['cards'] >= 7)
            check('首页无横向溢出', not home['overflow'])

            print('== 院校详情页（清华大学） ==')
            page.goto(
                f'http://127.0.0.1:{PORT}/专业课选择/考研专业课院校查询.html?school=%E6%B8%85%E5%8D%8E%E5%A4%A7%E5%AD%A6',
                wait_until='networkidle', timeout=30000,
            )
            page.wait_for_timeout(800)
            detail = page.evaluate('''() => {
                const t = document.querySelector('.admission-table');
                return {
                    title: (document.getElementById('schoolDetailTitle') || {}).innerText || '',
                    subjectItems: document.querySelectorAll('.subject-item').length,
                    bookLines: document.querySelectorAll('.book-line').length,
                    admissionRows: t ? t.querySelectorAll('tbody tr').length : 0,
                    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
                };
            }''')
            check('标题包含清华大学', '清华大学' in detail['title'])
            check('专业课条目 >= 1', detail['subjectItems'] >= 1)
            check('参考书 >= 1', detail['bookLines'] >= 1)
            check('录取记录 >= 1', detail['admissionRows'] >= 1)
            check('详情页无横向溢出', not detail['overflow'])

            browser.close()
    finally:
        proc.kill()
        proc.wait(timeout=10)

    print(f'\n{PASS} passed, {FAIL} failed')
    return 1 if FAIL else 0


if __name__ == '__main__':
    raise SystemExit(main())
