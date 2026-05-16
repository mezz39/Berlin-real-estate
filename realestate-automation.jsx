import { useState, useEffect, useRef } from "react";

// ─── MOCK DATA ───────────────────────────────────────────────────────────────
const MOCK_BROKERS = [
  { id: "b1", name: "Layla Hassan", phone: "+971 50 111 2233", email: "layla@realty.com", driveConnected: true, avatar: "LH" },
  { id: "b2", name: "Omar Khalid",  phone: "+971 55 444 5566", email: "omar@realty.com",  driveConnected: true, avatar: "OK" },
  { id: "b3", name: "Sara Mansour", phone: "+971 52 777 8899", email: "sara@realty.com",  driveConnected: false, avatar: "SM" },
];

const MOCK_MESSAGES = [
  { id: "m1", brokerId: "b1", from: "+971 50 999 0011", clientName: "Ahmed Al Farsi", type: "image", content: "property_front.jpg", preview: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=300&q=80", text: "Villa front view – Marina district", timestamp: "10:24 AM", status: "pending", property: "Villa 4BR Marina" },
  { id: "m2", brokerId: "b1", from: "+971 50 999 0011", clientName: "Ahmed Al Farsi", type: "image", content: "living_room.jpg", preview: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=300&q=80", text: "Living area – natural light", timestamp: "10:25 AM", status: "uploaded", property: "Villa 4BR Marina" },
  { id: "m3", brokerId: "b1", from: "+971 54 123 4567", clientName: "Fatima Al Zaabi", type: "text",  content: null, preview: null, text: "2BR apartment JBR – asking 120k/yr, flexible on term. Photos coming tomorrow.", timestamp: "11:02 AM", status: "saved", property: "Apt 2BR JBR" },
  { id: "m4", brokerId: "b2", from: "+971 56 321 6543", clientName: "Khalid Nouri", type: "image", content: "pool_area.jpg", preview: "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=300&q=80", text: "Pool + garden – Palm Jumeirah", timestamp: "09:15 AM", status: "pending", property: "Villa 5BR Palm" },
  { id: "m5", brokerId: "b2", from: "+971 56 321 6543", clientName: "Khalid Nouri", type: "image", content: "master_bed.jpg", preview: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=300&q=80", text: "Master bedroom with sea view", timestamp: "09:17 AM", status: "pending", property: "Villa 5BR Palm" },
  { id: "m6", brokerId: "b3", from: "+971 58 654 3210", clientName: "Noura Al Shamsi", type: "text",  content: null, preview: null, text: "Studio in Downtown – furnished, Burj view, 95k/yr. Owner wants quick deal.", timestamp: "08:45 AM", status: "pending", property: "Studio Downtown" },
];

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────
const STATUS = {
  pending:  { label: "Pending",  color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  uploading:{ label: "Uploading…", color: "#6366F1", bg: "rgba(99,102,241,0.12)" },
  uploaded: { label: "Uploaded", color: "#10B981", bg: "rgba(16,185,129,0.12)" },
  saved:    { label: "Saved",    color: "#10B981", bg: "rgba(16,185,129,0.12)" },
  error:    { label: "Error",    color: "#EF4444", bg: "rgba(239,68,68,0.12)" },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [brokers]         = useState(MOCK_BROKERS);
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [selected, setSelected] = useState("b1");
  const [tab, setTab]     = useState("inbox");   // inbox | settings
  const [toast, setToast] = useState(null);
  const [bulkSel, setBulkSel] = useState([]);
  const [search, setSearch] = useState("");
  const [driveModal, setDriveModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  const broker = brokers.find(b => b.id === selected);
  const inbox  = messages.filter(m =>
    m.brokerId === selected &&
    (search === "" ||
      m.clientName.toLowerCase().includes(search.toLowerCase()) ||
      m.property.toLowerCase().includes(search.toLowerCase()) ||
      m.text.toLowerCase().includes(search.toLowerCase()))
  );
  const pending = inbox.filter(m => m.status === "pending");

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function uploadMessage(id) {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, status: "uploading" } : m));
    setUploadProgress(p => ({ ...p, [id]: 0 }));

    // Simulate progress
    for (let i = 20; i <= 90; i += 20) {
      await sleep(300);
      setUploadProgress(p => ({ ...p, [id]: i }));
    }
    await sleep(400);

    setMessages(prev => prev.map(m =>
      m.id === id ? { ...m, status: m.type === "image" ? "uploaded" : "saved" } : m
    ));
    setUploadProgress(p => { const n = { ...p }; delete n[id]; return n; });
    showToast("Sent to Drive & WhatsApp confirmation sent ✓");

    /*
    ── REAL INTEGRATION POINTS ──────────────────────────────────────────────
    1. Google Drive upload:
       POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart
       Authorization: Bearer {broker.oauthToken}
       Body: { name, mimeType, parents: [broker.driveFolderId] }

    2. WhatsApp confirmation reply:
       POST https://graph.facebook.com/v18.0/{phoneNumberId}/messages
       Authorization: Bearer {WHATSAPP_TOKEN}
       Body: { messaging_product:"whatsapp", to: message.from,
               type:"text", text:{ body:"✅ Your file has been saved to our Drive." } }
    ─────────────────────────────────────────────────────────────────────── */
  }

  async function uploadBulk() {
    const ids = bulkSel.length > 0 ? bulkSel : pending.map(m => m.id);
    if (!ids.length) return showToast("No pending items to upload", "warn");
    for (const id of ids) await uploadMessage(id);
    setBulkSel([]);
    showToast(`${ids.length} item(s) processed ✓`);
  }

  function toggleBulk(id) {
    setBulkSel(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  const pendingCount = messages.filter(m => m.brokerId === selected && m.status === "pending").length;

  return (
    <div style={S.root}>
      {/* ── SIDEBAR ── */}
      <aside style={S.sidebar}>
        <div style={S.logo}>
          <span style={S.logoIcon}>⬡</span>
          <span style={S.logoText}>PropSync</span>
        </div>

        <p style={S.sidebarLabel}>BROKERS</p>
        {brokers.map(b => {
          const bPending = messages.filter(m => m.brokerId === b.id && m.status === "pending").length;
          return (
            <button key={b.id} style={{ ...S.brokerBtn, ...(selected === b.id ? S.brokerBtnActive : {}) }}
              onClick={() => { setSelected(b.id); setSearch(""); setBulkSel([]); }}>
              <div style={{ ...S.avatar, background: selected === b.id ? "#C9A84C" : "#2A2A3A" }}>
                {b.avatar}
              </div>
              <div style={S.brokerInfo}>
                <span style={S.brokerName}>{b.name}</span>
                <span style={S.brokerEmail}>{b.email}</span>
              </div>
              {bPending > 0 && <span style={S.badge}>{bPending}</span>}
            </button>
          );
        })}

        <div style={S.sidebarFooter}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:18 }}>☁</span>
            <span style={{ fontSize:12, color:"#888" }}>Google Drive</span>
          </div>
          <div style={{ fontSize:11, color: broker?.driveConnected ? "#10B981" : "#EF4444", marginTop:4 }}>
            {broker?.driveConnected ? "● Connected" : "● Not connected"}
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={S.main}>
        {/* Header */}
        <header style={S.header}>
          <div>
            <h1 style={S.headerTitle}>{broker?.name}</h1>
            <p style={S.headerSub}>{broker?.phone} · {broker?.email}</p>
          </div>
          <div style={S.headerActions}>
            {pendingCount > 0 && (
              <button style={S.btnPrimary} onClick={uploadBulk}>
                ↑ Upload All Pending ({pendingCount})
              </button>
            )}
            <button style={S.btnGhost} onClick={() => setDriveModal(true)}>
              ⚙ Settings
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div style={S.tabs}>
          {["inbox","activity"].map(t => (
            <button key={t} style={{ ...S.tab, ...(tab === t ? S.tabActive : {}) }}
              onClick={() => setTab(t)}>
              {t === "inbox" ? `Inbox${pendingCount ? ` (${pendingCount})` : ""}` : "Activity Log"}
            </button>
          ))}
        </div>

        {/* Search + bulk */}
        <div style={S.toolbar}>
          <div style={S.searchWrap}>
            <span style={S.searchIcon}>⌕</span>
            <input style={S.searchInput} placeholder="Search client, property, message…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {bulkSel.length > 0 && (
            <button style={S.btnPrimary} onClick={uploadBulk}>
              Upload Selected ({bulkSel.length})
            </button>
          )}
        </div>

        {/* Message cards */}
        <div style={S.cardGrid}>
          {inbox.length === 0 && (
            <div style={S.empty}>No messages found.</div>
          )}
          {inbox.map(msg => {
            const st = STATUS[msg.status] || STATUS.pending;
            const prog = uploadProgress[msg.id];
            const isSel = bulkSel.includes(msg.id);
            return (
              <div key={msg.id} style={{ ...S.card, ...(isSel ? S.cardSelected : {}) }}
                onClick={() => msg.status === "pending" && toggleBulk(msg.id)}>

                {/* Top row */}
                <div style={S.cardTop}>
                  <div style={S.cardClient}>
                    <div style={S.clientDot} />
                    <div>
                      <div style={S.clientName}>{msg.clientName}</div>
                      <div style={S.clientPhone}>{msg.from}</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ ...S.statusPill, color: st.color, background: st.bg }}>{st.label}</span>
                    <span style={S.timestamp}>{msg.timestamp}</span>
                  </div>
                </div>

                {/* Property tag */}
                <div style={S.propertyTag}>{msg.property}</div>

                {/* Image preview */}
                {msg.type === "image" && msg.preview && (
                  <div style={S.imgWrap}>
                    <img src={msg.preview} alt={msg.content} style={S.imgPreview} />
                    <div style={S.imgOverlay}>
                      <span style={S.imgIcon}>🖼</span>
                      <span style={{ fontSize:11 }}>{msg.content}</span>
                    </div>
                  </div>
                )}

                {/* Text */}
                <p style={S.msgText}>{msg.text}</p>

                {/* Progress bar */}
                {prog !== undefined && (
                  <div style={S.progressBar}>
                    <div style={{ ...S.progressFill, width: `${prog}%` }} />
                  </div>
                )}

                {/* Action row */}
                <div style={S.cardActions}>
                  {msg.status === "pending" && (
                    <button style={S.btnUpload} onClick={e => { e.stopPropagation(); uploadMessage(msg.id); }}>
                      ↑ Upload to Drive + Reply
                    </button>
                  )}
                  {(msg.status === "uploaded" || msg.status === "saved") && (
                    <span style={{ fontSize:12, color:"#10B981" }}>
                      ✓ {msg.type === "image" ? "Uploaded to Drive" : "Saved to Drive"} · Confirmation sent
                    </span>
                  )}
                  <span style={S.typeTag}>{msg.type === "image" ? "📷 Image" : "💬 Text"}</span>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* ── TOAST ── */}
      {toast && (
        <div style={{ ...S.toast, background: toast.type === "warn" ? "#92400E" : "#064E3B" }}>
          {toast.msg}
        </div>
      )}

      {/* ── SETTINGS MODAL ── */}
      {driveModal && (
        <div style={S.modalOverlay} onClick={() => setDriveModal(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <h2 style={{ margin:0, fontSize:18, color:"#F0EDE8" }}>Broker Settings</h2>
              <button style={S.modalClose} onClick={() => setDriveModal(false)}>✕</button>
            </div>

            <div style={S.modalBody}>
              {brokers.map(b => (
                <div key={b.id} style={S.settingsRow}>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ ...S.avatar, background:"#2A2A3A", flexShrink:0 }}>{b.avatar}</div>
                    <div>
                      <div style={{ color:"#F0EDE8", fontWeight:600 }}>{b.name}</div>
                      <div style={{ color:"#888", fontSize:12 }}>{b.email}</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:12, color: b.driveConnected ? "#10B981" : "#EF4444" }}>
                      {b.driveConnected ? "● Drive linked" : "● Not linked"}
                    </span>
                    <button style={{ ...S.btnGhost, fontSize:12, padding:"4px 12px" }}>
                      {b.driveConnected ? "Re-auth" : "Connect Drive"}
                    </button>
                  </div>
                </div>
              ))}

              <div style={S.settingsDivider} />

              <div style={{ color:"#888", fontSize:12, lineHeight:1.8 }}>
                <p style={{ color:"#C9A84C", fontWeight:600, marginBottom:8 }}>Integration notes</p>
                <p>• WhatsApp Business API webhook → your server receives messages</p>
                <p>• Server uploads images/text to each broker's linked Google Drive folder</p>
                <p>• Confirmation reply sent via WhatsApp API back to the sender</p>
                <p>• Each broker authenticates their own Google account via OAuth 2.0</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const S = {
  root: {
    display: "flex",
    height: "100vh",
    background: "#0F0F18",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    color: "#F0EDE8",
    overflow: "hidden",
  },

  // Sidebar
  sidebar: {
    width: 240,
    background: "#14141F",
    borderRight: "1px solid #1E1E2E",
    display: "flex",
    flexDirection: "column",
    padding: "0 0 16px 0",
    flexShrink: 0,
  },
  logo: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "24px 20px 20px",
    borderBottom: "1px solid #1E1E2E",
    marginBottom: 16,
  },
  logoIcon: { fontSize: 22, color: "#C9A84C" },
  logoText: {
    fontSize: 18, fontWeight: 700, letterSpacing: "0.08em",
    color: "#F0EDE8",
  },
  sidebarLabel: {
    fontSize: 10, letterSpacing: "0.15em", color: "#555",
    padding: "0 20px", margin: "0 0 8px",
  },
  brokerBtn: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 16px", margin: "0 8px 4px",
    background: "transparent", border: "none", cursor: "pointer",
    borderRadius: 8, textAlign: "left", width: "calc(100% - 16px)",
    transition: "background 0.15s",
    position: "relative",
  },
  brokerBtnActive: { background: "#1E1E2E" },
  avatar: {
    width: 36, height: 36, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 12, fontWeight: 700, color: "#C9A84C", flexShrink: 0,
  },
  brokerInfo: { display: "flex", flexDirection: "column", minWidth: 0, flex: 1 },
  brokerName: { fontSize: 13, fontWeight: 600, color: "#F0EDE8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  brokerEmail: { fontSize: 10, color: "#666", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  badge: {
    background: "#C9A84C", color: "#0F0F18",
    fontSize: 10, fontWeight: 800, borderRadius: "50%",
    width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  sidebarFooter: {
    marginTop: "auto", padding: "16px 20px",
    borderTop: "1px solid #1E1E2E",
  },

  // Header
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "24px 32px 0",
  },
  headerTitle: { margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" },
  headerSub: { margin: "4px 0 0", fontSize: 13, color: "#666" },
  headerActions: { display: "flex", gap: 10 },

  // Tabs
  tabs: {
    display: "flex", gap: 4,
    padding: "20px 32px 0",
    borderBottom: "1px solid #1E1E2E",
  },
  tab: {
    padding: "8px 16px", fontSize: 13, fontWeight: 500,
    background: "transparent", border: "none", cursor: "pointer",
    color: "#666", borderBottom: "2px solid transparent",
    transition: "all 0.15s", marginBottom: -1,
  },
  tabActive: { color: "#C9A84C", borderBottomColor: "#C9A84C" },

  // Toolbar
  toolbar: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "16px 32px 0",
  },
  searchWrap: {
    flex: 1, display: "flex", alignItems: "center",
    background: "#14141F", border: "1px solid #2A2A3A",
    borderRadius: 8, padding: "0 12px",
  },
  searchIcon: { fontSize: 16, color: "#555", marginRight: 8 },
  searchInput: {
    flex: 1, background: "transparent", border: "none", outline: "none",
    color: "#F0EDE8", fontSize: 13, padding: "10px 0",
  },

  // Cards
  main: {
    flex: 1, display: "flex", flexDirection: "column",
    overflow: "hidden",
  },
  cardGrid: {
    flex: 1, overflowY: "auto",
    padding: "16px 32px 32px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: 16,
    alignContent: "start",
  },
  card: {
    background: "#14141F", border: "1px solid #1E1E2E",
    borderRadius: 12, padding: 16,
    cursor: "pointer", transition: "border-color 0.15s",
  },
  cardSelected: { borderColor: "#C9A84C" },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  cardClient: { display: "flex", alignItems: "center", gap: 10 },
  clientDot: { width: 8, height: 8, borderRadius: "50%", background: "#25D366", flexShrink: 0 },
  clientName: { fontSize: 13, fontWeight: 600, color: "#F0EDE8" },
  clientPhone: { fontSize: 11, color: "#555" },
  statusPill: { fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 20 },
  timestamp: { fontSize: 11, color: "#444" },
  propertyTag: {
    fontSize: 10, letterSpacing: "0.08em", color: "#C9A84C",
    background: "rgba(201,168,76,0.1)", display: "inline-block",
    padding: "2px 8px", borderRadius: 4, marginBottom: 10,
  },
  imgWrap: {
    position: "relative", marginBottom: 10, borderRadius: 8, overflow: "hidden",
    height: 140,
  },
  imgPreview: { width: "100%", height: "100%", objectFit: "cover" },
  imgOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
    padding: "8px 10px", display: "flex", alignItems: "center", gap: 6,
    fontSize: 11, color: "#ccc",
  },
  imgIcon: { fontSize: 14 },
  msgText: { fontSize: 12, color: "#888", margin: "0 0 12px", lineHeight: 1.5 },
  progressBar: {
    height: 3, background: "#2A2A3A", borderRadius: 2, marginBottom: 12,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%", background: "#C9A84C",
    borderRadius: 2, transition: "width 0.3s ease",
  },
  cardActions: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  btnUpload: {
    fontSize: 12, fontWeight: 600, color: "#0F0F18",
    background: "#C9A84C", border: "none", cursor: "pointer",
    padding: "6px 14px", borderRadius: 6,
  },
  typeTag: { fontSize: 11, color: "#555" },
  empty: { color: "#444", fontSize: 14, padding: "40px 0", textAlign: "center", gridColumn: "1/-1" },

  // Buttons
  btnPrimary: {
    background: "#C9A84C", color: "#0F0F18",
    border: "none", cursor: "pointer", borderRadius: 8,
    padding: "8px 16px", fontSize: 13, fontWeight: 700,
  },
  btnGhost: {
    background: "transparent", color: "#888",
    border: "1px solid #2A2A3A", cursor: "pointer", borderRadius: 8,
    padding: "8px 16px", fontSize: 13,
  },

  // Toast
  toast: {
    position: "fixed", bottom: 24, right: 24,
    padding: "12px 20px", borderRadius: 10,
    fontSize: 13, fontWeight: 500, color: "#fff",
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    animation: "fadeIn 0.2s ease",
    zIndex: 1000,
  },

  // Modal
  modalOverlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 999,
  },
  modal: {
    background: "#14141F", border: "1px solid #2A2A3A",
    borderRadius: 16, width: 520, maxWidth: "90vw",
    boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
  },
  modalHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "20px 24px", borderBottom: "1px solid #1E1E2E",
  },
  modalClose: {
    background: "transparent", border: "none", cursor: "pointer",
    color: "#666", fontSize: 16,
  },
  modalBody: { padding: "20px 24px" },
  settingsRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "12px 0", borderBottom: "1px solid #1E1E2E",
  },
  settingsDivider: { height: 1, background: "#1E1E2E", margin: "16px 0" },
};
