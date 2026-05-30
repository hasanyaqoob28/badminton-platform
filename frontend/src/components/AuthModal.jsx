import { useState, useEffect, useRef } from "react"
import { useAuth } from "../AuthContext"
import { api } from "../api"

export default function AuthModal({ onClose }) {
  const { login } = useAuth()
  const [mode, setMode] = useState("login")
  const [username, setUsername] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [teamId, setTeamId] = useState("")
  const [teams, setTeams] = useState([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const ref = useRef()

  useEffect(() => {
    api.get("/teams").then(r => setTeams(r.data))
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [onClose])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      if (mode === "login") {
        await login(username, password)
        onClose()
      } else {
        if (!teamId) { setError("Please select a team"); setLoading(false); return }
        const res = await api.post("/register", { username, password, name, team_id: Number(teamId) })
        localStorage.setItem("badminton_token", res.data.access_token)
        localStorage.setItem("badminton_user", JSON.stringify(res.data))
        api.defaults.headers.common["Authorization"] = `Bearer ${res.data.access_token}`
        window.location.reload()
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong")
    }
    setLoading(false)
  }

  const inp = {
    width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)",
    border: "1px solid #1a3a5c", borderRadius: 7, color: "#e2e8f0",
    fontSize: "0.85rem", outline: "none", marginBottom: 12
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "flex-end", paddingTop: 64, paddingRight: 28 }}>
      <div ref={ref} style={{ width: 320, background: "linear-gradient(180deg, #0f1e35, #0d1a2e)", border: "1px solid #1a3a5c", borderRadius: 14, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>

        {/* Tabs */}
        <div style={{ display: "flex", marginBottom: 20, borderBottom: "1px solid #1a3a2e" }}>
          {["login", "register"].map(m => (
            <button key={m} onClick={() => { setMode(m); setError("") }} style={{
              flex: 1, padding: "8px", background: "none", border: "none", cursor: "pointer",
              fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.1em",
              color: mode === m ? "#4ab870" : "#2d5a3d",
              borderBottom: mode === m ? "2px solid #4ab870" : "2px solid transparent",
              marginBottom: -1
            }}>
              {m === "login" ? "🔑 LOGIN" : "📝 REGISTER"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <input value={username} onChange={e => setUsername(e.target.value)}
            placeholder="Username" required style={inp}
            onFocus={e => e.target.style.borderColor = "#4ab870"}
            onBlur={e => e.target.style.borderColor = "#1a3a5c"} />

          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Password" required style={inp}
            onFocus={e => e.target.style.borderColor = "#4ab870"}
            onBlur={e => e.target.style.borderColor = "#1a3a5c"} />

          {mode === "register" && (
            <>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="Your full name" required style={inp}
                onFocus={e => e.target.style.borderColor = "#4ab870"}
                onBlur={e => e.target.style.borderColor = "#1a3a5c"} />
              <select value={teamId} onChange={e => setTeamId(e.target.value)} required
                style={{ ...inp, cursor: "pointer" }}>
                <option value="">— Select your team —</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id} disabled={!!t.captain}>
                    {t.name} {t.captain ? "✗ captain assigned" : "✓ available"}
                  </option>
                ))}
              </select>
              <p style={{ fontSize: "0.7rem", color: "#2d5a3d", marginBottom: 12, marginTop: -8 }}>
                Teams marked ✗ already have a captain. Contact admin to remove.
              </p>
            </>
          )}

          {error && (
            <div style={{ background: "rgba(252,129,129,0.1)", border: "1px solid #4a1a1a", borderRadius: 6, padding: "8px 12px", color: "#fc8181", fontSize: "0.78rem", marginBottom: 12 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: "100%", padding: "10px", border: "none", cursor: "pointer", borderRadius: 7,
            fontWeight: 800, fontSize: "0.82rem", letterSpacing: "0.08em",
            background: loading ? "rgba(74,184,112,0.3)" : "linear-gradient(135deg, #2d8a52, #4ab870)",
            color: "white", boxShadow: loading ? "none" : "0 4px 15px rgba(74,184,112,0.25)"
          }}>
            {loading ? "..." : mode === "login" ? "SIGN IN →" : "CREATE ACCOUNT →"}
          </button>
        </form>
      </div>
    </div>
  )
}
