#!/usr/bin/env python3
"""ADB-forwarded Firefox debugger helper for local development APKs."""
import socket
import json
import sys


class RDP:
    def __init__(self, port=6088):
        self.events = []
        self.s = socket.create_connection(("127.0.0.1", port), timeout=20)
        self.recv()

    def recv(self):
        n = b""
        while not n.endswith(b":"):
            c = self.s.recv(1)
            if not c:
                raise EOFError()
            n += c
        data = b""
        while len(data) < int(n[:-1]):
            data += self.s.recv(int(n[:-1]) - len(data))
        return json.loads(data)

    def call(self, to, kind, **args):
        data = json.dumps(dict(to=to, type=kind, **args)).encode()
        self.s.sendall(str(len(data)).encode() + b":" + data)
        while True:
            r = self.recv()
            self.events.append(r)
            if r.get("from") == to and (r.get("type") not in ["consoleAPICall", "pageError"]):
                return r

    def eval(self, text):
        tabs = self.call("root", "listTabs")["tabs"]
        tab = next(t for t in tabs if "system.localhost" in t.get("url", ""))
        frame = self.call(tab["actor"], "getTarget")["frame"]
        reply = self.call(frame["consoleActor"], "evaluateJSAsync", text=text)
        if "resultID" not in reply:
            return reply
        while True:
            result = self.recv()
            if (
                result.get("type") == "evaluationResult"
                and result.get("resultID") == reply["resultID"]
            ):
                return result


if __name__ == "__main__":
    c = RDP()
    print(
        json.dumps(
            c.eval(sys.argv[1]) if len(sys.argv) > 1 else c.call("root", "listTabs"),
            ensure_ascii=False,
            indent=2,
        )
    )
    c.s.close()
