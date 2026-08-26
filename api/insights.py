# api/insights.py
#
# Vercel Python Serverless Function.
# The frontend (JavaScript) sends column stats + flagged anomalies here as JSON.
# This function builds a prompt, asks Gemini to explain the data in plain English,
# and sends that explanation back to the frontend.
#
# Your Gemini API key is read from an environment variable (GEMINI_API_KEY) —
# it never touches the frontend or gets exposed to the browser.
#
# Vercel requires Python functions to be written as a class named "handler"
# that extends BaseHTTPRequestHandler. This is just Vercel's required shape —
# you don't need to understand BaseHTTPRequestHandler deeply, just follow the pattern.

import json
import os
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler


def _load_env_local():
    """
    Manually read .env.local and load any KEY=VALUE lines into os.environ,
    but only if they aren't already set. This is a plain-Python replacement
    for the 'dotenv' package (which isn't installed) — no extra install needed.
    Local dev only: in production, Vercel injects env vars from its dashboard
    directly, so this file won't even need to exist there.
    """
    # NOTE: vercel dev copies this function into a temp folder to run it,
    # so os.path.dirname(__file__) points to that temp copy, NOT your real
    # project folder. os.getcwd() is more reliable — vercel dev keeps the
    # working directory set to your actual project root.
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


class handler(BaseHTTPRequestHandler):

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        raw_body = self.rfile.read(content_length)

        try:
            body = json.loads(raw_body)
        except json.JSONDecodeError:
            self._send_json(400, {"error": "Invalid JSON in request body."})
            return

        columns = body.get("columns")
        anomalies = body.get("anomalies", [])
        sample_size = body.get("sampleSize", "unknown")

        if not columns or not isinstance(columns, list):
            self._send_json(400, {"error": "Missing or invalid 'columns' data."})
            return

        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            self._send_json(500, {"error": "Server misconfigured: GEMINI_API_KEY not set."})
            return

        prompt = self._build_prompt(columns, anomalies, sample_size)

        try:
            raw_text = self._call_gemini(prompt, api_key)
        except Exception as e:
            self._send_json(502, {"error": "Gemini API request failed.", "detail": str(e)})
            return

        report = self._parse_report_json(raw_text)
        self._send_json(200, {"report": report})

    # --- helpers ---

    def _build_prompt(self, columns, anomalies, sample_size):
        column_lines = []
        for c in columns:
            column_lines.append(
                f"- {c.get('name')}: mean={c.get('mean')}, stdDev={c.get('stdDev')}, "
                f"min={c.get('min')}, max={c.get('max')}, latestValue={c.get('latestValue')}"
            )
        column_summary = "\n".join(column_lines)

        if anomalies:
            anomaly_lines = []
            for a in anomalies:
                anomaly_lines.append(
                    f"- {a.get('column')}: value {a.get('value')} deviates "
                    f"{a.get('deviation')} std-dev from baseline ({a.get('direction')})"
                )
            anomaly_summary = "\n".join(anomaly_lines)
        else:
            anomaly_summary = "No anomalies were flagged by the detection logic."

        return f"""You are writing a short data report for a manager who just uploaded a dataset with {sample_size} rows. You don't know the exact business context, so make a reasonable, clearly-hedged guess about what this dataset likely represents based on the column names and values.

Column statistics:
{column_summary}

Flagged anomalies (values that deviate significantly from the baseline):
{anomaly_summary}

Respond with ONLY a raw JSON object (no markdown code fences, no extra text before or after) in exactly this shape:

{{
  "dataset_overview": "1-2 sentences guessing what this dataset represents and what its columns track, in plain conversational language.",
  "stats_summary": "2-3 sentences summarizing the overall shape of the data - typical ranges, which metrics look stable vs volatile - in plain conversational language.",
  "anomaly_notes": "2-3 sentences on what the flagged anomalies suggest and a plausible real-world reason they might matter, in plain conversational language."
}}

Do not use markdown, headers, or bullet points inside any of the three strings - just flowing prose sentences."""

    def _call_gemini(self, prompt, api_key):
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"gemini-3.6-flash:generateContent?key={api_key}"
        )

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.4, "maxOutputTokens": 2048},
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
            raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError):
            raise Exception("Gemini response had no text content.")

        return raw_text

    def _parse_report_json(self, raw_text):
        # Gemini sometimes wraps JSON in ```json ... ``` fences even when told not to.
        # Strip those off before parsing.
        cleaned = raw_text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        cleaned = cleaned.strip()

        try:
            parsed = json.loads(cleaned)
            return {
                "dataset_overview": parsed.get("dataset_overview", ""),
                "stats_summary": parsed.get("stats_summary", ""),
                "anomaly_notes": parsed.get("anomaly_notes", ""),
            }
        except json.JSONDecodeError:
            # Fallback: if it truly isn't valid JSON, at least show something
            # rather than failing silently.
            return {
                "dataset_overview": raw_text,
                "stats_summary": "",
                "anomaly_notes": "",
            }

    def _send_json(self, status_code, body_dict):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(body_dict).encode("utf-8"))