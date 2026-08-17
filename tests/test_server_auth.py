# -*- coding: utf-8 -*-
"""管理接口鉴权 + API 服务集成测试（自动拉起 serve.py，无需常驻服务器）。

用法：
    python tests/test_server_auth.py
"""
import json
import os
import pathlib
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

REPO = pathlib.Path(__file__).resolve().parent.parent
SERVER = REPO / 'serve.py'
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


def wait_port(port, timeout=20.0):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with socket.create_connection(('127.0.0.1', port), timeout=0.5):
                return True
        except OSError:
            time.sleep(0.3)
    return False


def start_server(port, token=None):
    env = os.environ.copy()
    if token is None:
        env.pop('KAOYAN_ADMIN_TOKEN', None)
    else:
        env['KAOYAN_ADMIN_TOKEN'] = token
    proc = subprocess.Popen(
        [sys.executable, str(SERVER), str(port)],
        cwd=str(REPO),
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    if not wait_port(port):
        proc.kill()
        raise RuntimeError(f'serve.py 在端口 {port} 未就绪')
    return proc


def stop_server(proc):
    if proc and proc.poll() is None:
        proc.kill()
        proc.wait(timeout=10)


def get(port, path):
    with urllib.request.urlopen(f'http://127.0.0.1:{port}{path}', timeout=10) as r:
        return r.status, json.loads(r.read().decode('utf-8'))


def post(port, token):
    req = urllib.request.Request(
        f'http://127.0.0.1:{port}/api/admin/import-admission',
        data=b'{}',
        method='POST',
        headers={'Content-Type': 'application/json'},
    )
    if token is not None:
        req.add_header('X-Admin-Token', token)
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, json.loads(r.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8'))


def main():
    print('== 无 Token 服务（本机回环应允许导入） ==')
    proc = start_server(8799, token=None)
    try:
        status, body = get(8799, '/api/summary')
        check('/api/summary 200', status == 200 and body.get('code') == 0)
        status, body = post(8799, None)
        check('本机回环无 Token 空 body → 400（非 401）', status == 400 and body.get('code') == 1)
    finally:
        stop_server(proc)

    print('== 有 Token 服务（必须携带 X-Admin-Token） ==')
    proc = start_server(8798, token='test-token-123')
    try:
        status, body = post(8798, None)
        check('无 Token → 401', status == 401)
        status, body = post(8798, 'wrong-token')
        check('错 Token → 401', status == 401)
        status, body = post(8798, 'test-token-123')
        check('正确 Token 空 body → 400（进入导入逻辑）', status == 400 and body.get('code') == 1)
    finally:
        stop_server(proc)

    print(f'\n{PASS} passed, {FAIL} failed')
    return 1 if FAIL else 0


if __name__ == '__main__':
    raise SystemExit(main())
