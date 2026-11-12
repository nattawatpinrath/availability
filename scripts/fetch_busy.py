"""Read one or more iCal (.ics) calendars and write only the busy time ranges.

The output (busy.json) holds start/end times only: no titles, places,
attendees or notes, so it is safe to publish on a public page.

Environment variables:
  ICS_URLS    one or more .ics URLs or local file paths, separated by spaces
              or new lines (keep real URLs in GitHub Secrets, never in the repo)
  OUT         output file (default: build/busy.json; not published as is)
  DAYS_AHEAD  how many days ahead to read (default: 60)
  LOCAL_TZ    timezone for all-day / floating events (default: Asia/Bangkok)
"""
import json
import os
import sys
import urllib.request
from datetime import date, datetime, time, timedelta, timezone

try:
    from zoneinfo import ZoneInfo
except ImportError:  # Python < 3.9
    from backports.zoneinfo import ZoneInfo

import icalendar
import recurring_ical_events

LOCAL_TZ = ZoneInfo(os.environ.get("LOCAL_TZ", "Asia/Bangkok"))
DAYS_AHEAD = int(os.environ.get("DAYS_AHEAD", "60"))
OUT = os.environ.get("OUT", "build/busy.json")


def load(src: str) -> bytes:
    if src.startswith("webcal://"):
        src = "https://" + src[len("webcal://"):]
    if src.startswith(("http://", "https://")):
        req = urllib.request.Request(src, headers={"User-Agent": "busy-sync/1.0"})
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.read()
    with open(src, "rb") as f:
        return f.read()


def to_utc(value) -> datetime:
    if isinstance(value, datetime):
        if value.tzinfo is None:  # floating time: treat as local time
            value = value.replace(tzinfo=LOCAL_TZ)
        return value.astimezone(timezone.utc)
    # all-day event: a plain date, midnight local time
    return datetime.combine(value, time.min, tzinfo=LOCAL_TZ).astimezone(timezone.utc)


def busy_ranges(cal, start: datetime, end: datetime):
    for ev in recurring_ical_events.of(cal).between(start, end):
        if str(ev.get("TRANSP", "OPAQUE")).upper() == "TRANSPARENT":
            continue  # marked "free" / "show as available"
        if str(ev.get("STATUS", "")).upper() == "CANCELLED":
            continue
        dtstart = ev.get("DTSTART")
        if dtstart is None:
            continue
        s = dtstart.dt
        if ev.get("DTEND") is not None:
            e = ev["DTEND"].dt
        elif ev.get("DURATION") is not None:
            e = s + ev["DURATION"].dt
        else:
            e = s + (timedelta(days=1) if not isinstance(s, datetime) else timedelta(0))
        s, e = to_utc(s), to_utc(e)
        if e > s:
            yield s, e


def merge(ranges):
    out = []
    for s, e in sorted(ranges):
        if out and s <= out[-1][1]:
            out[-1][1] = max(out[-1][1], e)
        else:
            out.append([s, e])
    return out


def main() -> int:
    sources = os.environ.get("ICS_URLS", "").split()
    if not sources:
        print("ICS_URLS is empty: set it to your calendar's secret .ics address", file=sys.stderr)
        return 1

    today = datetime.now(LOCAL_TZ).date()
    start = datetime.combine(today, time.min, tzinfo=LOCAL_TZ)
    end = start + timedelta(days=DAYS_AHEAD + 1)

    ranges = []
    for i, src in enumerate(sources, 1):
        try:
            cal = icalendar.Calendar.from_ical(load(src))
        except Exception as exc:  # never print the URL: it is a secret
            print(f"calendar #{i}: could not read ({type(exc).__name__})", file=sys.stderr)
            return 1
        found = list(busy_ranges(cal, start, end))
        print(f"calendar #{i}: {len(found)} busy events")
        ranges.extend(found)

    fmt = "%Y-%m-%dT%H:%M:%SZ"
    data = {
        "generated": datetime.now(timezone.utc).strftime(fmt),
        "from": start.astimezone(timezone.utc).strftime(fmt),
        "to": end.astimezone(timezone.utc).strftime(fmt),
        "busy": [[s.strftime(fmt), e.strftime(fmt)] for s, e in merge(ranges)],
    }
    os.makedirs(os.path.dirname(OUT) or ".", exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, separators=(",", ":"))
    print(f"wrote {len(data['busy'])} busy ranges to {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
