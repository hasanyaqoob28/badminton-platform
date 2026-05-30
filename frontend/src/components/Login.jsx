import { useState } from "react"
import { useAuth } from "../AuthContext"

export default function Login() {
  const { login } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await login(username, password)
    } catch {
      setError("Invalid username or password")
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a1628", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Background court lines */}
      <div style={{ position: "fixed", inset: 0, opacity: 0.03, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: 0, left: "50%", width: 2, height: "100%", background: "white" }} />
        <div style={{ position: "absolute", top: "30%", left: "15%", right: "15%", height: 2, background: "white" }} />
        <div style={{ position: "absolute", top: "70%", left: "15%", right: "15%", height: 2, background: "white" }} />
        <div style={{ position: "absolute", top: 0, left: "15%", width: 2, height: "100%", background: "white" }} />
        <div style={{ position: "absolute", top: 0, right: "15%", width: 2, height: "100%", background: "white" }} />
      </div>

      <div style={{ width: 380, position: "relative" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, #2d8a52, #4ab870)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", margin: "0 auto 16px", boxShadow: "0 0 30px rgba(74,184,112,0.4)" }}>🏸</div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 900, color: "white", letterSpacing: "-0.02em" }}>
            BADMINTON <span style={{ color: "#4ab870" }}>TOURNAMENT</span>
          </h1>
          <p style={{ color: "#2d8a52", fontSize: "0.78rem", letterSpacing: "0.15em", marginTop: 6 }}>CAPTAIN LOGIN</p>
        </div>

        {/* Card */}
        <div style={{ background: "linear-gradient(180deg, #0f1e35, #0d1a2e)", border: "1px solid #1a3a5c", borderRadius: 16, padding: 32, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: "0.7rem", fontWeight: 800, color: "#2d8a52", letterSpacing: "0.12em", display: "block", marginBottom: 8 }}>USERNAME</label>
              <input value={username} onChange={e => setUsername(e.target.value)} placeholder="captain_a"
                style={{ width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid #1a3a5c", borderRadius: 8, color: "#e2e8f0", fontSize: "0.9rem", outline: "none" }}
                onFocus={e => e.target.style.borderColor = "#4ab870"}
                onBlur={e => e.target.style.borderColor = "#1a3a5c"}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: "0.7rem", fontWeight: 800, color: "#2d8a52", letterSpacing: "0.12em", display: "block", marginBottom: 8 }}>PASSWORD</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                style={{ width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid #1a3a5c", borderRadius: 8, color: "#e2e8f0", fontSize: "0.9rem", outline: "none" }}
                onFocus={e => e.target.style.borderColor = "#4ab870"}
                onBlur={e => e.target.style.borderColor = "#1a3a5c"}
              />
            </div>

            {error && <div style={{ background: "rgba(252,129,129,0.1)", border: "1px solid #4a1a1a", borderRadius: 8, padding: "10px 14px", color: "#fc8181", fontSize: "0.82rem", marginBottom: 16 }}>{error}</div>}

            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "12px", border: "none", cursor: "pointer",
              background: loading ? "rgba(74,184,112,0.3)" : "linear-gradient(135deg, #2d8a52, #4ab870)",
              color: "white", borderRadius: 8, fontWeight: 800, fontSize: "0.9rem",
              letterSpacing: "0.08em", boxShadow: loading ? "none" : "0 4px 20px rgba(74,184,112,0.3)"
            }}>
              {loading ? "SIGNING IN..." : "SIGN IN →"}
            </button>
          </form>

          {/* Credentials hint */}
          <div style={{ marginTop: 24, padding: "14px", background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid #1a2a3a" }}>
            <div style={{ fontSize: "0.68rem", color: "#2d5a3d", fontWeight: 800, letterSpacing: "0.1em", marginBottom: 8 }}>DEFAULT CREDENTIALS</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: "0.72rem", color: "#4a6a5a" }}>
              {[["captain_a","pass_a"],["captain_b","pass_b"],["captain_c","pass_c"],["captain_d","pass_d"],["captain_e","pass_e"],["admin","admin123"]].map(([u,p]) => (
                <div key={u} style={{ cursor: "pointer", padding: "3px 6px", borderRadius: 4, transition: "background 0.15s" }}
                  onClick={() => { setUsername(u); setPassword(p) }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(74,184,112,0.08)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <span style={{ color: "#4ab870" }}>{u}</span> / {p}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
