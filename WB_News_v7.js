// WB News Reader v7 — CashFlowWB
// t.me/cashflowwb

const scriptName   = "WB_News";
const WB_KEY_NAME  = "WB Balance Ultimate";
const NEWS_TTL     = 30 * 60 * 1000;
const META_TTL     = 15 * 60 * 1000;
const ARCHIVE_DAYS = 30;
const MAX_FETCH    = 50;
const BAL_HIST_MAX = 30;

const TG_BOT_TOKEN    = "7790801484:AAGoXifOZCkgzXN4thGaP2sDsPF7mw7DB1E";
const TG_COLLECT_CHAT = "154912984";

// ════════════════════════════════════════════════════════════
// ENTRY POINT
// ════════════════════════════════════════════════════════════
async function run() {
  if (config.runsInWidget) { await runWidget(); return; }
  const hasKey   = Keychain.contains(WB_KEY_NAME);
  const welcomed = Keychain.contains(`${scriptName}_welcomed`);
  if (!welcomed || !hasKey) { await runWelcome(); return; }
  await runMain();
}

// ════════════════════════════════════════════════════════════
// WIDGET
// ════════════════════════════════════════════════════════════
async function runWidget() {
  const family = config.widgetFamily;
  const themeId = Keychain.contains(`${scriptName}_theme`) ? Keychain.get(`${scriptName}_theme`) : "auto";
  const h = new Date().getHours();
  const isDark = themeId === "light" ? false : themeId === "auto" ? (h < 6 || h >= 21) : true;

  const C = isDark
    ? { bg1:"#000000", bg2:"#0D0F1E", text:"#FFFFFF", muted:"#636366", card:"#1C1C1E",
        border:"#2C2C2E", accent:"#0A84FF", accentBg:"#001533", green:"#30D158", red:"#FF453A" }
    : { bg1:"#F2F2F7", bg2:"#FFFFFF", text:"#000000", muted:"#8E8E93", card:"#FFFFFF",
        border:"#E5E5EA", accent:"#007AFF", accentBg:"#E5F0FF", green:"#34C759", red:"#FF3B30" };

  const widget = new ListWidget();
  widget.url = `scriptable:///run/${encodeURIComponent(Script.name())}`;

  const grad = new LinearGradient();
  grad.locations = [0, 1];
  grad.colors = [new Color(C.bg1), new Color(C.bg2)];
  widget.backgroundGradient = grad;

  // ── Small ──
  if (family === "small") {
    widget.setPadding(16, 16, 16, 16);
    const top = widget.addStack();
    top.layoutHorizontally(); top.centerAlignContent();
    const ico = top.addText("📊");
    ico.font = Font.systemFont(22);
    top.addSpacer();
    const dot = top.addText("●");
    dot.font = Font.systemFont(7);
    dot.textColor = new Color(C.green);
    widget.addSpacer(8);
    const nm = widget.addText("CashFlowWB");
    nm.font = Font.boldSystemFont(14);
    nm.textColor = new Color(C.text);
    widget.addSpacer(4);
    const hint = widget.addText("Нажмите для\nпросмотра новостей");
    hint.font = Font.systemFont(11);
    hint.textColor = new Color(C.muted);
    hint.lineLimit = 2;
    widget.addSpacer();
    const tip = widget.addText("Лучше — СРЕДНИЙ или БОЛЬШОЙ");
    tip.font = Font.systemFont(9);
    tip.textColor = new Color(C.accent);
    Script.setWidget(widget); Script.complete(); return;
  }

  if (!Keychain.contains(WB_KEY_NAME)) {
    widget.setPadding(14, 16, 14, 16);
    const t = widget.addText("⚠️ Введите API-ключ в настройках");
    t.font = Font.mediumSystemFont(13); t.textColor = new Color(C.red);
    Script.setWidget(widget); Script.complete(); return;
  }

  // ── Fetch data ──
  let balance = null, forWithdraw = null, sellerName = null;
  const mc = loadCache(`${scriptName}_meta`, META_TTL);
  if (mc) { balance = mc.balance; forWithdraw = mc.forWithdraw; sellerName = mc.sellerName; }
  else {
    try { const b = await fetchBalance(); balance = b.balance; forWithdraw = b.forWithdraw; } catch {}
    try { const s = await fetchSellerInfo(); sellerName = s.name; } catch {}
    if (balance !== null) saveCache(`${scriptName}_meta`, { balance, forWithdraw, sellerName });
  }

  let archive = loadArchive();
  if (archive.length === 0) {
    try { const r = await fetchWBNews(); archive = mergeToArchive(r.items); } catch(e) {
      widget.setPadding(14, 16, 14, 16);
      const t = widget.addText(`⚠️ ${e.message}`);
      t.font = Font.mediumSystemFont(12); t.textColor = new Color(C.red);
      Script.setWidget(widget); Script.complete(); return;
    }
  }
  const shuffled = [...archive].sort(() => Math.random() - 0.5).slice(0, 5);

  // ════════════════════════════════
  // MEDIUM WIDGET
  // ════════════════════════════════
  if (family === "medium") {
    widget.setPadding(12, 14, 12, 14);

    const hdr = widget.addStack();
    hdr.layoutHorizontally(); hdr.centerAlignContent();
    hdr.backgroundColor = new Color(C.card, isDark ? 0.6 : 0.85);
    hdr.cornerRadius = 10; hdr.setPadding(5, 10, 5, 10);

    const svc = hdr.addText(sellerName ? `📊 CashFlowWB · ${sellerName}` : "📊 CashFlowWB");
    svc.font = Font.semiboldRoundedSystemFont(10);
    svc.textColor = new Color(C.accent);
    hdr.addSpacer();
    if (balance !== null) {
      const balStr = hdr.addText(`${fmtM(balance)}`);
      balStr.font = Font.boldSystemFont(10);
      balStr.textColor = new Color(C.green);
    }
    widget.addSpacer(7);

    for (let i = 0; i < Math.min(shuffled.length, 4); i++) {
      const item = shuffled[i];
      const row = widget.addStack();
      row.layoutHorizontally(); row.centerAlignContent();
      const dot2 = row.addText("▸ ");
      dot2.font = Font.boldSystemFont(9);
      dot2.textColor = new Color(C.accent, 0.7);
      const title = row.addText(item.title);
      title.font = Font.systemFont(11);
      title.textColor = new Color(C.text, 0.9);
      title.lineLimit = 1;
      if (i < Math.min(shuffled.length, 4) - 1) widget.addSpacer(4);
    }
    Script.setWidget(widget); Script.complete(); return;
  }

  // ════════════════════════════════
  // LARGE WIDGET
  // ════════════════════════════════
  widget.setPadding(14, 14, 14, 14);

  // Balance bar
  const balBar = widget.addStack();
  balBar.layoutHorizontally(); balBar.centerAlignContent();
  balBar.backgroundColor = new Color(C.card, isDark ? 0.7 : 0.95);
  balBar.cornerRadius = 12; balBar.setPadding(8, 12, 8, 12);

  const leftCol = balBar.addStack();
  leftCol.layoutVertically();
  const svcL = leftCol.addText(sellerName ? `CashFlowWB · ${sellerName}` : "📊 CashFlowWB");
  svcL.font = Font.semiboldRoundedSystemFont(11);
  svcL.textColor = new Color(C.accent);
  if (balance !== null) {
    leftCol.addSpacer(2);
    const balLine = leftCol.addText(`Баланс ${fmtM(balance)}  ·  Вывод ${fmtM(forWithdraw)}`);
    balLine.font = Font.mediumSystemFont(10);
    balLine.textColor = new Color(C.muted);
  }
  widget.addSpacer(9);

  for (let i = 0; i < Math.min(shuffled.length, 4); i++) {
    const item = shuffled[i];
    const card = widget.addStack();
    card.layoutVertically();
    card.backgroundColor = new Color(C.card, isDark ? 0.55 : 0.9);
    card.cornerRadius = 10; card.setPadding(7, 10, 7, 10);

    if ((item.cats && item.cats.length > 0) || item.date) {
      const meta = card.addStack();
      meta.layoutHorizontally();
      if (item.cats && item.cats.length > 0) {
        const cat = meta.addText(item.cats[0].toUpperCase());
        cat.font = Font.boldSystemFont(8);
        cat.textColor = new Color(C.accent, 0.9);
      }
      if (item.date) {
        meta.addSpacer();
        const dt = meta.addText(item.date);
        dt.font = Font.mediumSystemFont(8);
        dt.textColor = new Color(C.muted);
      }
      card.addSpacer(3);
    }

    const title = card.addText(item.title);
    title.font = Font.semiboldSystemFont(12);
    title.textColor = new Color(C.text, 0.95);
    title.lineLimit = 2;

    if (item.desc) {
      card.addSpacer(2);
      const desc = card.addText(item.desc);
      desc.font = Font.systemFont(10);
      desc.textColor = new Color(C.muted);
      desc.lineLimit = 1;
    }

    if (i < Math.min(shuffled.length, 4) - 1) widget.addSpacer(6);
  }

  Script.setWidget(widget);
  Script.complete();
}

