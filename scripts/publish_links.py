"""Encrypt the busy times once per active temporary link.

For every link in links.json that has not expired, this writes
site/d/<id>.bin = AES-256-GCM(key, payload), where

    key = HMAC-SHA256(LINK_SECRET, "<id>|<expires>")

The link people receive is  https://.../#<id>.<key>  (the key sits after "#",
so it is never sent to GitHub's servers). Expired or revoked links get no
file at the next deploy, so they stop working. Nothing readable is published
without a valid link.

Environment variables:
  LINK_SECRET    long random string (GitHub Secret); also pasted in admin.html
  CONTACT_EMAIL  optional; shown to link holders for "Request this time"
  BUSY           input from fetch_busy.py (default: build/busy.json)
  LINKS          link list (default: links.json)
  OUT_DIR        output folder (default: site/d)
"""
import base64
import hashlib
import hmac
import json
import os
import shutil
import sys
from datetime import datetime, timezone

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

BUSY = os.environ.get("BUSY", "build/busy.json")
LINKS = os.environ.get("LINKS", "links.json")
OUT_DIR = os.environ.get("OUT_DIR", "site/d")


def link_key(secret: str, link_id: str, expires: str) -> bytes:
    msg = f"{link_id}|{expires}".encode()
    return hmac.new(secret.encode(), msg, hashlib.sha256).digest()


def b64url(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def main() -> int:
    secret = os.environ.get("LINK_SECRET", "")
    with open(BUSY, encoding="utf-8") as f:
        busy = json.load(f)
    try:
        with open(LINKS, encoding="utf-8") as f:
            links = json.load(f).get("links", [])
    except FileNotFoundError:
        links = []

    shutil.rmtree(OUT_DIR, ignore_errors=True)
    os.makedirs(OUT_DIR, exist_ok=True)
    now = datetime.now(timezone.utc)
    if not any(datetime.fromisoformat(l["expires"]) > now for l in links):
        print("no active links yet: nothing to encrypt")  # first deploy works even before LINK_SECRET is set
        return 0
    if len(secret) < 20:
        print("LINK_SECRET is missing or too short (set it in GitHub Secrets)", file=sys.stderr)
        return 1
    contact = os.environ.get("CONTACT_EMAIL", "").strip()
    active = 0
    for link in links:
        exp = datetime.fromisoformat(link["expires"])
        if exp <= now:
            continue
        payload = dict(busy, expires=link["expires"])
        if contact:
            payload["contact"] = contact
        key = link_key(secret, link["id"], link["expires"])
        nonce = os.urandom(12)
        blob = nonce + AESGCM(key).encrypt(nonce, json.dumps(payload, separators=(",", ":")).encode(), None)
        with open(os.path.join(OUT_DIR, f"{link['id']}.bin"), "wb") as f:
            f.write(blob)
        active += 1
    print(f"{active} active link(s), {len(links) - active} expired")
    return 0


if __name__ == "__main__":
    sys.exit(main())
