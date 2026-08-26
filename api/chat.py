# api/chat.py
#
# Vercel Python Serverless Function.
# Powers the chatbot: the frontend sends the full uploaded dataset (as CSV text)
# plus the user's question. This function asks Gemini to answer using only
# that data, and returns the answer.
#
# Unlike insights.py (which only sends summary stats), this endpoint sends the
# full dataset — needed so the bot can answer specific questions like
# "which row has the highest revenue" rather than just trend-level questions.

import json
import os
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler


def _load_env_local():
    candidate_paths = [
        os.path.join(os.getcwd(), ".env.local"),
        os.path.join(os.path.dirname(__file__), "..", ".env.local"),
    ]
    env_path = None
    for path in candidate_paths:
        if os.path.exists(path):
            env_path = path
            break
    if env_path is None:
        return
    with open(env_path, "r") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


_load_env_local()

# Safety cap: if someone uploads a huge dataset, don't send unlimited rows to
# Gemini every single chat message — that would be slow and burn through the
# free-tier token budget fast. 500 rows is plenty for a chatbot to reason over.
MAX_ROWS_FOR_CHAT = 500


class handler(BaseHTTPRequestHandler):

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        raw_body = self.rfile.read(content_length)

        try:
            body = json.loads(raw_body)
        except json.JSONDecodeError:
            self._send_json(400, {"error": "Invalid JSON in request body."})
            return

        question = body.get("question")
        csv_data = body.get("csvData")
        history = body.get("history", [])  # list of {role, text} from earlier turns in this chat

        if not question or not csv_data:
            self._send_json(400, {"error": "Missing 'question' or 'csvData'."})
            return

        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            self._send_json(500, {"error": "Server misconfigured: GEMINI_API_KEY not set."})
            return

        prompt = self._build_prompt(question, csv_data, history)

        try:
            answer = self._call_gemini(prompt, api_key)
        except Exception as e:
            self._send_json(502, {"error": "Gemini API request failed.", "detail": str(e)})
            return

        self._send_json(200, {"answer": answer})

    def _build_prompt(self, question, csv_data, history):
        history_text = ""
        if history:
            history_lines = [f"{h.get('role')}: {h.get('text')}" for h in history]
            history_text = "Earlier in this conversation:\n" + "\n".join(history_lines) + "\n\n"

        return f"""You are answering questions about a dataset a user uploaded. Here is the data in CSV format (possibly truncated to the first {MAX_ROWS_FOR_CHAT} rows if it was larger):

{csv_data}

{history_text}The user's question: {question}

Answer using only the data above. If the answer isn't determinable from this data, say so plainly rather than guessing. Keep your answer concise and conversational - a sentence or two for simple questions, a short paragraph max for more complex ones. No markdown formatting, no bullet points - plain spoken-style text."""

    def _call_gemini(self, prompt, api_key):
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"gemini-3.6-flash:generateContent?key={api_key}"
        )

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.3, "maxOutputTokens": 1024},
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=55) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            raise Exception(f"Gemini returned HTTP {e.code}: {e.read().decode('utf-8')}")

        try:
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError):
            raise Exception("Gemini response had no text content.")

    def _send_json(self, status_code, body_dict):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(body_dict).encode("utf-8"))
