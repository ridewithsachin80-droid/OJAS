import { useState } from "react";
import ProjectEditorModal from "./ProjectEditorModal.jsx";
import ContentEditor      from "./ContentEditor.jsx";
import { createProject, updateProject, deleteProject } from "../api.js";

function getToken() { return localStorage.getItem("shuddhi_token"); }

const CAT_COLORS = {
  "Education":         "#2E7D32",
  "Infrastructure":    "#1565C0",
  "Special Needs":     "#6A1B9A",
  "Women Empowerment": "#E65100",
  "Health & Welfare":  "#C2185B",
  "Community Welfare": "#00796B",
};

function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      position:"fixed", bottom:28, right:28,
      background:"#1B5E20", color:"#fff",
      padding:"12px 22px", borderRadius:10, fontSize:14,
      boxShadow:"0 8px 24px rgba(0,0,0,0.4)", zIndex:9999,
      animation:"slideUp 0.3s ease"
    }}>
      {msg}
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

export default function AdminDashboard({ projects, onProjectsChange, onLogout, onViewPublic }) {
  const [activeTab, setActiveTab] = useState("projects"); // "projects" | "homepage"
  const [editing,  setEditing]  = useState(null);
  const [confirm,  setConfirm]  = useState(null);
  const [search,   setSearch]   = useState("");
  const [catFilter,setCatFilter]= useState("All");
  const [toast,    setToast]    = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""), 2800); };

  const categories = ["All", ...Array.from(new Set(projects.map(p=>p.category)))];

  const filtered = projects.filter(p => {
    const matchCat  = catFilter === "All" || p.category === catFilter;
    const matchText = !search || p.title.toLowerCase().includes(search.toLowerCase())
                              || p.category.toLowerCase().includes(search.toLowerCase())
                              || (p.location||"").toLowerCase().includes(search.toLowerCase());
    return matchCat && matchText;
  });

  /* ── CRUD ── */
  const handleSave = async (form) => {
    try {
      if (projects.find(p => p.id === form.id)) {
        const updated = await updateProject(form.id, form);
        onProjectsChange(projects.map(p => p.id === form.id ? updated : p));
        showToast("✅ Project updated successfully");
      } else {
        const created = await createProject(form);
        // Add any local photos that were queued
        onProjectsChange([...projects, created]);
        showToast("✅ New project created");
      }
      setEditing(null);
    } catch (e) {
      alert("Save failed: " + e.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteProject(id);
      onProjectsChange(projects.filter(p => p.id !== id));
      setConfirm(null);
      showToast("🗑️ Project deleted");
    } catch (e) {
      alert("Delete failed: " + e.message);
    }
  };

  const totalPhotos = projects.reduce((a,p) => a + (p.photos?.length||0), 0);

  return (
    <div style={{ minHeight:"100vh", background:"#0a1a0a", fontFamily:"'DM Sans',sans-serif" }}>

      {/* Top nav */}
      <div style={{
        background:"#0f1f0f", borderBottom:"1px solid #1e3a1e",
        padding:"0 24px", height:64,
        display:"flex", alignItems:"center", justifyContent:"space-between", gap:16
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{
            width:36, height:36, borderRadius:"50%",
            background:"linear-gradient(135deg,#2E7D32,#1B5E20)",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:18
          }}>🕯️</div>
          <div>
            <div style={{ color:"#A5D6A7", fontWeight:700, fontSize:14 }}>Admin Panel</div>
            <div style={{ color:"#4a7a4a", fontSize:11 }}>Shuddhi Educational Charitable Trust</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onViewPublic} style={{
            padding:"8px 16px", borderRadius:8, background:"transparent",
            border:"1px solid #2E7D32", color:"#4CAF50", cursor:"pointer", fontSize:13, fontWeight:500
          }}>👁 View Public Site</button>
          <button onClick={onLogout} style={{
            padding:"8px 16px", borderRadius:8, background:"transparent",
            border:"1px solid #3a2020", color:"#ef9a9a", cursor:"pointer", fontSize:13
          }}>Logout</button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        background:"#0a1a0a", borderBottom:"1px solid #1e3a1e",
        padding:"0 24px", display:"flex", gap:4,
      }}>
        {[
          { id:"projects", label:"📁 Projects" },
          { id:"homepage", label:"🏠 Homepage Content" },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding:"14px 22px", background:"none", border:"none", cursor:"pointer",
            fontSize:13, fontWeight:600, fontFamily:"inherit",
            color:      activeTab===tab.id ? "#A5D6A7"     : "#4a7a4a",
            borderBottom: activeTab===tab.id ? "2px solid #4CAF50" : "2px solid transparent",
          }}>{tab.label}</button>
        ))}
      </div>

      <div style={{ padding:"28px 24px 60px", maxWidth: activeTab==="homepage"?860:1200, margin:"0 auto" }}>

        {/* ── HOMEPAGE CONTENT EDITOR ── */}
        {activeTab === "homepage" && (
          <ContentEditor token={getToken()} />
        )}

        {/* ── PROJECTS TAB ── */}
        {activeTab === "projects" && (<>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12, marginBottom:28 }}>
          {[
            ["📁", projects.length,                                           "Total Projects"],
            ["🟢", projects.filter(p=>p.status==="ongoing").length,           "Ongoing"],
            ["✅", projects.filter(p=>p.status==="completed").length,         "Completed"],
            ["📸", totalPhotos,                                                "Total Photos"],
            ["👥", projects.filter(p=>!p.photos||p.photos.length===0).length, "Need Photos"],
          ].map(([icon, n, lbl]) => (
            <div key={lbl} style={{
              background:"#1a2e1a", borderRadius:10, padding:"16px 18px", border:"1px solid #1e3a1e"
            }}>
              <div style={{ fontSize:20, marginBottom:6 }}>{icon}</div>
              <div style={{ color:"#A5D6A7", fontSize:26, fontWeight:700 }}>{n}</div>
              <div style={{ color:"#4a7a4a", fontSize:12, marginTop:2 }}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
          <input
            style={{
              flex:1, minWidth:200, padding:"10px 16px", borderRadius:8,
              background:"#1a2e1a", border:"1.5px solid #1e3a1e",
              color:"#d0ead0", fontSize:14, outline:"none", fontFamily:"inherit"
            }}
            placeholder="🔍  Search by title, category, or location…"
            value={search} onChange={e=>setSearch(e.target.value)}
          />
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {categories.map(c => (
              <button key={c} onClick={()=>setCatFilter(c)} style={{
                padding:"8px 14px", borderRadius:8, fontSize:12, fontWeight:500, cursor:"pointer",
                background: catFilter===c ? "#2E7D32" : "transparent",
                color:       catFilter===c ? "#fff"    : "#4a7a4a",
                border:      catFilter===c ? "none"    : "1px solid #1e3a1e",
              }}>{c}</button>
            ))}
          </div>
          <button onClick={()=>setEditing({})} style={{
            padding:"10px 22px", borderRadius:8, background:"#2E7D32",
            color:"#fff", border:"none", cursor:"pointer", fontWeight:600,
            fontSize:14, whiteSpace:"nowrap"
          }}>+ New Project</button>
        </div>

        {/* Table */}
        <div style={{ background:"#0f1f0f", borderRadius:12, border:"1px solid #1e3a1e", overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:700 }}>
            <thead>
              <tr style={{ borderBottom:"1px solid #1e3a1e" }}>
                {["#","Project","Category","Location","Beneficiaries","Photos","Status","Actions"].map(h=>(
                  <th key={h} style={{
                    padding:"13px 14px", textAlign:"left", fontSize:11,
                    color:"#4a7a4a", fontWeight:600, textTransform:"uppercase", letterSpacing:0.8,
                    whiteSpace:"nowrap"
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id}
                  style={{ borderBottom:"1px solid #111d11", transition:"background 0.15s" }}
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(46,125,50,0.08)"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                >
                  <td style={{ padding:"12px 14px", color:"#4a7a4a", fontSize:12 }}>{i+1}</td>
                  <td style={{ padding:"12px 14px", maxWidth:220 }}>
                    <div style={{ color:"#c8e6c8", fontWeight:600, fontSize:14, lineHeight:1.3 }}>{p.title}</div>
                    {p.partner && <div style={{ color:"#4a7a4a", fontSize:11, marginTop:2 }}>🤝 {p.partner}</div>}
                  </td>
                  <td style={{ padding:"12px 14px" }}>
                    <span style={{
                      background:"rgba(255,255,255,0.06)", color: CAT_COLORS[p.category]||"#fff",
                      padding:"3px 10px", borderRadius:50, fontSize:11, fontWeight:600, whiteSpace:"nowrap"
                    }}>{p.category}</span>
                  </td>
                  <td style={{ padding:"12px 14px", color:"#5a8a5a", fontSize:12, whiteSpace:"nowrap" }}>
                    {(p.location||"").split(",")[0]}
                  </td>
                  <td style={{ padding:"12px 14px", color:"#5a8a5a", fontSize:12, whiteSpace:"nowrap" }}>
                    {p.beneficiaries}
                  </td>
                  <td style={{ padding:"12px 14px" }}>
                    <span style={{
                      background: (p.photos?.length||0)>0?"rgba(46,125,50,0.2)":"rgba(255,255,255,0.04)",
                      color:      (p.photos?.length||0)>0?"#81C784":"#4a7a4a",
                      padding:"3px 10px", borderRadius:50, fontSize:12, fontWeight:600
                    }}>📷 {p.photos?.length||0}</span>
                  </td>
                  <td style={{ padding:"12px 14px" }}>
                    <span style={{
                      background: p.status==="ongoing"?"rgba(76,175,80,0.15)":"rgba(33,150,243,0.15)",
                      color:      p.status==="ongoing"?"#66BB6A":"#42A5F5",
                      padding:"3px 10px", borderRadius:50, fontSize:11, fontWeight:600
                    }}>{p.status}</span>
                  </td>
                  <td style={{ padding:"12px 14px" }}>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={()=>setEditing(p)} style={{
                        padding:"6px 12px", borderRadius:6,
                        background:"rgba(46,125,50,0.18)", color:"#81C784",
                        border:"1px solid rgba(46,125,50,0.25)",
                        cursor:"pointer", fontSize:12, fontWeight:600
                      }}>✏️ Edit</button>
                      <button onClick={()=>setConfirm(p.id)} style={{
                        padding:"6px 12px", borderRadius:6,
                        background:"rgba(211,47,47,0.12)", color:"#ef9a9a",
                        border:"1px solid rgba(211,47,47,0.22)",
                        cursor:"pointer", fontSize:12
                      }}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div style={{ padding:"60px", textAlign:"center", color:"#4a7a4a" }}>
              <div style={{ fontSize:36, marginBottom:12 }}>📂</div>
              No projects match your search.
            </div>
          )}
        </div>

        {/* Footer hint */}
        <p style={{ marginTop:16, color:"#2e5e2e", fontSize:12 }}>
          {filtered.length} of {projects.length} projects shown
          {totalPhotos > 0 && ` · ${totalPhotos} total photos in database`}
        </p>

        </>)} {/* end projects tab */}
      </div>

      {/* Edit / Create modal */}
      {editing !== null && (
        <ProjectEditorModal
          project={editing}
          onSave={handleSave}
          onClose={()=>setEditing(null)}
        />
      )}

      {/* Delete confirm */}
      {confirm && (
        <div onClick={()=>setConfirm(null)} style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,0.72)",
          zIndex:9997, display:"flex", alignItems:"center", justifyContent:"center"
        }}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:"#1a2e1a", borderRadius:14, padding:36, width:320,
            textAlign:"center", border:"1px solid #2E7D32"
          }}>
            <div style={{ fontSize:36, marginBottom:14 }}>⚠️</div>
            <h3 style={{ color:"#A5D6A7", marginBottom:10, fontFamily:"'Playfair Display',serif", fontSize:20 }}>
              Delete Project?
            </h3>
            <p style={{ color:"#5a8a5a", fontSize:14, marginBottom:24, lineHeight:1.6 }}>
              This will permanently delete the project and all its photos from the database. This cannot be undone.
            </p>
            <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
              <button onClick={()=>setConfirm(null)} style={{
                padding:"11px 24px", borderRadius:8, background:"transparent",
                border:"1px solid #2E7D32", color:"#4CAF50", cursor:"pointer", fontWeight:500
              }}>Cancel</button>
              <button onClick={()=>handleDelete(confirm)} style={{
                padding:"11px 24px", borderRadius:8, background:"#c62828",
                border:"none", color:"#fff", cursor:"pointer", fontWeight:600
              }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <Toast msg={toast} />
    </div>
  );
}
