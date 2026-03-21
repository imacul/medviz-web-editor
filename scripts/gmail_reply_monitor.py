#!/usr/bin/env python3
"""Watch Gmail inbox for new replies and persist seen message ids."""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

try:
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "Missing dependencies. Install with:\n"
        "python -m pip install --user google-api-python-client google-auth-httplib2 google-auth-oauthlib"
    ) from exc

# Keep send scope here so one token can both read and send.
SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
]


@dataclass
class MailSummary:
    message_id: str
    thread_id: str
    from_header: str
    subject: str
    date: str
    snippet: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Monitor Gmail for new replies.")
    parser.add_argument("--credentials", required=True, help="Path to OAuth client credentials.json")
    parser.add_argument("--token", required=True, help="Path to OAuth token cache file")
    parser.add_argument(
        "--state-file",
        default="outreach/gmail_reply_monitor_state.json",
        help="Path to state file with seen message ids",
    )
    parser.add_argument(
        "--query",
        default='in:inbox newer_than:14d',
        help="Gmail search query used for scanning inbox",
    )
    parser.add_argument("--limit", type=int, default=25, help="Max messages to inspect")
    parser.add_argument(
        "--sender-filter",
        default="",
        help="Optional substring filter on sender (case-insensitive)",
    )
    parser.add_argument(
        "--self-email",
        default="",
        help="Optional sender email to exclude your own messages",
    )
    return parser.parse_args()


def to_console(text: str) -> str:
    # Windows terminals may use cp1252; replace unsupported glyphs.
    return text.encode("cp1252", errors="replace").decode("cp1252")


def get_credentials(credentials_path: Path, token_path: Path) -> Credentials:
    creds = None
    if token_path.exists():
        creds = Credentials.from_authorized_user_file(str(token_path), SCOPES)
        if not creds.has_scopes(SCOPES):
            creds = None

    if creds and creds.valid:
        return creds

    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
    else:
        flow = InstalledAppFlow.from_client_secrets_file(str(credentials_path), SCOPES)
        creds = flow.run_local_server(port=0)

    token_path.write_text(creds.to_json(), encoding="utf-8")
    return creds


def load_seen_ids(path: Path) -> set[str]:
    if not path.exists():
        return set()
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return set()
    seen = payload.get("seen_ids", [])
    if not isinstance(seen, list):
        return set()
    return {str(item) for item in seen}


def save_seen_ids(path: Path, seen_ids: Iterable[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {"seen_ids": sorted(set(seen_ids))}
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def header_value(headers: list[dict], name: str) -> str:
    target = name.lower()
    for item in headers:
        if item.get("name", "").lower() == target:
            return item.get("value", "")
    return ""


def fetch_summaries(service, query: str, limit: int) -> list[MailSummary]:
    resp = (
        service.users()
        .messages()
        .list(userId="me", q=query, maxResults=limit)
        .execute()
    )
    messages = resp.get("messages", [])
    results: list[MailSummary] = []

    for msg in messages:
        msg_id = msg.get("id", "")
        if not msg_id:
            continue
        detail = (
            service.users()
            .messages()
            .get(userId="me", id=msg_id, format="metadata", metadataHeaders=["From", "Subject", "Date"])
            .execute()
        )
        payload = detail.get("payload", {})
        headers = payload.get("headers", [])
        results.append(
            MailSummary(
                message_id=detail.get("id", ""),
                thread_id=detail.get("threadId", ""),
                from_header=header_value(headers, "From"),
                subject=header_value(headers, "Subject"),
                date=header_value(headers, "Date"),
                snippet=detail.get("snippet", ""),
            )
        )
    return results


def is_from_self(from_header: str, self_email: str) -> bool:
    if not self_email:
        return False
    return self_email.lower() in from_header.lower()


def main() -> int:
    args = parse_args()
    credentials_path = Path(args.credentials)
    token_path = Path(args.token)
    state_path = Path(args.state_file)

    if not credentials_path.exists():
        raise SystemExit(f"Credentials file not found: {credentials_path}")

    creds = get_credentials(credentials_path, token_path)
    service = build("gmail", "v1", credentials=creds)

    seen_ids = load_seen_ids(state_path)
    summaries = fetch_summaries(service, args.query, args.limit)

    sender_filter = args.sender_filter.lower().strip()
    new_items: list[MailSummary] = []

    for item in summaries:
        if not item.message_id or item.message_id in seen_ids:
            continue
        if is_from_self(item.from_header, args.self_email):
            continue
        if sender_filter and sender_filter not in item.from_header.lower():
            continue
        new_items.append(item)

    # Mark scanned messages as seen to avoid noisy repeats.
    updated_seen = set(seen_ids)
    for item in summaries:
        if item.message_id:
            updated_seen.add(item.message_id)
    save_seen_ids(state_path, updated_seen)

    if not new_items:
        print("No new replies.")
        return 0

    print(f"New replies found: {len(new_items)}")
    for idx, item in enumerate(new_items, start=1):
        print("")
        print(to_console(f"[{idx}] From: {item.from_header}"))
        print(to_console(f"Subject: {item.subject}"))
        print(to_console(f"Date: {item.date}"))
        print(to_console(f"Thread: {item.thread_id}"))
        print(to_console(f"Message: {item.message_id}"))
        print(to_console(f"Snippet: {item.snippet}"))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
