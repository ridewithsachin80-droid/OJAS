import { useEffect } from "react";

export default function Lightbox({ photos, index, onClose, onNav }) {
  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape")      onClose();
      if (e.key === "ArrowRight")  onNav(1);
      if (e.key === "ArrowLeft")   onNav(-1);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, onNav]);

  if (!photos.length) return null;
  const photo = photos[index];

  return (
    <div onClick={onClose} style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.93)",
      zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center"
    }}>
      <button onClick={onClose} style={{
        position:"absolute", top:20, right:24, background:"none",
        border:"none", color:"#fff", fontSize:36, cursor:"pointer", lineHeight:1, zIndex:2
      }}>×</button>

      {photos.length > 1 && <>
        <button onClick={e=>{e.stopPropagation();onNav(-1);}} style={{
          position:"absolute", left:16, background:"rgba(255,255,255,0.12)",
          border:"none", color:"#fff", width:52, height:52, borderRadius:"50%",
          fontSize:28, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", zIndex:2
        }}>‹</button>
        <button onClick={e=>{e.stopPropagation();onNav(1);}} style={{
          position:"absolute", right:16, background:"rgba(255,255,255,0.12)",
          border:"none", color:"#fff", width:52, height:52, borderRadius:"50%",
          fontSize:28, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", zIndex:2
        }}>›</button>
      </>}

      <div onClick={e=>e.stopPropagation()} style={{ textAlign:"center", maxWidth:"90vw" }}>
        <img
          src={photo.url}
          alt={photo.caption || `Photo ${index+1}`}
          style={{ maxWidth:"90vw", maxHeight:"80vh", objectFit:"contain", borderRadius:10 }}
        />
        {photo.caption && (
          <p style={{ color:"rgba(255,255,255,0.75)", marginTop:12, fontSize:14 }}>{photo.caption}</p>
        )}
      </div>

      <div style={{ position:"absolute", bottom:20, color:"rgba(255,255,255,0.5)", fontSize:13 }}>
        {index+1} / {photos.length}
      </div>
    </div>
  );
}
