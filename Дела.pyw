# -*- coding: utf-8 -*-
"""Запуск «Дел» на компьютере: поднимает маленький сервер на 127.0.0.1:8124 и открывает браузер.
Окна не показывает (pythonw). Если сервер уже запущен — просто открывает вкладку."""
import os, socket, sys, threading, webbrowser
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

HERE = os.path.dirname(os.path.abspath(__file__))
PORT = 8124
URL = f'http://127.0.0.1:{PORT}/'


class Quiet(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=HERE, **kw)

    def log_message(self, *a):
        pass

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()


def busy():
    try:
        with socket.create_connection(('127.0.0.1', PORT), timeout=0.5):
            return True
    except OSError:
        return False


if busy():
    webbrowser.open(URL)
    sys.exit(0)

srv = ThreadingHTTPServer(('127.0.0.1', PORT), Quiet)
threading.Timer(0.3, webbrowser.open, (URL,)).start()
srv.serve_forever()
