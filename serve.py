# -*- coding: utf-8 -*-
"""本地开发服务器：静态文件 + 禁用缓存头（解决浏览器缓存旧数据）。"""
import http.server
import os
import socketserver
import sys

os.chdir(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, *args):
        pass


with socketserver.ThreadingTCPServer(('', PORT), NoCacheHandler) as httpd:
    print(f'serving on http://127.0.0.1:{PORT} (no-cache)', flush=True)
    httpd.serve_forever()
