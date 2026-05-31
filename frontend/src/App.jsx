import { useEffect, useState, useCallback } from "react"
import { api } from "./api"
import { useAuth } from "./AuthContext"
import { useToast } from "./ToastContext"
import ScheduleTable from "./components/ScheduleTable"
import ScoreEntry from "./components/ScoreEntry"
import Standings from "./components/Standings"
import Teams from "./components/Teams"
import Stats from "./components/Stats"
import Knockout from "./components/Knockout"
import AuthModal from "./components/AuthModal"

export default function App() {
  const { user, logout } = useAuth()
  const toast = useToast()
  const [matches, setMatches] = useState([])
  const [standings, setStandings] = useState([])
  const [teams, setTeams] = useState([])
  const [scheduleTab, setScheduleTab] = useState("TEAMS")
  const [rightTab, setRightTab] = useState("SCORE")
  const [loading, setLoading] = useState(true)
  const [ticker, setTicker] = useState([])
  const [showAuth, setShowAuth] = useState(false)

  const fetchAll = useCallback(async () => {
    try {
      const [m, s, t] = await Promise.all([api.get("/schedule"), api.get("/standings"), api.get("/teams")])
      setMatches(m.data)
      setStandings(s.data)
      setTeams(t.data)
      setTicker(m.data.filter(x => x.completed).slice(-3).reverse())
    } catch {
      // silently retry on background refresh; error interceptor handles 401/500
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 30000)
    return () => clearInterval(interval)
  }, [fetchAll])

  const completed = matches.filter(m => m.completed).length
  const total = matches.length
  const pct = total ? Math.round((completed / total) * 100) : 0
  const disputed = matches.filter(m => m.disputed).length

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0a1628" }}>
      <div style={{ fontSize: "3rem" }}>🏸</div>
      <p style={{ marginTop: 12, color: "#4a9d6f", fontWeight: 600, letterSpacing: "0.1em", fontSize: "0.9rem" }}>LOADING TOURNAMENT...</p>
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: "#0a1628" }}>

      {/* LIVE TICKER */}
      {ticker.length > 0 && (
        <div style={{ background: "#0d2137", borderBottom: "1px solid #1a3a2e", padding: "5px 28px", display: "flex", alignItems: "center", gap: 0, overflow: "hidden" }}>
          <span style={{ fontSize: "0.62rem", fontWeight: 800, color: "#4ab870", letterSpacing: "0.12em", marginRight: 16, flexShrink: 0 }}>🔴 LIVE</span>
          <div style={{ display: "flex", gap: 24, overflow: "hidden" }}>
            {ticker.map(m => (
              <span key={m.id} style={{ fontSize: "0.7rem", color: "#4a9d6f", whiteSpace: "nowrap" }}>
                <span style={{ color: "#c8d8e8", fontWeight: 600 }}>{m.team1}</span>
                <span style={{ color: "#4ab870", fontWeight: 800, margin: "0 5px" }}>{m.sets_won_team1}-{m.sets_won_team2}</span>
                <span style={{ color: "#c8d8e8", fontWeight: 600 }}>{m.team2}</span>
                <span style={{ color: "#2d5a3d", margin: "0 4px" }}>·</span>
                <span style={{ color: "#2d8a52" }}>{m.pair_group}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* TOPBAR */}
      <header style={{ background: "linear-gradient(135deg, #0d2137 0%, #0f3d24 50%, #0d2137 100%)", borderBottom: "2px solid #2d5a3d", padding: "0 28px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.04, pointerEvents: "none" }}>
          <div style={{ position: "absolute", top: 0, left: "50%", width: 2, height: "100%", background: "white" }} />
          <div style={{ position: "absolute", top: "50%", left: "10%", right: "10%", height: 2, background: "white" }} />
          <div style={{ position: "absolute", top: 0, left: "10%", width: 2, height: "100%", background: "white" }} />
          <div style={{ position: "absolute", top: 0, right: "10%", width: 2, height: "100%", background: "white" }} />
        </div>

        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, padding: "16px 0" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, #2d8a52, #4ab870)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", boxShadow: "0 0 20px rgba(74,184,112,0.4)" }}>🏸</div>
            <div>
              <h1 style={{ fontSize: "1.3rem", fontWeight: 900, color: "white", letterSpacing: "-0.02em", margin: 0 }}>
                BADMINTON <span style={{ color: "#4ab870" }}>TOURNAMENT</span>

              </h1>
              <p style={{ fontSize: "0.68rem", color: "#4a9d6f", letterSpacing: "0.15em", marginTop: 2 }}>5 TEAMS · 10 PAIRS · {total} MATCHES · 6 COURTS</p>
            </div>
          </div>

          {/* Right side: progress + auth */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Progress bar */}
            <div style={{ minWidth: 200 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: "0.65rem", color: "#4a9d6f", letterSpacing: "0.1em", fontWeight: 600 }}>PROGRESS</span>
                <span style={{ fontSize: "0.65rem", color: "#4ab870", fontWeight: 800 }}>{pct}%</span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 4, height: 5 }}>
                <div style={{ height: 5, borderRadius: 4, background: "linear-gradient(90deg, #2d8a52, #4ab870)", width: `${pct}%`, transition: "width 0.6s" }} />
              </div>
              {disputed > 0 && <div style={{ fontSize: "0.6rem", color: "#fc8181", fontWeight: 700, marginTop: 3 }}>⚠️ {disputed} disputed</div>}
            </div>

            {/* Auth area */}
            {user ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "rgba(255,255,255,0.04)", borderRadius: 8, border: "1px solid #1a3a2e" }}>
                <span style={{ fontSize: "0.9rem" }}>{user.is_admin ? "👑" : "🏸"}</span>
                <div>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#4ab870", lineHeight: 1.2 }}>{user.username}</div>
                  <div style={{ fontSize: "0.58rem", color: "#2d5a3d" }}>{user.is_admin ? "Admin" : user.team}</div>
                </div>
                <button onClick={logout} style={{ background: "rgba(252,129,129,0.1)", border: "1px solid #4a1a1a", borderRadius: 5, padding: "3px 8px", color: "#fc8181", fontSize: "0.65rem", fontWeight: 700, cursor: "pointer", marginLeft: 4 }}>LOGOUT</button>
              </div>
            ) : (
              <button onClick={() => setShowAuth(true)} style={{
                padding: "8px 18px", background: "linear-gradient(135deg, #2d8a52, #4ab870)",
                border: "none", borderRadius: 8, color: "white", fontWeight: 800,
                fontSize: "0.78rem", letterSpacing: "0.08em", cursor: "pointer",
                boxShadow: "0 4px 15px rgba(74,184,112,0.3)"
              }}>
                🔑 LOGIN / REGISTER
              </button>
            )}
          </div>
        </div>
      </header>

      {/* STAT CARDS */}
      <div className="stat-cards page-padding" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, padding: "16px 28px 0" }}>
        {[
          { label: "TOTAL MATCHES", value: total, icon: "🎯", color: "#4ab870", glow: "rgba(74,184,112,0.2)", border: "#1a4a2e" },
          { label: "COMPLETED", value: completed, icon: "✅", color: "#63b3ed", glow: "rgba(99,179,237,0.2)", border: "#1a3a5c" },
          { label: "PENDING", value: total - completed, icon: "⏳", color: "#f6ad55", glow: "rgba(246,173,85,0.2)", border: "#4a3010" },
          { label: "DISPUTED", value: disputed, icon: "⚠️", color: "#fc8181", glow: "rgba(252,129,129,0.2)", border: "#4a1a1a" },
        ].map(c => (
          <div key={c.label} style={{ background: "linear-gradient(135deg, #0f1e35, #0d2137)", border: `1px solid ${c.border}`, borderRadius: 12, padding: "14px 18px", boxShadow: `0 4px 20px ${c.glow}`, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: "1.5rem" }}>{c.icon}</div>
            <div>
              <div style={{ fontSize: "1.6rem", fontWeight: 900, color: c.color, lineHeight: 1 }}>{c.value}</div>
              <div style={{ fontSize: "0.6rem", color: "#4a6a5a", marginTop: 4, fontWeight: 700, letterSpacing: "0.1em" }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* MAIN GRID */}
      <div className="main-grid page-padding" style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, padding: "16px 28px" }}>

        {/* Left panel */}
        <div style={{ background: "linear-gradient(180deg, #0f1e35, #0d1a2e)", borderRadius: 16, padding: "20px 22px", border: "1px solid #1a3a5c", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
          <div className="nav-tabs" style={{ display: "flex", gap: 0, marginBottom: 18, borderBottom: "1px solid #1a3a2e" }}>
            {[
              { key: "TEAMS", icon: "👥" },
              { key: "SCHEDULE", icon: "📅" },
              { key: "STATS", icon: "📊" },
              { key: "KNOCKOUT", icon: "🏆" },
              ...(user?.is_admin ? [{ key: "ROSTER", icon: "📋" }, { key: "CAPTAINS", icon: "👑" }] : []),
            ].map(({ key, icon }) => (
              <button key={key} onClick={() => setScheduleTab(key)} style={{
                padding: "8px 16px", background: "none", border: "none", cursor: "pointer",
                fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.08em",
                color: scheduleTab === key ? "#4ab870" : "#2d5a3d",
                borderBottom: scheduleTab === key ? "2px solid #4ab870" : "2px solid transparent",
                marginBottom: -1, transition: "all 0.2s"
              }}>
                {icon} {key}
              </button>
            ))}
          </div>
          {scheduleTab === "SCHEDULE" && <ScheduleTable matches={matches} />}
          {scheduleTab === "TEAMS" && <Teams teams={user && !user.is_admin ? teams.filter(t => t.name === user.team) : teams} onTeamsUpdated={fetchAll} />}
          {scheduleTab === "ROSTER" && <Teams teams={user && !user.is_admin ? teams.filter(t => t.name === user.team) : teams} onTeamsUpdated={fetchAll} view="roster" />}
          {scheduleTab === "CAPTAINS" && <Teams teams={teams} onTeamsUpdated={fetchAll} view="captains" />}
          {scheduleTab === "STATS" && <Stats />}
          {scheduleTab === "KNOCKOUT" && <Knockout />}
        </div>

        {/* Right panel */}
        <div className="right-panel" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ background: "linear-gradient(180deg, #0f2a1e, #0a1f16)", borderRadius: 16, padding: "20px 22px", border: "1px solid #1a4a2e", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: "1px solid #1a4a2e" }}>
              {[{ key: "SCORE", icon: "🏸" }, { key: "STANDINGS", icon: "🏆" }].map(({ key, icon }) => (
                <button key={key} onClick={() => setRightTab(key)} style={{
                  padding: "7px 14px", background: "none", border: "none", cursor: "pointer",
                  fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.08em",
                  color: rightTab === key ? "#4ab870" : "#2d5a3d",
                  borderBottom: rightTab === key ? "2px solid #4ab870" : "2px solid transparent",
                  marginBottom: -1
                }}>
                  {icon} {key}
                </button>
              ))}
            </div>
            {rightTab === "SCORE"
              ? <ScoreEntry matches={matches} onScoreUpdated={fetchAll} onLoginClick={() => setShowAuth(true)} />
              : <Standings standings={standings} />}
          </div>

          {rightTab === "SCORE" && (
            <div style={{ background: "linear-gradient(180deg, #1a1535, #120f28)", borderRadius: 16, padding: "20px 22px", border: "1px solid #2d2060", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 4, height: 20, background: "linear-gradient(180deg, #b794f4, #805ad5)", borderRadius: 2 }} />
                <h2 style={{ fontSize: "0.85rem", fontWeight: 800, color: "#e2e8f0", letterSpacing: "0.08em" }}>🏆 STANDINGS</h2>
              </div>
              <Standings standings={standings} />
            </div>
          )}
        </div>
      </div>

      {/* Auth modal */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  )
}
