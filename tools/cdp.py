#!/usr/bin/env python3
"""Minimal Chrome DevTools Protocol driver (stdlib only, no node/websockets needed).

Usage as a library (see tools/README.md):
    import sys; sys.path.insert(0, "tools")
    from cdp import Chrome
    with Chrome() as c:                       # desktop 1440x900; Chrome(mobile=True, width=390, height=844) for a phone
        c.goto("http://127.0.0.1:8765/")
        c.click("[data-act=pcreate]")         # real mouse click at the element's centre
        c.type("#np-name", "VIRTUVE")         # focus + set value + input/change events
        c.shot("/tmp/x.png")
        print(c.drain_logs())                 # console + page errors
Every Chrome() picks its own free debugging port and a throw-away profile, so several can run at once.
"""
import base64, json, os, shutil, socket, struct, subprocess, sys, tempfile, time, urllib.request

CHROME = os.environ.get("CHROME") or "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"   # elsewhere: CHROME=/path/to/chrome


class WS:
    def __init__(self, url):
        assert url.startswith("ws://")
        rest = url[5:]
        hostport, _, path = rest.partition("/")
        host, _, port = hostport.partition(":")
        self.sock = socket.create_connection((host, int(port or 80)), timeout=30)
        key = base64.b64encode(os.urandom(16)).decode()
        req = (
            f"GET /{path} HTTP/1.1\r\nHost: {hostport}\r\nUpgrade: websocket\r\n"
            f"Connection: Upgrade\r\nSec-WebSocket-Key: {key}\r\n"
            "Sec-WebSocket-Version: 13\r\n\r\n"
        )
        self.sock.sendall(req.encode())
        buf = b""
        while b"\r\n\r\n" not in buf:
            buf += self.sock.recv(4096)
        assert b"101" in buf.split(b"\r\n")[0], buf[:200]
        self.buf = buf.split(b"\r\n\r\n", 1)[1]

    def _recv(self, n):
        while len(self.buf) < n:
            chunk = self.sock.recv(65536)
            if not chunk:
                raise ConnectionError("ws closed")
            self.buf += chunk
        out, self.buf = self.buf[:n], self.buf[n:]
        return out

    def send(self, text):
        payload = text.encode()
        mask = os.urandom(4)
        n = len(payload)
        hdr = b"\x81"
        if n < 126:
            hdr += bytes([0x80 | n])
        elif n < 65536:
            hdr += b"\xfe" + struct.pack(">H", n)
        else:
            hdr += b"\xff" + struct.pack(">Q", n)
        masked = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
        self.sock.sendall(hdr + mask + masked)

    def recv(self):
        while True:
            b0, b1 = self._recv(2)
            op = b0 & 0x0F
            n = b1 & 0x7F
            if n == 126:
                n = struct.unpack(">H", self._recv(2))[0]
            elif n == 127:
                n = struct.unpack(">Q", self._recv(8))[0]
            data = self._recv(n)
            if op == 1:
                return data.decode("utf-8", "replace")
            if op == 8:
                raise ConnectionError("ws close frame")
            # ignore ping/pong/binary

    def close(self):
        try:
            self.sock.close()
        except Exception:
            pass


