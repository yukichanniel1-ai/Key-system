import { useState, useEffect, useCallback, useRef } from "react";

// ─── KEY GENERATION ───────────────────────────────────────────────────────────
function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
function hexRand(n) {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}
function alphaRand(n) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}
function generateKeyValue(format, tier) {
  switch (format) {
    case "uuid": return uuidv4();
    case "hex": return hexRand(32);
    case "alphanum": return alphaRand(24);
    case "prefix": {
      const pfx = { free: "free", vip: "vip" }[tier] ?? "key";
      return `${pfx}_${alphaRand(8)}_${alphaRand(8)}`;
    }
    default: return uuidv4();
  }
}

// ─── SEED DATA ────────────────────────────────────────────────────────────────
function buildSeed() {
  const now = Date.now();
  return [
    { id: uuidv4(), key: "vip_ab3fxyz1_mn7pqrs2", label: "mobile-app-prod", tier: "vip", rateLimit: "5000", threads: 16, createdAt: now - 86400000 * 10, expiresAt: now + 86400000 * 20, revoked: false, usageCount: 1482, maxRedemptions: 100, redemptionCount: 67 },
    { id: uuidv4(), key: hexRand(32), label: "analytics-service", tier: "vip", rateLimit: "unlimited", threads: 32, createdAt: now - 86400000 * 30, expiresAt: now + 86400000 * 335, revoked: false, usageCount: 58210, maxRedemptions: null, redemptionCount: 0 },
    { id: uuidv4(), key: uuidv4(), label: "sandbox-testing", tier: "free", rateLimit: "1000", threads: 2, createdAt: now - 86400000 * 5, expiresAt: now + 86400000 * 2, revoked: false, usageCount: 44, maxRedemptions: 10, redemptionCount: 10 },
    { id: uuidv4(), key: alphaRand(24), label: "legacy-webhook", tier: "free", rateLimit: "1000", threads: 4, createdAt: now - 86400000 * 90, expiresAt: now - 86400000 * 1, revoked: false, usageCount: 9320, maxRedemptions: 50, redemptionCount: 50 },
    { id: uuidv4(), key: "vip_" + alphaRand(8) + "_" + alphaRand(8), label: "ci-pipeline", tier: "vip", rateLimit: "unlimited", threads: 8, createdAt: now - 86400000 * 60, expiresAt: null, revoked: true, revokedAt: now - 86400000 * 3, usageCount: 301, maxRedemptions: null, redemptionCount: 0 },
  ];
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const EXPIRY_OPTS = [
  { label: "7 days", days: 7 }, { label: "30 days", days: 30 },
  { label: "90 days", days: 90 }, { label: "1 year", days: 365 }, { label: "Never", days: 0 }
];
const RATE_PRESETS = ["1000", "5000", "unlimited"];
const REDEEM_PRESETS = ["1", "5", "10", "50", "100"];
const THREAD_PRESETS = [1, 2, 4, 8, 16, 32];
const FORMAT_OPTS = [
  { value: "uuid", label: "UUID v4" }, { value: "hex", label: "HEX-32" },
  { value: "alphanum", label: "ALPHANUM-24" }, { value: "prefix", label: "PREFIX-KEY" }
];

// ─── UTILS ────────────────────────────────────────────────────────────────────
function fmtDate(ts) {
  if (!ts) return "Never";
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function daysUntil(ts) {
  if (!ts) return null;
  return Math.ceil((ts - Date.now()) / 86400000);
}
function getKeyStatus(k) {
  const now = Date.now();
  if (k.revoked) return "revoked";
  if (k.expiresAt && now > k.expiresAt) return "expired";
  return k.tier;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function KeyVault() {
  const [keys, setKeys] = useState(() => {
    try {
      const s = localStorage.getItem("kv2:keys");
      if (s) return JSON.parse(s);
      const seed = buildSeed();
      localStorage.setItem("kv2:keys", JSON.stringify(seed));
      return seed;
    } catch { return buildSeed(); }
  });
  useEffect(() => { try { localStorage.setItem("kv2:keys", JSON.stringify(keys)); } catch {} }, [keys]);

  const [tab, setTab] = useState("generate");
  const [theme, setTheme] = useState("dark");
  const [toast, setToast] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [expandedKey, setExpandedKey] = useState(null);
  const [generatedKey, setGeneratedKey] = useState(null);
  const [showKeyVal, setShowKeyVal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // generate form
  const [tier, setTier] = useState("free");
  const [format, setFormat] = useState("prefix");
  const [expiryDays, setExpiryDays] = useState(30);
  const [rateLimit, setRateLimit] = useState("1000");
  const [customRate, setCustomRate] = useState("");
  const [label, setLabel] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [customRedeem, setCustomRedeem] = useState("");

  // validate
  const [validateInput, setValidateInput] = useState("");
  const [validateResult, setValidateResult] = useState(null);

  // manage
  const [search, setSearch] = useState("");
  const [filterTier, setFilterTier] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const isDark = theme === "dark";

  const notify = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }, []);

  const copyToClipboard = useCallback((val, id) => {
    navigator.clipboard.writeText(val).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  const stats = {
    total: keys.length,
    active: keys.filter(k => !k.revoked && (!k.expiresAt || Date.now() < k.expiresAt)).length,
    expired: keys.filter(k => !k.revoked && k.expiresAt && Date.now() > k.expiresAt).length,
    revoked: keys.filter(k => k.revoked).length,
  };

  function handleGenerate() {
    if (loading) return;
    setLoading(true);
    const rate = customRate || rateLimit;
    const redeems = customRedeem || maxRedemptions;
    setTimeout(() => {
      const id = uuidv4();
      const now = Date.now();
      const newKey = {
        id, key: generateKeyValue(format, tier),
        label: label.trim() || `${tier}-key-${Date.now().toString(36).slice(-4)}`,
        tier, rateLimit: rate, threads: 1,
        createdAt: now,
        expiresAt: expiryDays > 0 ? now + expiryDays * 86400000 : null,
        revoked: false, usageCount: 0,
        maxRedemptions: redeems && Number(redeems) > 0 ? Number(redeems) : null,
        redemptionCount: 0,
      };
      setKeys(prev => [newKey, ...prev]);
      setGeneratedKey(newKey);
      setShowKeyVal(false);
      setLabel("");
      setLoading(false);
      notify("Key generated successfully");
    }, 700);
  }

  function handleValidate() {
    if (!validateInput.trim()) return;
    setLoading(true);
    setTimeout(() => {
      const found = keys.find(k => k.key === validateInput.trim());
      if (!found) { setValidateResult({ valid: false, reason: "Key not found in vault" }); }
      else if (found.revoked) { setValidateResult({ valid: false, reason: "Key has been revoked", key: found }); }
      else if (found.expiresAt && Date.now() > found.expiresAt) { setValidateResult({ valid: false, reason: "Key has expired", key: found }); }
      else {
        setKeys(prev => prev.map(k => k.id === found.id ? { ...k, usageCount: k.usageCount + 1 } : k));
        setValidateResult({ valid: true, key: found });
      }
      setLoading(false);
    }, 500);
  }

  const now = Date.now();
  let filtered = keys.filter(k => {
    const matchSearch = !search || k.label.toLowerCase().includes(search.toLowerCase()) || k.key.toLowerCase().includes(search.toLowerCase());
    const matchTier = filterTier === "all" || k.tier === filterTier;
    const isExpired = k.expiresAt && now > k.expiresAt;
    const isActive = !k.revoked && !isExpired;
    const matchStatus = filterStatus === "all" || (filterStatus === "active" && isActive) || (filterStatus === "revoked" && k.revoked) || (filterStatus === "expired" && isExpired);
    return matchSearch && matchTier && matchStatus;
  }).sort((a, b) => {
    if (sortBy === "newest") return b.createdAt - a.createdAt;
    if (sortBy === "oldest") return a.createdAt - b.createdAt;
    if (sortBy === "label") return a.label.localeCompare(b.label);
    if (sortBy === "usage") return b.usageCount - a.usageCount;
    return 0;
  });

  const D = isDark ? {
    bg: "#0a0a0c", surface: "#111114", card: "#16161a", border: "#222228",
    borderHover: "#2e2e38", text: "#f2f2f7", muted: "#56566a", hint: "#2a2a36",
    accent: "#6c63f5", accentDim: "#1a1830", accentText: "#9d97f8",
    green: "#34d399", greenDim: "#061a10", greenText: "#6ee7b7",
    amber: "#f59e0b", amberDim: "#180f00", amberText: "#fcd34d",
    red: "#f87171", redDim: "#1a0606", redText: "#fca5a5",
    blue: "#60a5fa", blueDim: "#050f1e", blueText: "#93c5fd",
    input: "#0d0d10", btnBg: "#f2f2f7", btnText: "#0a0a0c",
    scrollbar: "#222230",
  } : {
    bg: "#f0eff8", surface: "#ffffff", card: "#ffffff", border: "#e2e0f0",
    borderHover: "#c5c2e0", text: "#0f0f1a", muted: "#6b6880", hint: "#c0bdd8",
    accent: "#5046e5", accentDim: "#eeecff", accentText: "#3d33b0",
    green: "#059669", greenDim: "#d1fae5", greenText: "#047857",
    amber: "#d97706", amberDim: "#fef3c7", amberText: "#b45309",
    red: "#dc2626", redDim: "#fee2e2", redText: "#b91c1c",
    blue: "#2563eb", blueDim: "#dbeafe", blueText: "#1d4ed8",
    input: "#faf9ff", btnBg: "#0f0f1a", btnText: "#f0eff8",
    scrollbar: "#d0ced8",
  };

  const statusColors = (s) => ({
    vip: { bg: D.amberDim, text: D.amberText, border: D.amber + "35" },
    free: { bg: D.blueDim, text: D.blueText, border: D.blue + "35" },
    revoked: { bg: D.redDim, text: D.redText, border: D.red + "35" },
    expired: { bg: isDark ? "#1a1200" : "#fef3c7", text: D.amberText, border: D.amber + "30" },
  }[s] || { bg: D.hint, text: D.muted, border: D.border });

  const statusLabel = (s) => ({ vip: "VIP", free: "FREE", revoked: "REVOKED", expired: "EXPIRED" }[s]);

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    ::-webkit-scrollbar{width:5px;height:5px}
    ::-webkit-scrollbar-track{background:transparent}
    ::-webkit-scrollbar-thumb{background:${D.scrollbar};border-radius:4px}
    input::placeholder{color:${D.hint}}
    select option{background:${D.card};color:${D.text}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    @keyframes slideIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
    @keyframes glow{0%,100%{box-shadow:0 0 12px ${D.accent}22}50%{box-shadow:0 0 22px ${D.accent}44}}
    .kv-card{transition:border-color .15s,background .15s}
    .kv-card:hover{border-color:${D.borderHover}!important}
    .kv-btn{transition:opacity .12s,transform .1s}
    .kv-btn:hover{opacity:.85}
    .kv-btn:active{transform:scale(.97)}
    .kv-tab{transition:all .15s}
    .kv-tab:hover{color:${D.text}!important}
    .kv-row{transition:background .12s,border-color .12s;cursor:pointer}
    .kv-row:hover{background:${isDark ? "#18181d" : "#f5f4fc"}!important}
    .kv-input{transition:border-color .15s,box-shadow .15s}
    .kv-input:focus{outline:none;border-color:${D.accent}!important;box-shadow:0 0 0 3px ${D.accent}18}
    .kv-input:hover{border-color:${D.borderHover}}
    .kv-segment{transition:all .15s}
    .kv-segment:hover{border-color:${D.accent}55!important;color:${D.accentText}!important}
    .kv-chevron{transition:transform .2s}
    .kv-expanded .kv-chevron{transform:rotate(180deg)}
  `;

  const inputStyle = {
    width: "100%", background: D.input, border: `1px solid ${D.border}`,
    borderRadius: 8, color: D.text, fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12, padding: "9px 12px", outline: "none", boxSizing: "border-box"
  };

  const selectStyle = {
    ...inputStyle, appearance: "none", cursor: "pointer",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='${encodeURIComponent(D.muted)}'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
    paddingRight: 30,
  };

  return (
    <div style={{ fontFamily: "'JetBrains Mono', monospace", background: D.bg, color: D.text, minHeight: "100vh", padding: "28px 18px" }}>
      <style>{css}</style>

      {/* ── TOAST ── */}
      {toast && (
        <div style={{ position: "fixed", top: 18, right: 18, zIndex: 9999, animation: "slideIn .2s ease",
          background: toast.type === "error" ? D.redDim : toast.type === "warn" ? D.amberDim : D.greenDim,
          border: `1px solid ${toast.type === "error" ? D.red + "40" : toast.type === "warn" ? D.amber + "40" : D.green + "40"}`,
          color: toast.type === "error" ? D.redText : toast.type === "warn" ? D.amberText : D.greenText,
          padding: "10px 16px", borderRadius: 10, fontSize: 12, fontWeight: 500,
          display: "flex", alignItems: "center", gap: 8, maxWidth: 300 }}>
          <span style={{ fontSize: 14 }}>{toast.type === "error" ? "✕" : toast.type === "warn" ? "⚠" : "✓"}</span>
          {toast.msg}
        </div>
      )}

      {/* ── DELETE MODAL ── */}
      {confirmDel && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,.65)",
          display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)" }}>
          <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, padding: 28,
            width: "min(380px, 92vw)", animation: "fadeUp .15s ease" }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: D.text, fontFamily: "'Syne', sans-serif" }}>Delete this key?</div>
            <div style={{ fontSize: 12, color: D.muted, marginBottom: 22, lineHeight: 1.6 }}>
              <span style={{ color: D.red }}>"{keys.find(k => k.id === confirmDel)?.label}"</span> will be permanently removed. This cannot be undone.
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="kv-btn" onClick={() => setConfirmDel(null)}
                style={{ padding: "8px 18px", borderRadius: 8, border: `1px solid ${D.border}`, background: "transparent", color: D.muted, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                Cancel
              </button>
              <button className="kv-btn" onClick={() => { setKeys(prev => prev.filter(k => k.id !== confirmDel)); setConfirmDel(null); if (expandedKey === confirmDel) setExpandedKey(null); notify("Key deleted", "warn"); }}
                style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: D.red, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Delete key
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 780, margin: "0 auto" }}>

        {/* ── HEADER ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: D.accentDim, border: `1px solid ${D.accent}40`,
                display: "flex", alignItems: "center", justifyContent: "center", animation: "glow 3s ease-in-out infinite" }}>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d="M13.5 2a4.5 4.5 0 0 1 4.5 4.5A4.5 4.5 0 0 1 13.5 11a4.5 4.5 0 0 1-4.24-3H2v3H0V8h1V5h8.26A4.5 4.5 0 0 1 13.5 2zm0 2a2.5 2.5 0 0 0-2.5 2.5A2.5 2.5 0 0 0 13.5 9 2.5 2.5 0 0 0 16 6.5 2.5 2.5 0 0 0 13.5 4z" fill={D.accent} />
                </svg>
              </div>
              <div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: D.text, letterSpacing: "-0.5px", lineHeight: 1.1 }}>
                  Key<span style={{ color: D.accent }}>Vault</span>
                </div>
                <div style={{ fontSize: 10, color: D.muted, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 2 }}>
                  API Key Management
                </div>
              </div>
            </div>
          </div>
          <button className="kv-btn" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
            style={{ width: 36, height: 36, borderRadius: 9, border: `1px solid ${D.border}`, background: D.surface,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>
            {isDark ? "☀️" : "🌙"}
          </button>
        </div>

        {/* ── STATS ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
          {[
            { label: "Total Keys", value: stats.total, color: D.text },
            { label: "Active", value: stats.active, color: D.green },
            { label: "Expired", value: stats.expired, color: D.amber },
            { label: "Revoked", value: stats.revoked, color: D.red },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color, fontVariantNumeric: "tabular-nums", lineHeight: 1, marginBottom: 5, fontFamily: "'Syne', sans-serif" }}>{value}</div>
              <div style={{ fontSize: 10, color: D.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* ── TABS ── */}
        <div style={{ display: "flex", gap: 3, background: D.surface, border: `1px solid ${D.border}`, borderRadius: 12, padding: 4, marginBottom: 18 }}>
          {[["generate", "✦ Generate"], ["validate", "⬡ Validate"], ["manage", "⊞ Manage"]].map(([id, lbl]) => (
            <button key={id} className="kv-tab" onClick={() => setTab(id)}
              style={{ flex: 1, padding: "9px 10px", borderRadius: 9, cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: tab === id ? 500 : 400,
                border: tab === id ? `1px solid ${D.border}` : "1px solid transparent",
                background: tab === id ? D.card : "transparent",
                color: tab === id ? D.text : D.muted, letterSpacing: "0.05em" }}>
              {lbl}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* GENERATE TAB */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab === "generate" && (
          <div style={{ animation: "fadeUp .2s ease" }}>
            <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22 }}>
                <div style={{ width: 5, height: 20, background: D.accent, borderRadius: 3 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: D.text, letterSpacing: "0.05em" }}>Generate New Key</span>
              </div>

              {/* Tier selector — big buttons */}
              <div style={{ marginBottom: 16 }}>
                <Label color={D.muted}>Tier</Label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[["free", "FREE", "Basic access, 1k combo/day"], ["vip", "VIP", "Premium, unlimited combos"]].map(([v, lbl, desc]) => {
                    const sc = statusColors(v);
                    const active = tier === v;
                    return (
                      <button key={v} className="kv-btn kv-segment" onClick={() => setTier(v)}
                        style={{ padding: "12px 14px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                          border: `1px solid ${active ? D.accent : D.border}`,
                          background: active ? D.accentDim : D.input }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>{lbl}</span>
                        </div>
                        <div style={{ fontSize: 11, color: active ? D.accentText : D.muted }}>{desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Format + Expiry */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                <div>
                  <Label color={D.muted}>Format</Label>
                  <select className="kv-input" value={format} onChange={e => setFormat(e.target.value)} style={selectStyle}>
                    {FORMAT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <Label color={D.muted}>Expiry</Label>
                  <select className="kv-input" value={expiryDays} onChange={e => setExpiryDays(Number(e.target.value))} style={selectStyle}>
                    {EXPIRY_OPTS.map(o => <option key={o.days} value={o.days}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Combo Limit */}
              <div style={{ marginBottom: 16 }}>
                <Label color={D.muted}>Combo Limit</Label>
                <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                  {RATE_PRESETS.map(v => {
                    const active = rateLimit === v && !customRate;
                    return (
                      <button key={v} className="kv-segment" onClick={() => { setRateLimit(v); setCustomRate(""); }}
                        style={{ flex: 1, padding: "9px 0", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 11,
                          border: `1px solid ${active ? D.accent : D.border}`,
                          background: active ? D.accentDim : D.input,
                          color: active ? D.accentText : D.muted, fontWeight: active ? 600 : 400, transition: "all .15s" }}>
                        {v === "unlimited" ? "∞ Unlimited" : `${Number(v).toLocaleString()}`}
                      </button>
                    );
                  })}
                </div>
                <input className="kv-input" type="number" min={1} value={customRate} onChange={e => setCustomRate(e.target.value)}
                  placeholder="Custom limit…" style={{ ...inputStyle, border: `1px solid ${customRate ? D.accent : D.border}` }} />
              </div>

              {/* Label */}
              <div style={{ marginBottom: 16 }}>
                <Label color={D.muted}>Label <span style={{ color: D.hint }}>(optional)</span></Label>
                <input className="kv-input" value={label} onChange={e => setLabel(e.target.value)}
                  placeholder="e.g. my-app-production" style={{ ...inputStyle, border: `1px solid ${D.border}` }} />
              </div>

              {/* Max Redemptions */}
              <div style={{ marginBottom: 20 }}>
                <Label color={D.muted}>Max Redemptions <span style={{ color: D.hint }}>(optional)</span></Label>
                <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                  {[...REDEEM_PRESETS, "∞"].map(v => {
                    const actual = v === "∞" ? "" : v;
                    const active = !customRedeem && maxRedemptions === actual;
                    return (
                      <button key={v} className="kv-segment" onClick={() => { setMaxRedemptions(actual); setCustomRedeem(""); }}
                        style={{ flex: 1, padding: "9px 0", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 11,
                          border: `1px solid ${active ? D.accent : D.border}`,
                          background: active ? D.accentDim : D.input,
                          color: active ? D.accentText : D.muted, fontWeight: active ? 600 : 400, transition: "all .15s" }}>
                        {v}
                      </button>
                    );
                  })}
                </div>
                <input className="kv-input" type="number" min={1} value={customRedeem} onChange={e => setCustomRedeem(e.target.value)}
                  placeholder="Custom limit… (empty = unlimited)" style={{ ...inputStyle, border: `1px solid ${customRedeem ? D.accent : D.border}` }} />
              </div>

              {/* Preview */}
              <div style={{ background: D.bg, border: `1px solid ${D.border}`, borderRadius: 10, padding: "10px 14px", marginBottom: 18,
                display: "flex", flexWrap: "wrap", gap: "8px 20px" }}>
                {[
                  ["Tier", <Chip key="t" label={tier.toUpperCase()} c={statusColors(tier)} />],
                  ["Format", <span key="f" style={{ fontSize: 11, color: D.accentText }}>{format.toUpperCase()}</span>],
                  ["Expires", <span key="e" style={{ fontSize: 11, color: D.muted }}>{expiryDays > 0 ? `in ${expiryDays}d` : "Never"}</span>],
                  ["Combo", <span key="r" style={{ fontSize: 11, color: D.muted }}>{(customRate || rateLimit) === "unlimited" ? "∞" : `${Number(customRate || rateLimit).toLocaleString()}/d`}</span>],
                  ["Redeems", <span key="rd" style={{ fontSize: 11, color: D.muted }}>{(customRedeem || maxRedemptions) ? `0 / ${Number(customRedeem || maxRedemptions).toLocaleString()}` : "∞"}</span>],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 10, color: D.hint, textTransform: "uppercase", letterSpacing: "0.08em" }}>{k}:</span>
                    {v}
                  </div>
                ))}
              </div>

              <button className="kv-btn" onClick={handleGenerate} disabled={loading}
                style={{ width: "100%", padding: "13px", background: loading ? D.hint : D.btnBg, color: D.btnText, border: "none",
                  borderRadius: 10, fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: loading ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8, letterSpacing: "0.05em" }}>
                {loading
                  ? <><Spinner color={D.btnText} /> Generating…</>
                  : "✦ Generate Key"}
              </button>

              {/* Generated result */}
              {generatedKey && (
                <div style={{ marginTop: 20, background: D.bg, border: `1px solid ${D.green}30`, borderRadius: 12, padding: 18, animation: "fadeUp .2s ease" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10, color: D.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Generated Key</span>
                      <Chip label={generatedKey.tier.toUpperCase()} c={statusColors(generatedKey.tier)} />
                    </div>
                    <span style={{ fontSize: 11, color: D.greenText }}>✓ Saved to vault</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: D.surface,
                    border: `1px solid ${D.border}`, borderRadius: 9, padding: "10px 12px", marginBottom: 12 }}>
                    <div style={{ flex: 1, fontSize: 11, color: D.greenText, wordBreak: "break-all", lineHeight: 1.6,
                      filter: showKeyVal ? "none" : "blur(5px)", userSelect: showKeyVal ? "text" : "none", transition: "filter .2s" }}>
                      {generatedKey.key}
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <IconBtn onClick={() => setShowKeyVal(s => !s)} title={showKeyVal ? "Hide" : "Show"} color={D.muted}>
                        {showKeyVal ? "🙈" : "👁"}
                      </IconBtn>
                      <IconBtn onClick={() => copyToClipboard(generatedKey.key, "gen")} color={copiedId === "gen" ? D.green : D.muted}>
                        {copiedId === "gen" ? "✓" : "⎘"}
                      </IconBtn>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 16, fontSize: 11, color: D.muted, flexWrap: "wrap" }}>
                    <span>Label: <b style={{ color: D.text }}>{generatedKey.label}</b></span>
                    <span>Combo: <b style={{ color: D.text }}>{generatedKey.rateLimit === "unlimited" ? "∞" : `${Number(generatedKey.rateLimit).toLocaleString()}/d`}</b></span>
                    <span>Expires: <b style={{ color: D.text }}>{fmtDate(generatedKey.expiresAt)}</b></span>
                    <span>Redeems: <b style={{ color: D.text }}>{generatedKey.maxRedemptions ? `0 / ${generatedKey.maxRedemptions}` : "∞"}</b></span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* VALIDATE TAB */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab === "validate" && (
          <div style={{ animation: "fadeUp .2s ease" }}>
            <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22 }}>
                <div style={{ width: 5, height: 20, background: D.accent, borderRadius: 3 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: D.text, letterSpacing: "0.05em" }}>Validate Key</span>
              </div>

              <div style={{ marginBottom: 14 }}>
                <Label color={D.muted}>Paste key to check</Label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input className="kv-input" value={validateInput}
                    onChange={e => { setValidateInput(e.target.value); setValidateResult(null); }}
                    placeholder="Enter key value…"
                    style={{ ...inputStyle, flex: 1, border: `1px solid ${D.border}` }} />
                  {validateInput && (
                    <button className="kv-btn" onClick={() => { setValidateInput(""); setValidateResult(null); }}
                      style={{ background: "none", border: `1px solid ${D.border}`, borderRadius: 8, padding: "0 12px", color: D.muted, cursor: "pointer", fontSize: 18, flexShrink: 0 }}>×</button>
                  )}
                </div>
              </div>

              <button className="kv-btn" onClick={handleValidate} disabled={loading || !validateInput.trim()}
                style={{ width: "100%", padding: 13, background: (!validateInput.trim() || loading) ? D.hint : D.btnBg,
                  color: D.btnText, border: "none", borderRadius: 10, fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                  cursor: (!validateInput.trim() || loading) ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {loading ? <><Spinner color={D.btnText} /> Checking…</> : "⬡ Validate Key"}
              </button>

              {validateResult && (
                <div style={{ marginTop: 20, animation: "fadeUp .15s ease",
                  background: validateResult.valid ? D.greenDim : D.redDim,
                  border: `1px solid ${validateResult.valid ? D.green + "35" : D.red + "35"}`,
                  borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: validateResult.valid ? D.greenText : D.redText, marginBottom: validateResult.valid ? 14 : 0, fontFamily: "'Syne', sans-serif" }}>
                    {validateResult.valid ? "✓ Valid Key" : `✕ ${validateResult.reason}`}
                  </div>
                  {validateResult.valid && validateResult.key && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      {[
                        ["Label", validateResult.key.label],
                        ["Tier", validateResult.key.tier?.toUpperCase()],
                        ["Combo Limit", validateResult.key.rateLimit === "unlimited" ? "Unlimited" : `${Number(validateResult.key.rateLimit).toLocaleString()}/day`],
                        ["Usage Count", validateResult.key.usageCount.toLocaleString()],
                        ["Redemptions", validateResult.key.maxRedemptions ? `${validateResult.key.redemptionCount} / ${validateResult.key.maxRedemptions}` : "∞ Unlimited"],
                        ["Created", fmtDate(validateResult.key.createdAt)],
                        ["Expires", fmtDate(validateResult.key.expiresAt)],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <div style={{ fontSize: 10, color: D.greenText + "80", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>{k}</div>
                          <div style={{ fontSize: 12, color: D.text }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Quick fill */}
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${D.border}` }}>
                <div style={{ fontSize: 10, color: D.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Quick test</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {keys.slice(0, 5).map(k => (
                    <button key={k.id} className="kv-btn"
                      onClick={() => { setValidateInput(k.key); setValidateResult(null); }}
                      style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, border: `1px solid ${D.border}`, background: "transparent", color: D.muted, cursor: "pointer", fontFamily: "inherit" }}>
                      {k.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* MANAGE TAB */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab === "manage" && (
          <div style={{ animation: "fadeUp .2s ease" }}>
            <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <div style={{ width: 5, height: 20, background: D.accent, borderRadius: 3 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: D.text, letterSpacing: "0.05em" }}>Manage Keys</span>
              </div>

              {/* Toolbar */}
              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                <input className="kv-input" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search label or key…"
                  style={{ ...inputStyle, flex: 1, minWidth: 150, border: `1px solid ${D.border}` }} />
                {[
                  { val: filterTier, set: setFilterTier, opts: [["all","All tiers"],["free","Free"],["vip","VIP"]] },
                  { val: filterStatus, set: setFilterStatus, opts: [["all","All status"],["active","Active"],["expired","Expired"],["revoked","Revoked"]] },
                  { val: sortBy, set: setSortBy, opts: [["newest","Newest"],["oldest","Oldest"],["label","Label A–Z"],["usage","Most used"]] },
                ].map((sel, i) => (
                  <select key={i} className="kv-input" value={sel.val} onChange={e => sel.set(e.target.value)} style={{ ...selectStyle, width: 120 }}>
                    {sel.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                ))}
              </div>

              <div style={{ fontSize: 10, color: D.muted, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {filtered.length} of {keys.length} key{keys.length !== 1 ? "s" : ""}
              </div>

              {filtered.length === 0 ? (
                <div style={{ textAlign: "center", padding: "44px 0", color: D.hint, fontSize: 12 }}>
                  No keys match your filters
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {filtered.map(k => {
                    const status = getKeyStatus(k);
                    const sc = statusColors(status);
                    const days = daysUntil(k.expiresAt);
                    const isActive = status === "free" || status === "vip";
                    const expiringSoon = isActive && days !== null && days <= 7;
                    const isExpanded = expandedKey === k.id;
                    const redemFull = k.maxRedemptions && k.redemptionCount >= k.maxRedemptions;

                    return (
                      <div key={k.id} className={`kv-row kv-card${isExpanded ? " kv-expanded" : ""}`}
                        style={{ background: D.bg, border: `1px solid ${expiringSoon ? D.amber + "50" : D.border}`, borderRadius: 10, overflow: "hidden" }}>
                        {/* Row header */}
                        <div onClick={() => setExpandedKey(isExpanded ? null : k.id)}
                          style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                          {/* Status dot */}
                          <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                            background: status === "revoked" ? D.red : status === "expired" ? D.amber : D.green,
                            animation: isActive ? "pulse 2.5s ease-in-out infinite" : "none" }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 13, fontWeight: 500, color: k.revoked ? D.muted : D.text }}>{k.label}</span>
                              <Chip label={statusLabel(status)} c={sc} />
                              {expiringSoon && <Chip label={`${days}d left`} c={{ bg: D.amberDim, text: D.amberText, border: D.amber + "35" }} />}
                              {redemFull && <Chip label="REDEEMS FULL" c={{ bg: D.redDim, text: D.redText, border: D.red + "35" }} />}
                            </div>
                            <div style={{ fontSize: 10, color: D.hint, fontFamily: "inherit" }}>
                              {k.key.length > 40 ? k.key.slice(0, 20) + "…" + k.key.slice(-10) : k.key}
                            </div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: 11, color: D.muted }}>{k.usageCount.toLocaleString()} uses</div>
                            <div style={{ fontSize: 10, color: redemFull ? D.redText : D.hint }}>
                              {k.maxRedemptions ? `${k.redemptionCount}/${k.maxRedemptions}` : "∞"} redeems
                            </div>
                            <div style={{ fontSize: 10, color: D.hint }}>{fmtDate(k.expiresAt)}</div>
                          </div>
                          <span className="kv-chevron" style={{ fontSize: 11, color: D.hint, marginLeft: 4 }}>▾</span>
                        </div>

                        {/* Expanded panel */}
                        {isExpanded && (
                          <div style={{ borderTop: `1px solid ${D.border}`, padding: 16, background: D.surface, animation: "slideIn .15s ease" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                              {[
                                ["Created", fmtDate(k.createdAt)],
                                ["Expires", fmtDate(k.expiresAt)],
                                ["Combo Limit", k.rateLimit === "unlimited" ? "Unlimited" : `${Number(k.rateLimit).toLocaleString()}/day`],
                                ["Redemptions", k.maxRedemptions ? `${k.redemptionCount} / ${k.maxRedemptions}` : "∞ Unlimited"],
                                ["Usage Count", k.usageCount.toLocaleString()],
                                ["Key ID", k.id.slice(0, 18) + "…"],
                                ...(k.revoked ? [["Revoked At", fmtDate(k.revokedAt ?? null)]] : []),
                              ].map(([lbl, val]) => (
                                <div key={lbl}>
                                  <div style={{ fontSize: 10, color: D.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>{lbl}</div>
                                  <div style={{ fontSize: 11, color: D.text, wordBreak: "break-all" }}>{val}</div>
                                </div>
                              ))}

                              {/* Threads editor */}
                              <div style={{ gridColumn: "1/-1" }}>
                                <div style={{ fontSize: 10, color: D.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Threads</div>
                                <div style={{ display: "flex", gap: 5, marginBottom: 6 }}>
                                  {THREAD_PRESETS.map(v => {
                                    const active = (k.threads ?? 1) === v;
                                    return (
                                      <button key={v} className="kv-segment" onClick={() => { setKeys(prev => prev.map(kk => kk.id === k.id ? { ...kk, threads: v } : kk)); notify(`Threads → ${v}`); }}
                                        style={{ flex: 1, padding: "7px 0", borderRadius: 7, border: `1px solid ${active ? D.accent : D.border}`, background: active ? D.accentDim : D.input, color: active ? D.accentText : D.muted, fontSize: 11, fontFamily: "inherit", cursor: "pointer", fontWeight: active ? 600 : 400, transition: "all .15s" }}>
                                        {v}
                                      </button>
                                    );
                                  })}
                                </div>
                                <input type="number" min={1} max={512} defaultValue={![1,2,4,8,16,32].includes(k.threads ?? 1) ? k.threads : ""}
                                  onChange={e => { const v = Number(e.target.value); if (v > 0) setKeys(prev => prev.map(kk => kk.id === k.id ? { ...kk, threads: v } : kk)); }}
                                  placeholder={`Custom (current: ${k.threads ?? 1})`}
                                  style={{ ...inputStyle, border: `1px solid ${D.border}` }} className="kv-input" />
                              </div>
                            </div>

                            {/* Full key */}
                            <div style={{ background: D.bg, border: `1px solid ${D.border}`, borderRadius: 8, padding: "8px 12px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ flex: 1, fontSize: 10, color: D.muted, wordBreak: "break-all", lineHeight: 1.6 }}>{k.key}</div>
                              <IconBtn onClick={() => copyToClipboard(k.key, k.id)} color={copiedId === k.id ? D.green : D.muted}>
                                {copiedId === k.id ? "✓" : "⎘"}
                              </IconBtn>
                            </div>

                            {/* Actions */}
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              {!k.revoked && (
                                <button className="kv-btn" onClick={() => { setKeys(prev => prev.map(kk => kk.id === k.id ? { ...kk, revoked: true, revokedAt: Date.now() } : kk)); notify("Key revoked", "warn"); }}
                                  style={{ fontSize: 11, padding: "7px 16px", borderRadius: 8, border: `1px solid ${D.amber}40`, background: D.amberDim, color: D.amberText, cursor: "pointer", fontFamily: "inherit" }}>
                                  Revoke
                                </button>
                              )}
                              {k.revoked && (
                                <button className="kv-btn" onClick={() => { setKeys(prev => prev.map(kk => kk.id === k.id ? { ...kk, revoked: false, revokedAt: undefined } : kk)); notify("Key restored"); }}
                                  style={{ fontSize: 11, padding: "7px 16px", borderRadius: 8, border: `1px solid ${D.green}40`, background: D.greenDim, color: D.greenText, cursor: "pointer", fontFamily: "inherit" }}>
                                  Restore
                                </button>
                              )}
                              <button className="kv-btn" onClick={() => setConfirmDel(k.id)}
                                style={{ fontSize: 11, padding: "7px 16px", borderRadius: 8, border: `1px solid ${D.red}35`, background: D.redDim, color: D.redText, cursor: "pointer", fontFamily: "inherit" }}>
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── FOOTER ── */}
        <div style={{ marginTop: 28, textAlign: "center", fontSize: 10, color: D.hint, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          KeyVault · {keys.length} keys · All data stored locally
        </div>
      </div>
    </div>
  );
}

// ─── MINI COMPONENTS ─────────────────────────────────────────────────────────
function Label({ children, color }) {
  return <div style={{ fontSize: 10, color, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{children}</div>;
}

function Chip({ label, c }) {
  return (
    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", padding: "2px 7px", borderRadius: 20,
      background: c.bg, color: c.text, border: `1px solid ${c.border}`, fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

function IconBtn({ onClick, color, children, title }) {
  return (
    <button onClick={onClick} title={title}
      style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 6, color, fontSize: 13, lineHeight: 1 }}>
      {children}
    </button>
  );
}

function Spinner({ color }) {
  return (
    <span style={{ display: "inline-block", width: 13, height: 13,
      border: `2px solid ${color}35`, borderTopColor: color, borderRadius: "50%",
      animation: "spin .7s linear infinite" }} />
  );
}
