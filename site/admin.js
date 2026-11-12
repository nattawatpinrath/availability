(function () {
  "use strict";
  const C = window.AVAILABILITY_CONFIG;
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const pad = (n) => String(n).padStart(2, "0");
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const BKK = 7 * 3600000;
  const LOCK_PATH = "site/admin-lock.json"; // in the repo; served next to this page as admin-lock.json
  const ITER = 600000; // PBKDF2 rounds: makes password guessing slow
  const SITE = location.origin + location.pathname.replace(/[^/]*$/, "");

  let cfg = null;    // { repo, token, secret } once unlocked
  let labels = {};   // link id -> "who it is for" (stored encrypted in links.json)

  // ---------- encoding + crypto ----------
  const te = (s) => new TextEncoder().encode(s);
  const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const unb64 = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
  const rand = (n) => crypto.getRandomValues(new Uint8Array(n));

  async function pwKey(pw, salt, iter) {
    const base = await crypto.subtle.importKey("raw", te(pw), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }
  async function seal(key, obj) {
    const iv = rand(12);
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, te(JSON.stringify(obj))));
    return { iv: b64url(iv), data: b64url(ct) };
  }
  async function unseal(key, box) {
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(box.iv) }, key, unb64(box.data));
    return JSON.parse(new TextDecoder().decode(pt));
  }
  async function hmac(secret, msg) {
    const k = await crypto.subtle.importKey("raw", te(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    return new Uint8Array(await crypto.subtle.sign("HMAC", k, te(msg)));
  }
  // link key: same as scripts/publish_links.py
  const linkUrl = async (l) => `${SITE}#${l.id}.${b64url(await hmac(cfg.secret, `${l.id}|${l.expires}`))}`;
  const notesKey = async () => crypto.subtle.importKey("raw", await hmac(cfg.secret, "notes"), "AES-GCM", false, ["encrypt", "decrypt"]);

  // ---------- GitHub API ----------
  async function gh(path, opts = {}) {
    const r = await fetch(`https://api.github.com/repos/${cfg.repo}${path}`, {
      ...opts,
      headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${cfg.token}`, "X-GitHub-Api-Version": "2022-11-28" },
    });
    if (!r.ok && r.status !== 404) {
      const msg = (await r.json().catch(() => ({}))).message || "";
      throw new Error(`GitHub said ${r.status}${msg ? ": " + msg : ""}`);
    }
    return r;
  }
  const enc = (s) => btoa(unescape(encodeURIComponent(s)));
  const dec = (s) => decodeURIComponent(escape(atob(s.replace(/\n/g, ""))));
  async function getFile(path) {
    const r = await gh(`/contents/${path}`);
    if (r.status === 404) return { text: null, sha: null };
    const j = await r.json();
    return { text: dec(j.content), sha: j.sha };
  }
  async function putFile(path, text, sha, message) {
    const body = { message, content: enc(text) };
    if (sha) body.sha = sha;
    const r = await gh(`/contents/${path}`, { method: "PUT", body: JSON.stringify(body) });
    if (r.status === 404) throw new Error("Repository not found. Check the repository name and token.");
  }
  async function readLinks() {
    const f = await getFile("links.json");
    const data = f.text ? JSON.parse(f.text) : { links: [] };
    labels = {};
    if (data.notes) { try { labels = await unseal(await notesKey(), data.notes); } catch (e) { /* secret changed */ } }
    return { data, sha: f.sha };
  }
  async function writeLinks(data, sha, message) {
    const now = Date.now();
    data.links = data.links.filter((l) => Date.parse(l.expires) > now); // drop expired ones
    for (const id of Object.keys(labels)) if (!data.links.some((l) => l.id === id)) delete labels[id];
    data.notes = await seal(await notesKey(), labels);
    await putFile("links.json", JSON.stringify(data, null, 2) + "\n", sha, message);
  }

  // ---------- helpers ----------
  function fmtDate(iso) { const d = new Date(Date.parse(iso) + BKK); return `${DOW[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; }
  function timeLeft(iso) {
    const ms = Date.parse(iso) - Date.now(), days = Math.floor(ms / 86400000);
    return days >= 1 ? `${days} day${days > 1 ? "s" : ""}` : `${Math.max(1, Math.floor(ms / 3600000))} h`;
  }
  function endOfDayIn(days) {
    const d = new Date(Date.now() + BKK + days * 86400000);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T23:59:59+07:00`;
  }
  function qrSvg(text) { const q = qrcode(0, "M"); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); }
  function status(id, msg, kind) { const n = $(id); n.textContent = msg; n.className = "status" + (kind ? " " + kind : ""); }
  function toast(msg) { const n = $("toast"); n.textContent = msg; n.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { n.hidden = true; }, 2200); }
  async function copy(text) { try { await navigator.clipboard.writeText(text); toast("Copied"); } catch (e) { window.prompt("Copy this", text); } }
  const session = {
    get() { try { return JSON.parse(sessionStorage.getItem("adm.session")); } catch (e) { return null; } },
    set(v) { try { sessionStorage.setItem("adm.session", JSON.stringify(v)); } catch (e) { /* ignore */ } },
    clear() { try { sessionStorage.removeItem("adm.session"); } catch (e) { /* ignore */ } },
  };

  // ---------- screens ----------
  function show(which) {
    $("unlockCard").hidden = which !== "unlock";
    $("setupCard").hidden = which !== "setup";
    $("appCards").hidden = which !== "app";
    $("topActions").hidden = which !== "app";
  }
  let lockFile = null;

  async function start() {
    const s = session.get();
    if (s && s.repo && s.token && s.secret) { cfg = s; return showApp(); }
    const r = await fetch(`admin-lock.json?t=${Date.now()}`, { cache: "no-store" }).catch(() => null);
    if (r && r.ok) { lockFile = await r.json(); show("unlock"); $("pw").focus(); }
    else showSetup(true);
  }

  $("unlockForm").onsubmit = async (e) => {
    e.preventDefault();
    status("unlockStatus", "Checking…", "");
    try {
      const key = await pwKey($("pw").value, unb64(lockFile.salt), lockFile.iter);
      cfg = await unseal(key, lockFile);
      session.set(cfg);
      $("pw").value = "";
      status("unlockStatus", "", "");
      showApp();
    } catch (err) {
      status("unlockStatus", "Wrong password.", "err");
      $("pw").select();
    }
  };

  function showSetup(first) {
    $("setupTitle").textContent = first ? "First-time setup" : "Settings";
    $("cancelSetup").hidden = first;
    if (!first) { $("repo").value = cfg.repo; $("token").value = cfg.token; $("secret").value = cfg.secret; }
    else if (!$("repo").value && location.hostname.endsWith(".github.io")) {
      const owner = location.hostname.split(".")[0];
      const firstSeg = location.pathname.split("/").filter(Boolean)[0];
      $("repo").value = `${owner}/${firstSeg && !firstSeg.endsWith(".html") ? firstSeg : location.hostname}`;
    }
    $("newPw").value = ""; $("newPw2").value = "";
    status("setupStatus", first ? "" : "To keep your current password, type it again below.", "");
    show("setup");
  }
  $("openSettings").onclick = () => showSetup(false);
  $("cancelSetup").onclick = () => showApp();
  $("lockNow").onclick = () => { session.clear(); location.reload(); };

  $("newSecret").onclick = () => {
    if ($("secret").value && !confirm("A new secret makes every existing link stop working. Continue?")) return;
    $("secret").value = b64url(rand(32));
    status("setupStatus", "New secret made. Copy it into the LINK_SECRET GitHub Secret too.", "");
  };
  $("copySecret").onclick = () => copy($("secret").value);

  $("saveSetup").onclick = async () => {
    const next = {
      repo: $("repo").value.trim().replace(/^https:\/\/github\.com\//, "").replace(/\/$/, ""),
      token: $("token").value.trim(),
      secret: $("secret").value.trim(),
    };
    const pw = $("newPw").value;
    if (!/^[\w.-]+\/[\w.-]+$/.test(next.repo)) return status("setupStatus", "Repository should look like owner/name.", "err");
    if (!next.token) return status("setupStatus", "Paste your GitHub token.", "err");
    if (next.secret.length < 20) return status("setupStatus", "The link secret is too short (press New).", "err");
    if (pw.length < 10) return status("setupStatus", "Password needs at least 10 characters.", "err");
    if (pw !== $("newPw2").value) return status("setupStatus", "The two passwords are different.", "err");
    const btn = $("saveSetup");
    btn.disabled = true;
    status("setupStatus", "Checking GitHub…", "");
    const prev = cfg;
    try {
      cfg = next;
      const repoCheck = await gh("");
      if (repoCheck.status === 404) throw new Error("Repository not found, or the token can't see it.");
      status("setupStatus", "Locking settings with your password…", "");
      const salt = rand(16);
      const box = await seal(await pwKey(pw, salt, ITER), next);
      const lock = { v: 1, iter: ITER, salt: b64url(salt), ...box };
      const cur = await getFile(LOCK_PATH);
      await putFile(LOCK_PATH, JSON.stringify(lock) + "\n", cur.sha, "Update admin settings");
      session.set(cfg);
      toast("Saved. From now on you only need the password.");
      showApp();
    } catch (err) {
      cfg = prev;
      status("setupStatus", err.message, "err");
    } finally {
      btn.disabled = false;
    }
  };

  $("syncNow").onclick = async () => {
    try {
      const r = await gh("/actions/workflows/deploy.yml/dispatches", { method: "POST", body: JSON.stringify({ ref: "main" }) });
      if (r.status === 404) throw new Error("Workflow not found");
      toast("Sync started. The page updates in about 1–2 minutes.");
    } catch (e) { toast(e.message); }
  };

  // ---------- new link ----------
  const DURATIONS = [
    { days: 1, label: "Until tomorrow" }, { days: 3, label: "3 days" }, { days: 7, label: "1 week" },
    { days: 14, label: "2 weeks" }, { days: 30, label: "1 month" }, { days: 120, label: "Semester (4 months)" },
    { days: null, label: "Pick a date" },
  ];
  let choice = DURATIONS[2];
  function renderDurations() {
    const box = $("durations");
    box.replaceChildren();
    for (const d of DURATIONS) {
      const b = el("button", null, d.label);
      b.type = "button";
      b.setAttribute("aria-pressed", String(d === choice));
      b.onclick = () => { choice = d; $("customWrap").hidden = d.days !== null; renderDurations(); };
      box.append(b);
    }
  }
  $("customDate").min = endOfDayIn(0).slice(0, 10);

  function showResult(link, url) {
    $("result").hidden = false;
    $("resWhen").textContent = `${labels[link.id] ? labels[link.id] + " · " : ""}valid until ${fmtDate(link.expires)}`;
    $("resUrl").textContent = url;
    $("resQr").innerHTML = qrSvg(url);
    $("resCopy").onclick = () => copy(url);
    $("resPrint").onclick = () => {
      $("signName").textContent = C.ownerName.en;
      $("signQr").innerHTML = qrSvg(url);
      $("signValid").textContent = `Valid until ${fmtDate(link.expires)}`;
      window.print();
    };
    $("result").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function waitLive(id) {
    for (let i = 0; i < 36; i++) {
      await new Promise((r) => setTimeout(r, 10000));
      const r = await fetch(`d/${id}.bin?t=${Date.now()}`, { method: "HEAD", cache: "no-store" }).catch(() => null);
      if (r && r.ok) return status("genStatus", "✓ The link is live.", "ok");
    }
    status("genStatus", "Still not live after 6 minutes. Check the Actions tab on GitHub.", "err");
  }

  $("generate").onclick = async () => {
    let expires;
    if (choice.days === null) {
      const v = $("customDate").value;
      if (!v) return status("genStatus", "Pick a date.", "err");
      expires = `${v}T23:59:59+07:00`;
    } else expires = endOfDayIn(choice.days);
    if (Date.parse(expires) <= Date.now()) return status("genStatus", "That date is in the past.", "err");
    const btn = $("generate");
    btn.disabled = true;
    status("genStatus", "Saving to GitHub…", "");
    try {
      const link = { id: b64url(rand(9)), expires };
      const { data, sha } = await readLinks();
      data.links.push(link);
      const label = $("label").value.trim();
      if (label) labels[link.id] = label;
      await writeLinks(data, sha, "Add temporary link");
      showResult(link, await linkUrl(link));
      status("genStatus", "Saved. The link starts working in about 1–2 minutes, once GitHub publishes it…", "");
      $("label").value = "";
      loadList();
      waitLive(link.id);
    } catch (e) {
      status("genStatus", e.message, "err");
    } finally {
      btn.disabled = false;
    }
  };

  // ---------- active links ----------
  async function loadList() {
    const tbody = $("list");
    $("listHelp").textContent = "Revoking a link stops it working in about 1–2 minutes.";
    const { data } = await readLinks();
    const active = data.links.filter((l) => Date.parse(l.expires) > Date.now()).sort((a, b) => Date.parse(a.expires) - Date.parse(b.expires));
    $("viewLink").href = active.length ? await linkUrl(active[active.length - 1]) : SITE;
    tbody.replaceChildren();
    if (!active.length) {
      const tr = el("tr"); const td = el("td", "muted", "No active links."); td.colSpan = 4; tr.append(td); tbody.append(tr);
      return;
    }
    for (const l of active) {
      const tr = el("tr");
      tr.append(el("td", null, labels[l.id] || "—"), el("td", null, fmtDate(l.expires)), el("td", "hide-sm", timeLeft(l.expires)));
      const acts = el("td", "acts");
      const showBtn = el("button", "btn sm", "Copy / QR");
      showBtn.type = "button";
      showBtn.onclick = async () => showResult(l, await linkUrl(l));
      const revoke = el("button", "btn sm danger", "Revoke");
      revoke.type = "button";
      revoke.onclick = async () => {
        if (!confirm(`Stop the link${labels[l.id] ? ' for "' + labels[l.id] + '"' : ""} now?`)) return;
        revoke.disabled = true;
        try {
          const cur = await readLinks();
          cur.data.links = cur.data.links.filter((x) => x.id !== l.id);
          await writeLinks(cur.data, cur.sha, "Revoke temporary link");
          toast("Revoked. It stops working in about 1–2 minutes.");
          loadList();
        } catch (e) { toast(e.message); revoke.disabled = false; }
      };
      acts.append(showBtn, revoke);
      tr.append(acts);
      tbody.append(tr);
    }
  }

  function showApp() {
    show("app");
    loadList().catch((e) => { $("listHelp").textContent = e.message; });
  }

  renderDurations();
  start();
})();
