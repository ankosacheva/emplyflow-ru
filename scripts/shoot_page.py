#!/usr/bin/env python3
"""Скриншоты страницы по секциям через headless Chrome и CDP.

Нужен для визуальной проверки длинных страниц: обычный `--screenshot`
снимает только первый экран и не дожидается scroll-анимаций.

    python3 scripts/shoot_page.py URL OUT_PREFIX [--width 1440] [--sel "#a" "#b"]

Без --sel снимает всю страницу целиком одним кадром.
"""

import argparse
import base64
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request

import websocket

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def free_port():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


class Chrome:
    def __init__(self, width, height):
        self.port = free_port()
        self.profile = tempfile.mkdtemp(prefix="shootprof-")
        self.proc = subprocess.Popen(
            [
                CHROME,
                "--headless=new",
                "--disable-gpu",
                "--no-first-run",
                "--no-default-browser-check",
                "--disable-extensions",
                "--hide-scrollbars",
                "--force-device-scale-factor=1",
                "--user-data-dir=" + self.profile,
                "--remote-debugging-port=%d" % self.port,
                "--remote-allow-origins=*",
                "--window-size=%d,%d" % (width, height),
                "about:blank",
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        self.ws = websocket.create_connection(self._target(), timeout=30)
        self.msg_id = 0

    def _target(self):
        deadline = time.time() + 25
        while time.time() < deadline:
            try:
                raw = urllib.request.urlopen(
                    "http://127.0.0.1:%d/json" % self.port, timeout=2
                ).read()
                for tab in json.loads(raw):
                    if tab.get("type") == "page" and tab.get("webSocketDebuggerUrl"):
                        return tab["webSocketDebuggerUrl"]
            except Exception:
                pass
            time.sleep(0.4)
        raise RuntimeError("Chrome не поднял CDP-порт")

    def call(self, method, **params):
        self.msg_id += 1
        self.ws.send(json.dumps({"id": self.msg_id, "method": method, "params": params}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get("id") == self.msg_id:
                if "error" in msg:
                    raise RuntimeError("%s: %s" % (method, msg["error"]))
                return msg.get("result", {})

    def evaluate(self, expr):
        res = self.call("Runtime.evaluate", expression=expr, returnByValue=True, awaitPromise=True)
        return res.get("result", {}).get("value")

    def close(self):
        try:
            self.ws.close()
        except Exception:
            pass
        self.proc.terminate()
        try:
            self.proc.wait(timeout=10)
        except Exception:
            self.proc.kill()
        shutil.rmtree(self.profile, ignore_errors=True)


def shoot(chrome, path, clip=None):
    params = {"format": "png"}
    if clip:
        params["clip"] = clip
        params["captureBeyondViewport"] = True
    data = chrome.call("Page.captureScreenshot", **params)["data"]
    with open(path, "wb") as fh:
        fh.write(base64.b64decode(data))
    return path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("url")
    ap.add_argument("out_prefix")
    ap.add_argument("--width", type=int, default=1440)
    ap.add_argument("--height", type=int, default=1000)
    ap.add_argument("--sel", nargs="*", default=[])
    ap.add_argument("--full", action="store_true")
    ap.add_argument("--scale", type=float, default=1.0)
    args = ap.parse_args()

    chrome = Chrome(args.width, args.height)
    written = []
    try:
        chrome.call("Page.enable")
        chrome.call("Emulation.setDeviceMetricsOverride", width=args.width,
                    height=args.height, deviceScaleFactor=1, mobile=False)
        chrome.call("Page.navigate", url=args.url)
        time.sleep(2.5)
        # Прокрутка до конца и обратно: поднимает все reveal-блоки.
        chrome.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(1.2)
        chrome.evaluate("window.scrollTo(0, 0)")
        time.sleep(0.8)

        if args.full or not args.sel:
            h = chrome.evaluate("document.documentElement.scrollHeight")
            clip = {"x": 0, "y": 0, "width": args.width, "height": h, "scale": args.scale}
            written.append(shoot(chrome, args.out_prefix + "-full.png", clip))
        for sel in args.sel:
            box = chrome.evaluate(
                "(function(){var e=document.querySelector('%s');if(!e)return null;"
                "var r=e.getBoundingClientRect();return JSON.stringify({x:r.x+scrollX,"
                "y:r.y+scrollY,w:r.width,h:r.height});})()" % sel
            )
            if not box:
                print("не найден:", sel)
                continue
            b = json.loads(box)
            clip = {"x": 0, "y": b["y"], "width": args.width,
                    "height": min(b["h"], 2400), "scale": args.scale}
            name = sel.strip("#.").replace(" ", "_")
            written.append(shoot(chrome, "%s-%s.png" % (args.out_prefix, name), clip))
    finally:
        chrome.close()

    for path in written:
        print(path, os.path.getsize(path))


if __name__ == "__main__":
    sys.exit(main())
