#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
WaveLink - Mission Control Dashboard & Process Manager
Thư mục: start/
- Port Dashboard: 9999 (UI: start/dashboard.html)
- Port Backend: 8080 (go run ./cmd/api/main.go)
- Port Frontend: 5173 (npm run dev)
"""

import os
import sys
import re
import time
import json
import socket
import threading
import subprocess
import webbrowser
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

START_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(START_DIR)
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
DASHBOARD_HTML_PATH = os.path.join(START_DIR, "dashboard.html")

DASHBOARD_PORT = 9999
BE_PORT = 8080
FE_PORT = 5173

# Lọc ANSI escape sequences
ANSI_REGEX = re.compile(r'\x1b\[[0-9;]*[a-zA-Z]')

def clean_ansi(text):
    if not text:
        return ""
    return ANSI_REGEX.sub('', text)

class ReusableHTTPServer(HTTPServer):
    allow_reuse_address = True
    daemon_threads = True

# Quản lý logs
logs_lock = threading.Lock()
logs_history = []
log_counter = 0

def add_log(log_type, text):
    global log_counter
    text = clean_ansi(text).strip()
    if not text:
        return
    with logs_lock:
        log_counter += 1
        entry = {
            "id": log_counter,
            "time": time.strftime("%H:%M:%S"),
            "type": log_type,
            "text": text
        }
        logs_history.append(entry)
        if len(logs_history) > 3000:
            del logs_history[:500]

def free_port(port):
    if sys.platform != 'win32':
        return
    try:
        cmd = f'netstat -aon | findstr :{port}'
        out = subprocess.check_output(cmd, shell=True, text=True, errors='ignore')
        for line in out.strip().splitlines():
            if "LISTENING" in line:
                parts = line.strip().split()
                pid = parts[-1]
                if pid != "0":
                    subprocess.run(f'taskkill /F /PID {pid}', shell=True, capture_output=True)
    except Exception:
        pass

class ProcessController:
    def __init__(self):
        self.be_proc = None
        self.fe_proc = None
        self.is_shutting_down = False

    def is_port_in_use(self, port):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.4)
            return s.connect_ex(('127.0.0.1', port)) == 0

    def start_be(self):
        if self.is_be_running():
            add_log("sys", f"Backend đã đang chạy trên cổng {BE_PORT}.")
            return True

        main_go = os.path.join(BACKEND_DIR, "cmd", "api", "main.go")
        if not os.path.exists(main_go):
            add_log("sys", f"[LỖI] Không tìm thấy file entry point: {main_go}")
            return False

        free_port(BE_PORT)
        cmd_args = ["go", "run", "./cmd/api/main.go"]
        add_log("sys", f"Đang khởi động Backend Golang qua lệnh: {' '.join(cmd_args)} (Port: {BE_PORT})...")

        startupinfo = None
        creationflags = 0
        if sys.platform == 'win32':
            startupinfo = subprocess.STARTUPINFO()
            startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            creationflags = subprocess.CREATE_NO_WINDOW

        try:
            self.be_proc = subprocess.Popen(
                cmd_args,
                cwd=BACKEND_DIR,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding='utf-8',
                errors='replace',
                bufsize=1,
                startupinfo=startupinfo,
                creationflags=creationflags
            )

            def be_reader():
                try:
                    for line in iter(self.be_proc.stdout.readline, ''):
                        if line:
                            add_log("be", line)
                    self.be_proc.stdout.close()
                except Exception as e:
                    add_log("be", f"[Reader End] {e}")

            t = threading.Thread(target=be_reader, daemon=True)
            t.start()
            add_log("sys", f"Backend Golang đã kích hoạt (PID: {self.be_proc.pid}) tại port {BE_PORT}.")
            return True
        except Exception as e:
            add_log("sys", f"[LỖI] Không thể khởi động Backend: {e}")
            return False

    def stop_be(self):
        add_log("sys", "Đang dừng Backend...")
        if self.be_proc:
            try:
                if sys.platform == 'win32':
                    subprocess.run(["taskkill", "/F", "/T", "/PID", str(self.be_proc.pid)], capture_output=True)
                else:
                    self.be_proc.terminate()
            except Exception:
                pass
            self.be_proc = None
        free_port(BE_PORT)
        add_log("sys", "Backend đã dừng và giải phóng cổng 8080.")
        return True

    def is_be_running(self):
        if self.be_proc and self.be_proc.poll() is None:
            return True
        return self.is_port_in_use(BE_PORT)

    def start_fe(self):
        if self.is_fe_running():
            add_log("sys", f"Frontend đã đang chạy trên cổng {FE_PORT}.")
            return True

        free_port(FE_PORT)
        node_modules = os.path.join(FRONTEND_DIR, "node_modules")
        npm_cmd = "npm.cmd" if sys.platform == 'win32' else "npm"

        if not os.path.exists(node_modules):
            add_log("sys", "Chưa có node_modules, đang tự động cài đặt qua npm install...")
            try:
                subprocess.run([npm_cmd, "install"], cwd=FRONTEND_DIR, check=True, capture_output=True)
                add_log("sys", "Cài đặt dependencies thành công.")
            except Exception as e:
                add_log("sys", f"[LỖI] npm install thất bại: {e}")
                return False

        cmd_args = [npm_cmd, "run", "dev"]
        add_log("sys", f"Đang khởi động Frontend Vite qua lệnh: {' '.join(cmd_args)} (Port: {FE_PORT})...")

        startupinfo = None
        creationflags = 0
        if sys.platform == 'win32':
            startupinfo = subprocess.STARTUPINFO()
            startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            creationflags = subprocess.CREATE_NO_WINDOW

        try:
            self.fe_proc = subprocess.Popen(
                cmd_args,
                cwd=FRONTEND_DIR,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding='utf-8',
                errors='replace',
                bufsize=1,
                startupinfo=startupinfo,
                creationflags=creationflags
            )

            def fe_reader():
                try:
                    for line in iter(self.fe_proc.stdout.readline, ''):
                        if line:
                            add_log("fe", line)
                    self.fe_proc.stdout.close()
                except Exception as e:
                    add_log("fe", f"[Reader End] {e}")

            t = threading.Thread(target=fe_reader, daemon=True)
            t.start()
            add_log("sys", f"Frontend Vite Dev Server đã kích hoạt (PID: {self.fe_proc.pid}) tại port {FE_PORT}.")
            return True
        except Exception as e:
            add_log("sys", f"[LỖI] Không thể khởi động Frontend: {e}")
            return False

    def stop_fe(self):
        add_log("sys", "Đang dừng Frontend...")
        if self.fe_proc:
            try:
                if sys.platform == 'win32':
                    subprocess.run(["taskkill", "/F", "/T", "/PID", str(self.fe_proc.pid)], capture_output=True)
                else:
                    self.fe_proc.terminate()
            except Exception:
                pass
            self.fe_proc = None
        free_port(FE_PORT)
        add_log("sys", "Frontend đã dừng và giải phóng cổng 5173.")
        return True

    def is_fe_running(self):
        if self.fe_proc and self.fe_proc.poll() is None:
            return True
        return self.is_port_in_use(FE_PORT)

    def start_all(self):
        b1 = self.start_be()
        b2 = self.start_fe()
        return b1 and b2

    def stop_all(self):
        self.stop_be()
        self.stop_fe()
        return True

    def shutdown_everything(self):
        add_log("sys", "💀 Đang tắt toàn bộ tiến trình hệ thống và đóng Dashboard...")
        self.is_shutting_down = True
        self.stop_all()
        free_port(BE_PORT)
        free_port(FE_PORT)
        free_port(DASHBOARD_PORT)

        def delayed_exit():
            time.sleep(1)
            os._exit(0)

        threading.Thread(target=delayed_exit, daemon=True).start()
        return True

    def get_status(self):
        be_online = self.is_be_running()
        fe_online = self.is_fe_running()
        return {
            "be": {
                "running": be_online,
                "port": BE_PORT,
                "cmd": "go run ./cmd/api/main.go",
                "pid": self.be_proc.pid if (self.be_proc and self.be_proc.poll() is None) else None,
                "url": f"http://localhost:{BE_PORT}"
            },
            "fe": {
                "running": fe_online,
                "port": FE_PORT,
                "cmd": "npm run dev",
                "pid": self.fe_proc.pid if (self.fe_proc and self.fe_proc.poll() is None) else None,
                "url": f"http://localhost:{FE_PORT}"
            },
            "dashboard": {
                "port": DASHBOARD_PORT,
                "url": f"http://localhost:{DASHBOARD_PORT}"
            }
        }

controller = ProcessController()

class DashboardHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == '/api/status':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            data = controller.get_status()
            self.wfile.write(json.dumps(data).encode('utf-8'))
            return

        if path == '/api/logs':
            query = parse_qs(parsed.query)
            last_id = int(query.get('last_id', [0])[0])
            with logs_lock:
                new_logs = [entry for entry in logs_history if entry['id'] > last_id]
                current_last = logs_history[-1]['id'] if logs_history else last_id

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({"logs": new_logs, "last_id": current_last}).encode('utf-8'))
            return

        if path in ['/', '/index.html']:
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            if os.path.exists(DASHBOARD_HTML_PATH):
                with open(DASHBOARD_HTML_PATH, 'rb') as f:
                    self.wfile.write(f.read())
            else:
                self.wfile.write(b"<h1>Dashboard HTML not found in start/dashboard.html</h1>")
            return

        self.send_response(404)
        self.end_headers()
        self.wfile.write(b"Not Found")

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        res = {"success": True}

        if path == '/api/be/start':
            res["success"] = controller.start_be()
        elif path == '/api/be/stop':
            res["success"] = controller.stop_be()
        elif path == '/api/be/restart':
            controller.stop_be()
            time.sleep(1)
            res["success"] = controller.start_be()
        elif path == '/api/fe/start':
            res["success"] = controller.start_fe()
        elif path == '/api/fe/stop':
            res["success"] = controller.stop_fe()
        elif path == '/api/fe/restart':
            controller.stop_fe()
            time.sleep(1)
            res["success"] = controller.start_fe()
        elif path == '/api/all/start':
            res["success"] = controller.start_all()
        elif path == '/api/all/stop':
            res["success"] = controller.stop_all()
        elif path == '/api/shutdown':
            res["success"] = controller.shutdown_everything()
        elif path == '/api/logs/clear':
            with logs_lock:
                logs_history.clear()
            res["success"] = True
        else:
            self.send_response(404)
            self.end_headers()
            return

        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(res).encode('utf-8'))

    def log_message(self, format, *args):
        pass

def run_dashboard():
    add_log("sys", "==================================================")
    add_log("sys", "🚀 KHỞI ĐỘNG HỆ THỐNG WAVELINK (MISSION CONTROL)")
    add_log("sys", f"• Dashboard Server: http://localhost:{DASHBOARD_PORT}")
    add_log("sys", f"• Backend Golang: go run ./cmd/api/main.go (Port {BE_PORT})")
    add_log("sys", f"• Frontend Vite: npm run dev (Port {FE_PORT})")
    add_log("sys", "==================================================")

    controller.start_all()

    def open_browser():
        time.sleep(1.2)
        webbrowser.open(f"http://localhost:{DASHBOARD_PORT}")

    threading.Thread(target=open_browser, daemon=True).start()

    try:
        server = ReusableHTTPServer(('0.0.0.0', DASHBOARD_PORT), DashboardHandler)
        server.serve_forever()
    except KeyboardInterrupt:
        controller.shutdown_everything()
    except Exception as e:
        add_log("sys", f"[LỖI SERVER] {e}")
        controller.shutdown_everything()

if __name__ == '__main__':
    run_dashboard()