class Chrome:
    def __init__(self, width=1440, height=900, dpr=1, port=0, profile=None, mobile=False):
        self.w, self.h, self.dpr, self.mobile = width, height, dpr, mobile
        if not port:                                   # a free port, so parallel runs never collide
            s = socket.socket(); s.bind(("127.0.0.1", 0)); port = s.getsockname()[1]; s.close()
        self.port = port
        self._tmp = None if profile else tempfile.mkdtemp(prefix="cdp-profile-")
        self.profile = profile or self._tmp
        self.msg_id = 0
        self.logs = []

    def __enter__(self):
        self.proc = subprocess.Popen(
            [CHROME, "--headless=new", f"--remote-debugging-port={self.port}",
             f"--user-data-dir={self.profile}", "--no-first-run", "--no-default-browser-check",
             "--hide-scrollbars", "--disable-gpu-vsync", "--force-device-scale-factor=1",
             f"--window-size={self.w},{self.h}"] + os.environ.get("CHROME_ARGS", "").split() + ["about:blank"],   # e.g. CHROME_ARGS=--no-sandbox when run as root
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        ws_url = None
        for _ in range(80):
            try:
                data = json.load(urllib.request.urlopen(f"http://127.0.0.1:{self.port}/json/list", timeout=2))
                for t in data:
                    if t.get("type") == "page":
                        ws_url = t["webSocketDebuggerUrl"]
                        break
                if ws_url:
                    break
            except Exception:
                pass
            time.sleep(0.25)
        if not ws_url:
            raise RuntimeError("chrome devtools not reachable")
        self.ws = WS(ws_url)
        self.cmd("Page.enable")
        self.cmd("Runtime.enable")
        self.cmd("Log.enable")
        self.cmd("Network.enable")
        self.cmd("Network.setCacheDisabled", {"cacheDisabled": True})
        # the app offers the workshop sign-in once per session (cloud.js); tests work signed out, in this browser only
        self.cmd("Page.addScriptToEvaluateOnNewDocument", {"source":
            "try{sessionStorage.setItem('dbKurejas.cloudAsked','1')}catch(e){}"})
        self.cmd("Emulation.setDeviceMetricsOverride", {
            "width": self.w, "height": self.h, "deviceScaleFactor": self.dpr, "mobile": self.mobile})
        if self.mobile:
            self.cmd("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 5})
            self.cmd("Emulation.setUserAgentOverride", {"userAgent":
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 "
                "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"})
        return self

    def __exit__(self, *a):
        try:
            self.ws.close()
        finally:
            self.proc.terminate()
            try:
                self.proc.wait(timeout=5)
            except Exception:
                self.proc.kill()
            if self._tmp:
                shutil.rmtree(self._tmp, ignore_errors=True)

    def cmd(self, method, params=None, timeout=60):
        self.msg_id += 1
        mid = self.msg_id
        self.ws.send(json.dumps({"id": mid, "method": method, "params": params or {}}))
        deadline = time.time() + timeout
        while time.time() < deadline:
            msg = json.loads(self.ws.recv())
            if msg.get("id") == mid:
                if "error" in msg:
                    raise RuntimeError(f"{method}: {msg['error']}")
                return msg.get("result", {})
            m = msg.get("method", "")
            if m == "Runtime.consoleAPICalled":
                args = " ".join(str(a.get("value", a.get("description", "?"))) for a in msg["params"].get("args", []))
                self.logs.append(f"[{msg['params']['type']}] {args}")
            elif m == "Runtime.exceptionThrown":
                d = msg["params"]["exceptionDetails"]
                self.logs.append("[pageerror] " + (d.get("exception", {}).get("description") or d.get("text", "")))
            elif m == "Log.entryAdded":
                e = msg["params"]["entry"]
                if e.get("level") in ("error", "warning"):
                    self.logs.append(f"[{e['level']}] {e.get('text','')} {e.get('url','')}")
        raise TimeoutError(method)

    def goto(self, url, wait=1.5):
        self.cmd("Page.navigate", {"url": url})
        time.sleep(wait)

    def eval(self, expr, await_promise=False):
        r = self.cmd("Runtime.evaluate", {
            "expression": expr, "returnByValue": True, "awaitPromise": await_promise,
            "userGesture": True})
        if "exceptionDetails" in r:
            d = r["exceptionDetails"]
            return {"__error": d.get("exception", {}).get("description") or d.get("text")}
        return r.get("result", {}).get("value")

    # ---- helpers for driving a page -------------------------------------------------
    def wait(self, expr, timeout=10, step=0.1):
        """Poll a JS expression until it is truthy; returns its value or raises TimeoutError."""
        end = time.time() + timeout
        while time.time() < end:
            v = self.eval(expr)
            if v and not (isinstance(v, dict) and "__error" in v):
                return v
            time.sleep(step)
        raise TimeoutError("wait: " + expr)

    def rect(self, sel, nth=0):
        """Centre + box of the nth element matching a CSS selector (scrolled into view), or None."""
        return self.eval("(function(){var e=document.querySelectorAll(%s)[%d];if(!e)return null;"
                         "e.scrollIntoView({block:'center',inline:'center'});var r=e.getBoundingClientRect();"
                         "return {x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height,l:r.left,t:r.top}})()"
                         % (json.dumps(sel), nth))

    def mouse(self, kind, x, y, buttons=1):
        self.cmd("Input.dispatchMouseEvent", {"type": kind, "x": x, "y": y, "button": "left",
                                              "buttons": buttons if kind != "mouseReleased" else 0, "clickCount": 1})

    def click_at(self, x, y, pause=0.15):
        self.mouse("mouseMoved", x, y, 0); self.mouse("mousePressed", x, y); self.mouse("mouseReleased", x, y)
        time.sleep(pause)

    def click(self, sel, nth=0, pause=0.25):
        r = self.rect(sel, nth)
        if not r:
            raise RuntimeError("click: no element for " + sel)
        self.click_at(r["x"], r["y"], pause)
        return r

    def click_text(self, text, tag="button,a,[data-act],[role=button]", pause=0.25):
        """Click the first visible element (of `tag`) whose text contains `text`."""
        r = self.eval("(function(){var t=%s,L=[].slice.call(document.querySelectorAll(%s)).filter(function(e){"
                      "return e.offsetParent!==null&&(e.textContent||'').indexOf(t)>=0});"
                      "L.sort(function(a,b){return a.textContent.length-b.textContent.length});var e=L[0];if(!e)return null;"
                      "e.scrollIntoView({block:'center'});var r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()"
                      % (json.dumps(text), json.dumps(tag)))
        if not r:
            raise RuntimeError("click_text: nothing with text " + text)
        self.click_at(r["x"], r["y"], pause)

    def drag(self, x0, y0, x1, y1, steps=12, pause=0.02):
        self.mouse("mouseMoved", x0, y0, 0); self.mouse("mousePressed", x0, y0)
        for i in range(1, steps + 1):
            self.mouse("mouseMoved", x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps); time.sleep(pause)
        self.mouse("mouseReleased", x1, y1); time.sleep(0.15)

    def type(self, sel, value, nth=0, commit=True):
        """Set an input / select / textarea value the way a user would (input + change events)."""
        r = self.eval("(function(){var e=document.querySelectorAll(%s)[%d];if(!e)return false;e.focus();"
                      "var d=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(e),'value');d&&d.set?d.set.call(e,%s):(e.value=%s);"
                      "e.dispatchEvent(new Event('input',{bubbles:true}));%s return true})()"
                      % (json.dumps(sel), nth, json.dumps(str(value)), json.dumps(str(value)),
                         "e.dispatchEvent(new Event('change',{bubbles:true}));" if commit else ""))
        if not r:
            raise RuntimeError("type: no element for " + sel)
        time.sleep(0.15)

    def key(self, key, code=None, vk=None):
        """Press a key, e.g. key('Enter'), key('Escape'), key('Tab')."""
        VK = {"Enter": 13, "Escape": 27, "Tab": 9, "Backspace": 8, "Delete": 46, "ArrowLeft": 37, "ArrowUp": 38, "ArrowRight": 39, "ArrowDown": 40}
        p = {"key": key, "code": code or key, "windowsVirtualKeyCode": vk or VK.get(key, 0)}
        if key == "Enter":
            p["text"] = "\r"
        self.cmd("Input.dispatchKeyEvent", dict(p, type="keyDown")); self.cmd("Input.dispatchKeyEvent", dict(p, type="keyUp"))
        time.sleep(0.1)

    def text(self, sel="body"):
        return self.eval("(function(){var e=document.querySelector(%s);return e?e.innerText:null})()" % json.dumps(sel))

    def resize(self, w, h, dpr=None):
        self.w, self.h = w, h
        if dpr:
            self.dpr = dpr
        self.cmd("Emulation.setDeviceMetricsOverride", {
            "width": w, "height": h, "deviceScaleFactor": self.dpr, "mobile": self.mobile})

    def shot(self, path, full=False):
        p = {"format": "png"}
        if full:
            p["captureBeyondViewport"] = True
        r = self.cmd("Page.captureScreenshot", p)
        with open(path, "wb") as f:
            f.write(base64.b64decode(r["data"]))
        return path

    def drain_logs(self):
        out, self.logs = self.logs[:], []
        return out


if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8765/"
    out = sys.argv[2] if len(sys.argv) > 2 else "shot.png"
    with Chrome() as c:
        c.goto(url, wait=2.5)
        c.shot(out)
        print("logs:", c.drain_logs())
        print("saved", out)