// ════════════════════════════════════════════════════════════
// WELCOME
// ════════════════════════════════════════════════════════════
async function runWelcome() {
  const existKey = Keychain.contains(WB_KEY_NAME) ? Keychain.get(WB_KEY_NAME) : "";
  const existTg  = Keychain.contains(`${scriptName}_telegram`) ? Keychain.get(`${scriptName}_telegram`) : "";
  const fm = FileManager.local();
  const p  = fm.joinPath(fm.temporaryDirectory(), `${scriptName}_w.html`);
  fm.writeString(p, buildWelcomeHTML(existKey, existTg));
  const wv = new WebView();
  await wv.loadFile(p);
  await wv.present(false);
  try { fm.remove(p); } catch {}
  let res = null;
  try { res = JSON.parse(await wv.evaluateJavaScript("JSON.stringify(window._result||null)")); } catch {}
  if (res && res.apiKey && res.apiKey.trim()) {
    Keychain.set(WB_KEY_NAME, res.apiKey.trim());
    const tg = (res.telegram || "").trim();
    if (tg) Keychain.set(`${scriptName}_telegram`, tg);
    Keychain.set(`${scriptName}_welcomed`, "1");
    if (tg) await collectTgUser(tg).catch(() => {});
    await runMain();
  }
}

// ════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════
async function runMain() {
  const themeId  = Keychain.contains(`${scriptName}_theme`) ? Keychain.get(`${scriptName}_theme`) : "auto";
  const h        = new Date().getHours();
  const isDark   = themeId === "light" ? false : themeId === "auto" ? (h < 6 || h >= 21) : true;

  let favorites = [];
  try {
    if (Keychain.contains(`${scriptName}_favorites`))
      favorites = JSON.parse(Keychain.get(`${scriptName}_favorites`));
  } catch {}

  let readIds = [];
  try {
    if (Keychain.contains(`${scriptName}_read`))
      readIds = JSON.parse(Keychain.get(`${scriptName}_read`));
  } catch {}

  const telegram = Keychain.contains(`${scriptName}_telegram`) ? Keychain.get(`${scriptName}_telegram`) : "";
  const apiKey   = Keychain.contains(WB_KEY_NAME) ? Keychain.get(WB_KEY_NAME) : "";

  let items = [], categories = [], fetchError = null, debugInfo = null, fromCache = false, cacheAge = null;
  const ck = `${scriptName}_cache_wb`;
  const cached = loadCache(ck, NEWS_TTL);
  if (cached) {
    items = cached.items; categories = cached.categories || [];
    fromCache = true; cacheAge = Math.round((Date.now() - cached.ts) / 60000);
  } else {
    try {
      const r = await fetchWBNews();
      items = r.items; categories = r.categories || []; debugInfo = r.debug;
      if (items.length > 0) {
        saveCache(ck, { items, categories });
        mergeToArchive(items);
      }
    } catch(e) { fetchError = e.message; debugInfo = e.debug || null; }
    if (items.length === 0) items = loadArchive();
  }

  let sellerName = null, balance = null, forWithdraw = null;
  const mk = `${scriptName}_meta`;
  const mc = loadCache(mk, META_TTL);
  if (mc) { sellerName = mc.sellerName; balance = mc.balance; forWithdraw = mc.forWithdraw; }
  else {
    const [sR, bR] = await Promise.all([
      fetchSellerInfo().catch(() => ({})),
      fetchBalance().catch(() => ({})),
    ]);
    sellerName = sR.name ?? null; balance = bR.balance ?? null; forWithdraw = bR.forWithdraw ?? null;
    saveCache(mk, { sellerName, balance, forWithdraw });
  }

  // Save balance history
  let balHistory = [];
  if (balance !== null) balHistory = saveBalanceHistory(balance, forWithdraw);
  else {
    try {
      if (Keychain.contains(`${scriptName}_balHistory`))
        balHistory = JSON.parse(Keychain.get(`${scriptName}_balHistory`));
    } catch {}
  }

  const fm = FileManager.local();
  const p  = fm.joinPath(fm.temporaryDirectory(), `${scriptName}.html`);
  fm.writeString(p, buildMainHTML({
    items, categories, favorites, readIds, balHistory,
    sellerName, balance, forWithdraw,
    themeId, isDark, fetchError, debugInfo,
    fromCache, cacheAge, telegram, apiKey
  }));

  const wv = new WebView();
  await wv.loadFile(p);
  await wv.present(false);
  try { fm.remove(p); } catch {}

  try {
    const s = JSON.parse(await wv.evaluateJavaScript(
      "JSON.stringify({f:window._favorites,rd:window._readIds,t:window._theme,ak:window._apiKey,tg:window._telegram,r:window._doRefresh,w:window._doWipe})"
    ));
    if (Array.isArray(s.f))  { try { Keychain.set(`${scriptName}_favorites`, JSON.stringify(s.f)); } catch {} }
    if (Array.isArray(s.rd)) { try { Keychain.set(`${scriptName}_read`, JSON.stringify(s.rd)); } catch {} }
    if (s.t)                   Keychain.set(`${scriptName}_theme`, s.t);
    if (s.ak && s.ak.trim()) Keychain.set(WB_KEY_NAME, s.ak.trim());
    if (s.tg !== undefined)  Keychain.set(`${scriptName}_telegram`, (s.tg||"").trim());
    if (s.w) {
      const wipeKeys = [
        WB_KEY_NAME,
        `${scriptName}_welcomed`, `${scriptName}_telegram`, `${scriptName}_theme`,
        `${scriptName}_favorites`, `${scriptName}_read`, `${scriptName}_cache_wb`,
        `${scriptName}_meta`, `${scriptName}_archive`, `${scriptName}_balHistory`,
      ];
      for (const k of wipeKeys) { try { if (Keychain.contains(k)) Keychain.remove(k); } catch {} }
      await runWelcome(); return;
    }
    if (s.r) {
      for (const k of [ck, mk]) if (Keychain.contains(k)) Keychain.remove(k);
      await runMain();
    }
  } catch(e) { console.log("state:", e.message); }
}

// ════════════════════════════════════════════════════════════
// BALANCE HISTORY
// ════════════════════════════════════════════════════════════
function saveBalanceHistory(balance, forWithdraw) {
  const key = `${scriptName}_balHistory`;
  let history = [];
  try { if (Keychain.contains(key)) history = JSON.parse(Keychain.get(key)); } catch {}
  const now  = Date.now();
  const last = history[history.length - 1];
  if (!last || now - last.ts > 3600000) {
    history.push({ ts: now, balance, forWithdraw });
    if (history.length > BAL_HIST_MAX) history = history.slice(-BAL_HIST_MAX);
    try { Keychain.set(key, JSON.stringify(history)); } catch {}
  }
  return history;
}

// ════════════════════════════════════════════════════════════
// ARCHIVE
// ════════════════════════════════════════════════════════════
const ARCHIVE_KEY = `${scriptName}_archive`;

function loadArchive() {
  try { if (Keychain.contains(ARCHIVE_KEY)) return JSON.parse(Keychain.get(ARCHIVE_KEY)); } catch {}
  return [];
}

function mergeToArchive(newItems) {
  const cutoff   = Date.now() - ARCHIVE_DAYS * 24 * 3600 * 1000;
  const existing = loadArchive();
  const map      = new Map(existing.map(i => [i.id, i]));
  for (const item of newItems) map.set(item.id, item);
  const merged   = [...map.values()]
    .filter(item => { try { return new Date(item.rawDate || 0).getTime() > cutoff; } catch { return true; } })
    .sort((a,b)  => { try { return new Date(b.rawDate||0) - new Date(a.rawDate||0); } catch { return 0; } });
  try { Keychain.set(ARCHIVE_KEY, JSON.stringify(merged)); } catch {}
  return merged;
}

// ════════════════════════════════════════════════════════════
// CACHE
// ════════════════════════════════════════════════════════════
function loadCache(key, ttl) {
  if (!Keychain.contains(key)) return null;
  try { const d = JSON.parse(Keychain.get(key)); return (Date.now()-d.ts) > ttl ? null : d; }
  catch { return null; }
}
function saveCache(key, payload) {
  try { Keychain.set(key, JSON.stringify({ ts: Date.now(), ...payload })); }
  catch(e) { console.log("cache:", e.message); }
}

