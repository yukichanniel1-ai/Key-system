import { useState, useCallback, useEffect } from "react";
import type { ApiKey, KeyTier, KeyFormat } from "../lib/types";

// ─── CRYPTO HELPERS ───────────────────────────────────────────────────────────
function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
function hexRand(n: number): string {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}
function alphaRand(n: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}
function generateKeyValue(format: string, tier: string): string {
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

// ─── INITIAL SEED DATA ────────────────────────────────────────────────────────
function buildSeed(): ApiKey[] {
  const now = Date.now();
  return [
    { id: uuidv4(), key: "vip_ab3fxyz1_mn7pqrs2", label: "mobile-app-prod", tier: "vip", rateLimit: "5000", threads: 16, createdAt: now - 86400000 * 10, expiresAt: now + 86400000 * 20, revoked: false, usageCount: 1482, maxRedemptions: 100, redemptionCount: 67 },
    { id: uuidv4(), key: hexRand(32), label: "analytics-service", tier: "vip", rateLimit: "unlimited", threads: 32, createdAt: now - 86400000 * 30, expiresAt: now + 86400000 * 335, revoked: false, usageCount: 58210, maxRedemptions: null, redemptionCount: 0 },
    { id: uuidv4(), key: uuidv4(), label: "sandbox-testing", tier: "free", rateLimit: "1000", threads: 2, createdAt: now - 86400000 * 5, expiresAt: now + 86400000 * 2, revoked: false, usageCount: 44, maxRedemptions: 10, redemptionCount: 10 },
    { id: uuidv4(), key: alphaRand(24), label: "legacy-webhook", tier: "free", rateLimit: "1000", threads: 4, createdAt: now - 86400000 * 90, expiresAt: now - 86400000 * 1, revoked: false, usageCount: 9320, maxRedemptions: 50, redemptionCount: 50 },
    { id: uuidv4(), key: "vip_" + alphaRand(8) + "_" + alphaRand(8), label: "ci-pipeline", tier: "vip", rateLimit: "unlimited", threads: 8, createdAt: now - 86400000 * 60, expiresAt: null, revoked: true, revokedAt: now - 86400000 * 3, usageCount: 301, maxRedemptions: null, redemptionCount: 0 },
  ];
}

// ─── THEME ────────────────────────────────────────────────────────────────────
const THEMES = {
  dark: {
    bg: "#0c0c0e",
    surface: "#131316",
    card: "#18181c",
    border: "#2a2a32",
    borderHover: "#3a3a46",
    text: "#f0f0f5",
    muted: "#5a5a70",
    hint: "#3a3a48",
    accent: "#7c6ff7",
    accentBg: "#1c1a3a",
    accentText: "#a89ef9",
    green: "#4ade80",
    greenBg: "#0a1f10",
    greenText: "#86efac",
    amber: "#fbbf24",
    amberBg: "#1a1200",
    amberText: "#fcd34d",
    red: "#f87171",
    redBg: "#1a0808",
    redText: "#fca5a5",
    blue: "#60a5fa",
    blueBg: "#071325",
    blueText: "#93c5fd",
    btnBg: "#f0f0f5",
    btnText: "#0c0c0e",
    input: "#0f0f12",
    scrollThumb: "#2a2a3a",
  },
  light: {
    bg: "#f5f5f8",
    surface: "#ffffff",
    card: "#ffffff",
    border: "#e0e0eb",
    borderHover: "#c0c0d8",
    text: "#131318",
    muted: "#6b6b85",
    hint: "#c8c8dc",
    accent: "#6053e8",
    accentBg: "#eeecff",
    accentText: "#4a3fc4",
    green: "#16a34a",
    greenBg: "#dcfce7",
    greenText: "#15803d",
    amber: "#d97706",
    amberBg: "#fef3c7",
    amberText: "#b45309",
    red: "#dc2626",
    redBg: "#fee2e2",
    redText: "#b91c1c",
    blue: "#2563eb",
    blueBg: "#dbeafe",
    blueText: "#1d4ed8",
    btnBg: "#131318",
    btnText: "#f5f5f8",
    input: "#fafafa",
    scrollThumb: "#d0d0e0",
  },
};

// ─── TIER CONFIG ──────────────────────────────────────────────────────────────
const TIER_CFG = {
  free: { label: "FREE", color: (t: Theme) => ({ bg: t.blueBg, text: t.blueText, border: t.blue + "40" }) },
  vip: { label: "VIP", color: (t: Theme) => ({ bg: t.amberBg, text: t.amberText, border: t.amber + "40" }) },
};

const COMBO_LIMIT_PRESETS = ["1000", "5000", "unlimited"];
const EXPIRY_OPTS = [{ label: "7 days", days: 7 }, { label: "30 days", days: 30 }, { label: "90 days", days: 90 }, { label: "1 year", days: 365 }, { label: "Never", days: 0 }];

// ─── COMPONENT PROP TYPES ─────────────────────────────────────────────────────
type Theme = typeof THEMES.dark;

interface BadgeProps { label: string; bg: string; text: string; border: string; }
interface KeyStatusBadgeProps { k: Pick<ApiKey, "revoked" | "expiresAt" | "tier">; T: Theme; }
interface CopyBtnProps { value: string; T: Theme; }
interface StatCardProps { label: string; value: number; color?: string; T: Theme; }
interface InputProps { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; style?: React.CSSProperties; }
interface SelectOption { value: string | number; label: string; }
interface SelectProps { value: string | number; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; options: SelectOption[]; style?: React.CSSProperties; }

// ─── COMPONENTS ───────────────────────────────────────────────────────────────
function Badge({ label, bg, text, border }: BadgeProps) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", padding: "2px 8px", borderRadius: 20, background: bg, color: text, border: `0.5px solid ${border}`, fontFamily: "var(--font-mono, monospace)", whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

function KeyStatusBadge({ k, T }: KeyStatusBadgeProps) {
  const now = Date.now();
  if (k.revoked) return <Badge label="REVOKED" bg={T.redBg} text={T.redText} border={T.red + "40"} />;
  if (k.expiresAt && now > k.expiresAt) return <Badge label="EXPIRED" bg={T.amberBg} text={T.amberText} border={T.amber + "40"} />;
  const cfg = TIER_CFG[k.tier];
  const c = cfg.color(T);
  return <Badge label={cfg.label} bg={c.bg} text={c.text} border={c.border} />;
}

function CopyBtn({ value, T }: CopyBtnProps) {
  const [state, setState] = useState("idle");
  function copy() {
    navigator.clipboard.writeText(value).then(() => { setState("ok"); setTimeout(() => setState("idle"), 2000); });
  }
  return (
    <button onClick={copy} title="Copy" style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 6, color: state === "ok" ? T.green : T.muted, fontSize: 13, transition: "color 0.15s", lineHeight: 1 }}>
      {state === "ok" ? "✓" : "⎘"}
    </button>
  );
}

