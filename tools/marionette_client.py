"""Small client for the Marionette protocol shipped with current Firefox."""

import json
import socket
import time


class Client:
    def __init__(self, port=2856):
        deadline = time.monotonic() + 30
        while True:
            try:
                self.socket = socket.create_connection(("127.0.0.1", port), timeout=20)
                break
            except ConnectionRefusedError:
                if time.monotonic() >= deadline:
                    raise
                time.sleep(0.2)
        self.sequence = 0
        self.quit_requested = False
        self.receive()
        self.call("WebDriver:NewSession", {"capabilities": {}})
        self.call("Marionette:SetContext", {"value": "chrome"})

    def receive(self):
        length = bytearray()
        while not length.endswith(b":"):
            chunk = self.socket.recv(1)
            if not chunk:
                raise ConnectionError("Marionette disconnected")
            length += chunk
        remaining = int(length[:-1])
        payload = bytearray()
        while len(payload) < remaining:
            chunk = self.socket.recv(remaining - len(payload))
            if not chunk:
                raise ConnectionError("Marionette disconnected")
            payload += chunk
        return json.loads(payload)

    def call(self, command, arguments=None):
        self.sequence += 1
        payload = json.dumps([0, self.sequence, command, arguments or {}]).encode()
        self.socket.sendall(str(len(payload)).encode() + b":" + payload)
        response = self.receive()
        if response[2]:
            raise RuntimeError(response[2])
        if command == "Marionette:Quit":
            self.quit_requested = True
        return response[3]

    def execute(self, script):
        result = self.call(
            "WebDriver:ExecuteScript",
            {"script": script, "args": [], "newSandbox": True, "sandbox": "system"},
        )
        return result.get("value", result)

    def close(self):
        try:
            if not self.quit_requested:
                self.call("WebDriver:DeleteSession")
        finally:
            self.socket.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()
