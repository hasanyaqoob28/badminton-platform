import { useEffect, useState } from "react"
import { api } from "./api"
import ScheduleTable from "./components/ScheduleTable"
import ScoreEntry from "./components/ScoreEntry"
import Standings from "./components/Standings"
import Teams from "./components/Teams"

export default function App() {
  const [matches, setMatches] = useState([])
  const [standings, setStandings] = useState([])
  const [teams, setTeams] = useState([])
  const [scheduleTab, setScheduleTab] = useState("TEAMS")
  const [loading, setLoading] = useState(true)

  const fetchAll = async () => {
    const [m, s, t] = await Promise.all([api.get("/schedule"), api.get("/standings"), api.get("/teams")])
    setMatches(m.data)
    setStandings(s.data)
    setTeams(t.data)
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const completed = matches.filter(m => m.completed).length
  const total = matches.length
  const pct = total ? Math.round((completed / total) * 100) : 0

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0a1628" }}>
      <div style={{ fontSize: "4rem", animation: "spin 1s linear infinite" }}>🏸</div>
      <p style={{ marginTop: 16, color: "#4a9d6f", fontWeight: 600, letterSpacing: "0.1em", fontSize: "0.9rem" }}>LOADING TOURNAMENT...</p>
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: "#0a1628" }}>

      {/* HERO HEADER */}
      <header style={{
        background: "linear-gradient(135deg, #0d2137 0%, #0f3d24 50%, #0d2137 100%)",
        borderBottom: "2px solid #2d5a3d",
        padding: "0 28px",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Court lines decoration */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.04 }}>
          <div style={{ position: "absolute", top: 0, left: "50%", width: 2, height: "100%", background: "white" }} />
          <div style={{ position: "absolute", top: "50%", left: "10%", right: "10%", height: 2, background: "white" }} />
          <div style={{ position: "absolute", top: 0, left: "10%", width: 2, height: "100%", background: "white" }} />
          <div style={{ position: "absolute", top: 0, right: "10%", width: 2, height: "100%", background: "white" }} />
        </div>

        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, padding: "20px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%",
              background: "linear-gradient(135deg, #2d8a52, #4ab870)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.6rem", boxShadow: "0 0 20px rgba(74,184,112,0.4)"
            }}>🏸</div>
            <div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 900, color: "white", letterSpacing: "-0.02em" }}>
                BADMINTON <span style={{ color: "#4ab870" }}>TOURNAMENT</span>
              </h1>
              <p style={{ fontSize: "0.75rem", color: "#4a9d6f", letterSpacing: "0.15em", marginTop: 2 }}>
                5 TEAMS · 10 PAIRS · {total} MATCHES · 6 COURTS
              </p>
            </div>
          </div>

          {/* Progress */}
          <div style={{ minWidth: 260 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: "0.72rem", color: "#4a9d6f", letterSpacing: "0.1em", fontWeight: 600 }}>TOURNAMENT PROGRESS</span>
              <span style={{ fontSize: "0.72rem", color: "#4ab870", fontWeight: 800 }}>{pct}%</span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 4, height: 6 }}>
              <div style={{ height: 6, borderRadius: 4, background: "linear-gradient(90deg, #2d8a52, #4ab870)", width: `${pct}%`, transition: "width 0.6s ease", boxShadow: "0 0 8px rgba(74,184,112,0.6)" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontSize: "0.7rem", color: "#2d5a3d" }}>{completed} completed</span>
              <span style={{ fontSize: "0.7rem", color: "#2d5a3d" }}>{total - completed} remaining</span>
            </div>
          </div>
        </div>
      </header>

      {/* STAT CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, padding: "20px 28px 0" }}>
        {[
          { label: "TOTAL MATCHES", value: total, icon: "🎯", color: "#4ab870", glow: "rgba(74,184,112,0.2)", border: "#1a4a2e" },
          { label: "COMPLETED", value: completed, icon: "✅", color: "#63b3ed", glow: "rgba(99,179,237,0.2)", border: "#1a3a5c" },
          { label: "PENDING", value: total - completed, icon: "⏳", color: "#f6ad55", glow: "rgba(246,173,85,0.2)", border: "#4a3010" },
          { label: "COURTS", value: 6, icon: "🏟️", color: "#b794f4", glow: "rgba(183,148,244,0.2)", border: "#3a2a5c" },
        ].map(c => (
          <div key={c.label} style={{
            background: "linear-gradient(135deg, #0f1e35, #0d2137)",
            border: `1px solid ${c.border}`,
            borderRadius: 12, padding: "16px 20px",
            boxShadow: `0 4px 20px ${c.glow}`,
            display: "flex", alignItems: "center", gap: 14
          }}>
            <div style={{ fontSize: "1.8rem" }}>{c.icon}</div>
            <div>
              <div style={{ fontSize: "1.8rem", fontWeight: 900, color: c.color, lineHeight: 1 }}>{c.value}</div>
              <div style={{ fontSize: "0.65rem", color: "#4a6a5a", marginTop: 4, fontWeight: 700, letterSpacing: "0.1em" }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* MAIN GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20, padding: "20px 28px" }}>

        {/* Schedule */}
        <div style={{
          background: "linear-gradient(180deg, #0f1e35, #0d1a2e)",
          borderRadius: 16, padding: "22px",
          border: "1px solid #1a3a5c",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)"
        }}>
          {/* Schedule card tabs */}
          <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 18, borderBottom: "1px solid #1a3a2e" }}>
            {["SCHEDULE", "TEAMS"].map(tab => (
              <button key={tab} onClick={() => setScheduleTab(tab)} style={{
                padding: "8px 20px", background: "none", border: "none", cursor: "pointer",
                fontSize: "0.78rem", fontWeight: 800, letterSpacing: "0.1em",
                color: scheduleTab === tab ? "#4ab870" : "#2d5a3d",
                borderBottom: scheduleTab === tab ? "2px solid #4ab870" : "2px solid transparent",
                marginBottom: -1, transition: "all 0.2s"
              }}>
                {tab === "SCHEDULE" ? "📅 " : "👥 "}{tab}
              </button>
            ))}
          </div>
          {scheduleTab === "SCHEDULE" ? <ScheduleTable matches={matches} /> : <Teams teams={teams} onTeamsUpdated={fetchAll} />}
        </div>

        {/* Right sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Score Entry */}
          <div style={{
            background: "linear-gradient(180deg, #0f2a1e, #0a1f16)",
            borderRadius: 16, padding: "22px",
            border: "1px solid #1a4a2e",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <div style={{ width: 4, height: 20, background: "linear-gradient(180deg, #f6ad55, #ed8936)", borderRadius: 2 }} />
              <h2 style={{ fontSize: "0.9rem", fontWeight: 800, color: "#e2e8f0", letterSpacing: "0.08em" }}>SCORE ENTRY</h2>
            </div>
            <ScoreEntry matches={matches} onScoreUpdated={fetchAll} />
          </div>

          {/* Standings */}
          <div style={{
            background: "linear-gradient(180deg, #1a1535, #120f28)",
            borderRadius: 16, padding: "22px",
            border: "1px solid #2d2060",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <div style={{ width: 4, height: 20, background: "linear-gradient(180deg, #b794f4, #805ad5)", borderRadius: 2 }} />
              <h2 style={{ fontSize: "0.9rem", fontWeight: 800, color: "#e2e8f0", letterSpacing: "0.08em" }}>STANDINGS</h2>
            </div>
            <Standings standings={standings} />
          </div>
        </div>
      </div>
    </div>
  )
}
