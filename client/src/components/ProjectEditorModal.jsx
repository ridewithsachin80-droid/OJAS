import { useState } from "react";
import { addPhoto, deletePhoto } from "../api.js";

const CATEGORIES = ["Education","Infrastructure","Special Needs","Women Empowerment","Health & Welfare","Community Welfare"];

const input = {
  width:"100%", padding:"10px 14px", borderRadius:8,
  border:"1.5px solid #e0e0e0", fontSize:14, background:"#fff",
  boxSizing:"border-box", fontFamily:"inherit", color:"#1a1a1a", outline:"none"
};
const label = {
  fontSize:12, fontWeight:600, color:"#666",
  textTransform:"uppercase", letterSpacing:0.5,
  display:"block", marginBottom:6
};

export default function ProjectEditorModal({ project, onSave, onClose }) {
  const isNew = !project.id;

  const [form, setForm] = useState({
    id:            project.id            || `p${Date.now()}`,
    title:         project.title         || "",
    category:      project.category      || "Education",
    location:      project.location      || "",
    beneficiaries: project.beneficiaries || "",
    year:          project.year          || new Date().getFullYear().toString(),
    partner:       project.partner       || "",
    status:        project.status        || "ongoing",
    description:   project.description   || "",
    impact:        project.impact        || "",
    photos:        project.photos        || [],
  });

  const [newUrl,     setNewUrl]     = useState("");
  const [newCaption, setNewCaption] = useState("");
  const [photoErr,   setPhotoErr]   = useState("");
  const [saving,     setSaving]     = useState(false);
  const [addingPhoto,setAddingPhoto]= useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  /* Add photo — calls API immediately if project already exists */
  const handleAddPhoto = async () => {
    const url = newUrl.trim();
    if (!url) return;
    if (!url.startsWith("http")) { setPhotoErr("Must be a valid http/https URL"); return; }
    setPhotoErr(""); setAddingPhoto(true);
    try {
      if (!isNew) {
        const ph = await addPhoto(project.id, { url, caption: newCaption.trim() });
        setForm(f => ({ ...f, photos: [...f.photos, ph] }));
      } else {
        // For new projects, store locally until saved
        setForm(f => ({ ...f, photos: [...f.photos, { url, caption: newCaption.trim(), _local: true }] }));
      }
      setNewUrl(""); setNewCaption("");
    } catch (e) { setPhotoErr(e.message); }
    finally { setAddingPhoto(false); }
  };

  /* Delete photo — calls API immediately if project already exists */
  const handleDeletePhoto = async (ph, i) => {
    try {
      if (!isNew && ph.id) await deletePhoto(project.id, ph.id);
      setForm(f => ({ ...f, photos: f.photos.filter((_, idx) => idx !== i) }));
    } catch (e) { alert("Failed to delete photo: " + e.message); }
  };

  const handleSave = async () => {
    if (!form.title.trim()) { alert("Project title is required"); return; }
    setSaving(true);
    try {
      await onSave(form);
    } finally { setSaving(false); }
  };

  return (
    <div onClick={onClose} style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.6)",
      zIndex:9998, display:"flex", alignItems:"flex-start",
      justifyContent:"center", padding:"24px 16px", overflowY:"auto"
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:"#fff", borderRadius:16, width:"100%", maxWidth:700,
        boxShadow:"0 20px 60px rgba(0,0,0,0.3)", marginBottom:24
      }}>
        {/* Header */}
        <div style={{
          background:"linear-gradient(135deg,#1B5E20,#2E7D32)",
          padding:"24px 28px", borderRadius:"16px 16px 0 0",
          display:"flex", justifyContent:"space-between", alignItems:"center"
        }}>
          <h2 style={{ fontFamily:"'Playfair Display',serif", color:"#fff", fontSize:20, margin:0 }}>
            {isNew ? "➕ Add New Project" : `✏️ Edit — ${project.title}`}
          </h2>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#fff", fontSize:26, cursor:"pointer", lineHeight:1 }}>×</button>
        </div>

        <div style={{ padding:28, display:"flex", flexDirection:"column", gap:18 }}>

          {/* Title */}
          <div>
            <label style={label}>Project Title *</label>
            <input style={input} value={form.title} onChange={e=>set("title",e.target.value)} placeholder="e.g., Virtual Classrooms Project" />
          </div>

          {/* Category + Status */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <div>
              <label style={label}>Category *</label>
              <select style={input} value={form.category} onChange={e=>set("category",e.target.value)}>
                {CATEGORIES.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Status</label>
              <select style={input} value={form.status} onChange={e=>set("status",e.target.value)}>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Location + Year */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <div>
              <label style={label}>Location</label>
              <input style={input} value={form.location} onChange={e=>set("location",e.target.value)} placeholder="e.g., Tumkur, Karnataka" />
            </div>
            <div>
              <label style={label}>Year / Period</label>
              <input style={input} value={form.year} onChange={e=>set("year",e.target.value)} placeholder="e.g., 2022 or 2019–Present" />
            </div>
          </div>

          {/* Beneficiaries + Partner */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <div>
              <label style={label}>Beneficiaries</label>
              <input style={input} value={form.beneficiaries} onChange={e=>set("beneficiaries",e.target.value)} placeholder="e.g., 800+ students" />
            </div>
            <div>
              <label style={label}>Partner Organisation</label>
              <input style={input} value={form.partner} onChange={e=>set("partner",e.target.value)} placeholder="e.g., Manipal Foundation" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={label}>Project Description *</label>
            <textarea style={{ ...input, height:100, resize:"vertical" }}
              value={form.description} onChange={e=>set("description",e.target.value)}
              placeholder="Describe the project — what was done, where, and how..." />
          </div>

          {/* Impact */}
          <div>
            <label style={label}>Impact / Outcomes</label>
            <textarea style={{ ...input, height:80, resize:"vertical" }}
              value={form.impact} onChange={e=>set("impact",e.target.value)}
              placeholder="Describe measurable outcomes — numbers, changes, beneficiaries..." />
          </div>

          {/* Photos */}
          <div style={{ background:"#f9fafb", borderRadius:10, padding:20, border:"1px solid #e8e8e8" }}>
            <label style={{ ...label, color:"#333", fontSize:13 }}>
              📸 Photo Gallery
              <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0, color:"#888", marginLeft:8 }}>
                ({form.photos.length} photos)
              </span>
            </label>

            {/* Add photo row */}
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:14 }}>
              <div style={{ display:"flex", gap:8 }}>
                <input style={{ ...input, flex:1 }}
                  value={newUrl}
                  onChange={e=>{ setNewUrl(e.target.value); setPhotoErr(""); }}
                  onKeyDown={e=>e.key==="Enter"&&handleAddPhoto()}
                  placeholder="Paste direct image URL (Google Photos, etc.)" />
                <button onClick={handleAddPhoto} disabled={addingPhoto} style={{
                  padding:"10px 18px", borderRadius:8, background: addingPhoto?"#81c784":"#2E7D32",
                  color:"#fff", border:"none", cursor:"pointer", fontWeight:600, whiteSpace:"nowrap", fontSize:13
                }}>{addingPhoto ? "Adding…" : "+ Add"}</button>
              </div>
              <input style={{ ...input, fontSize:13 }}
                value={newCaption} onChange={e=>setNewCaption(e.target.value)}
                placeholder="Caption (optional) — e.g., Students in virtual classroom, Tumkur 2023" />
            </div>

            {photoErr && <p style={{ color:"#d32f2f", fontSize:12, marginBottom:10 }}>{photoErr}</p>}

            <p style={{ fontSize:11, color:"#aaa", marginBottom:14, lineHeight:1.6 }}>
              💡 <strong>Google Photos:</strong> Open photo → Right-click the image → "Copy image address" → paste above. Append <code>=w800-h560-no</code> to the URL for best quality.
            </p>

            {/* Thumbnails */}
            {form.photos.length > 0 && (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))", gap:8 }}>
                {form.photos.map((ph, i) => (
                  <div key={ph.id||i} style={{ position:"relative", aspectRatio:"4/3", borderRadius:8, overflow:"hidden", background:"#eee" }}>
                    <img src={ph.url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}
                      onError={e=>{ e.target.style.opacity="0.2"; }} />
                    <button onClick={()=>handleDeletePhoto(ph,i)} title="Remove photo" style={{
                      position:"absolute", top:4, right:4,
                      background:"rgba(211,47,47,0.9)", color:"#fff",
                      border:"none", borderRadius:"50%", width:22, height:22,
                      cursor:"pointer", fontSize:13, lineHeight:1,
                      display:"flex", alignItems:"center", justifyContent:"center"
                    }}>×</button>
                    <div style={{
                      position:"absolute", bottom:0, left:0, right:0,
                      background:"rgba(0,0,0,0.45)", color:"#fff",
                      fontSize:9, padding:"3px 6px",
                      overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis"
                    }}>{ph.caption || `#${i+1}`}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div style={{ display:"flex", gap:12, justifyContent:"flex-end", paddingTop:4 }}>
            <button onClick={onClose} style={{
              padding:"12px 24px", borderRadius:8, background:"#fff",
              border:"1.5px solid #e0e0e0", color:"#555", cursor:"pointer", fontWeight:500
            }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{
              padding:"12px 28px", borderRadius:8,
              background: saving?"#81c784":"#2E7D32",
              color:"#fff", border:"none", cursor:"pointer", fontWeight:600, fontSize:15
            }}>{saving ? "Saving…" : "💾 Save Project"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
