"""Command-line alternative to admin.html: add a temporary link and print it.

  LINK_SECRET=... SITE_URL=https://<user>.github.io/<repo>/ python scripts/make_link.py 7
  (then commit and push links.json)

The argument is how many days the link stays valid (until 23:59 Bangkok time).
"""
import json
import os
import secrets
import sys
from datetime import datetime, time, timedelta, timezone

sys.path.insert(0, os.path.dirname(__file__))
from publish_links import LINKS, b64url, link_key  # noqa: E402

BKK = timezone(timedelta(hours=7))


def main() -> int:
    days = int(sys.argv[1]) if len(sys.argv) > 1 else 7
    secret = os.environ["LINK_SECRET"]
    site = os.environ.get("SITE_URL", "http://localhost:8765/")
    end = datetime.combine(datetime.now(BKK).date() + timedelta(days=days), time(23, 59, 59), BKK)
    link = {"id": b64url(secrets.token_bytes(9)), "expires": end.isoformat()}
    try:
        with open(LINKS, encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        data = {"links": []}
    now = datetime.now(timezone.utc)
    data["links"] = [l for l in data["links"] if datetime.fromisoformat(l["expires"]) > now] + [link]
    with open(LINKS, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        f.write("\n")
    key = b64url(link_key(secret, link["id"], link["expires"]))
    print(f"valid until {end:%a %d %b %Y %H:%M} (Bangkok)")
    print(f"{site}#{link['id']}.{key}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
