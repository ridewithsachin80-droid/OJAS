import { useState, useEffect } from "react";

const BASE = "/api";

async function loadContent() {
  const res = await fetch(`${BASE}/content`);
  return res.json();
}

async function saveContent(updates, token) {
  const res = await fetch(`${BASE}/content`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Save failed");
  return res.json();
}

/* ── Reusable field components ── */
function Field({ label, hint, value, onChange, multiline, rows = 4 }) {
  const base = {
    width: "100%", padding: "10px 14px", borderRadius: 8,
    border: "1.5px solid #1e3a1e", fontSize: 14,
    background: "#0f1f0f", color: "#d0ead0",
    boxSizing: "border-box", fontFamily: "inherit",
    outline: "none", resize: "vertical",
  };
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{
        display: "block", fontSize: 12, fontWeight: 600,
        color: "#5a8a5a", textTransform: "uppercase",
        letterSpacing: 0.8, marginBottom: 6,
      }}>{label}</label>
      {hint && <p style={{ fontSize: 11, color: "#2e5e2e", marginBottom: 8 }}>{hint}</p>}
      {multiline
        ? <textarea style={{ ...base, height: rows * 26 }} value={value} onChange={e => onChange(e.target.value)} />
        : <input    style={base}                           value={value} onChange={e => onChange(e.target.value)} />
      }
    </div>
  );
}

function Section({ title, icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: "#0f1f0f", borderRadius: 12, border: "1px solid #1e3a1e", marginBottom: 16, overflow: "hidden" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", background: "none", border: "none", cursor: "pointer",
        padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center",
        color: "#A5D6A7", fontFamily: "inherit",
      }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>{icon} {title}</span>
        <span style={{ fontSize: 18, transition: "transform .2s", transform: open ? "rotate(180deg)" : "rotate(0)" }}>⌄</span>
      </button>
      {open && <div style={{ padding: "4px 22px 22px" }}>{children}</div>}
    </div>
  );
}

function StatRow({ label, ck, data, set }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
      <span style={{ color: "#5a8a5a", fontSize: 12, minWidth: 160, fontWeight: 500 }}>{label}</span>
      <input
        value={data[ck] || ""}
        onChange={e => set(ck, e.target.value)}
        style={{
          flex: 1, padding: "8px 12px", borderRadius: 8,
          border: "1.5px solid #1e3a1e", background: "#0a1a0a",
          color: "#d0ead0", fontSize: 14, fontFamily: "inherit", outline: "none",
        }}
        placeholder="e.g. 28+"
      />
    </div>
  );
}

