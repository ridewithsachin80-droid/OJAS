import { useState } from "react";
import { login } from "../api.js";

export default function AdminLogin({ onLogin, onBack }) {
  const [pw,  setPw]  = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!pw) return;
    setLoading(true); setErr("");
    try {
      await login(pw);
      onLogin();
    } catch (e) {
      setErr(e.message || "Incorrect password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:"#0F1F0F", padding:20
    }}>
      <div style={{
        background:"#1a2e1a", border:"1px solid #2E7D32", borderRadius:16,
        padding:40, width:"100%", maxWidth:360, textAlign:"center"
      }}>
        <div style={{ fontSize:40, marginBottom:16 }}>🔒</div>
        <h2 style={{ fontFamily:"'Playfair Display',serif", color:"#A5D6A7", fontSize:24, marginBottom:8 }}>Admin Panel</h2>
        <p style={{ color:"#5a8a5a", fontSize:13, marginBottom:28 }}>Shuddhi Educational Charitable Trust</p>

        <input
          type="password" placeholder="Enter admin password"
          value={pw} onChange={e=>{ setPw(e.target.value); setErr(""); }}
          onKeyDown={e=>e.key==="Enter"&&handle()}
          style={{
            width:"100%", padding:"12px 16px", borderRadius:8,
            border: err?"1.5px solid #ef5350":"1.5px solid #2E7D32",
            background:"#0f1f0f", color:"#fff", fontSize:14,
            outline:"none", boxSizing:"border-box", marginBottom: err?8:16
          }}
        />
        {err && <p style={{ color:"#ef5350", fontSize:12, marginBottom:16, textAlign:"left" }}>{err}</p>}

        <button onClick={handle} disabled={loading} style={{
          width:"100%", padding:13, borderRadius:8,
          background: loading?"#1a4d1a":"#2E7D32",
          color:"#fff", border:"none", fontSize:15, fontWeight:600, cursor:"pointer"
        }}>
          {loading ? "Logging in…" : "Login"}
        </button>
        <button onClick={onBack} style={{
          marginTop:16, background:"none", border:"none",
          color:"#5a8a5a", cursor:"pointer", fontSize:13
        }}>← Back to site</button>
      </div>
    </div>
  );
}
