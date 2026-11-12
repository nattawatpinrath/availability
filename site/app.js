(function () {
  "use strict";
  const C = window.AVAILABILITY_CONFIG;

  // ---------- text in both languages ----------
  const TXT = {
    en: {
      days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      monthsLong: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
      year: (y) => y,
      availability: "Availability", tz: "Bangkok time (GMT+7)", bkk: "Bangkok time (GMT+7)",
      refresh: "Refresh", updated: "Updated", today: "Today",
      thisWeek: "This week", nextWeek: "Next week",
      hFree: (n) => `${n} h free`, full: "full",
      nextAvailable: "Next available", noneAhead: (n) => `None in the next ${n} days`,
      weekTotal: (n) => (n ? `${n} free hour${n === 1 ? "" : "s"} in total` : "No free time in this week"),
      past: "Past", notOpen: "Not open yet", fullyBooked: "Fully booked", hasFree: "Has free time",
      busy: "Busy", lunch: "Lunch", legendFree: "Free · click to request", legendOff: "Lunch / past",
      foot: "Free times update automatically. Please contact me to confirm a time.",
      request: "Request by email", copyWeek: "Copy link to this week", copied: "Link copied",
      validUntil: (d) => `This link works until ${d}.`,
      lockedTitle: "Link needed", lockedText: "To see my free times, please open the link I sent you.",
      goneTitle: "This link is no longer active", goneText: "It has expired or was cancelled. Please ask me for a new link.",
      badTitle: "This link doesn't work", badText: "It may have been copied incompletely. Please ask me for a new link.",
      loadError: "Could not load. Try again.",
      mailSubject: (w) => `Meeting request: ${w}`,
      mailBody: (w, name) => `Dear ${name},\n\nI would like to request a meeting on ${w} (Bangkok time).\n\nMy name:\nTopic:\n\nThank you.`,
      dayFree: (d, n) => `${d}: ${n} h free`, dayFull: (d) => `${d}: fully booked`,
    },
    th: {
      days: ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."],
      months: ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."],
      monthsLong: ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"],
      year: (y) => y + 543,
      availability: "เวลาว่าง", tz: "เวลาประเทศไทย (GMT+7)", bkk: "เวลาประเทศไทย",
      refresh: "รีเฟรช", updated: "อัปเดต", today: "วันนี้",
      thisWeek: "สัปดาห์นี้", nextWeek: "สัปดาห์หน้า",
      hFree: (n) => `ว่าง ${n} ชม.`, full: "เต็ม",
      nextAvailable: "ว่างครั้งถัดไป", noneAhead: (n) => `ไม่มีเวลาว่างใน ${n} วันข้างหน้า`,
      weekTotal: (n) => (n ? `รวมว่าง ${n} ชั่วโมง` : "ไม่มีเวลาว่างในสัปดาห์นี้"),
      past: "ผ่านไปแล้ว", notOpen: "ยังไม่เปิด", fullyBooked: "ไม่ว่างทั้งวัน", hasFree: "มีเวลาว่าง",
      busy: "ไม่ว่าง", lunch: "พักกลางวัน", legendFree: "ว่าง · คลิกเพื่อขอนัด", legendOff: "พัก / ผ่านไปแล้ว",
      foot: "เวลาว่างอัปเดตอัตโนมัติ กรุณาติดต่อเพื่อยืนยันเวลาก่อน",
      request: "ขอนัดทางอีเมล", copyWeek: "คัดลอกลิงก์สัปดาห์นี้", copied: "คัดลอกลิงก์แล้ว",
      validUntil: (d) => `ลิงก์นี้ใช้ได้ถึง ${d}`,
      lockedTitle: "ต้องใช้ลิงก์", lockedText: "กรุณาเปิดจากลิงก์ที่ได้รับเพื่อดูเวลาว่าง",
      goneTitle: "ลิงก์นี้หมดอายุแล้ว", goneText: "ลิงก์หมดอายุหรือถูกยกเลิก กรุณาขอลิงก์ใหม่",
      badTitle: "ลิงก์ไม่ถูกต้อง", badText: "อาจคัดลอกลิงก์มาไม่ครบ กรุณาขอลิงก์ใหม่",
      loadError: "โหลดไม่สำเร็จ ลองใหม่อีกครั้ง",
      mailSubject: (w) => `ขอนัดหมาย: ${w}`,
      mailBody: (w, name) => `เรียน คุณ${name}\n\nขอนัดหมาย${w}\n\nชื่อผู้ขอนัด:\nเรื่อง:\n\nขอบคุณครับ/ค่ะ`,
      dayFree: (d, n) => `${d}: ว่าง ${n} ชม.`, dayFull: (d) => `${d}: ไม่ว่าง`,
    },
  };
  let lang = (() => { try { return localStorage.getItem("lang"); } catch (e) { return null; } })();
  if (!TXT[lang]) lang = C.defaultLang || "en";
  const t = () => TXT[lang];

  // ---------- helpers ----------
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const m = /^([+-])(\d\d):(\d\d)$/.exec(C.tzOffset);
  const OFF = (m[1] === "-" ? -1 : 1) * (+m[2] * 60 + +m[3]) * 60000;
  const DAY_MS = 86400000, STEP = 60; // one row = one hour
  const local = (d) => new Date(d.getTime() + OFF); // read with getUTC*()
  const fromLocal = (dayL, mins) => new Date(dayL.getTime() + mins * 60000 - OFF);
  const pad = (n) => String(n).padStart(2, "0");
  const hm = (mins) => pad(Math.floor(mins / 60)) + ":" + pad(mins % 60);
  const toMin = (s) => { const [h, mi] = s.split(":").map(Number); return h * 60 + mi; };
  const dayName = (d) => `${t().days[d.getUTCDay()]} ${d.getUTCDate()} ${t().months[d.getUTCMonth()]}`;
  const dayNameY = (d) => `${dayName(d)} ${t().year(d.getUTCFullYear())}`;
  const ymd = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const b64urlDecode = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

  const BLOCKS = C.workHours.map((b) => [toMin(b.start), toMin(b.end)]);
  const DAY_START = Math.min(...BLOCKS.map((b) => b[0]));
  const DAY_END = Math.max(...BLOCKS.map((b) => b[1]));
  const ROWS = Math.ceil((DAY_END - DAY_START) / STEP);
  const COLS = [1, 2, 3, 4, 5, 6, 0].filter((d) => C.workDays.includes(d)); // Monday first

  const state = { week: 0, weeks: 1, busy: [], dataTo: 0, loaded: false, sel: null, payload: null, lastLoad: 0 };

  let todayL, monday0, lastDay;
  function setToday() {
    const l = local(new Date());
    todayL = new Date(Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), l.getUTCDate()));
    monday0 = new Date(todayL.getTime() - ((todayL.getUTCDay() + 6) % 7) * DAY_MS);
    lastDay = new Date(todayL.getTime() + C.daysAhead * DAY_MS);
    state.weeks = Math.floor((lastDay - monday0) / (7 * DAY_MS)) + 1;
  }
  setToday();
  const weekDays = (w) => COLS.map((wd) => new Date(monday0.getTime() + (w * 7 + (wd + 6) % 7) * DAY_MS));

  // ---------- free / busy per hour ----------
  function cellsForDay(dayL) {
    const now = Date.now();
    const cells = [];
    for (let r = 0; r < ROWS; r++) {
      const mins = DAY_START + r * STEP;
      const s = fromLocal(dayL, mins).getTime(), e = s + STEP * 60000;
      let kind;
      if (!BLOCKS.some(([a, b]) => mins >= a && mins + STEP <= b)) kind = "off";
      else if (s < now) kind = "past";
      else if (dayL > lastDay || e > state.dataTo) kind = "na";
      else if (state.busy.some(([bs, be]) => s < be && e > bs)) kind = "busy";
      else kind = "free";
      cells.push({ r, mins, kind });
    }
    return cells;
  }
  function runs(cells) {
    const out = [];
    for (const c of cells) {
      const last = out[out.length - 1];
      if (last && last.kind === c.kind) last.len++;
      else out.push({ ...c, len: 1 });
    }
    return out;
  }
  const freeRuns = (dayL) => runs(cellsForDay(dayL)).filter((x) => x.kind === "free").map((x) => [x.mins, x.mins + x.len * STEP]);
  const hoursOf = (fr) => fr.reduce((h, [a, b]) => h + (b - a) / 60, 0);
  const weekHours = (w) => weekDays(w).reduce((n, d) => n + hoursOf(freeRuns(d)), 0);

  // ---------- selection + request ----------
  function select(dayL, a, b) {
    state.sel = { dayL, a, b };
    render();
  }
  function renderActionBar() {
    const s = state.sel;
    $("actionbar").hidden = !s;
    if (!s) return;
    const when = `${dayNameY(s.dayL)}, ${hm(s.a)}–${hm(s.b)}`;
    $("selText").textContent = when;
    const contact = state.payload && state.payload.contact;
    const btn = $("requestBtn");
    btn.hidden = !contact;
    if (contact) {
      const name = C.ownerName[lang] || C.ownerName.en;
      btn.href = `mailto:${contact}?subject=${encodeURIComponent(t().mailSubject(when))}&body=${encodeURIComponent(t().mailBody(when, name))}`;
    }
  }

  // ---------- summary ----------
  function renderSummary(days) {
    const list = $("summary");
    list.replaceChildren();
    for (const dayL of days) {
      const li = el("li");
      li.append(el("span", "d" + (dayL.getTime() === todayL.getTime() ? " today" : ""), dayName(dayL)));
      const chips = el("span", "chips");
      const fr = freeRuns(dayL);
      for (const [a, b] of fr) {
        const c = el("button", "chip", `${hm(a)}–${hm(b)}`);
        c.type = "button";
        c.onclick = () => select(dayL, a, b);
        chips.append(c);
      }
      if (!fr.length) {
        const kinds = cellsForDay(dayL).map((c) => c.kind).filter((k) => k !== "off");
        const why = kinds.every((k) => k === "past") ? t().past : kinds.every((k) => k === "na") ? t().notOpen : t().fullyBooked;
        chips.append(el("span", "none", why));
      }
      li.append(chips);
      list.append(li);
    }
    $("weekTotal").textContent = t().weekTotal(weekHours(state.week));

    let next = t().noneAhead(C.daysAhead);
    outer: for (let w = 0; w < state.weeks; w++) {
      for (const dayL of weekDays(w)) {
        const fr = freeRuns(dayL);
        if (fr.length) { next = `${dayName(dayL)}, ${hm(fr[0][0])}–${hm(fr[0][1])}`; break outer; }
      }
    }
    $("nextFree").textContent = next;
  }

  // ---------- weekly grid ----------
  function renderGrid(days) {
    const cal = $("cal");
    cal.replaceChildren();
    cal.style.gridTemplateColumns = `46px repeat(${COLS.length}, minmax(0, 1fr))`;
    cal.style.gridTemplateRows = `auto repeat(${ROWS}, var(--row))`;
    const place = (n, col, row, span = 1) => { n.style.gridColumn = col; n.style.gridRow = `${row} / span ${span}`; cal.append(n); return n; };
    place(el("div", "c-corner"), 1, 1);
    for (let r = 0; r < ROWS; r++) {
      const tm = place(el("div", "c-time", hm(DAY_START + r * STEP)), 1, r + 2);
      if (r === 0) tm.style.transform = "none";
    }
    days.forEach((dayL, i) => {
      const col = i + 2;
      const head = el("div", "c-head" + (dayL.getTime() === todayL.getTime() ? " today" : ""));
      head.append(el("small", null, t().days[dayL.getUTCDay()]), el("b", null, dayL.getUTCDate()), el("small", null, t().months[dayL.getUTCMonth()]));
      place(head, col, 1);
      const cells = cellsForDay(dayL);
      for (const c of cells) place(el("div", "c-line"), col, c.r + 2);
      for (const run of runs(cells)) {
        const end = run.mins + run.len * STEP;
        const label = { free: `${hm(run.mins)}–${hm(end)}`, busy: t().busy, off: t().lunch, past: "", na: "" }[run.kind];
        const b = place(el("div", "blk " + run.kind, label), col, run.r + 2, run.len);
        if (run.kind === "free") {
          b.setAttribute("role", "button");
          b.tabIndex = 0;
          b.title = t().legendFree;
          const pick = (e) => {
            const rect = b.getBoundingClientRect();
            const idx = e && e.clientY ? Math.min(run.len - 1, Math.max(0, Math.floor((e.clientY - rect.top) / (rect.height / run.len)))) : 0;
            select(dayL, run.mins + idx * STEP, run.mins + (idx + 1) * STEP);
          };
          b.onclick = pick;
          b.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } };
        }
      }
      const s = state.sel;
      if (s && s.dayL.getTime() === dayL.getTime()) {
        place(el("div", "blk sel", `${hm(s.a)}–${hm(s.b)}`), col, (s.a - DAY_START) / STEP + 2, (s.b - s.a) / STEP);
      }
    });
  }

  // ---------- week button + month picker ----------
  function weekLabel(w) {
    const days = weekDays(w), a = days[0], b = days[days.length - 1], T = t();
    return a.getUTCMonth() === b.getUTCMonth()
      ? `${a.getUTCDate()}–${b.getUTCDate()} ${T.months[b.getUTCMonth()]} ${T.year(b.getUTCFullYear())}`
      : `${a.getUTCDate()} ${T.months[a.getUTCMonth()]} – ${b.getUTCDate()} ${T.months[b.getUTCMonth()]} ${T.year(b.getUTCFullYear())}`;
  }
  function renderWeekButton() {
    const tag = state.week === 0 ? t().thisWeek + " · " : state.week === 1 ? t().nextWeek + " · " : "";
    const h = weekHours(state.week);
    $("weekText").textContent = tag + weekLabel(state.week);
    $("weekHours").textContent = h ? t().hFree(h) : t().full;
  }
  function renderPicker() {
    const first = state.pickMonth, mo = first.getUTCMonth();
    $("pMonth").textContent = `${t().monthsLong[mo]} ${t().year(first.getUTCFullYear())}`;
    const firstMonth = Date.UTC(monday0.getUTCFullYear(), monday0.getUTCMonth(), 1);
    const lastDate = new Date(monday0.getTime() + (state.weeks * 7 - 1) * DAY_MS);
    $("pPrev").disabled = first.getTime() <= firstMonth;
    $("pNext").disabled = first.getTime() >= Date.UTC(lastDate.getUTCFullYear(), lastDate.getUTCMonth(), 1);
    const grid = $("pGrid");
    grid.replaceChildren();
    let row = new Date(first.getTime() - ((first.getUTCDay() + 6) % 7) * DAY_MS);
    while (row.getUTCMonth() === mo || row < first) {
      const w = Math.round((row - monday0) / (7 * DAY_MS));
      const inRange = w >= 0 && w < state.weeks;
      const r = el("div", "p-row" + (inRange ? " inrange" : "") + (inRange && w === state.week ? " sel" : ""));
      for (let i = 0; i < 7; i++) {
        const d = new Date(row.getTime() + i * DAY_MS);
        const cls = ["p-day"];
        if (d.getUTCMonth() !== mo) cls.push("other");
        if (!C.workDays.includes(d.getUTCDay())) cls.push("off");
        if (d.getTime() === todayL.getTime()) cls.push("today");
        const cell = el("div", cls.join(" "));
        cell.append(el("span", null, d.getUTCDate()));
        if (inRange && C.workDays.includes(d.getUTCDay()) && d >= todayL && d <= lastDay) {
          const hrs = hoursOf(freeRuns(d));
          if (hrs || d > todayL) cell.append(el("i", hrs ? "free" : "full"));
          cell.title = hrs ? t().dayFree(dayName(d), hrs) : t().dayFull(dayName(d));
        }
        r.append(cell);
      }
      if (inRange) r.onclick = () => { goWeek(w); closePicker(); };
      grid.append(r);
      row = new Date(row.getTime() + 7 * DAY_MS);
    }
  }
  function openPicker() {
    const mon = weekDays(state.week)[0];
    state.pickMonth = new Date(Date.UTC(mon.getUTCFullYear(), mon.getUTCMonth(), 1));
    renderPicker();
    $("picker").hidden = false;
    $("weekBtn").setAttribute("aria-expanded", "true");
  }
  function closePicker() {
    $("picker").hidden = true;
    $("weekBtn").setAttribute("aria-expanded", "false");
  }

  // ---------- page ----------
  function goWeek(w) {
    state.week = Math.min(Math.max(w, 0), state.weeks - 1);
    state.sel = null;
    // keep ?week= in the address so "copy link" opens this week (the #key stays as is)
    const u = new URL(location.href);
    u.searchParams.set("week", ymd(weekDays(state.week)[0]));
    history.replaceState(null, "", u);
    render();
  }

  function render() {
    setToday();
    state.week = Math.min(Math.max(state.week, 0), state.weeks - 1);
    const days = weekDays(state.week);
    renderWeekButton();
    $("prevWeek").disabled = state.week <= 0;
    $("nextWeek").disabled = state.week >= state.weeks - 1;
    $("today").setAttribute("aria-current", String(state.week === 0));
    renderSummary(days);
    renderGrid(days);
    renderActionBar();
    if (!$("picker").hidden) renderPicker();
    const p = state.payload;
    if (p) {
      const e = local(new Date(p.expires));
      $("validity").textContent = t().validUntil(`${dayNameY(e)}, ${pad(e.getUTCHours())}:${pad(e.getUTCMinutes())}`);
      const g = local(new Date(p.generated));
      $("updated").textContent = `${t().updated} ${dayName(g)}, ${pad(g.getUTCHours())}:${pad(g.getUTCMinutes())}`;
    }
  }

  function applyLanguage() {
    document.documentElement.lang = lang;
    const T = t();
    document.querySelectorAll("[data-t]").forEach((n) => { n.textContent = typeof T[n.dataset.t] === "string" ? T[n.dataset.t] : ""; });
    document.querySelectorAll(".seg button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
    const name = C.ownerName[lang] || C.ownerName.en;
    $("ownerName").textContent = name;
    $("tzLabel").textContent = `${T.availability} · ${T.tz}`;
    document.title = `${name} · ${T.availability}`;
    $("refresh").setAttribute("aria-label", T.refresh);
    $("refresh").title = T.refresh;
    $("copyWeek").title = T.copyWeek;
    $("copyWeek").setAttribute("aria-label", T.copyWeek);
    $("pDow").replaceChildren(...[1, 2, 3, 4, 5, 6, 0].map((d) => el("span", null, T.days[d])));
    if (state.lockedKind) showLocked(state.lockedKind);
    if (state.loaded) render();
  }

  function showLocked(kind) {
    state.lockedKind = kind;
    const T = t();
    $("app").hidden = true;
    $("refresh").hidden = true;
    $("actionbar").hidden = true;
    $("locked").hidden = false;
    $("lockedTitle").textContent = T[kind + "Title"];
    $("lockedText").textContent = T[kind + "Text"];
  }

  function toast(msg) {
    const n = $("toast");
    n.textContent = msg;
    n.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { n.hidden = true; }, 1800);
  }

  // ---------- loading (the #id.key part of the link) ----------
  const tok = /^#([A-Za-z0-9_-]{6,})\.([A-Za-z0-9_-]{40,})$/.exec(location.hash);

  async function load() {
    const btn = $("refresh");
    btn.disabled = true; btn.classList.add("spin");
    try {
      const r = await fetch(`d/${tok[1]}.bin?t=${Date.now()}`, { cache: "no-store" });
      if (r.status === 404) return showLocked("gone");
      if (!r.ok) throw new Error("HTTP " + r.status);
      const buf = new Uint8Array(await r.arrayBuffer());
      let payload;
      try {
        const key = await crypto.subtle.importKey("raw", b64urlDecode(tok[2]), "AES-GCM", false, ["decrypt"]);
        const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: buf.slice(0, 12) }, key, buf.slice(12));
        payload = JSON.parse(new TextDecoder().decode(plain));
      } catch (e) {
        return showLocked("bad");
      }
      if (Date.parse(payload.expires) <= Date.now()) return showLocked("gone");
      state.payload = payload;
      state.busy = payload.busy.map(([s, e]) => [Date.parse(s), Date.parse(e)]);
      state.dataTo = Date.parse(payload.to);
      state.lastLoad = Date.now();
      $("locked").hidden = true;
      $("app").hidden = false;
      btn.hidden = false;
      setToday();
      if (!state.loaded) {
        state.loaded = true;
        const wq = new URL(location.href).searchParams.get("week");
        const wanted = wq && /^\d{4}-\d\d-\d\d$/.test(wq) ? Math.floor((Date.parse(wq + "T00:00:00Z") - monday0) / (7 * DAY_MS)) : NaN;
        if (wanted >= 0 && wanted < state.weeks) state.week = wanted;
        else while (state.week < state.weeks - 1 && !weekDays(state.week).some((d) => freeRuns(d).length)) state.week++;
      }
      render();
    } catch (err) {
      console.error(err);
      $("updated").textContent = t().loadError;
    } finally {
      btn.disabled = false; btn.classList.remove("spin");
    }
  }

  // ---------- events ----------
  document.querySelectorAll(".seg button").forEach((b) => {
    b.onclick = () => {
      lang = b.dataset.lang;
      try { localStorage.setItem("lang", lang); } catch (e) { /* private mode */ }
      applyLanguage();
    };
  });
  $("prevWeek").onclick = () => goWeek(state.week - 1);
  $("nextWeek").onclick = () => goWeek(state.week + 1);
  $("today").onclick = () => goWeek(0);
  $("refresh").onclick = load;
  $("selClose").onclick = () => { state.sel = null; render(); };
  $("copyWeek").onclick = async () => {
    const u = new URL(location.href);
    u.searchParams.set("week", ymd(weekDays(state.week)[0]));
    try { await navigator.clipboard.writeText(u.toString()); toast(t().copied); }
    catch (e) { window.prompt(t().copyWeek, u.toString()); }
  };
  $("weekBtn").onclick = (e) => { e.stopPropagation(); $("picker").hidden ? openPicker() : closePicker(); };
  $("picker").onclick = (e) => e.stopPropagation();
  $("pPrev").onclick = () => { state.pickMonth = new Date(Date.UTC(state.pickMonth.getUTCFullYear(), state.pickMonth.getUTCMonth() - 1, 1)); renderPicker(); };
  $("pNext").onclick = () => { state.pickMonth = new Date(Date.UTC(state.pickMonth.getUTCFullYear(), state.pickMonth.getUTCMonth() + 1, 1)); renderPicker(); };
  document.addEventListener("click", closePicker);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closePicker(); if (state.sel) { state.sel = null; render(); } } });

  // auto refresh while the page is open and visible
  const every = (C.autoRefreshMinutes || 5) * 60000;
  setInterval(() => { if (state.loaded && !document.hidden) load(); }, every);
  document.addEventListener("visibilitychange", () => {
    if (state.loaded && !document.hidden && Date.now() - state.lastLoad > every) load();
  });

  window.addEventListener("hashchange", () => location.reload()); // a different link was pasted


  applyLanguage();
  if (!tok) showLocked("locked");
  else if (!window.crypto || !crypto.subtle) showLocked("bad");
  else load();
})();
