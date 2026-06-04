import { useState, useEffect, useRef } from "react"
import { useAuth } from "../AuthContext"
import { useToast } from "../ToastContext"
import { api } from "../api"

export default function AuthModal({ onClose }) {
  const { login, requestPasswordReset } = useAuth()
  const toast = useToast()
  const [mode, setMode] = useState("login")
  const [username, setUsername] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [teamId, setTeamId] = useState("")
  const [playerId, setPlayerId] = useState("")
  const [teams, setTeams] = useState([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(false)
  const ref = useRef()

  useEffect(() => {
    api.get("/teams").then(r => setTeams(r.data))
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [onClose])

  const validatePassword = (pw) => {
    if (pw.length < 8) return "Password must be at least 8 characters"
    if (!/[A-Z]/.test(pw)) return "Password must contain an uppercase letter"
    if (!/[a-z]/.test(pw)) return "Password must contain a lowercase letter"
    if (!/\d/.test(pw)) return "Password must contain a number"
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    if (mode === "register") {
      const pwErr = validatePassword(password)
      if (pwErr) { setError(pwErr); return }
      if (!teamId) { setError("Please select a team"); return }
      if (!playerId) { setError("Please select your player slot"); return }
    }
    setLoading(true)
    try {
      if (mode === "login") {
        await login(username, password)
        toast.success(`Welcome back, ${username}!`)
        onClose()
      } else if (mode === "register") {
        await api.post("/register", { username, password, name, team_id: Number(teamId), player_id: playerId ? Number(playerId) : null })
        setRegistered(true)
      } else if (mode === "forgot") {
        await requestPasswordReset(username)
        toast.success("Password reset request submitted to admin!")
        setMode("login")
        setUsername("")
        setError("")
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

        {registered ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>⏳</div>
            <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "#4ab870", marginBottom: 8 }}>Registration Submitted!</h3>
            <p style={{ fontSize: "0.8rem", color: "#4a9d6f", lineHeight: 1.6, marginBottom: 20 }}>
              Your account is pending admin approval. You'll be able to login once approved.
            </p>
            <button onClick={onClose} style={{ width: "100%", padding: "10px", border: "none", borderRadius: 7, background: "linear-gradient(135deg, #2d8a52, #4ab870)", color: "white", fontWeight: 800, fontSize: "0.82rem", cursor: "pointer" }}>
              CLOSE
            </button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            {mode !== "forgot" && (
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
            )}

            {mode === "forgot" && (
              <div style={{ marginBottom: 20, paddingBottom: 12, borderBottom: "1px solid #1a3a2e", textAlign: "center" }}>
                <h3 style={{ fontSize: "0.9rem", fontWeight: 800, color: "#4ab870", margin: "0 0 4px 0", letterSpacing: "0.08em" }}>
                  🔐 PASSWORD RESET
                </h3>
                <p style={{ fontSize: "0.7rem", color: "#2d5a3d", margin: 0 }}>Request reset from admin</p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <input value={username} onChange={e => setUsername(e.target.value)}
                placeholder="Username" required style={inp}
                onFocus={e => e.target.style.borderColor = "#4ab870"}
                onBlur={e => e.target.style.borderColor = "#1a3a5c"} />

              {mode !== "forgot" && (
                <>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Password" required style={inp}
                    onFocus={e => e.target.style.borderColor = "#4ab870"}
                    onBlur={e => e.target.style.borderColor = "#1a3a5c"} />
                  {mode === "register" && (
                    <p style={{ fontSize: "0.68rem", color: "#2d5a3d", marginTop: -8, marginBottom: 12 }}>
                      Min 8 chars · uppercase · lowercase · number
                    </p>
                  )}
                </>
              )}

              {mode === "register" && (
                <>
                  <select value={teamId} onChange={e => { setTeamId(e.target.value); setPlayerId("") }} required
                    style={{ ...inp, cursor: "pointer" }}>
                    <option value="">— Select your team —</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id} disabled={!!t.captain}>
                        {t.name} {t.captain ? "✗ captain assigned" : "✓ available"}
                      </option>
                    ))}
                  </select>
                  {teamId && (() => {
                    const selectedTeam = teams.find(t => t.id === Number(teamId))
                    const players = selectedTeam?.players || []
                    return (
                      <>
                        <select value={playerId} onChange={e => {
                          setPlayerId(e.target.value)
                          const p = players.find(p => p.id === Number(e.target.value))
                          if (p) setName(p.name)
                        }} required style={{ ...inp, cursor: "pointer" }}>
                          <option value="">— Select your player slot —</option>
                          {players.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <p style={{ fontSize: "0.7rem", color: "#2d5a3d", marginBottom: 12, marginTop: -8 }}>
                          Select which player in the roster you are
                        </p>
                      </>
                    )
                  })()}
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
                {loading ? "..." : mode === "login" ? "SIGN IN →" : mode === "register" ? "CREATE ACCOUNT →" : "REQUEST RESET →"}
              </button>

              {mode === "login" && (
                <div style={{ marginTop: 14, textAlign: "center" }}>
                  <button type="button" onClick={() => { setMode("forgot"); setError(""); setUsername("") }} style={{
                    fontSize: "0.75rem", color: "#4a9d6f", background: "none", border: "none",
                    cursor: "pointer", fontWeight: 700, letterSpacing: "0.08em", transition: "color 0.2s",
                  }} onMouseEnter={e => e.target.style.color = "#4ab870"}
                    onMouseLeave={e => e.target.style.color = "#4a9d6f"}>
                    🔐 FORGOT PASSWORD?
                  </button>
                </div>
              )}

              {mode === "forgot" && (
                <div style={{ marginTop: 14, textAlign: "center" }}>
                  <button type="button" onClick={() => { setMode("login"); setError(""); setUsername("") }} style={{
                    fontSize: "0.75rem", color: "#4a9d6f", background: "none", border: "none",
                    cursor: "pointer", fontWeight: 700, letterSpacing: "0.08em", transition: "color 0.2s",
                  }} onMouseEnter={e => e.target.style.color = "#4ab870"}
                    onMouseLeave={e => e.target.style.color = "#4a9d6f"}>
                    ← BACK TO LOGIN
                  </button>
                </div>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  )
}
