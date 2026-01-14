"""
FlowMate Automation Engine (Minimal, Working)

Goal:
- Provide TWO real, working integrations for your FlowMate UI:
  1) Email Monitor (practical demo): watches a local folder for "email" files
  2) Notification/Data Puller: fetches non-sensitive notification-like data from a URL

This keeps the project simple and reliable for a 1-week deadline.

How it integrates:
- The Node backend calls this engine via HTTP: POST http://localhost:5001/execute
- The frontend calls the backend to run a flow.

Run:
  cd python
  python engine.py

Then the engine listens on: http://localhost:5001
"""

from __future__ import annotations

import json
import os
from datetime import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any, Dict, Optional

import requests


# ------------------------------
# Helpers
# ------------------------------

def now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


def safe_json(body: bytes) -> Dict[str, Any]:
    try:
        if not body:
            return {}
        return json.loads(body.decode("utf-8"))
    except Exception:
        return {}


# ------------------------------
# Real Integrations (Minimal)
# ------------------------------

class RealIntegrations:
    """Small, reliable "real" integrations for a capstone demo."""

    def email_folder_monitor(
        self,
        folder: str,
        match_from: Optional[str] = None,
        match_subject: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Checks a folder for files that represent emails.

        File format (simple JSON recommended):
          {
            "from": "alerts@company.com",
            "subject": "Server Down",
            "body": "..."
          }

        Also supports plain text files (subject=filename).

        Returns:
          { found: bool, matches: [...], checked: int }
        """
        os.makedirs(folder, exist_ok=True)

        # Look for .json and .txt "emails"
        files = []
        for name in os.listdir(folder):
            if name.lower().endswith((".json", ".txt")):
                files.append(os.path.join(folder, name))

        matches = []
        for path in sorted(files, key=lambda p: os.path.getmtime(p), reverse=True):
            item = {
                "file": os.path.basename(path),
                "from": None,
                "subject": None,
                "preview": None,
                "timestamp": datetime.fromtimestamp(os.path.getmtime(path)).isoformat(),
            }
            try:
                if path.lower().endswith(".json"):
                    with open(path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    item["from"] = data.get("from")
                    item["subject"] = data.get("subject")
                    body = data.get("body") or ""
                    item["preview"] = (body[:120] + "...") if len(body) > 120 else body
                else:
                    with open(path, "r", encoding="utf-8") as f:
                        body = f.read()
                    item["subject"] = os.path.basename(path)
                    item["preview"] = (body[:120] + "...") if len(body) > 120 else body

                # Apply filters
                if match_from and item.get("from"):
                    if match_from.lower() not in str(item["from"]).lower():
                        continue
                if match_subject and item.get("subject"):
                    if match_subject.lower() not in str(item["subject"]).lower():
                        continue

                matches.append(item)
            except Exception:
                # Ignore unreadable files
                continue

        return {
            "found": len(matches) > 0,
            "checked": len(files),
            "matches": matches[:5],  # limit for UI
        }

    def pull_notification_data(self, url: str, json_path: Optional[str] = None) -> Dict[str, Any]:
        """
        Fetch non-sensitive notification-type data from a URL.

        - If URL returns JSON, we optionally extract a nested value via json_path: "a.b.c"
        - If URL returns text/HTML, we return a short preview.
        """
        r = requests.get(url, timeout=8)
        content_type = r.headers.get("content-type", "").lower()

        if "application/json" in content_type or r.text.strip().startswith("{") or r.text.strip().startswith("["):
            data = r.json()
            extracted = None
            if json_path:
                cur: Any = data
                for key in json_path.split("."):
                    if isinstance(cur, dict) and key in cur:
                        cur = cur[key]
                    else:
                        cur = None
                        break
                extracted = cur
            return {
                "kind": "json",
                "url": url,
                "extracted": extracted,
                "data": data if extracted is None else None,
            }

        preview = r.text.strip().replace("\n", " ")
        preview = preview[:300] + ("..." if len(preview) > 300 else "")
        return {
            "kind": "text",
            "url": url,
            "preview": preview,
        }


# ------------------------------
# Workflow Executor
# ------------------------------

class WorkflowExecutor:
    def __init__(self):
        self.integrations = RealIntegrations()

    def execute(self, flow: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a flow definition sent by the backend."""
        flow_type = flow.get("type")
        flow_name = flow.get("name", "Untitled Flow")

        started = now_iso()

        # FLOW 1: Email Monitor (Folder)
        if flow_type == "email_monitor":
            config = flow.get("config", {})
            folder = config.get("folder", "inbox")
            match_from = config.get("matchFrom")
            match_subject = config.get("matchSubject")

            result = self.integrations.email_folder_monitor(folder, match_from, match_subject)
            status = "success"
            message = (
                f"Email monitor checked {result['checked']} files. "
                + (f"Matched {len(result['matches'])} email(s)." if result["found"] else "No matches found.")
            )
            return {
                "success": True,
                "status": status,
                "flow": flow_name,
                "type": flow_type,
                "startedAt": started,
                "finishedAt": now_iso(),
                "message": message,
                "result": result,
            }

        # FLOW 2: Notification/Data Pull
        if flow_type == "data_pull":
            config = flow.get("config", {})
            url = config.get("url") or "https://api.github.com/repos/nodejs/node"  # safe, public
            json_path = config.get("jsonPath")  # optional

            data = self.integrations.pull_notification_data(url, json_path=json_path)
            status = "success"
            if data.get("kind") == "json" and json_path:
                message = f"Fetched JSON from {url}. Extracted '{json_path}' = {data.get('extracted')}"
            else:
                message = f"Fetched data from {url}."

            return {
                "success": True,
                "status": status,
                "flow": flow_name,
                "type": flow_type,
                "startedAt": started,
                "finishedAt": now_iso(),
                "message": message,
                "result": data,
            }

        # Default / unknown
        return {
            "success": False,
            "status": "failed",
            "flow": flow_name,
            "type": flow_type,
            "startedAt": started,
            "finishedAt": now_iso(),
            "message": f"Unknown flow type: {flow_type}",
        }


# ------------------------------
# Tiny HTTP Server (no extra dependencies)
# ------------------------------

executor = WorkflowExecutor()


class Handler(BaseHTTPRequestHandler):
    def _send(self, code: int, payload: Dict[str, Any]):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "content-type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):  # noqa
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "content-type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()

    def do_GET(self):  # noqa
        if self.path == "/health":
            return self._send(200, {"status": "OK", "service": "FlowMate Python Engine", "time": now_iso()})
        return self._send(404, {"success": False, "error": "Not found"})

    def do_POST(self):  # noqa
        if self.path != "/execute":
            return self._send(404, {"success": False, "error": "Not found"})

        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length)
        payload = safe_json(body)

        flow = payload.get("flow") if isinstance(payload, dict) else None
        if not isinstance(flow, dict):
            return self._send(400, {"success": False, "error": "Missing 'flow' object"})

        try:
            result = executor.execute(flow)
            code = 200 if result.get("success") else 400
            return self._send(code, result)
        except Exception as e:
            return self._send(500, {"success": False, "status": "failed", "error": str(e)})


def main():
    port = int(os.environ.get("FLOWMATE_ENGINE_PORT", "5001"))
    server = HTTPServer(("0.0.0.0", port), Handler)
    print("=" * 60)
    print("FlowMate Python Engine (Minimal) running")
    print(f"Health:   http://localhost:{port}/health")
    print(f"Execute:  http://localhost:{port}/execute")
    print("Email monitor folder default: ./inbox")
    print("=" * 60)
    server.serve_forever()


if __name__ == "__main__":
    main()