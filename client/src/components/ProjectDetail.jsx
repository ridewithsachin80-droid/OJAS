import { useState } from "react";
import Lightbox from "./Lightbox.jsx";

export default function ProjectDetail({ project, onBack }) {
  const [lbIdx, setLbIdx] = useState(null);
  const photos = project.photos || [];

  return (
    <div style={{ maxWidth:960, margin:"0 auto", padding:"32px 20px 60px" }}>
      <button onClick={onBack} style={{
        background:"none", border:"none", cursor:"pointer",
        display:"flex", alignItems:"center", gap:8,
        color:"#2E7D32", fontWeight:600, fontSize:14, marginBottom:32, padding:0
      }}>← Back to All Projects</button>

      {/* Hero */}
      <div style={{
        background:"linear-gradient(135deg,#1B5E20,#2E7D32)",
        borderRadius:16, padding:"40px 40px 36px", color:"#fff",
        marginBottom:28, position:"relative", overflow:"hidden"
      }}>
        <div style={{ position:"absolute", inset:0, opacity:0.06,
          backgroundImage:"radial-gradient(circle,#fff 1px,transparent 1px)",
          backgroundSize:"24px 24px"
        }}/>
        <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginBottom:16 }}>
          <span style={{ background:"rgba(255,255,255,0.2)", padding:"4px 14px", borderRadius:50, fontSize:12, fontWeight:600 }}>
            {project.category}
          </span>
          <span style={{
            background: project.status==="ongoing"?"rgba(102,255,102,0.2)":"rgba(100,180,255,0.2)",
            padding:"4px 14px", borderRadius:50, fontSize:12, fontWeight:600
          }}>● {project.status==="ongoing"?"Ongoing":"Completed"}</span>
        </div>
        <h1 style={{
          fontFamily:"'Playfair Display',serif", fontSize:"clamp(24px,4vw,40px)",
          fontWeight:900, marginBottom:16, lineHeight:1.2
        }}>{project.title}</h1>
        <div style={{ display:"flex", flexWrap:"wrap", gap:24, fontSize:14, opacity:0.85 }}>
          {project.location      && <span>📍 {project.location}</span>}
          {project.beneficiaries && <span>👥 {project.beneficiaries}</span>}
          {project.year          && <span>📅 {project.year}</span>}
          {project.partner       && <span>🤝 {project.partner}</span>}
        </div>
      </div>

      {/* Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:20, marginBottom:28 }}>
        <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e8f5e9", padding:28 }}>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:"#1B5E20", marginBottom:14 }}>About this Project</h2>
          <p style={{ color:"#4a4a4a", lineHeight:1.8, fontSize:15 }}>{project.description}</p>
        </div>
        {project.impact && (
          <div style={{ background:"#F1F8E9", borderRadius:12, border:"1px solid #c5e1a5", padding:28 }}>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:"#33691E", marginBottom:14 }}>📊 Impact</h2>
            <p style={{ color:"#4a4a4a", lineHeight:1.8, fontSize:15 }}>{project.impact}</p>
          </div>
        )}
      </div>

      {/* Gallery */}
      <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e0e0e0", padding:28 }}>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:"#1a1a1a", marginBottom:20 }}>
          📸 Photo Gallery {photos.length > 0 && <span style={{ fontSize:14, fontWeight:400, color:"#888" }}>({photos.length} photos)</span>}
        </h2>
        {photos.length === 0 ? (
          <div style={{ textAlign:"center", padding:"48px 20px", color:"#ccc", border:"2px dashed #e0e0e0", borderRadius:8 }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🖼️</div>
            <div style={{ fontSize:14 }}>No photos yet for this project.</div>
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))", gap:12 }}>
            {photos.map((ph, i) => (
              <div key={ph.id||i} onClick={()=>setLbIdx(i)} style={{
                borderRadius:8, overflow:"hidden", cursor:"pointer",
                aspectRatio:"4/3", background:"#f5f5f5",
                transition:"transform 0.2s, box-shadow 0.2s",
                boxShadow:"0 2px 8px rgba(0,0,0,0.08)"
              }}
              onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.03)";e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,0.15)";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,0.08)";}}
              >
                <img src={ph.url} alt={ph.caption||`Photo ${i+1}`}
                  style={{ width:"100%", height:"100%", objectFit:"cover" }}
                  onError={e=>{e.target.src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect fill='%23f5f5f5' width='200' height='150'/%3E%3C/svg%3E";}}
                />
                {ph.caption && (
                  <div style={{
                    position:"absolute", bottom:0, left:0, right:0,
                    background:"rgba(0,0,0,0.55)", color:"#fff",
                    fontSize:11, padding:"4px 8px"
                  }}>{ph.caption}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {lbIdx !== null && (
        <Lightbox
          photos={photos}
          index={lbIdx}
          onClose={()=>setLbIdx(null)}
          onNav={dir=>setLbIdx(i=>(i+dir+photos.length)%photos.length)}
        />
      )}
    </div>
  );
}