// ════════════════════════════════════════════════════════════
// API
// ════════════════════════════════════════════════════════════
async function fetchSellerInfo() {
  const req = new Request("https://common-api.wildberries.ru/api/v1/seller-info");
  req.headers = { "Authorization": Keychain.get(WB_KEY_NAME), "accept": "application/json" };
  req.timeoutInterval = 10;
  const j = JSON.parse(await req.loadString());
  return { name: j.name || j.tradeName || j.data?.name || null };
}

async function fetchBalance() {
  const req = new Request(`https://finance-api.wildberries.ru/api/v1/account/balance?t=${Date.now()}`);
  req.headers = { "Authorization": Keychain.get(WB_KEY_NAME), "accept": "application/json", "Cache-Control": "no-store" };
  req.timeoutInterval = 10;
  const j = await req.loadJSON();
  return { balance: Number(j.current ?? j.balance ?? 0), forWithdraw: Number(j.for_withdraw ?? j.availableBalance ?? 0) };
}

async function fetchWBNews() {
  if (!Keychain.contains(WB_KEY_NAME)) throw new Error("Ключ не найден");
  const from = new Date(Date.now() - ARCHIVE_DAYS * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const url  = `https://common-api.wildberries.ru/api/communications/v2/news?limit=${MAX_FETCH}&from=${encodeURIComponent(from)}`;
  const req  = new Request(url);
  req.headers = { "Authorization": Keychain.get(WB_KEY_NAME), "accept": "application/json" };
  req.timeoutInterval = 15;
  let raw = "";
  try { raw = await req.loadString(); }
  catch(netErr) { const e = new Error(`Сеть: ${netErr.message}`); e.debug = url; throw e; }
  let json;
  try { json = JSON.parse(raw); }
  catch { const e = new Error("Не JSON"); e.debug = raw.slice(0,300); throw e; }
  if (json.error || (json.additionalErrors && !json.data)) {
    const e = new Error(json.errorText || "Ошибка API");
    e.debug = raw.slice(0, 500); throw e;
  }
  const news = Array.isArray(json) ? json : (json.data || json.news || []);
  if (!Array.isArray(news)) { const e = new Error("Неизвестный формат"); e.debug = raw.slice(0,300); throw e; }
  const catMap = {};
  const items  = news.map(n => {
    const cats = (n.types||[]).map(t => t.name);
    cats.forEach(c => { catMap[c] = true; });
    return {
      id:       String(n.id || Date.now() + Math.random()),
      title:    n.header || n.title || "Без заголовка",
      desc:     stripTags(n.content || n.text || "").slice(0, 260),
      fullDesc: stripTags(n.content || n.text || "").slice(0, 3000),
      date:     fmtDate(n.date || n.createdAt),
      rawDate:  n.date || n.createdAt || "",
      link:     `https://seller.wildberries.ru/dynamic-product-categories/news/${n.id}`,
      cats,
    };
  });
  return { items, categories: Object.keys(catMap).sort(), debug: items.length===0 ? `Пустой. URL: ${url}` : null };
}

async function collectTgUser(username) {
  if (!TG_BOT_TOKEN || !TG_COLLECT_CHAT) return;
  try {
    const clean = username.replace(/^@/, "");
    const text  = `🆕 CashFlowWB — новый пользователь\n@${clean}`;
    const req   = new Request(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`);
    req.method  = "POST";
    req.headers = { "Content-Type": "application/json" };
    req.body    = JSON.stringify({ chat_id: Number(TG_COLLECT_CHAT) || TG_COLLECT_CHAT, text, parse_mode: "HTML" });
    req.timeoutInterval = 8;
    await req.loadString();
  } catch(e) { console.log("TG error:", e.message); }
}

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════
function stripTags(s) {
  return (s||"").replace(/<[^>]+>/g," ").replace(/&amp;/g,"&").replace(/&lt;/g,"<")
    .replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'")
    .replace(/&nbsp;/g," ").replace(/\s{2,}/g," ").trim();
}
function fmtDate(raw) {
  if (!raw) return "";
  try { return new Date(raw).toLocaleString("ru-RU",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}); } catch { return ""; }
}
function fmtM(v) {
  if (v===null||v===undefined||isNaN(v)) return "—";
  const a = Math.abs(v);
  if (a>=1e6) return (v/1e6).toFixed(1)+" млн ₽";
  if (a>=1e3) return (v/1e3).toFixed(1)+" тыс ₽";
  return v.toFixed(0)+" ₽";
}
function escH(s) {
  return (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ════════════════════════════════════════════════════════════
// WELCOME HTML
// ════════════════════════════════════════════════════════════
function buildWelcomeHTML(existKey, existTg) {
  return `<!DOCTYPE html><html lang="ru"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<title>CashFlowWB</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{background:#000;color:#fff;font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:0 0 60px;display:flex;flex-direction:column;align-items:center;min-height:100vh}
.hero{width:100%;background:linear-gradient(160deg,#0A1628 0%,#000 60%);padding:52px 24px 36px;display:flex;flex-direction:column;align-items:center;text-align:center}
.logo-ring{width:80px;height:80px;background:linear-gradient(135deg,#007AFF,#0055FF);border-radius:22px;display:flex;align-items:center;justify-content:center;font-size:36px;margin-bottom:16px;box-shadow:0 0 0 1px rgba(255,255,255,.1),0 12px 40px rgba(0,122,255,.5)}
.logo-name{font-size:26px;font-weight:700;letter-spacing:-.5px}
.logo-sub{font-size:13px;color:#636366;margin-top:5px;letter-spacing:.04em}
.badges{display:flex;gap:8px;margin-top:16px;flex-wrap:wrap;justify-content:center}
.badge{font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;border:1px solid rgba(255,255,255,.12);color:#8E8E93}
.content{width:100%;max-width:440px;padding:0 16px;display:flex;flex-direction:column;gap:12px;margin-top:24px}
.section{background:#1C1C1E;border:1px solid #2C2C2E;border-radius:16px;overflow:hidden}
.section-hdr{padding:14px 16px 0;font-size:12px;font-weight:600;color:#636366;letter-spacing:.06em;text-transform:uppercase}
.s-row{padding:12px 16px;border-bottom:1px solid #2C2C2E;display:flex;flex-direction:column;gap:6px}
.s-row:last-child{border-bottom:none}
.s-label{font-size:13px;color:#8E8E93}
input{width:100%;background:#2C2C2E;border:1.5px solid #3A3A3C;border-radius:10px;padding:12px 14px;font-size:15px;color:#fff;outline:none;-webkit-appearance:none;transition:border-color .2s}
input:focus{border-color:#007AFF}
input::placeholder{color:#48484A}
.cats{background:#2C2C2E;border-radius:10px;padding:10px 12px;margin-top:2px}
.cats p{font-size:12px;color:#636366;margin-bottom:8px}
.cat-row{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.cat-row:last-child{margin-bottom:0}
.cat-pill{font-size:10px;font-weight:700;background:#0A2744;color:#0A84FF;border-radius:6px;padding:3px 8px;flex-shrink:0}
.cat-desc{font-size:12px;color:#48484A}
.desc-block{padding:14px 16px;font-size:14px;color:#8E8E93;line-height:1.65}
.desc-block a{color:#007AFF;text-decoration:none}
.btn-wrap{width:100%;max-width:440px;padding:0 16px;margin-top:4px}
.btn{width:100%;background:#007AFF;color:#fff;border:none;border-radius:14px;padding:16px;font-size:16px;font-weight:700;cursor:pointer;box-shadow:0 4px 20px rgba(0,122,255,.4);transition:all .15s}
.btn:active{transform:scale(.97);opacity:.9}
.btn.done{background:#1C7A3E}
.err{font-size:13px;text-align:center;margin-top:8px;color:#FF453A;display:none}
.success{text-align:center;margin-top:12px;font-size:14px;color:#30D158;display:none}
</style></head><body>
<div class="hero">
  <div class="logo-ring">📊</div>
  <div class="logo-name">CashFlowWB</div>
  <div class="logo-sub">Финансы Wildberries на iPhone</div>
  <div class="badges">
    <span class="badge">📰 Новости WB</span>
    <span class="badge">💰 Баланс</span>
    <span class="badge">📊 Статистика</span>
    <span class="badge">🔖 Избранное</span>
  </div>
</div>
<div class="content">
  <div class="section">
    <div class="section-hdr">API-ключ Wildberries</div>
    <div class="s-row">
      <div class="s-label">Ключ из «Профиль → Настройки → Доступ к API»</div>
      <input type="password" id="apiKey" placeholder="eyJhbGciOi..." value="${escH(existKey)}">
      <div class="cats">
        <p>Необходимые категории ключа:</p>
        <div class="cat-row"><span class="cat-pill">Общее</span><span class="cat-desc">Новости портала, информация о продавце</span></div>
        <div class="cat-row"><span class="cat-pill">Финансы</span><span class="cat-desc">Баланс и доступные средства</span></div>
      </div>
    </div>
  </div>
  <div class="section">
    <div class="section-hdr">Telegram <span style="color:#FF453A">*</span></div>
    <div class="s-row">
      <div class="s-label">Для связи и поддержки (обязательно)</div>
      <input type="text" id="telegram" placeholder="@username или +7 900 000-00-00" value="${escH(existTg)}">
    </div>
  </div>
  <div class="section">
    <div class="desc-block">
      Ваш персональный аналитик для Wildberries. Без Excel и ручного подсчёта.<br><br>
      Поддержка: <a href="https://t.me/cashflowwb">@CashFlowWB</a>
    </div>
  </div>
</div>
<div class="btn-wrap" style="margin-top:16px">
  <button class="btn" id="startBtn" onclick="submit()">Начать работу →</button>
  <div class="err" id="err">Введите API-ключ</div>
  <div class="err" id="errTg">Укажите Telegram или номер телефона</div>
  <div class="success" id="success">✓ Данные сохранены! Смахните вниз ↓</div>
</div>
<script>
window._result = null;
function submit() {
  const apiKey   = document.getElementById('apiKey').value.trim();
  const telegram = document.getElementById('telegram').value.trim();
  document.getElementById('err').style.display    = 'none';
  document.getElementById('errTg').style.display  = 'none';
  if (!apiKey)   { document.getElementById('err').style.display   = 'block'; return; }
  if (!telegram) { document.getElementById('errTg').style.display = 'block'; return; }
  const btn = document.getElementById('startBtn');
  btn.disabled = true; btn.textContent = '✓ Сохранено'; btn.classList.add('done');
  document.getElementById('success').style.display = 'block';
  window._result = { apiKey, telegram };
  if (typeof completion !== 'undefined') { try { completion(); } catch(e) {} }
}
</script></body></html>`;
}

// ════════════════════════════════════════════════════════════
// MAIN HTML
// ════════════════════════════════════════════════════════════
function buildMainHTML({ items, categories, favorites, readIds, balHistory,
                         sellerName, balance, forWithdraw,
                         themeId, isDark, fetchError, debugInfo,
                         fromCache, cacheAge, telegram, apiKey }) {
  const D = s => JSON.stringify(s);

  // Build balance chart SVG data
  const chartPoints = balHistory.length >= 2 ? (() => {
    const vals = balHistory.map(h => h.balance);
    const mn   = Math.min(...vals), mx = Math.max(...vals);
    const rng  = mx - mn || 1;
    return vals.map((v,i) => {
      const x = (i / (vals.length - 1)) * 100;
      const y = 100 - ((v - mn) / rng) * 85 - 5;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  })() : null;

  return `<!DOCTYPE html><html lang="ru"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<title>WB Новости</title>
<style>
/* ── Reset & Base ── */
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{height:100%;overscroll-behavior:none}
body{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif;transition:background .25s,color .25s;padding-bottom:env(safe-area-inset-bottom,20px)}

/* ── Theme Variables ── */
body{
  --bg:${isDark?"#000000":"#F2F2F7"};
  --bg2:${isDark?"#1C1C1E":"#FFFFFF"};
  --card:${isDark?"#1C1C1E":"#FFFFFF"};
  --card2:${isDark?"#2C2C2E":"#F2F2F7"};
  --text:${isDark?"#FFFFFF":"#000000"};
  --text2:${isDark?"#EBEBF5":"#3C3C43"};
  --muted:${isDark?"#8E8E93":"#8E8E93"};
  --muted2:${isDark?"#636366":"#C7C7CC"};
  --border:${isDark?"#38383A":"#E5E5EA"};
  --sep:${isDark?"#2C2C2E":"#C6C6C8"};
  --accent:${isDark?"#0A84FF":"#007AFF"};
  --abg:${isDark?"#0A2744":"#E8F4FF"};
  --green:${isDark?"#30D158":"#34C759"};
  --red:${isDark?"#FF453A":"#FF3B30"};
  --orange:${isDark?"#FF9F0A":"#FF9500"};
  --hdr:${isDark?"rgba(0,0,0,.85)":"rgba(242,242,247,.92)"};
  background:var(--bg);
  color:var(--text);
}

/* ── Scrollable area above bottom tabs ── */
#pageWrap{height:calc(100vh - 83px);overflow-y:auto;-webkit-overflow-scrolling:touch}

/* ── Top Header ── */
.top-hdr{position:sticky;top:0;z-index:50;padding:12px 16px 8px;background:var(--hdr);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid var(--sep)}
.hdr-row{display:flex;align-items:center;gap:10px}
.hdr-logo{font-size:22px;line-height:1}
.hdr-info{flex:1;min-width:0}
.hdr-name{font-size:15px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hdr-bal{font-size:12px;color:var(--muted);margin-top:1px}
.hdr-bal .g{color:var(--green);font-weight:600}
.hdr-bal .b{font-weight:600}
.hdr-actions{display:flex;gap:6px;flex-shrink:0}
.icon-btn{width:34px;height:34px;border:none;background:var(--card2);border-radius:10px;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--muted)}
.icon-btn:active{opacity:.6}

/* ── Bottom Tab Bar ── */
.tabbar{position:fixed;bottom:0;left:0;right:0;z-index:100;background:var(--hdr);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-top:1px solid var(--sep);display:flex;padding:6px 0 calc(6px + env(safe-area-inset-bottom,8px))}
.tab-item{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;border:none;background:none;cursor:pointer;padding:4px 0;color:var(--muted2);transition:color .15s}
.tab-item.active{color:var(--accent)}
.tab-icon-wrap{position:relative;font-size:22px;line-height:1}
.tab-badge{position:absolute;top:-2px;right:-8px;min-width:16px;height:16px;background:var(--red);border-radius:8px;font-size:10px;font-weight:700;color:#fff;display:flex;align-items:center;justify-content:center;padding:0 4px;border:2px solid var(--bg)}
.tab-label{font-size:10px;font-weight:500}
.tab-item.active .tab-label{font-weight:700}

/* ── Search Bar ── */
.search-wrap{padding:8px 16px;display:none}
.search-wrap.visible{display:block}
.search-inner{display:flex;align-items:center;gap:8px;background:var(--card2);border-radius:12px;padding:8px 12px}
.search-icon{font-size:14px;color:var(--muted);flex-shrink:0}
.search-inp{flex:1;border:none;background:transparent;font-size:15px;color:var(--text);outline:none;-webkit-appearance:none}
.search-inp::placeholder{color:var(--muted2)}
.search-clr{border:none;background:none;color:var(--muted2);font-size:14px;cursor:pointer;padding:0;display:none}

/* ── Category Chips ── */
.chips-wrap{padding:6px 0 8px}
.chips{display:flex;gap:7px;padding:0 16px;overflow-x:auto;scrollbar-width:none}
.chips::-webkit-scrollbar{display:none}
.chip{flex-shrink:0;border:1.5px solid var(--border);border-radius:20px;padding:5px 13px;font-size:13px;font-weight:500;cursor:pointer;background:transparent;color:var(--muted);transition:all .15s;white-space:nowrap}
.chip.on{background:var(--abg);border-color:var(--accent);color:var(--accent);font-weight:600}

/* ── Sort Bar ── */
.sort-bar{display:flex;align-items:center;padding:0 16px 10px;gap:8px}
.sort-lbl{font-size:12px;color:var(--muted);flex-shrink:0}
.sort-seg{display:flex;background:var(--card2);border-radius:8px;padding:2px;gap:2px}
.sort-opt{border:none;background:transparent;color:var(--muted);font-size:12px;font-weight:500;padding:4px 10px;border-radius:6px;cursor:pointer;transition:all .15s;white-space:nowrap}
.sort-opt.on{background:var(--card);color:var(--text);font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.15)}
.sort-count{margin-left:auto;font-size:12px;color:var(--muted)}

/* ── Section Divider ── */
.div{height:.5px;background:var(--sep);margin:0 16px 12px}

/* ── Feed ── */
.feed{padding:0 16px;display:flex;flex-direction:column;gap:10px}

/* ── News Card ── */
.card{background:var(--card);border-radius:16px;border:1px solid var(--border);overflow:hidden;transition:transform .15s}
.card:active{transform:scale(.985)}
.card.hidden{display:none}
.card-inner{display:flex;align-items:stretch}
.unread-bar{width:3px;background:var(--accent);flex-shrink:0;border-radius:3px 0 0 3px;transition:background .3s}
.card.read .unread-bar{background:transparent}
.card-body{flex:1;padding:12px 10px 12px 13px;cursor:pointer;min-width:0}
.card-tags{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px}
.ctag{font-size:10px;font-weight:700;text-transform:uppercase;color:var(--accent);background:var(--abg);border-radius:6px;padding:2px 7px;letter-spacing:.03em}
.card-title{font-size:15px;font-weight:600;line-height:1.4;color:var(--text);margin-bottom:4px}
.card-preview{font-size:13px;color:var(--muted);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.card-full{font-size:13px;color:var(--text2);line-height:1.65;display:none;margin-top:6px}
.card.exp .card-preview{display:none}
.card.exp .card-full{display:block}
.card-footer{display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap}
.card-date{font-size:11px;color:var(--muted);background:var(--card2);border-radius:6px;padding:2px 7px}
.card-toggle{font-size:11px;color:var(--accent);font-weight:500}
.card-link-btn{font-size:11px;color:var(--accent);background:var(--abg);border-radius:6px;padding:2px 8px;border:none;cursor:pointer;font-weight:500}
.card-link-btn:active{opacity:.7}
.card-actions{display:flex;flex-direction:column;justify-content:space-between;padding:10px 10px 10px 0;gap:8px}
.fav-btn{background:none;border:none;font-size:20px;cursor:pointer;padding:2px;opacity:.25;transition:opacity .15s,transform .15s;filter:grayscale(1);line-height:1}
.fav-btn.on{opacity:1;filter:none}
.fav-btn:active{transform:scale(1.35)}

/* ── Error box ── */
.err-box{margin:0 16px 12px;background:rgba(255,59,48,.08);border:1px solid rgba(255,59,48,.3);border-radius:12px;padding:12px 14px;font-size:12px;color:var(--red)}
.err-box code{display:block;margin-top:6px;font-size:10.5px;opacity:.7;white-space:pre-wrap;word-break:break-all}

/* ── Empty State ── */
.empty{text-align:center;padding:60px 24px 40px;color:var(--muted)}
.empty-icon{font-size:48px;margin-bottom:14px}
.empty-title{font-size:16px;font-weight:600;color:var(--text2);margin-bottom:6px}
.empty-sub{font-size:14px}

/* ── STATS TAB ── */
.stats-wrap{padding:16px 16px 20px}
.stat-card{background:var(--card);border:1px solid var(--border);border-radius:18px;padding:18px;margin-bottom:12px}
.stat-card-title{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:14px}
.bal-big{font-size:34px;font-weight:700;letter-spacing:-.5px;color:var(--text)}
.bal-sub{font-size:14px;color:var(--muted);margin-top:4px}
.bal-sub .g{color:var(--green);font-weight:600}
.bal-trend{display:inline-flex;align-items:center;gap:5px;margin-top:10px;font-size:13px;font-weight:600;padding:4px 10px;border-radius:20px}
.bal-trend.up{background:rgba(48,209,88,.12);color:var(--green)}
.bal-trend.dn{background:rgba(255,69,58,.12);color:var(--red)}
.bal-trend.eq{background:var(--card2);color:var(--muted)}
.chart-wrap{margin-top:14px;width:100%;height:90px;position:relative}
.chart-svg{width:100%;height:100%}
.chart-empty{font-size:13px;color:var(--muted);text-align:center;padding:20px 0}
.stat-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--sep)}
.stat-row:last-child{border-bottom:none}
.stat-row-label{font-size:14px;color:var(--text2)}
.stat-row-val{font-size:14px;font-weight:600;color:var(--text)}
.stat-row-val.g{color:var(--green)}
.stat-row-val.r{color:var(--red)}
.hist-list{margin-top:4px}
.hist-item{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--sep)}
.hist-item:last-child{border-bottom:none}
.hist-date{font-size:12px;color:var(--muted);width:90px;flex-shrink:0}
.hist-bar-wrap{flex:1;height:6px;background:var(--card2);border-radius:3px;overflow:hidden}
.hist-bar{height:100%;background:var(--accent);border-radius:3px;transition:width .5s ease}
.hist-val{font-size:12px;font-weight:600;color:var(--text);width:80px;text-align:right;flex-shrink:0}

/* ── SETTINGS TAB ── */
.cfg-wrap{padding:12px 0 24px}
.cfg-section{margin-bottom:20px}
.cfg-section-hdr{font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);padding:0 16px;margin-bottom:8px}
.cfg-list{background:var(--card);border-top:1px solid var(--sep);border-bottom:1px solid var(--sep)}
.cfg-row{padding:14px 16px;border-bottom:1px solid var(--sep);display:flex;flex-direction:column;gap:6px}
.cfg-row:last-child{border-bottom:none}
.cfg-row-lbl{font-size:13px;color:var(--muted)}
.cfg-inp{width:100%;background:transparent;border:none;font-size:16px;color:var(--text);outline:none;-webkit-appearance:none}
.cfg-inp::placeholder{color:var(--muted2)}
.cfg-row-action{display:flex;align-items:center;justify-content:space-between;cursor:pointer}
.cfg-row-action .lbl{font-size:16px;color:var(--text)}
.cfg-row-action .val{font-size:16px;color:var(--muted)}
.cfg-row-action .arr{font-size:14px;color:var(--muted2)}
/* Theme swatches */
.theme-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;padding:14px 16px}
.theme-swatch{display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;transition:transform .15s}
.theme-swatch:active{transform:scale(.9)}
.swatch-ring{width:44px;height:44px;border-radius:14px;border:3px solid transparent;transition:border-color .2s;display:flex;align-items:center;justify-content:center;font-size:20px}
.theme-swatch.on .swatch-ring{border-color:var(--accent)}
.swatch-label{font-size:10px;color:var(--muted);text-align:center;font-weight:500}
.theme-swatch.on .swatch-label{color:var(--accent);font-weight:700}
/* Buttons */
.cfg-btn{display:block;width:calc(100% - 32px);margin:0 16px;border:none;border-radius:14px;padding:14px;font-size:16px;font-weight:600;cursor:pointer;text-align:center;transition:all .15s}
.cfg-btn:active{opacity:.8;transform:scale(.98)}
.btn-primary{background:var(--accent);color:#fff;margin-bottom:10px}
.btn-secondary{background:var(--card2);color:var(--accent)}
.btn-danger{background:rgba(255,59,48,.1);color:var(--red);border:1px solid rgba(255,59,48,.2)}
.cfg-ok{font-size:13px;color:var(--green);text-align:center;margin-top:8px;display:none;padding:0 16px}
.del-confirm{background:var(--card2);border-radius:12px;padding:14px;margin:0 16px}
.del-warn{font-size:14px;color:var(--red);margin-bottom:10px}
.del-btns{display:flex;gap:8px}
.del-yes{flex:1;background:var(--red);color:#fff;border:none;border-radius:10px;padding:12px;font-size:14px;font-weight:600;cursor:pointer}
.del-no{flex:1;background:var(--card);color:var(--text);border:1px solid var(--border);border-radius:10px;padding:12px;font-size:14px;cursor:pointer}
.cfg-footer{text-align:center;font-size:12px;color:var(--muted);padding:20px 16px 4px;line-height:1.8}
.cfg-footer a{color:var(--accent);text-decoration:none}

/* ── Animations ── */
@keyframes rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.card,.stat-card{animation:rise .3s ease both}
</style></head><body>

<!-- ── Top Header ── -->
<div class="top-hdr">
  <div class="hdr-row">
    <div class="hdr-logo">📊</div>
    <div class="hdr-info">
      <div class="hdr-name" id="hdrName">CashFlowWB</div>
      <div class="hdr-bal" id="hdrBal"></div>
    </div>
    <div class="hdr-actions">
      <button class="icon-btn" id="searchToggleBtn" onclick="toggleSearch()" title="Поиск">🔍</button>
      <button class="icon-btn" id="refreshBtn" onclick="doRefresh()" title="Обновить">↺</button>
    </div>
  </div>
</div>

<!-- ── Pages ── -->
<div id="pageWrap">

<!-- NEWS PAGE -->
<div id="v-news">
  <div class="search-wrap" id="searchBar">
    <div class="search-inner">
      <span class="search-icon">🔍</span>
      <input class="search-inp" id="searchInp" type="search" placeholder="Поиск новостей..." oninput="doSearch(this.value)">
      <button class="search-clr" id="searchClr" onclick="clearSearch()">✕</button>
    </div>
  </div>
  <div class="chips-wrap" id="chipsWrap">
    <div class="chips" id="chips"></div>
  </div>
  <div class="sort-bar">
    <span class="sort-lbl">Сортировка:</span>
    <div class="sort-seg">
      <button class="sort-opt on" id="sort-new" onclick="setSort('new')">Новые</button>
      <button class="sort-opt" id="sort-old" onclick="setSort('old')">Старые</button>
      <button class="sort-opt" id="sort-cat" onclick="setSort('cat')">A–Я</button>
    </div>
    <span class="sort-count" id="sortCount"></span>
  </div>
  <div id="errBox"></div>
  <div class="feed" id="newsFeed"></div>
  <div style="height:16px"></div>
</div>

<!-- FAVORITES PAGE -->
<div id="v-favs" style="display:none">
  <div style="height:12px"></div>
  <div class="feed" id="favFeed"></div>
  <div style="height:16px"></div>
</div>

<!-- STATS PAGE -->
<div id="v-stats" style="display:none">
  <div class="stats-wrap" id="statsWrap"></div>
</div>

<!-- SETTINGS PAGE -->
<div id="v-cfg" style="display:none">
  <div class="cfg-wrap">
    <div class="cfg-section">
      <div class="cfg-section-hdr">Тема оформления</div>
      <div class="cfg-list">
        <div class="theme-grid" id="themeGrid"></div>
      </div>
    </div>
    <div class="cfg-section">
      <div class="cfg-section-hdr">API-ключ WB</div>
      <div class="cfg-list">
        <div class="cfg-row">
          <div class="cfg-row-lbl">Ключ из «Профиль → Настройки → Доступ к API»</div>
          <input class="cfg-inp" type="password" id="cfgKey" placeholder="eyJhbGciOi...">
        </div>
      </div>
    </div>
    <div class="cfg-section">
      <div class="cfg-section-hdr">Telegram</div>
      <div class="cfg-list">
        <div class="cfg-row">
          <div class="cfg-row-lbl">Ваш @username для поддержки</div>
          <input class="cfg-inp" type="text" id="cfgTg" placeholder="@username">
        </div>
      </div>
    </div>
    <div class="cfg-section">
      <button class="cfg-btn btn-primary" onclick="saveSettings()">Сохранить настройки</button>
      <div class="cfg-ok" id="cfgOk">✓ Настройки сохранены</div>
      <button class="cfg-btn btn-secondary" style="margin-top:0" onclick="doRefresh()">↺ Обновить данные</button>
    </div>
    <div class="cfg-section">
      <div class="cfg-section-hdr">Опасная зона</div>
      <button class="cfg-btn btn-danger" onclick="confirmWipe()">🗑 Стереть все данные</button>
      <div class="del-confirm" id="delConfirm" style="display:none;margin-top:10px">
        <div class="del-warn">Удалить ключ, настройки, избранное и архив?</div>
        <div class="del-btns">
          <button class="del-yes" onclick="wipeAll()">Да, удалить</button>
          <button class="del-no" onclick="hideConfirm()">Отмена</button>
        </div>
      </div>
    </div>
    <div class="cfg-section">
      <div class="cfg-footer">
        <a href="https://t.me/cashflowwb">Разработано @CashFlowWB</a><br>
        WB News Reader v7
      </div>
    </div>
  </div>
</div>

</div><!-- /pageWrap -->

<!-- ── Bottom Tab Bar ── -->
<div class="tabbar">
  <button class="tab-item active" data-tab="news" onclick="goTab('news')">
    <div class="tab-icon-wrap">📰<span class="tab-badge" id="unreadBadge" style="display:none"></span></div>
    <div class="tab-label">Новости</div>
  </button>
  <button class="tab-item" data-tab="favs" onclick="goTab('favs')">
    <div class="tab-icon-wrap">🔖<span class="tab-badge" id="favBadge" style="display:none"></span></div>
    <div class="tab-label">Избранное</div>
  </button>
  <button class="tab-item" data-tab="stats" onclick="goTab('stats')">
    <div class="tab-icon-wrap">📊</div>
    <div class="tab-label">Статистика</div>
  </button>
  <button class="tab-item" data-tab="cfg" onclick="goTab('cfg')">
    <div class="tab-icon-wrap">⚙️</div>
    <div class="tab-label">Настройки</div>
  </button>
</div>

<script>
// ── Injected Data ──────────────────────────────────────
const ITEMS      = ${D(items)};
const CATS       = ${D(categories)};
const BAL_HIST   = ${D(balHistory)};
const SELLER     = ${D(sellerName)};
const BAL        = ${D(balance)};
const WITHDRAW   = ${D(forWithdraw)};
const FETCH_ERR  = ${D(fetchError)};
const DEBUG_INFO = ${D(debugInfo)};
const FROM_CACHE = ${D(fromCache)};
const CACHE_AGE  = ${D(cacheAge)};

window._favorites = ${D(favorites)};
window._readIds   = ${D(readIds)};
window._theme     = ${D(themeId)};
window._apiKey    = ${D(apiKey)};
window._telegram  = ${D(telegram)};
window._doRefresh = false;
window._doWipe    = false;

// ── Themes ──────────────────────────────────────────────
const THEMES = {
  auto:     { name:'Авто',    emoji:'🔄', bg1:'#000',    bg2:'#1C1C1E' },
  light:    { name:'Светлая', emoji:'☀️', bg1:'#F2F2F7', bg2:'#FFFFFF' },
  dark:     { name:'Тёмная',  emoji:'🌙', bg1:'#000000', bg2:'#1C1C1E' },
  oled:     { name:'OLED',    emoji:'⚫', bg1:'#000000', bg2:'#111111' },
  midnight: { name:'Полночь', emoji:'🔮', bg1:'#0D0F1E', bg2:'#161928' },
  aurora:   { name:'Аврора',  emoji:'🌊', bg1:'#071320', bg2:'#0D1E30' },
};

const THEME_CSS = {
  auto:     null,
  light:    {bg:'#F2F2F7',bg2:'#FFFFFF',card:'#FFFFFF',card2:'#F2F2F7',text:'#000000',text2:'#3C3C43',muted:'#8E8E93',muted2:'#C7C7CC',border:'#E5E5EA',sep:'#C6C6C8',accent:'#007AFF',abg:'#E8F4FF',green:'#34C759',red:'#FF3B30',orange:'#FF9500',hdr:'rgba(242,242,247,.92)'},
  dark:     {bg:'#000000',bg2:'#1C1C1E',card:'#1C1C1E',card2:'#2C2C2E',text:'#FFFFFF',text2:'#EBEBF5',muted:'#8E8E93',muted2:'#636366',border:'#38383A',sep:'#2C2C2E',accent:'#0A84FF',abg:'#0A2744',green:'#30D158',red:'#FF453A',orange:'#FF9F0A',hdr:'rgba(0,0,0,.85)'},
  oled:     {bg:'#000000',bg2:'#111111',card:'#111111',card2:'#1A1A1A',text:'#FFFFFF',text2:'#E5E5E5',muted:'#636366',muted2:'#48484A',border:'#2C2C2E',sep:'#1C1C1E',accent:'#0A84FF',abg:'#001533',green:'#30D158',red:'#FF453A',orange:'#FF9F0A',hdr:'rgba(0,0,0,.92)'},
  midnight: {bg:'#0D0F1E',bg2:'#161928',card:'#161928',card2:'#1E2235',text:'#E8ECFF',text2:'#C8CCEE',muted:'#5A6280',muted2:'#3A3F60',border:'#2A2F50',sep:'#232740',accent:'#BF5AF2',abg:'#2A1440',green:'#30D158',red:'#FF453A',orange:'#FF9F0A',hdr:'rgba(13,15,30,.9)'},
  aurora:   {bg:'#071320',bg2:'#0D1E30',card:'#0D1E30',card2:'#122438',text:'#E8F4FF',text2:'#B8D4EE',muted:'#4A7090',muted2:'#2A4560',border:'#1A3050',sep:'#162840',accent:'#00C2FF',abg:'#003D52',green:'#34E86A',red:'#FF453A',orange:'#FFB340',hdr:'rgba(7,19,32,.9)'},
};

function applyTheme(id) {
  window._theme = id;
  const css = THEME_CSS[id];
  if (!css) return; // auto — use server-rendered vars
  const r = document.documentElement;
  Object.entries(css).forEach(([k,v]) => r.style.setProperty('--'+k, v));
  document.body.style.background = css.bg;
  document.body.style.color      = css.text;
}

function renderThemeGrid() {
  const el = document.getElementById('themeGrid');
  el.innerHTML = Object.entries(THEMES).map(([id,t]) =>
    '<div class="theme-swatch'+(window._theme===id?' on':'')+'" onclick="pickTheme(\''+id+'\')" data-tid="'+id+'">'
    +'<div class="swatch-ring" style="background:'+(THEME_CSS[id]?THEME_CSS[id].bg:'linear-gradient(135deg,#1C1C1E,#3A3A3C)')+'">'
    +t.emoji+'</div><div class="swatch-label">'+t.name+'</div></div>'
  ).join('');
}

function pickTheme(id) {
  applyTheme(id);
  renderThemeGrid();
}

// ── Header ──────────────────────────────────────────────
(function(){
  const fmtM = v => { if(v===null||isNaN(v)) return '—'; const a=Math.abs(v); if(a>=1e6) return (v/1e6).toFixed(1)+' млн ₽'; if(a>=1e3) return (v/1e3).toFixed(1)+' тыс ₽'; return v.toFixed(0)+' ₽'; };
  document.getElementById('hdrName').textContent = SELLER ? 'CashFlowWB — '+SELLER : 'CashFlowWB';
  if (BAL !== null) {
    document.getElementById('hdrBal').innerHTML =
      'Баланс: <span class="b">'+fmtM(BAL)+'</span>&nbsp;&nbsp;Вывод: <span class="g">'+fmtM(WITHDRAW)+'</span>';
  } else {
    document.getElementById('hdrBal').textContent = FROM_CACHE ? ('Кэш '+CACHE_AGE+' мин назад') : '';
  }
})();

// ── Tabs ────────────────────────────────────────────────
let currentTab = 'news';
function goTab(name) {
  currentTab = name;
  ['news','favs','stats','cfg'].forEach(t => {
    document.getElementById('v-'+t).style.display = t===name?'':'none';
  });
  document.querySelectorAll('.tab-item').forEach(b => {
    b.classList.toggle('active', b.dataset.tab===name);
  });
  document.getElementById('pageWrap').scrollTop = 0;
  if (name==='favs')  renderFavs();
  if (name==='stats') renderStats();
  if (name==='cfg') {
    renderThemeGrid();
    document.getElementById('cfgKey').value = window._apiKey||'';
    document.getElementById('cfgTg').value  = window._telegram||'';
  }
}

// ── Search ──────────────────────────────────────────────
let searchActive = false;
function toggleSearch() {
  searchActive = !searchActive;
  document.getElementById('searchBar').classList.toggle('visible', searchActive);
  if (searchActive) setTimeout(()=>document.getElementById('searchInp').focus(), 100);
  else { clearSearch(); }
}
function clearSearch() {
  document.getElementById('searchInp').value = '';
  document.getElementById('searchClr').style.display = 'none';
  applyFilters();
}
function doSearch(q) {
  document.getElementById('searchClr').style.display = q ? 'block' : 'none';
  applyFilters();
}

// ── Categories ──────────────────────────────────────────
let activeCat = '';
(function(){
  const el = document.getElementById('chips');
  el.innerHTML = '<button class="chip on" onclick="setCat(this,\\'\\')">Все</button>'
    + CATS.map(c => '<button class="chip" onclick="setCat(this,\\'' + c.replace(/'/g,"\\\\'") + '\\')">' + c + '</button>').join('');
})();

function setCat(btn, cat) {
  activeCat = cat;
  document.querySelectorAll('.chip').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  applyFilters();
}

// ── Sort ────────────────────────────────────────────────
let sortMode = 'new';
function setSort(mode) {
  sortMode = mode;
  document.querySelectorAll('.sort-opt').forEach(b => b.classList.remove('on'));
  document.getElementById('sort-'+mode).classList.add('on');
  applyFilters();
}

// ── Filter + Sort + Render ──────────────────────────────
function applyFilters() {
  const q = (document.getElementById('searchInp').value||'').toLowerCase().trim();
  let visible = [...ITEMS];
  if (activeCat) visible = visible.filter(i => (i.cats||[]).includes(activeCat));
  if (q) visible = visible.filter(i => (i.title+' '+(i.desc||'')).toLowerCase().includes(q));
  if (sortMode==='old') visible.sort((a,b)=>new Date(a.rawDate||0)-new Date(b.rawDate||0));
  else if (sortMode==='cat') visible.sort((a,b)=>((a.cats||[])[0]||'').localeCompare((b.cats||[])[0]||''));
  else visible.sort((a,b)=>new Date(b.rawDate||0)-new Date(a.rawDate||0));
  const feed = document.getElementById('newsFeed');
  feed.querySelectorAll('.card').forEach(card => {
    card.classList.toggle('hidden', !visible.some(i=>i.id===card.dataset.id));
  });
  document.getElementById('sortCount').textContent = visible.length + ' / ' + ITEMS.length;
}

// ── News Cards ──────────────────────────────────────────
const readSet = new Set(window._readIds);

(function(){
  // Error box
  if (FETCH_ERR || DEBUG_INFO) {
    if (ITEMS.length===0) {
      document.getElementById('errBox').innerHTML =
        '<div class="err-box"><b>'+(FETCH_ERR?'⚠️ Ошибка':'ℹ️ Отладка')+':</b> '+(FETCH_ERR||'')
        +(DEBUG_INFO?'<code>'+escH(DEBUG_INFO)+'</code>':'')+'</div>';
    }
  }
  const feed = document.getElementById('newsFeed');
  if (!ITEMS.length) {
    feed.innerHTML = '<div class="empty"><div class="empty-icon">'+(FETCH_ERR?'⚠️':'📭')+'</div>'
      +'<div class="empty-title">'+(FETCH_ERR?'Не удалось загрузить':'Новостей нет')+'</div>'
      +'<div class="empty-sub">'+(FETCH_ERR?FETCH_ERR:'Попробуйте обновить')+'</div></div>';
    return;
  }

  // Sort initial: newest first
  const sorted = [...ITEMS].sort((a,b)=>new Date(b.rawDate||0)-new Date(a.rawDate||0));

  feed.innerHTML = sorted.map((item,i) => {
    const isFav  = window._favorites.some(f=>f.id===item.id);
    const isRead = readSet.has(item.id);
    const cats   = item.cats||[];
    const delay  = Math.min(i*15, 300);
    return '<div class="card'+(isRead?' read':'')+'" data-id="'+item.id+'" data-cats="'+cats.join(',')+'" style="animation-delay:'+delay+'ms">'
      +'<div class="card-inner">'
      +'<div class="unread-bar"></div>'
      +'<div class="card-body" onclick="expandCard(\''+item.id+'\')">'
      +(cats.length?'<div class="card-tags">'+cats.map(c=>'<span class="ctag">'+escH(c)+'</span>').join('')+'</div>':'')
      +'<div class="card-title">'+escH(item.title)+'</div>'
      +'<div class="card-preview">'+escH(item.desc)+'</div>'
      +'<div class="card-full">'+escH(item.fullDesc||item.desc)+'</div>'
      +'<div class="card-footer">'
      +(item.date?'<span class="card-date">'+escH(item.date)+'</span>':'')
      +'<span class="card-toggle"><span class="more-lbl">Подробнее ↓</span><span class="less-lbl" style="display:none">Свернуть ↑</span></span>'
      +(item.link?'<button class="card-link-btn" onclick="openLink(event,\''+escJS(item.link)+'\')">Открыть →</button>':'')
      +'</div></div>'
      +'<div class="card-actions">'
      +'<button class="fav-btn'+(isFav?' on':'')+'" data-id="'+item.id+'" onclick="toggleFav(event,\''+item.id+'\')">🔖</button>'
      +'</div></div></div>';
  }).join('');

  updateBadges();
  document.getElementById('sortCount').textContent = sorted.length + ' / ' + ITEMS.length;
})();

function expandCard(id) {
  const card = document.querySelector('#newsFeed .card[data-id="'+id+'"]');
  if (!card) return;
  const exp = card.classList.toggle('exp');
  card.querySelector('.more-lbl').style.display = exp ? 'none' : '';
  card.querySelector('.less-lbl').style.display = exp ? '' : 'none';
  // Mark as read
  if (!readSet.has(id)) {
    readSet.add(id);
    window._readIds = [...readSet];
    card.classList.add('read');
    updateBadges();
  }
}

function openLink(e, url) {
  e.stopPropagation();
  if (typeof Safari !== 'undefined') Safari.open(url);
  else window.open(url, '_blank');
}

// ── Favorites ──────────────────────────────────────────
function toggleFav(e, id) {
  e.stopPropagation();
  const idx = window._favorites.findIndex(f=>f.id===id);
  if (idx>=0) window._favorites.splice(idx,1);
  else { const item = ITEMS.find(i=>i.id===id); if(item) window._favorites.push(item); }
  document.querySelectorAll('.fav-btn[data-id="'+id+'"]').forEach(btn => {
    btn.classList.toggle('on', window._favorites.some(f=>f.id===id));
  });
  updateBadges();
}

function renderFavs() {
  const feed = document.getElementById('favFeed');
  if (!window._favorites.length) {
    feed.innerHTML = '<div class="empty"><div class="empty-icon">🔖</div>'
      +'<div class="empty-title">Нет избранных</div>'
      +'<div class="empty-sub">Нажмите 🔖 на любой новости</div></div>';
    return;
  }
  feed.innerHTML = window._favorites.map((item,i) => {
    const cats = item.cats||[];
    const delay = Math.min(i*15,300);
    return '<div class="card" style="animation-delay:'+delay+'ms">'
      +'<div class="card-inner">'
      +'<div class="unread-bar" style="background:var(--orange)"></div>'
      +'<div class="card-body" onclick="expandFavCard(this)">'
      +(cats.length?'<div class="card-tags">'+cats.map(c=>'<span class="ctag">'+escH(c)+'</span>').join('')+'</div>':'')
      +'<div class="card-title">'+escH(item.title)+'</div>'
      +'<div class="card-preview">'+escH(item.desc)+'</div>'
      +'<div class="card-full">'+escH(item.fullDesc||item.desc)+'</div>'
      +'<div class="card-footer">'
      +(item.date?'<span class="card-date">'+escH(item.date)+'</span>':'')
      +'<span class="card-toggle"><span class="more-lbl">Подробнее ↓</span><span class="less-lbl" style="display:none">Свернуть ↑</span></span>'
      +(item.link?'<button class="card-link-btn" onclick="openLink(event,\''+escJS(item.link)+'\')">Открыть →</button>':'')
      +'</div></div>'
      +'<div class="card-actions">'
      +'<button class="fav-btn on" data-id="'+item.id+'" onclick="removeFav(event,\''+item.id+'\')">🔖</button>'
      +'</div></div></div>';
  }).join('');
}

function expandFavCard(body) {
  const card = body.closest('.card');
  const exp  = card.classList.toggle('exp');
  card.querySelector('.more-lbl').style.display = exp ? 'none' : '';
  card.querySelector('.less-lbl').style.display = exp ? '' : 'none';
}

function removeFav(e, id) {
  e.stopPropagation();
  window._favorites = window._favorites.filter(f=>f.id!==id);
  renderFavs();
  document.querySelectorAll('.fav-btn[data-id="'+id+'"]').forEach(b=>b.classList.remove('on'));
  updateBadges();
}

function updateBadges() {
  const unread = ITEMS.filter(i=>!readSet.has(i.id)).length;
  const ub = document.getElementById('unreadBadge');
  ub.style.display = unread>0?'flex':'none';
  ub.textContent   = unread>99?'99+':String(unread);
  const fb = document.getElementById('favBadge');
  fb.style.display = window._favorites.length>0?'flex':'none';
  fb.textContent   = String(window._favorites.length);
}

// ── Statistics ──────────────────────────────────────────
function renderStats() {
  const fmtM = v => { if(v===null||isNaN(v)) return '—'; const a=Math.abs(v); if(a>=1e6) return (v/1e6).toFixed(1)+' млн ₽'; if(a>=1e3) return (v/1e3).toFixed(1)+' тыс ₽'; return v.toFixed(0)+' ₽'; };
  const fmtDt = ts => { try { return new Date(ts).toLocaleString('ru-RU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}); } catch { return ''; } };

  const wrap = document.getElementById('statsWrap');
  let html = '';

  // Balance card
  const prevBal = BAL_HIST.length >= 2 ? BAL_HIST[BAL_HIST.length-2].balance : null;
  const diff    = BAL!==null && prevBal!==null ? BAL - prevBal : null;
  const trendCls = diff===null?'eq':diff>0?'up':'dn';
  const trendTxt = diff===null?'Нет данных для сравнения':(diff>0?'▲ +':diff<0?'▼ ':'')+fmtM(Math.abs(diff||0))+' с прошлого измерения';

  html += '<div class="stat-card">';
  html += '<div class="stat-card-title">Баланс счёта</div>';
  html += '<div class="bal-big">'+(BAL!==null?fmtM(BAL):'—')+'</div>';
  html += '<div class="bal-sub">К выводу: <span class="g">'+(WITHDRAW!==null?fmtM(WITHDRAW):'—')+'</span></div>';
  html += '<div class="bal-trend '+trendCls+'">'+trendTxt+'</div>';

  // SVG Chart
  if (BAL_HIST.length >= 2) {
    const vals = BAL_HIST.map(h=>h.balance);
    const mn = Math.min(...vals), mx = Math.max(...vals), rng=mx-mn||1;
    const pts = vals.map((v,i)=>{
      const x = (i/(vals.length-1)*96+2).toFixed(1);
      const y = (100-((v-mn)/rng)*80-10).toFixed(1);
      return x+','+y;
    }).join(' ');
    // Area fill
    const first = vals.map((_,i)=>((i/(vals.length-1)*96+2).toFixed(1))).at(0)+',100';
    const last  = vals.map((_,i)=>((i/(vals.length-1)*96+2).toFixed(1))).at(-1)+',100';
    html += '<div class="chart-wrap">'
      +'<svg class="chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none">'
      +'<defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--accent)" stop-opacity=".25"/><stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>'
      +'<polygon points="'+first+' '+pts+' '+last+'" fill="url(#cg)"/>'
      +'<polyline points="'+pts+'" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>'
      +'</svg></div>';
  } else {
    html += '<div class="chart-empty">Накапливаем историю баланса…<br><small>Данные появятся после нескольких обновлений</small></div>';
  }
  html += '</div>';

  // Quick stats card
  html += '<div class="stat-card">';
  html += '<div class="stat-card-title">Быстрые факты</div>';
  const unread  = ITEMS.filter(i=>!readSet.has(i.id)).length;
  const favCnt  = window._favorites.length;
  const archLen = ITEMS.length;
  const rows = [
    ['Новостей в архиве', String(archLen), ''],
    ['Непрочитанных',     String(unread), unread>0?'r':''],
    ['Избранных',         String(favCnt), favCnt>0?'g':''],
    ['Обновлён',          FROM_CACHE?('кэш, '+CACHE_AGE+' мин'):'только что',''],
  ];
  rows.forEach(([lbl,val,cls])=>{
    html += '<div class="stat-row"><span class="stat-row-label">'+lbl+'</span><span class="stat-row-val '+cls+'">'+val+'</span></div>';
  });
  html += '</div>';

  // Balance history list
  if (BAL_HIST.length > 1) {
    html += '<div class="stat-card">';
    html += '<div class="stat-card-title">История баланса</div>';
    const mx = Math.max(...BAL_HIST.map(h=>Math.abs(h.balance)));
    const sliced = [...BAL_HIST].reverse().slice(0,15);
    html += '<div class="hist-list">';
    sliced.forEach(h=>{
      const pct = mx>0 ? Math.max(4, Math.round(Math.abs(h.balance)/mx*100)) : 4;
      html += '<div class="hist-item">'
        +'<div class="hist-date">'+fmtDt(h.ts)+'</div>'
        +'<div class="hist-bar-wrap"><div class="hist-bar" style="width:'+pct+'%"></div></div>'
        +'<div class="hist-val">'+fmtM(h.balance)+'</div>'
        +'</div>';
    });
    html += '</div></div>';
  }

  wrap.innerHTML = html;

  // Animate bars
  setTimeout(()=>{
    wrap.querySelectorAll('.hist-bar').forEach(b=>{
      const w = b.style.width;
      b.style.width='0';
      requestAnimationFrame(()=>{ b.style.width=w; });
    });
  }, 50);
}

// ── Settings ────────────────────────────────────────────
function saveSettings() {
  window._apiKey   = document.getElementById('cfgKey').value.trim();
  window._telegram = document.getElementById('cfgTg').value.trim();
  const ok = document.getElementById('cfgOk');
  ok.style.display = 'block'; setTimeout(()=>ok.style.display='none', 2200);
}
function confirmWipe() {
  const el = document.getElementById('delConfirm');
  el.style.display = el.style.display==='none'?'block':'none';
}
function hideConfirm() { document.getElementById('delConfirm').style.display='none'; }
function wipeAll() { window._doWipe=true; if(typeof completion!=='undefined')completion(); }
function doRefresh() {
  window._apiKey    = (document.getElementById('cfgKey')||{}).value?.trim()||window._apiKey;
  window._telegram  = (document.getElementById('cfgTg')||{}).value?.trim()||window._telegram;
  window._doRefresh = true;
  if(typeof completion!=='undefined')completion();
}

// ── Helpers ─────────────────────────────────────────────
function escH(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escJS(s){ return (s||'').replace(/\\\\/g,'\\\\\\\\').replace(/'/g,"\\\\'"); }

// ── Init ────────────────────────────────────────────────
applyTheme(window._theme);
renderThemeGrid();
updateBadges();
</script>
</body></html>`;
}

await run();