function StatCard({ label, value, color, T }: StatCardProps) {
  return (
    <div style={{ background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 12, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || T.text, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
    </div>
  );
}

function Input({ value, onChange, placeholder, style = {} }: InputProps) {
  return (
    <input value={value} onChange={onChange} placeholder={placeholder}
      style={{ width: "100%", background: "var(--inp)", border: "0.5px solid var(--bord)", borderRadius: 8, color: "var(--text)", fontFamily: "inherit", fontSize: 13, padding: "9px 12px", outline: "none", transition: "border-color 0.15s", boxSizing: "border-box", ...style }}
      onFocus={e => e.target.style.borderColor = "var(--accent)"}
      onBlur={e => e.target.style.borderColor = "var(--bord)"}
    />
  );
}

function Select({ value, onChange, options, style = {} }: SelectProps) {
  return (
    <select value={value} onChange={onChange}
      style={{ width: "100%", background: "var(--inp)", border: "0.5px solid var(--bord)", borderRadius: 8, color: "var(--text)", fontFamily: "inherit", fontSize: 13, padding: "9px 12px", outline: "none", transition: "border-color 0.15s", appearance: "none", cursor: "pointer", boxSizing: "border-box", ...style }}
      onFocus={e => e.target.style.borderColor = "var(--accent)"}
      onBlur={e => e.target.style.borderColor = "var(--bord)"}
    >
      {options.map(o => <option key={o.value} value={o.value} style={{ background: "var(--card)" }}>{o.label}</option>)}
    </select>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [theme, setTheme] = useState<keyof typeof THEMES>("dark");
  const [tab, setTab] = useState("generate");
  const [keys, setKeys] = useState<ApiKey[]>(() => {
    if (typeof window === "undefined") return buildSeed();
    try {
      const stored = localStorage.getItem("keyvault:keys");
      if (stored !== null) return JSON.parse(stored) as ApiKey[];
      // First visit: seed and mark as seeded
      const seed = buildSeed();
      localStorage.setItem("keyvault:keys", JSON.stringify(seed));
      localStorage.setItem("keyvault:seeded", "1");
      return seed;
    } catch {}
    return buildSeed();
  });
  useEffect(() => {
    try { localStorage.setItem("keyvault:keys", JSON.stringify(keys)); } catch {}
  }, [keys]);

  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ msg: string; type: string } | null>(null);
  const [generatedKey, setGeneratedKey] = useState<ApiKey | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [search, setSearch] = useState("");
  const [filterTier, setFilterTier] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [validateInput, setValidateInput] = useState("");
  const [validateResult, setValidateResult] = useState<{ valid: boolean; reason?: string; key?: ApiKey } | null>(null);
  const [tier, setTier] = useState<KeyTier>("free");
  const [format, setFormat] = useState<KeyFormat>("prefix");
  const [editingThreads, setEditingThreads] = useState<string | null>(null);
  const [editThreadsCustom, setEditThreadsCustom] = useState("");
  const [expiryDays, setExpiryDays] = useState(30);
  const [rateLimit, setRateLimit] = useState("1000");
  const [comboLimitCustom, setComboLimitCustom] = useState("");
  const [label, setLabel] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState<string>("");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const T = THEMES[theme];

  const notify = useCallback((msg: string, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
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
    setTimeout(() => {
      const id = uuidv4();
      const keyValue = generateKeyValue(format, tier);
      const now = Date.now();
      const newKey: ApiKey = {
        id, key: keyValue, label: label.trim() || `${tier}-key-${Date.now().toString(36).slice(-4)}`,
        tier, rateLimit, threads: 1, createdAt: now,
        expiresAt: expiryDays > 0 ? now + expiryDays * 86400000 : null,
        revoked: false, usageCount: 0,
        maxRedemptions: maxRedemptions !== "" && Number(maxRedemptions) > 0 ? Number(maxRedemptions) : null,
        redemptionCount: 0,
      };
      setKeys(prev => [newKey, ...prev]);
      setGeneratedKey(newKey);
      setShowKey(false);
      setLabel("");
      setLoading(false);
      notify("Key generated successfully!");
    }, 600);
  }

  function handleValidate() {
    if (!validateInput.trim()) return;
    setLoading(true);
    setTimeout(() => {
      const found = keys.find(k => k.key === validateInput.trim());
      if (!found) { setValidateResult({ valid: false, reason: "Key not found" }); }
      else if (found.revoked) { setValidateResult({ valid: false, reason: "Key has been revoked", key: found }); }
      else if (found.expiresAt && Date.now() > found.expiresAt) { setValidateResult({ valid: false, reason: "Key has expired", key: found }); }
      else {
        setKeys(prev => prev.map(k => k.id === found.id ? { ...k, usageCount: k.usageCount + 1 } : k));
        setValidateResult({ valid: true, key: found });
      }
      setLoading(false);
    }, 400);
  }

  function handleRevoke(id: string) {
    setKeys(prev => prev.map(k => k.id === id ? { ...k, revoked: true, revokedAt: Date.now() } : k));
    notify("Key revoked");
  }

  function handleDelete(id: string) {
    setKeys(prev => prev.filter(k => k.id !== id));
    setConfirmDelete(null);
    if (expandedKey === id) setExpandedKey(null);
    notify("Key deleted", "warning");
  }

  function handleUnrevoke(id: string) {
    setKeys(prev => prev.map(k => k.id === id ? { ...k, revoked: false, revokedAt: undefined } : k));
    notify("Key restored");
  }

  const now = Date.now();
  let filtered = keys.filter(k => {
    const matchSearch = !search || k.label.toLowerCase().includes(search.toLowerCase()) || k.key.toLowerCase().includes(search.toLowerCase());
    const matchTier = filterTier === "all" || k.tier === filterTier;
    const isExpired = k.expiresAt && now > k.expiresAt;
    const isActive = !k.revoked && !isExpired;
    const matchStatus = filterStatus === "all" || (filterStatus === "active" && isActive) || (filterStatus === "revoked" && k.revoked) || (filterStatus === "expired" && isExpired);
    return matchSearch && matchTier && matchStatus;
  });

  filtered = [...filtered].sort((a, b) => {
    if (sortBy === "newest") return b.createdAt - a.createdAt;
    if (sortBy === "oldest") return a.createdAt - b.createdAt;
    if (sortBy === "label") return a.label.localeCompare(b.label);
    if (sortBy === "usage") return b.usageCount - a.usageCount;
    return 0;
  });

  function daysUntil(ts: number | null): number | null {
    if (!ts) return null;
    const d = Math.ceil((ts - now) / 86400000);
    return d;
  }

  function fmtDate(ts: number | null): string {
    if (!ts) return "Never";
    return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  const cssVars = {
    "--bg": T.bg, "--surf": T.surface, "--card": T.card, "--bord": T.border,
    "--text": T.text, "--muted": T.muted, "--accent": T.accent,
    "--acc-bg": T.accentBg, "--acc-text": T.accentText,
    "--inp": T.input, "--btn-bg": T.btnBg, "--btn-text": T.btnText,
    fontFamily: "'DM Mono', 'JetBrains Mono', 'Fira Code', monospace",
    background: T.bg, color: T.text, minHeight: "100vh", padding: "24px 16px",
  };

  return (
    <div style={cssVars}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.scrollThumb}; border-radius: 3px; }
        input::placeholder, textarea::placeholder { color: ${T.hint}; }
        select option { background: ${T.card}; color: ${T.text}; }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        .key-row { transition: background 0.15s; }
        .key-row:hover { background: ${T.surface} !important; }
        .tab-btn { transition: all 0.15s; }
        .tab-btn:hover { color: ${T.text} !important; }
        .action-btn { transition: all 0.15s; }
        .action-btn:hover { opacity: 0.8; }
      `}</style>

      {/* Notification */}
      {notification && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, animation: "slideDown 0.2s ease", background: notification.type === "warning" ? T.amberBg : T.greenBg, border: `0.5px solid ${notification.type === "warning" ? T.amber + "60" : T.green + "60"}`, color: notification.type === "warning" ? T.amberText : T.greenText, padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
          <span>{notification.type === "warning" ? "⚠" : "✓"}</span> {notification.msg}
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 14, padding: 28, width: "min(400px, 90vw)", animation: "fadeIn 0.15s ease" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 8 }}>Delete key?</div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 20 }}>
              This will permanently delete <span style={{ color: T.red }}>"{keys.find(k => k.id === confirmDelete)?.label}"</span>. This cannot be undone.
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="action-btn" onClick={() => setConfirmDelete(null)} style={{ padding: "8px 18px", borderRadius: 8, border: `0.5px solid ${T.border}`, background: "transparent", color: T.muted, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button className="action-btn" onClick={() => handleDelete(confirmDelete)} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: T.red, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 760, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: T.accentBg, border: `0.5px solid ${T.accent}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M11 2a3 3 0 0 1 3 3 3 3 0 0 1-3 3 3 3 0 0 1-2.83-2H2v2H0V6H1V4H8.17A3 3 0 0 1 11 2zm0 2a1 1 0 0 0-1 1 1 1 0 0 0 1 1 1 1 0 0 0 1-1 1 1 0 0 0-1-1z" fill={T.accent} /></svg>
              </div>
              <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: T.text, letterSpacing: "-0.5px" }}>KeyVault</span>
            </div>
            <div style={{ fontSize: 11, color: T.muted, letterSpacing: "0.05em" }}>API key management system</div>
          </div>
          <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
            style={{ width: 36, height: 36, borderRadius: 8, border: `0.5px solid ${T.border}`, background: T.surface, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, transition: "all 0.15s" }}>
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
          <StatCard label="Total Keys" value={stats.total} T={T} />
          <StatCard label="Active" value={stats.active} color={T.green} T={T} />
          <StatCard label="Expired" value={stats.expired} color={T.amber} T={T} />
          <StatCard label="Revoked" value={stats.revoked} color={T.red} T={T} />
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 12, padding: 4, marginBottom: 20 }}>
          {[["generate", "✦ Generate"], ["validate", "⬡ Validate"], ["manage", "⊞ Manage"]].map(([id, label]) => (
            <button key={id} className="tab-btn" onClick={() => setTab(id)}
              style={{ flex: 1, padding: "9px 12px", borderRadius: 9, border: tab === id ? `0.5px solid ${T.border}` : "none", background: tab === id ? T.card : "transparent", color: tab === id ? T.text : T.muted, fontSize: 12, fontFamily: "inherit", cursor: "pointer", fontWeight: tab === id ? 500 : 400, letterSpacing: "0.03em" }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── GENERATE TAB ── */}
        {tab === "generate" && (
          <div style={{ animation: "fadeIn 0.2s ease" }}>
            <div style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: T.text, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: T.accent }}>✦</span> Generate New Key
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
                {[
                  { lbl: "Tier", el: <Select value={tier} onChange={e => setTier(e.target.value as KeyTier)} options={[{ value: "free", label: "Free" }, { value: "vip", label: "VIP" }]} /> },
                  { lbl: "Format", el: <Select value={format} onChange={e => setFormat(e.target.value as KeyFormat)} options={[{ value: "uuid", label: "UUID v4" }, { value: "hex", label: "HEX-32" }, { value: "alphanum", label: "ALPHANUM-24" }, { value: "prefix", label: "PREFIX-KEY" }]} /> },
                  { lbl: "Expiry", el: <Select value={expiryDays} onChange={e => setExpiryDays(Number(e.target.value))} options={EXPIRY_OPTS.map(o => ({ value: o.days, label: o.label }))} /> },
                ].map(({ lbl, el }) => (
                  <div key={lbl}>
                    <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{lbl}</div>
                    {el}
                  </div>
                ))}
              </div>


              {/* Combo Limit — full width */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Combo Limit</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    {COMBO_LIMIT_PRESETS.map(v => (
                      <button key={v} type="button"
                        onClick={() => { setRateLimit(v); setComboLimitCustom(""); }}
                        style={{ flex: 1, padding: "9px 0", borderRadius: 7, border: `0.5px solid ${rateLimit === v && !comboLimitCustom ? T.accent : T.border}`, background: rateLimit === v && !comboLimitCustom ? T.accentBg : "var(--inp)", color: rateLimit === v && !comboLimitCustom ? T.accentText : T.muted, fontSize: 12, fontFamily: "inherit", cursor: "pointer", fontWeight: rateLimit === v && !comboLimitCustom ? 600 : 400, transition: "all 0.15s" }}>
                        {v === "unlimited" ? "∞ Unlimited" : `${Number(v).toLocaleString()} lines`}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={comboLimitCustom}
                    onChange={e => { setComboLimitCustom(e.target.value); if (e.target.value) setRateLimit(e.target.value); }}
                    placeholder="Custom combo limit (e.g. 2500)..."
                    style={{ width: "100%", background: "var(--inp)", border: `0.5px solid ${comboLimitCustom ? T.accent : T.border}`, borderRadius: 8, color: "var(--text)", fontFamily: "inherit", fontSize: 13, padding: "9px 12px", outline: "none", boxSizing: "border-box" as const, transition: "border-color 0.15s" }}
                    onFocus={e => e.target.style.borderColor = T.accent}
                    onBlur={e => e.target.style.borderColor = comboLimitCustom ? T.accent : "var(--bord)"}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Label (optional)</div>
                <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. my-app-production" />
              </div>

              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Max Redemptions (optional)</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {["1", "5", "10", "50", "100"].map(v => (
                    <button key={v} type="button"
                      onClick={() => setMaxRedemptions(maxRedemptions === v ? "" : v)}
                      style={{ flex: 1, padding: "9px 0", borderRadius: 7, border: `0.5px solid ${maxRedemptions === v ? T.accent : T.border}`, background: maxRedemptions === v ? T.accentBg : "var(--inp)", color: maxRedemptions === v ? T.accentText : T.muted, fontSize: 12, fontFamily: "inherit", cursor: "pointer", fontWeight: maxRedemptions === v ? 600 : 400, transition: "all 0.15s" }}>
                      {v}
                    </button>
                  ))}
                  <button type="button"
                    onClick={() => setMaxRedemptions("")}
                    style={{ flex: 1, padding: "9px 0", borderRadius: 7, border: `0.5px solid ${maxRedemptions === "" ? T.accent : T.border}`, background: maxRedemptions === "" ? T.accentBg : "var(--inp)", color: maxRedemptions === "" ? T.accentText : T.muted, fontSize: 12, fontFamily: "inherit", cursor: "pointer", fontWeight: maxRedemptions === "" ? 600 : 400, transition: "all 0.15s" }}>
                    ∞
                  </button>
                </div>
                <input
                  type="number"
                  min={1}
                  value={maxRedemptions}
                  onChange={e => setMaxRedemptions(e.target.value)}
                  placeholder="Custom limit (e.g. 25)... leave empty for unlimited"
                  style={{ marginTop: 6, width: "100%", background: "var(--inp)", border: `0.5px solid ${maxRedemptions ? T.accent : T.border}`, borderRadius: 8, color: "var(--text)", fontFamily: "inherit", fontSize: 13, padding: "9px 12px", outline: "none", boxSizing: "border-box" as const, transition: "border-color 0.15s" }}
                  onFocus={e => e.target.style.borderColor = T.accent}
                  onBlur={e => e.target.style.borderColor = maxRedemptions ? T.accent : "var(--bord)"}
                />
              </div>

              {/* Preview strip */}
              <div style={{ background: T.bg, border: `0.5px solid ${T.border}`, borderRadius: 8, padding: "10px 14px", marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {([
                    ["Tier", <KeyStatusBadge key="t" k={{ tier, revoked: false, expiresAt: null }} T={T} />],
                    ["Format", <span key="f" style={{ fontSize: 11, color: T.accentText }}>{format.toUpperCase()}</span>],
                    ["Expires", <span key="e" style={{ fontSize: 11, color: T.muted }}>{expiryDays > 0 ? `in ${expiryDays}d` : "Never"}</span>],
                    ["Combo", <span key="r" style={{ fontSize: 11, color: T.muted }}>{rateLimit === "unlimited" ? "∞" : `${Number(rateLimit).toLocaleString()}/d`}</span>],
                    ["Redeems", <span key="rd" style={{ fontSize: 11, color: T.muted }}>{maxRedemptions ? `0 / ${Number(maxRedemptions).toLocaleString()}` : "∞"}</span>],
                  ] as [string, React.ReactNode][]).map(([k, v]) => (
                    <div key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 10, color: T.muted }}>{k}:</span>{v}
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={handleGenerate} disabled={loading}
                style={{ width: "100%", padding: "12px", background: loading ? T.hint : T.btnBg, color: T.btnText, border: "none", borderRadius: 9, fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "opacity 0.15s" }}>
                {loading ? <><span style={{ display: "inline-block", width: 14, height: 14, border: `2px solid ${T.btnText}40`, borderTopColor: T.btnText, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />Generating...</> : "✦ Generate Key"}
              </button>

              {generatedKey && (
                <div style={{ marginTop: 20, background: T.bg, border: `0.5px solid ${T.green}40`, borderRadius: 12, padding: 18, animation: "fadeIn 0.2s ease" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>New Key</span>
                      <KeyStatusBadge k={generatedKey} T={T} />
                    </div>
                    <span style={{ fontSize: 11, color: T.greenText }}>✓ Saved</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
                    <div style={{ flex: 1, fontSize: 12, color: T.greenText, wordBreak: "break-all", lineHeight: 1.5, fontFamily: "inherit", filter: showKey ? "none" : "blur(5px)", userSelect: showKey ? "text" : "none", transition: "filter 0.2s" }}>
                      {generatedKey.key}
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <button onClick={() => setShowKey(s => !s)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 6, color: T.muted, fontSize: 12 }}>{showKey ? "🙈" : "👁"}</button>
                      <CopyBtn value={generatedKey.key} T={T} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 16, fontSize: 11, color: T.muted, flexWrap: "wrap" }}>
                    <span>Label: <b style={{ color: T.text }}>{generatedKey.label}</b></span>
                    <span>Combo: <b style={{ color: T.text }}>{generatedKey.rateLimit === "unlimited" ? "∞" : `${Number(generatedKey.rateLimit).toLocaleString()}/d`}</b></span>
                    <span>Expires: <b style={{ color: T.text }}>{fmtDate(generatedKey.expiresAt)}</b></span>
                    <span>Redeems: <b style={{ color: T.text }}>{generatedKey.maxRedemptions ? `0 / ${generatedKey.maxRedemptions.toLocaleString()}` : "∞ Unlimited"}</b></span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── VALIDATE TAB ── */}
        {tab === "validate" && (
          <div style={{ animation: "fadeIn 0.2s ease" }}>
            <div style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: T.text, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: T.accent }}>⬡</span> Validate Key
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Paste key to validate</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Input value={validateInput} onChange={e => { setValidateInput(e.target.value); setValidateResult(null); }} placeholder="Enter key value..." style={{ flex: 1 }} />
                  {validateInput && <button onClick={() => { setValidateInput(""); setValidateResult(null); }} style={{ background: "none", border: `0.5px solid ${T.border}`, borderRadius: 8, padding: "0 12px", color: T.muted, cursor: "pointer", fontSize: 16, flexShrink: 0 }}>×</button>}
                </div>
              </div>

              <button onClick={handleValidate} disabled={loading || !validateInput.trim()}
                style={{ width: "100%", padding: 12, background: (!validateInput.trim() || loading) ? T.hint : T.btnBg, color: T.btnText, border: "none", borderRadius: 9, fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: (!validateInput.trim() || loading) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {loading ? <><span style={{ display: "inline-block", width: 14, height: 14, border: `2px solid ${T.btnText}40`, borderTopColor: T.btnText, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />Checking...</> : "⬡ Validate Key"}
              </button>

              {validateResult && (
                <div style={{ marginTop: 20, background: validateResult.valid ? T.greenBg : T.redBg, border: `0.5px solid ${validateResult.valid ? T.green + "40" : T.red + "40"}`, borderRadius: 12, padding: 18, animation: "fadeIn 0.15s ease" }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: validateResult.valid ? T.greenText : T.redText, marginBottom: validateResult.valid ? 12 : 0 }}>
                    {validateResult.valid ? "✓ Valid Key" : `✗ ${validateResult.reason}`}
                  </div>
                  {validateResult.valid && validateResult.key && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {[["Label", validateResult.key.label], ["Tier", validateResult.key.tier?.toUpperCase()], ["Combo Limit", validateResult.key.rateLimit === "unlimited" ? "Unlimited" : `${Number(validateResult.key.rateLimit).toLocaleString()}/day`], ["Threads", String((validateResult.key as ApiKey).threads ?? 1)], ["Usage Count", validateResult.key.usageCount.toLocaleString()], ["Redemptions", validateResult.key.maxRedemptions ? `${validateResult.key.redemptionCount} / ${validateResult.key.maxRedemptions}` : "∞ Unlimited"], ["Created", fmtDate(validateResult.key.createdAt)], ["Expires", fmtDate(validateResult.key.expiresAt)]].map(([k, v]) => (
                        <div key={k}>
                          <div style={{ fontSize: 10, color: T.greenText + "99", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>{k}</div>
                          <div style={{ fontSize: 12, color: T.text }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Quick fill buttons */}
              <div style={{ marginTop: 18, paddingTop: 16, borderTop: `0.5px solid ${T.border}` }}>
                <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Quick test with an existing key</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {keys.slice(0, 4).map(k => (
                    <button key={k.id} onClick={() => { setValidateInput(k.key); setValidateResult(null); }}
                      style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, border: `0.5px solid ${T.border}`, background: "transparent", color: T.muted, cursor: "pointer", fontFamily: "inherit", transition: "all 0.1s" }}>
                      {k.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── MANAGE TAB ── */}
        {tab === "manage" && (
          <div style={{ animation: "fadeIn 0.2s ease" }}>
            <div style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 14, padding: 24 }}>
              {/* Toolbar */}
              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search label or key..." />
                </div>
                <Select value={filterTier} onChange={e => setFilterTier(e.target.value)} style={{ width: 120 }} options={[{ value: "all", label: "All tiers" }, { value: "free", label: "Free" }, { value: "vip", label: "VIP" }]} />
                <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 120 }} options={[{ value: "all", label: "All status" }, { value: "active", label: "Active" }, { value: "expired", label: "Expired" }, { value: "revoked", label: "Revoked" }]} />
                <Select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: 120 }} options={[{ value: "newest", label: "Newest" }, { value: "oldest", label: "Oldest" }, { value: "label", label: "Label A-Z" }, { value: "usage", label: "Most used" }]} />
              </div>

              <div style={{ fontSize: 11, color: T.muted, marginBottom: 14 }}>
                {filtered.length} of {keys.length} key{keys.length !== 1 ? "s" : ""} shown
              </div>

              {filtered.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: T.hint, fontSize: 13 }}>No keys found matching your filters</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {filtered.map(k => {
                    const isExpired = !!(k.expiresAt && now > k.expiresAt);
                    const isActive = !k.revoked && !isExpired;
                    const days = daysUntil(k.expiresAt);
                    const isExpiringSoon = isActive && days !== null && days <= 7;
                    const isExpanded = expandedKey === k.id;

                    return (
                      <div key={k.id} className="key-row"
                        style={{ background: T.bg, border: `0.5px solid ${isExpiringSoon ? T.amber + "60" : T.border}`, borderRadius: 10, overflow: "hidden" }}>
                        {/* Main row */}
                        <div onClick={() => setExpandedKey(isExpanded ? null : k.id)}
                          style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 13, fontWeight: 500, color: k.revoked ? T.muted : T.text }}>{k.label}</span>
                              <KeyStatusBadge k={k} T={T} />
                              {isExpiringSoon && <Badge label={`${days}d left`} bg={T.amberBg} text={T.amberText} border={T.amber + "40"} />}
                            </div>
                            <div style={{ fontSize: 11, color: T.hint, fontFamily: "inherit" }}>
                              {k.key.length > 36 ? k.key.slice(0, 18) + "…" + k.key.slice(-10) : k.key}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 11, color: T.muted }}>{k.usageCount.toLocaleString()} uses</div>
                              <div style={{ fontSize: 10, color: k.maxRedemptions && k.redemptionCount >= k.maxRedemptions ? T.redText : T.hint }}>
                                {k.maxRedemptions ? `${k.redemptionCount} / ${k.maxRedemptions} redeems` : "∞ redeems"}
                              </div>
                              <div style={{ fontSize: 10, color: T.hint }}>{fmtDate(k.expiresAt)}</div>
                            </div>
                            <span style={{ fontSize: 12, color: T.hint, transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s", display: "inline-block" }}>▾</span>
                          </div>
                        </div>

                        {/* Expanded */}
                        {isExpanded && (
                          <div style={{ borderTop: `0.5px solid ${T.border}`, padding: "14px 14px", background: T.surface, animation: "slideDown 0.15s ease" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                              {[["Created", fmtDate(k.createdAt)], ["Expires", fmtDate(k.expiresAt)], ["Combo Limit", k.rateLimit === "unlimited" ? "Unlimited" : `${Number(k.rateLimit).toLocaleString()}/day`], ["Redemptions", k.maxRedemptions ? `${k.redemptionCount} / ${k.maxRedemptions}` : "∞ Unlimited"], ["Usage Count", k.usageCount.toLocaleString()], ["ID", k.id.slice(0, 18) + "…"], ...(k.revoked ? [["Revoked At", fmtDate(k.revokedAt ?? null)]] : [])].map(([lbl, val]) => (
                                <div key={lbl}>
                                  <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>{lbl}</div>
                                  <div style={{ fontSize: 12, color: T.text, wordBreak: "break-all" }}>{val}</div>
                                </div>
                              ))}

                            {/* Threads inline editor */}
                            <div style={{ gridColumn: "1 / -1" }}>
                              <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Threads</div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                <div style={{ display: "flex", gap: 5 }}>
                                  {[1, 2, 4, 8, 16, 32].map(v => {
                                    const cur = k.threads ?? 1;
                                    const isActive = cur === v && !(editingThreads === k.id && editThreadsCustom && ![1,2,4,8,16,32].includes(Number(editThreadsCustom)));
                                    return (
                                      <button key={v} type="button"
                                        onClick={() => {
                                          setKeys(prev => prev.map(kk => kk.id === k.id ? { ...kk, threads: v } : kk));
                                          setEditingThreads(k.id);
                                          setEditThreadsCustom("");
                                          notify(`Threads set to ${v}`);
                                        }}
                                        style={{ flex: 1, padding: "7px 0", borderRadius: 7, border: `0.5px solid ${isActive ? T.accent : T.border}`, background: isActive ? T.accentBg : "var(--inp)", color: isActive ? T.accentText : T.muted, fontSize: 11, fontFamily: "inherit", cursor: "pointer", fontWeight: isActive ? 600 : 400, transition: "all 0.15s" }}>
                                        {v}
                                      </button>
                                    );
                                  })}
                                </div>
                                <input
                                  type="number"
                                  min={1}
                                  max={512}
                                  value={editingThreads === k.id ? editThreadsCustom : (![1,2,4,8,16,32].includes(k.threads ?? 1) ? String(k.threads ?? 1) : "")}
                                  onChange={e => {
                                    setEditingThreads(k.id);
                                    setEditThreadsCustom(e.target.value);
                                    const v = Number(e.target.value);
                                    if (v > 0) setKeys(prev => prev.map(kk => kk.id === k.id ? { ...kk, threads: v } : kk));
                                  }}
                                  placeholder={`Custom (current: ${k.threads ?? 1})`}
                                  style={{ width: "100%", background: "var(--inp)", border: `0.5px solid ${editingThreads === k.id && editThreadsCustom ? T.accent : T.border}`, borderRadius: 8, color: "var(--text)", fontFamily: "inherit", fontSize: 12, padding: "7px 10px", outline: "none", boxSizing: "border-box" as const, transition: "border-color 0.15s" }}
                                  onFocus={e => { e.target.style.borderColor = T.accent; setEditingThreads(k.id); }}
                                  onBlur={e => { e.target.style.borderColor = "var(--bord)"; if (editThreadsCustom) notify(`Threads set to ${editThreadsCustom}`); }}
                                />
                              </div>
                            </div>
                            </div>

                            {/* Full key display */}
                            <div style={{ background: T.bg, border: `0.5px solid ${T.border}`, borderRadius: 8, padding: "8px 12px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ flex: 1, fontSize: 11, color: T.muted, wordBreak: "break-all", lineHeight: 1.5 }}>{k.key}</div>
                              <CopyBtn value={k.key} T={T} />
                            </div>

                            {/* Actions */}
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              {!k.revoked && (
                                <button className="action-btn" onClick={() => handleRevoke(k.id)}
                                  style={{ fontSize: 12, padding: "6px 14px", borderRadius: 7, border: `0.5px solid ${T.amber}60`, background: T.amberBg, color: T.amberText, cursor: "pointer", fontFamily: "inherit" }}>
                                  Revoke
                                </button>
                              )}
                              {k.revoked && (
                                <button className="action-btn" onClick={() => handleUnrevoke(k.id)}
                                  style={{ fontSize: 12, padding: "6px 14px", borderRadius: 7, border: `0.5px solid ${T.green}60`, background: T.greenBg, color: T.greenText, cursor: "pointer", fontFamily: "inherit" }}>
                                  Restore
                                </button>
                              )}
                              <button className="action-btn" onClick={() => setConfirmDelete(k.id)}
                                style={{ fontSize: 12, padding: "6px 14px", borderRadius: 7, border: `0.5px solid ${T.red}40`, background: T.redBg, color: T.redText, cursor: "pointer", fontFamily: "inherit" }}>
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

        {/* Footer */}
        <div style={{ marginTop: 28, textAlign: "center", fontSize: 11, color: T.hint, letterSpacing: "0.05em" }}>
          KeyVault · {keys.length} keys stored locally
        </div>
      </div>
    </div>
  );
}
