import { useState } from "react"

const Badge = ({ text, color, bg, border }) => (
  <span style={{ background: bg, color, border: `1px solid ${border || bg}`, padding: "3px 9px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700, whiteSpace: "nowrap" }}>
    {text}
  </span>
)

export default function ScheduleTable({ matches }) {
  const [filter, setFilter] = useState("All")
  const [pairFilter, setPairFilter] = useState("All")
  const [expanded, setExpanded] = useState(null)

  const sorted = [...matches].sort((a, b) => a.slot - b.slot || a.court - b.court)
  const filtered = sorted
    .filter(m => filter === "All" ? true : filter === "Completed" ? m.completed : !m.completed)
    .filter(m => pairFilter === "All" ? true : m.pair_group === pairFilter)

  const pairs = ["All", ...Array.from(new Set(matches.map(m => m.pair_group))).sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)))]

  return (
    <div>
      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        {["All", "Pending", "Completed"].map(f => {
          const count = f === "All" ? matches.length : f === "Completed" ? matches.filter(m => m.completed).length : matches.filter(m => !m.completed).length
          return (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "5px 14px", borderRadius: 20, cursor: "pointer", fontSize: "0.75rem", fontWeight: 700,
              border: `1px solid ${filter === f ? "#4ab870" : "#1a3a2e"}`,
              background: filter === f ? "rgba(74,184,112,0.15)" : "transparent",
              color: filter === f ? "#4ab870" : "#4a6a5a",
              letterSpacing: "0.05em"
            }}>
              {f} ({count})
            </button>
          )
        })}
        <select value={pairFilter} onChange={e => setPairFilter(e.target.value)} style={{
          padding: "5px 12px", borderRadius: 20, border: "1px solid #1a3a2e",
          background: "transparent", color: "#4a9d6f", fontSize: "0.75rem", cursor: "pointer", outline: "none"
        }}>
          {pairs.map(p => <option key={p}>{p}</option>)}
        </select>
        <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "#2d5a3d", fontWeight: 600 }}>
          {filtered.length} MATCHES
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 290px)", borderRadius: 10, border: "1px solid #1a3a2e" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
          <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
            <tr style={{ background: "#0a1f16" }}>
              {["#", "Slot", "Court", "Pair", "Match", "Score", "Status"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.1em", color: "#2d8a52", borderBottom: "1px solid #1a3a2e" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((m, idx) => (
              <>
                <tr key={m.id} onClick={() => setExpanded(expanded === m.id ? null : m.id)}
                  style={{
                    background: expanded === m.id ? "rgba(74,184,112,0.08)" : m.completed ? "rgba(74,184,112,0.04)" : idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                    cursor: "pointer",
                    transition: "background 0.15s",
                    borderLeft: m.completed ? "2px solid #2d8a52" : "2px solid transparent"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(74,184,112,0.08)"}
                  onMouseLeave={e => e.currentTarget.style.background = expanded === m.id ? "rgba(74,184,112,0.08)" : m.completed ? "rgba(74,184,112,0.04)" : idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)"}
                >
                  <td style={td}><span style={{ color: "#2d5a3d", fontWeight: 700, fontSize: "0.75rem" }}>{idx + 1}</span></td>
                  <td style={td}><span style={{ fontWeight: 800, color: "#63b3ed", fontSize: "0.8rem" }}>S{m.slot}</span></td>
                  <td style={td}><Badge text={`C${m.court}`} color="#90cdf4" bg="rgba(99,179,237,0.1)" border="#1a3a5c" /></td>
                  <td style={td}><Badge text={m.pair_group} color="#d6bcfa" bg="rgba(183,148,244,0.1)" border="#2d2060" /></td>
                  <td style={{ ...td, fontWeight: 600, color: "#c8d8e8" }}>
                    {m.team1} <span style={{ color: "#2d5a3d", fontWeight: 400, margin: "0 4px" }}>vs</span> {m.team2}
                  </td>
                  <td style={td}>
                    {m.completed
                      ? <span style={{ fontWeight: 800, color: "#4ab870", fontVariantNumeric: "tabular-nums" }}>{m.set1_team1}-{m.set1_team2} / {m.set2_team1}-{m.set2_team2}</span>
                      : <span style={{ color: "#1a3a2e" }}>—</span>}
                  </td>
                  <td style={td}>
                    {m.completed
                      ? <Badge text="✅ DONE" color="#4ab870" bg="rgba(74,184,112,0.1)" border="#1a4a2e" />
                      : <Badge text="⏳ PENDING" color="#f6ad55" bg="rgba(246,173,85,0.1)" border="#4a3010" />}
                  </td>
                </tr>
                {expanded === m.id && (
                  <tr key={`exp-${m.id}`} style={{ background: "rgba(74,184,112,0.06)" }}>
                    <td colSpan={7} style={{ padding: "10px 20px", borderBottom: "1px solid #1a3a2e" }}>
                      <div style={{ display: "flex", gap: 24, fontSize: "0.76rem", color: "#4a9d6f", flexWrap: "wrap" }}>
                        <span><b style={{ color: "#4ab870" }}>ID:</b> {m.id}</span>
                        <span><b style={{ color: "#4ab870" }}>Pair:</b> {m.pair_group}</span>
                        <span><b style={{ color: "#4ab870" }}>Slot:</b> {m.slot}</span>
                        <span><b style={{ color: "#4ab870" }}>Court:</b> {m.court}</span>
                        {m.completed && <>
                          <span><b style={{ color: "#4ab870" }}>Sets:</b> {m.sets_won_team1}–{m.sets_won_team2}</span>
                          <span><b style={{ color: "#4ab870" }}>Points:</b> {m.total_points_team1}–{m.total_points_team2}</span>
                        </>}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const td = { padding: "9px 14px", borderBottom: "1px solid rgba(26,58,46,0.5)" }