/* ── Main ContentEditor ── */
export default function ContentEditor({ token }) {
  const [data,    setData]    = useState(null);
  const [dirty,   setDirty]   = useState({});
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContent().then(c => { setData(c); setLoading(false); });
  }, []);

  const set = (key, val) => {
    setData(d => ({ ...d, [key]: val }));
    setDirty(d => ({ ...d, [key]: val }));
  };

  const handleSave = async () => {
    if (!Object.keys(dirty).length) { setToast("No changes to save"); return; }
    setSaving(true);
    try {
      await saveContent(dirty, token);
      setDirty({});
      setToast(`✅ ${Object.keys(dirty).length} field(s) saved — homepage updated!`);
    } catch {
      setToast("❌ Save failed — check your connection");
    } finally {
      setSaving(false);
      setTimeout(() => setToast(""), 3500);
    }
  };

  if (loading) return (
    <div style={{ padding: 60, textAlign: "center", color: "#4a7a4a" }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
      Loading homepage content…
    </div>
  );

  const d  = data || {};
  const nd = Object.keys(dirty).length;

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "0 0 60px" }}>

      {/* Save bar */}
      <div style={{
        position: "sticky", top: 64, zIndex: 100,
        background: "#0a1a0a", borderBottom: "1px solid #1e3a1e",
        padding: "12px 0", marginBottom: 28,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 16,
      }}>
        <div style={{ color: nd > 0 ? "#FFB300" : "#2e5e2e", fontSize: 13, fontWeight: 600 }}>
          {nd > 0 ? `⚠️  ${nd} unsaved change${nd > 1 ? "s" : ""}` : "✅ All changes saved"}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => { loadContent().then(c => { setData(c); setDirty({}); }); }} style={{
            padding: "9px 18px", borderRadius: 8, background: "transparent",
            border: "1px solid #1e3a1e", color: "#5a8a5a", cursor: "pointer", fontSize: 13,
          }}>↺ Discard</button>
          <button onClick={handleSave} disabled={saving || !nd} style={{
            padding: "9px 22px", borderRadius: 8,
            background: nd > 0 ? "#2E7D32" : "#1a2e1a",
            color: nd > 0 ? "#fff" : "#2e5e2e",
            border: "none", cursor: nd > 0 ? "pointer" : "default",
            fontWeight: 600, fontSize: 14,
          }}>{saving ? "Saving…" : "💾 Save All"}</button>
        </div>
      </div>

      {/* ── STATS ── */}
      <Section title="Homepage Stats" icon="📊" defaultOpen>
        <p style={{ color: "#3a6a3a", fontSize: 12, marginBottom: 16 }}>
          These numbers appear in the Hero section and the Impact Numbers band.
        </p>
        <StatRow label="Projects"              ck="stat.projects"   data={d} set={set} />
        <StatRow label="Students Supported"    ck="stat.students"   data={d} set={set} />
        <StatRow label="Students with Disability" ck="stat.disability" data={d} set={set} />
        <StatRow label="Women Benefited"       ck="stat.women"      data={d} set={set} />
        <StatRow label="Lives Impacted"        ck="stat.lives"      data={d} set={set} />
      </Section>

      {/* ── HERO ── */}
      <Section title="Hero Section" icon="🦸">
        <Field label="Main Headline"    hint='The large title at the top. Use plain text — "Education" will be shown in italic green automatically.'
          value={d["hero.title"] || ""} onChange={v => set("hero.title", v)} />
        <Field label="Sub-headline"     hint="The smaller italic line below the title."
          value={d["hero.subtitle"] || ""} onChange={v => set("hero.subtitle", v)} />
        <Field label="Description Paragraph" multiline rows={3}
          value={d["hero.description"] || ""} onChange={v => set("hero.description", v)} />
      </Section>

      {/* ── MISSION ── */}
      <Section title="Mission Statement" icon="🎯">
        <Field label="Mission (full text)" multiline rows={8}
          hint="Use a blank line between paragraphs."
          value={d["mission.body"] || ""} onChange={v => set("mission.body", v)} />
      </Section>

      {/* ── VISION ── */}
      <Section title="Vision" icon="🌅">
        <Field label="Vision (full text)" multiline rows={5}
          value={d["vision.body"] || ""} onChange={v => set("vision.body", v)} />
      </Section>

      {/* ── ABOUT ── */}
      <Section title="About Us" icon="🏛️">
        <Field label="Paragraph 1" multiline rows={4} value={d["about.para1"] || ""} onChange={v => set("about.para1", v)} />
        <Field label="Paragraph 2" multiline rows={4} value={d["about.para2"] || ""} onChange={v => set("about.para2", v)} />
        <Field label="Paragraph 3" multiline rows={4} value={d["about.para3"] || ""} onChange={v => set("about.para3", v)} />
      </Section>

      {/* ── TESTIMONIALS ── */}
      <Section title="Testimonials" icon="💬">
        {[1, 2, 3, 4].map(n => (
          <div key={n} style={{ background: "#1a2e1a", borderRadius: 10, padding: 18, marginBottom: 16 }}>
            <div style={{ color: "#81C784", fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Testimonial {n}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <Field label="Name" value={d[`testimonial.${n}.name`] || ""} onChange={v => set(`testimonial.${n}.name`, v)} />
              <Field label="Role / Organisation" value={d[`testimonial.${n}.role`] || ""} onChange={v => set(`testimonial.${n}.role`, v)} />
            </div>
            <Field label="Quote text" multiline rows={5}
              value={d[`testimonial.${n}.body`] || ""} onChange={v => set(`testimonial.${n}.body`, v)} />
          </div>
        ))}
      </Section>

      {/* ── CONTACT ── */}
      <Section title="Contact Information" icon="📞">
        <p style={{ color: "#3a6a3a", fontSize: 12, marginBottom: 16 }}>
          Shown in the footer and CSR partner box.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Email"   value={d["contact.email"]   || ""} onChange={v => set("contact.email", v)} />
          <Field label="Phone"   value={d["contact.phone"]   || ""} onChange={v => set("contact.phone", v)} />
          <Field label="Address" value={d["contact.address"] || ""} onChange={v => set("contact.address", v)} />
          <Field label="Website" value={d["contact.website"] || ""} onChange={v => set("contact.website", v)} />
        </div>
      </Section>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 28, right: 28,
          background: toast.startsWith("✅") ? "#1B5E20" : "#b71c1c",
          color: "#fff", padding: "13px 22px", borderRadius: 10,
          fontSize: 14, boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          zIndex: 9999, animation: "slideUp .3s ease",
        }}>{toast}
          <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
        </div>
      )}
    </div>
  );
}
