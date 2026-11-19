"""Read one or more iCal (.ics) calendars and write only the busy time ranges.

The output (busy.json) holds start/end times only, plus the dates when you
are away from campus ("away"): no titles, places, attendees or notes.

The event's place (LOCATION) comes first: it counts as off campus when it
names a province, district (อ./ต./จ.), Bangkok (กรุงเทพ/กทม) or a hotel, e.g.
"อ.ปลวกแดง จ.ระยอง". The title is read only for travel words such as
"เดินทางไป", "ไปราชการ", "กทม", "กรุงเทพ" or a hotel ("โรงแรม", "รีสอร์ท")
(a province in a title does not count: "visitors from อยุธยา" is on campus).
Put [นอก] in the place or title to mark it by hand, or [ใน] to say it is on
campus after all. Online meetings (Zoom, Meet, Teams) are not off campus.
The whole day of an off-campus event shows as away, even if the event is
marked "free". A hotel stay ("พักโรงแรม ...", "เข้าพัก", "check-in") also
marks the next day as away, since you wake up there.

Environment variables:
  ICS_URLS    one or more .ics URLs or local file paths, separated by spaces
              or new lines (keep real URLs in GitHub Secrets, never in the repo)
  OUT         output file (default: build/busy.json; not published as is)
  DAYS_AHEAD  how many days ahead to read (default: 60)
  LOCAL_TZ    timezone for all-day / floating events (default: Asia/Bangkok)
"""
import json
import os
import re
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


PROVINCES = (
    "กรุงเทพ กระบี่ กาญจนบุรี กาฬสินธุ์ กำแพงเพชร ขอนแก่น จันทบุรี ฉะเชิงเทรา ชลบุรี ชัยนาท "
    "ชัยภูมิ ชุมพร เชียงราย เชียงใหม่ ตรัง ตราด นครนายก นครปฐม นครพนม นครศรีธรรมราช "
    "นครสวรรค์ นนทบุรี นราธิวาส น่าน บึงกาฬ บุรีรัมย์ ปทุมธานี ประจวบคีรีขันธ์ ปราจีนบุรี ปัตตานี "
    "พระนครศรีอยุธยา อยุธยา พะเยา พังงา พัทลุง พิจิตร พิษณุโลก เพชรบุรี เพชรบูรณ์ ภูเก็ต "
    "มหาสารคาม มุกดาหาร แม่ฮ่องสอน ยโสธร ยะลา ร้อยเอ็ด ระนอง ระยอง ราชบุรี ลพบุรี ลำปาง "
    "ลำพูน ศรีสะเกษ สกลนคร สงขลา สตูล สมุทรปราการ สมุทรสงคราม สมุทรสาคร สระแก้ว สระบุรี "
    "สิงห์บุรี สุโขทัย สุพรรณบุรี สุราษฎร์ธานี สุรินทร์ หนองคาย หนองบัวลำภู อ่างทอง อำนาจเจริญ "
    "อุดรธานี อุตรดิตถ์ อุทัยธานี อุบลราชธานี พัทยา หัวหิน"
).split()  # left out: นครราชสีมา (the campus is there); เลย แพร่ ตาก (everyday words: write จ.เลย in the place)
OFF_WORDS = re.compile("|".join(map(re.escape, PROVINCES)) + r"|กทม|จังหวัด|โรงแรม|รีสอร์ท|hotel|resort|bangkok|\[นอก\]", re.I)
HOTEL = r"โรงแรม|รีสอร์ท|hotel|resort"
# a night away: "เข้าพัก", "Stay at X" (Gmail hotel bookings), "check-in"; or พัก + a hotel word
STAY_SURE = r"เข้าพัก|stay at|check.?in|เช็[คก]อิน"
STAY = re.compile(r"พัก(?!กลางวัน|เที่ยง|เบรก)|" + STAY_SURE, re.I)
TRAVEL = re.compile(r"เดินทาง|ไปราชการ|กทม|กรุงเทพ|bangkok|\[นอก\]|" + HOTEL + "|" + STAY_SURE, re.I)
OFF_PLACE = re.compile(r"(?:^|[\s(/,])(?:จ|อ|ต)\.\s*\S")
ONLINE = re.compile(r"zoom|meet\.google|teams\.microsoft|webex|online|ออนไลน์", re.I)
ON_CAMPUS = re.compile(r"\[ใน\]|มทส|สุรนารี|\bSUT\b", re.I)


