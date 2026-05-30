import { useEffect, useState } from "react"
import { api } from "../api"

export default function Stats() {
  const [data, setData] = useState(null)
  const [tab, setTab] = useState("pairs")

  useEffect(() => {
    api.get("/stats").then(r => setData(r.data))
  }, [])

  if (!data) return <div style={{ color: "#2d5a3d", fontSize: "0.85rem", padding: 20 }}>Loading stats...</div>

  const teams = Object.keys(data.head_to_head)

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["pairs", "h2h"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "5px 16px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em",
            background: tab === t ? "rgba(74,184,112,0.15)" : "transparent",
            color: tab === t ? "#4ab870" : "#2d5a3d",
            borderBottom: tab === t ? "1px solid #4ab870" : "1px solid transparent"
          }}>
            {t === "pairs" ? "🏸 PAIR STATS" : "⚔️ HEAD TO HEAD"}
          </button>
        ))}
      </div>

      {tab === "pairs" && (
        <div style={{ overflowY: "auto", maxHeight: 420 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
            <thead style={{ position: "sticky", top: 0 }}>
              <tr style={{ background: "#0a1f16" }}>
                {["#", "Pair", "Played", "SW", "SL", "Win%", "PF", "PA"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#2d8a52", fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.08em", borderBottom: "1px solid #1a3a2e" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.pair_stats.map((p, i) => (
                <tr key={p.pair} style={{ borderBottom: "1px solid rgba(26,58,46,0.4)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                  <td style={td}><span style={{ color: "#2d5a3d", fontWeight: 700 }}>{i + 1}</span></td>
                  <td style={{ ...td, fontWeight: 700, color: "#c8d8e8" }}>{p.pair}</td>
                  <td style={td}>{p.played}</td>
                  <td style={{ ...td, color: "#4ab870", fontWeight: 700 }}>{p.sets_won}</td>
                  <td style={{ ...td, color: "#fc8181" }}>{p.sets_lost}</td>
                  <td style={td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", borderRadius: 4, height: 6 }}>
                        <div style={{ height: 6, borderRadius: 4, background: p.win_rate > 50 ? "#4ab870" : p.win_rate > 30 ? "#f6ad55" : "#fc8181", width: `${p.win_rate}%` }} />
                      </div>
                      <span style={{ color: "#a0b8c8", fontSize: "0.72rem", minWidth: 32 }}>{p.win_rate}%</span>
                    </div>
                  </td>
                  <td style={{ ...td, color: "#63b3ed" }}>{p.points_for}</td>
                  <td style={{ ...td, color: "#718096" }}>{p.points_against}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "h2h" && (
        <div style={{ overflowX: "auto" }}>
          {teams.length === 0
            ? <p style={{ color: "#2d5a3d", fontSize: "0.82rem" }}>No completed matches yet.</p>
            : (
              <table style={{ borderCollapse: "collapse", fontSize: "0.78rem" }}>
                <thead>
                  <tr>
                    <th style={{ padding: "8px 14px", color: "#2d8a52", fontWeight: 700, fontSize: "0.7rem" }}>vs</th>
                    {teams.map(t => <th key={t} style={{ padding: "8px 14px", color: "#4ab870", fontWeight: 700, fontSize: "0.72rem", whiteSpace: "nowrap" }}>{t}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {teams.map(t1 => (
                    <tr key={t1}>
                      <td style={{ padding: "8px 14px", color: "#4ab870", fontWeight: 700, fontSize: "0.72rem", whiteSpace: "nowrap", borderRight: "1px solid #1a3a2e" }}>{t1}</td>
                      {teams.map(t2 => (
                        <td key={t2} style={{ padding: "8px 14px", textAlign: "center", background: t1 === t2 ? "rgba(255,255,255,0.03)" : "transparent", borderBottom: "1px solid rgba(26,58,46,0.3)" }}>
                          {t1 === t2
                            ? <span style={{ color: "#2d5a3d" }}>—</span>
                            : data.head_to_head[t1]?.[t2]
                              ? <span style={{ color: "#4ab870", fontWeight: 700 }}>{data.head_to_head[t1][t2].wins}W</span>
                              : <span style={{ color: "#2d5a3d" }}>0</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      )}
    </div>
  )
}

const td = { padding: "8px 12px", color: "#a0b8c8" }
