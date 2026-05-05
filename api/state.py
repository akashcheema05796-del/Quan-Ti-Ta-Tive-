from __future__ import annotations

import json
from typing import Optional, Set

from starlette.websockets import WebSocket


class AppState:
    def __init__(self):
        self.latest_signal: dict = {}
        self.exchange  = None
        self.executor  = None
        self._clients: Set[WebSocket] = set()

    def add_client(self, ws: WebSocket) -> None:
        self._clients.add(ws)

    def remove_client(self, ws: WebSocket) -> None:
        self._clients.discard(ws)

    async def broadcast(self, msg: dict) -> None:
        # Snapshot the set before iterating to avoid RuntimeError if a client
        # connects or disconnects mid-broadcast (C-3).
        dead = set()
        data = json.dumps(msg)
        for ws in list(self._clients):
            try:
                await ws.send_text(data)
            except Exception:
                dead.add(ws)
        self._clients -= dead


state = AppState()
