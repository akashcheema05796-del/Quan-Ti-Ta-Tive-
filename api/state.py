import json
from starlette.websockets import WebSocket

class AppState:
    def __init__(self):
        self.latest_signal: dict = {}
        self.exchange  = None
        self.executor  = None
        self._clients: set[WebSocket] = set()

    def add_client(self, ws: WebSocket):
        self._clients.add(ws)

    def remove_client(self, ws: WebSocket):
        self._clients.discard(ws)

    async def broadcast(self, msg: dict):
        dead = set()
        data = json.dumps(msg)
        for ws in self._clients:
            try:
                await ws.send_text(data)
            except Exception:
                dead.add(ws)
        self._clients -= dead

state = AppState()
