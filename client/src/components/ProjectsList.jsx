import { useState } from "react";

const CAT_COLORS = {
  "Education":         { bg:"#E8F5E9", text:"#1B5E20" },
  "Infrastructure":    { bg:"#E3F2FD", text:"#0D47A1" },
  "Special Needs":     { bg:"#F3E5F5", text:"#4A148C" },
  "Women Empowerment": { bg:"#FFF8E1", text:"#E65100" },
  "Health & Welfare":  { bg:"#FCE4EC", text:"#880E4F" },
  "Community Welfare": { bg:"#E0F2F1", text:"#004D40" },
};
const CAT_ICON = {
  "Education":"📚","Infrastructure":"🏗️","Special Needs":"💙",
  "Women Empowerment":"👩","Health & Welfare":"🏥","Community Welfare":"🤝",
};

export default function ProjectsList({ projects, onSelect, onAdminClick }) {
  const [filter, setFilter] = useState("All");
  const categories = ["All", ...Array.from(new Set(projects.map(p => p.category)))];
  const filtered   = filter === "All" ? projects : projects.filter(p => p.category === filter);

  return (
    <div style={{ minHeight:"100vh", background:"#FFFDF7" }}>
      {/* Header */}
      <div style={{
        background:"linear-gradient(135deg,#1B5E20 0%,#2E7D32 60%,#388E3C 100%)",
        padding:"60px 5% 48px", position:"relative", overflow:"hidden"
      }}>
        <div style={{ position:"absolute", inset:0, opacity:0.06,
          backgroundImage:"radial-gradient(circle,#fff 1px,transparent 1px)", backgroundSize:"28px 28px"
        }}/>
        <div style={{ position:"relative", maxWidth:960, margin:"0 auto" }}>
          <div style={{
            display:"inline-flex", alignItems:"center", gap:8,
            background:"rgba(255,255,255,0.15)", borderRadius:50,
            padding:"6px 18px", marginBottom:20, fontSize:12,
            color:"rgba(255,255,255,0.9)", fontWeight:600, letterSpacing:1, textTransform:"uppercase"
          }}>
            <span style={{ width:7, height:7, background:"#A5D6A7", borderRadius:"50%", animation:"pulse 2s infinite" }}/>
            Since 2015 • Tumkur, Karnataka
          </div>
          <h1 style={{
            fontFamily:"'Playfair Display',serif", fontSize:"clamp(28px,5vw,52px)",
            color:"#fff", fontWeight:900, marginBottom:14, lineHeight:1.1
          }}>Our Projects & Initiatives</h1>
          <p style={{ color:"rgba(255,255,255,0.8)", fontSize:16, maxWidth:560, lineHeight:1.7 }}>
            28+ projects across education, infrastructure, women empowerment, and community welfare.
          </p>
          <div style={{ display:"flex", gap:32, flexWrap:"wrap", marginTop:32 }}>
            {[["28+","Projects"],["12,000+","Lives Impacted"],["1,500+","Women Benefited"],["700+","Special Needs"]].map(([n,l])=>(
              <div key={l}>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28, color:"#fff", fontWeight:900, lineHeight:1 }}>{n}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.65)", marginTop:4, textTransform:"uppercase", letterSpacing:0.8 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{
        background:"#fff", borderBottom:"1px solid #e8f5e9", padding:"14px 5%",
        display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10
      }}>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {categories.map(c => (
            <button key={c} onClick={()=>setFilter(c)} style={{
              padding:"7px 16px", borderRadius:50, fontSize:13, fontWeight:500, cursor:"pointer",
              border: filter===c?"none":"1px solid #e0e0e0",
              background: filter===c?"#2E7D32":"#fff",
              color: filter===c?"#fff":"#555", transition:"all 0.2s"
            }}>{c}</button>
          ))}
        </div>
        <button onClick={onAdminClick} style={{
          padding:"7px 18px", borderRadius:50, fontSize:13, fontWeight:600,
          background:"transparent", border:"1.5px solid #F57C00", color:"#F57C00", cursor:"pointer"
        }}>⚙ Admin</button>
      </div>

      {/* Grid */}
      <div style={{ padding:"32px 5% 60px", maxWidth:1200, margin:"0 auto" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:20 }}>
          {filtered.map(project => {
            const cat   = CAT_COLORS[project.category] || CAT_COLORS["Education"];
            const thumb = project.photos?.[0]?.url;
            return (
              <div key={project.id} onClick={()=>onSelect(project.id)} style={{
                background:"#fff", borderRadius:14, overflow:"hidden",
                border:"1px solid #eee", cursor:"pointer",
                transition:"transform 0.2s, box-shadow 0.2s",
                boxShadow:"0 2px 12px rgba(0,0,0,0.06)"
              }}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow="0 12px 32px rgba(0,0,0,0.12)";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 2px 12px rgba(0,0,0,0.06)";}}
              >
                <div style={{ height:180, background:"#f0f4f0", position:"relative", overflow:"hidden" }}>
                  {thumb
                    ? <img src={thumb} alt={project.title} style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e=>e.target.style.display="none"} />
                    : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center",
                        background:"linear-gradient(135deg,#E8F5E9,#C8E6C9)", fontSize:48 }}>
                        {CAT_ICON[project.category]||"📌"}
                      </div>
                  }
                  <div style={{
                    position:"absolute", top:10, left:10,
                    background:cat.bg, color:cat.text,
                    padding:"4px 12px", borderRadius:50, fontSize:11, fontWeight:600
                  }}>{project.category}</div>
                  {(project.photos?.length||0) > 0 && (
                    <div style={{
                      position:"absolute", bottom:10, right:10,
                      background:"rgba(0,0,0,0.55)", color:"#fff",
                      padding:"3px 10px", borderRadius:50, fontSize:11
                    }}>📷 {project.photos.length}</div>
                  )}
                </div>
                <div style={{ padding:"20px 20px 22px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                    <h3 style={{
                      fontFamily:"'Playfair Display',serif", fontSize:17,
                      color:"#1a1a1a", fontWeight:700, lineHeight:1.3, flex:1, marginRight:8
                    }}>{project.title}</h3>
                    <span style={{
                      background: project.status==="ongoing"?"#E8F5E9":"#E3F2FD",
                      color: project.status==="ongoing"?"#1B5E20":"#0D47A1",
                      padding:"3px 10px", borderRadius:50, fontSize:10, fontWeight:600, whiteSpace:"nowrap"
                    }}>{project.status}</span>
                  </div>
                  <p style={{
                    color:"#777", fontSize:13, lineHeight:1.6, marginBottom:14,
                    display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden"
                  }}>{project.description}</p>
                  <div style={{ display:"flex", gap:16, fontSize:12, color:"#888" }}>
                    <span>📍 {(project.location||"").split(",")[0]}</span>
                    <span>👥 {project.beneficiaries}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <div style={{ textAlign:"center", padding:"80px 20px", color:"#aaa" }}>
            <div style={{ fontSize:48, marginBottom:16 }}>📂</div>
            <p>No projects found in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
}