def is_off_campus(ev) -> bool:
    place, title = str(ev.get("LOCATION", "")), str(ev.get("SUMMARY", ""))
    if ON_CAMPUS.search(place) or "[ใน]" in title:
        return False
    if "[นอก]" in place or TRAVEL.search(title):
        return True
    if ONLINE.search(place):
        return False
    return bool(OFF_WORDS.search(place) or OFF_PLACE.search(place))


def is_hotel_stay(ev) -> bool:
    place, title = str(ev.get("LOCATION", "")), str(ev.get("SUMMARY", ""))
    if re.search(STAY_SURE, title, re.I):
        return True
    return bool(STAY.search(title) and re.search(HOTEL, title + " " + place, re.I))


def local_days(s, e):
    """Local dates an event touches (an all-day end date is exclusive)."""
    if not isinstance(s, datetime):
        d, last = s, e - timedelta(days=1)
    else:
        d = s.astimezone(LOCAL_TZ).date()
        last = (e - timedelta(seconds=1)).astimezone(LOCAL_TZ).date()
    while d <= last:
        yield d
        d += timedelta(days=1)


def to_utc(value) -> datetime:
    if isinstance(value, datetime):
        if value.tzinfo is None:  # floating time: treat as local time
            value = value.replace(tzinfo=LOCAL_TZ)
        return value.astimezone(timezone.utc)
    # all-day event: a plain date, midnight local time
    return datetime.combine(value, time.min, tzinfo=LOCAL_TZ).astimezone(timezone.utc)


def read_events(cal, start: datetime, end: datetime):
    """Return (busy ranges in UTC, set of local dates spent off campus)."""
    busy, away = [], set()
    for ev in recurring_ical_events.of(cal).between(start, end):
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
        if isinstance(s, datetime) and s.tzinfo is None:
            s = s.replace(tzinfo=LOCAL_TZ)
        if isinstance(e, datetime) and e.tzinfo is None:
            e = e.replace(tzinfo=LOCAL_TZ)
        if is_off_campus(ev):  # counts even when marked "free": you are still away
            days = list(local_days(s, e))
            if days and is_hotel_stay(ev):  # slept there, so the next day starts off campus too
                days.append(days[-1] + timedelta(days=1))
            away.update(days)
        if str(ev.get("TRANSP", "OPAQUE")).upper() == "TRANSPARENT":
            continue  # marked "free" / "show as available"
        us, ue = to_utc(s), to_utc(e)
        if ue > us:
            busy.append((us, ue))
    return busy, away


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
        print("::error::ICS_URLS secret is empty or missing: add it under Settings > Secrets and variables > Actions")
        return 1

    today = datetime.now(LOCAL_TZ).date()
    start = datetime.combine(today, time.min, tzinfo=LOCAL_TZ)
    end = start + timedelta(days=DAYS_AHEAD + 1)

    ranges, away, failed = [], set(), 0
    for i, src in enumerate(sources, 1):
        try:
            cal = icalendar.Calendar.from_ical(load(src))
        except Exception as exc:  # never print the URL: it is a secret
            failed += 1
            code = getattr(exc, "code", None)
            hint = {404: "link not found: use the *secret* iCal address (ends with basic.ics)",
                    401: "not allowed: use the *secret* iCal address",
                    403: "not allowed: use the *secret* iCal address"}.get(code, "check the link is copied completely, one per line")
            # "::error::" makes GitHub show this line in the run summary (Annotations)
            print(f"::error::ICS_URLS line {i} of {len(sources)}: could not read "
                  f"({type(exc).__name__}{' ' + str(code) if code else ''}) - {hint}")
            continue
        found, days = read_events(cal, start, end)
        print(f"::notice::ICS_URLS line {i} of {len(sources)}: OK, {len(found)} busy events, "
              f"{len(days)} off-campus days")
        ranges.extend(found)
        away |= days
    if failed:  # check every line first so all problems show at once; never publish partial data
        return 1

    fmt = "%Y-%m-%dT%H:%M:%SZ"
    data = {
        "generated": datetime.now(timezone.utc).strftime(fmt),
        "from": start.astimezone(timezone.utc).strftime(fmt),
        "to": end.astimezone(timezone.utc).strftime(fmt),
        "busy": [[s.strftime(fmt), e.strftime(fmt)] for s, e in merge(ranges)],
        "away": sorted(d.isoformat() for d in away if today <= d < end.date()),
    }
    os.makedirs(os.path.dirname(OUT) or ".", exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, separators=(",", ":"))
    print(f"wrote {len(data['busy'])} busy ranges and {len(data['away'])} off-campus days to {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
