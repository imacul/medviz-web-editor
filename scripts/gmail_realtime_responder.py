#!/usr/bin/env python3
"""Poll Gmail and auto-respond to new matched inbox messages."""

from __future__ import annotations

import argparse
import base64
import json
import re
from dataclasses import dataclass
from email.message import EmailMessage
from pathlib import Path

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

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
]
ACK_MARKER = "[Codex-Ack]"


@dataclass
class MailSummary:
    message_id: str
    thread_id: str
    from_header: str
    subject: str
    date: str
    snippet: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Gmail near real-time responder")
    parser.add_argument("--credentials", required=True, help="Path to OAuth client credentials.json")
    parser.add_argument("--token", required=True, help="Path to OAuth token file")
    parser.add_argument(
        "--state-file",
        default="outreach/gmail_realtime_responder_state.json",
        help="Path to JSON state file",
    )
    parser.add_argument(
        "--query",
        default=f'in:inbox newer_than:2d -subject:"{ACK_MARKER}"',
        help="Gmail query for watched messages",
    )
    parser.add_argument(
        "--sender-filter",
        default="",
        help="Only respond if sender contains this text (case-insensitive)",
    )
    parser.add_argument("--limit", type=int, default=20, help="Max messages to scan")
    parser.add_argument(
        "--body-file",
        required=True,
        help="Path to auto-reply body template text file",
    )
    parser.add_argument("--dry-run", action="store_true", help="Preview without sending")
    return parser.parse_args()


def to_console(text: str) -> str:
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


def load_state(path: Path) -> dict:
    if not path.exists():
        return {"seen_ids": [], "replied_ids": []}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {"seen_ids": [], "replied_ids": []}
    payload.setdefault("seen_ids", [])
    payload.setdefault("replied_ids", [])
    return payload


def save_state(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload["seen_ids"] = sorted(set(str(v) for v in payload.get("seen_ids", [])))
    payload["replied_ids"] = sorted(set(str(v) for v in payload.get("replied_ids", [])))
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def header_value(headers: list[dict], name: str) -> str:
    target = name.lower()
    for item in headers:
        if item.get("name", "").lower() == target:
            return item.get("value", "")
    return ""


def parse_sender_email(from_header: str) -> str:
    match = re.search(r"<([^>]+)>", from_header)
    if match:
        return match.group(1).strip()
    return from_header.strip()


def fetch_summaries(service, query: str, limit: int) -> list[MailSummary]:
    resp = service.users().messages().list(userId="me", q=query, maxResults=limit).execute()
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
        headers = detail.get("payload", {}).get("headers", [])
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


def build_reply_message(to_email: str, subject: str, body: str) -> EmailMessage:
    message = EmailMessage()
    safe_subject = subject if subject.lower().startswith("re:") else f"Re: {subject}"
    if ACK_MARKER not in safe_subject:
        safe_subject = f"{safe_subject} {ACK_MARKER}"
    message["To"] = to_email
    message["Subject"] = safe_subject
    message.set_content(body)
    return message


def encode_message(message: EmailMessage) -> dict[str, str]:
    raw = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
    return {"raw": raw}


def main() -> int:
    args = parse_args()
    credentials_path = Path(args.credentials)
    token_path = Path(args.token)
    state_path = Path(args.state_file)
    body_path = Path(args.body_file)

    if not credentials_path.exists():
        raise SystemExit(f"Credentials file not found: {credentials_path}")
    if not body_path.exists():
        raise SystemExit(f"Body template not found: {body_path}")

    creds = get_credentials(credentials_path, token_path)
    service = build("gmail", "v1", credentials=creds)

    state = load_state(state_path)
    seen_ids = set(state.get("seen_ids", []))
    replied_ids = set(state.get("replied_ids", []))

    body_template = body_path.read_text(encoding="utf-8")
    sender_filter = args.sender_filter.lower().strip()

    summaries = fetch_summaries(service, args.query, args.limit)
    new_items = [item for item in summaries if item.message_id and item.message_id not in seen_ids]

    if not new_items:
        print("No new matched messages.")
        return 0

    replied_count = 0
    for item in new_items:
        seen_ids.add(item.message_id)
        from_email = parse_sender_email(item.from_header)
        if not from_email:
            continue
        if sender_filter and sender_filter not in item.from_header.lower():
            continue
        if item.message_id in replied_ids:
            continue

        body = body_template.format(
            from_header=item.from_header,
            subject=item.subject,
            date=item.date,
            snippet=item.snippet,
        )

        if args.dry_run:
            print(to_console(f"[DRY RUN] Would reply to {from_email} | subject={item.subject}"))
            replied_ids.add(item.message_id)
            replied_count += 1
            continue

        message = build_reply_message(from_email, item.subject, body)
        payload = encode_message(message)
        result = service.users().messages().send(userId="me", body=payload).execute()
        replied_ids.add(item.message_id)
        replied_count += 1
        print(to_console(f"Replied to {from_email} ({result.get('id', '')})"))

    state["seen_ids"] = sorted(seen_ids)
    state["replied_ids"] = sorted(replied_ids)
    save_state(state_path, state)
    print(f"Processed {len(new_items)} new messages; sent {replied_count} auto-replies.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

