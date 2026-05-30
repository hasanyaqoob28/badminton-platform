import { useEffect, useState } from "react"
import { api } from "../api"

function MatchCard({ label, team1, team2, color }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${color || "#1a3a2e"}`, borderRadius: 10, overflow: "hidden", minWidth: 180 }}>
      <div style={{ background: color ? `rgba(${hexToRgb(color)},0.15)` : "rgba(74,184,112,0.08)", padding: "5px 12px", fontSize: "0.65rem", fontWeight: 800, color: color || "#4ab870", letterSpacing: "0.1em" }}>{label}</div>
      <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#e2e8f0" }}>{team1}</span>
      </div>
      <div style={{ padding: "8px 12px" }}>
        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#e2e8f0" }}>{team2}</span>
      </div>
    </div>
  )
}

function hexToRgb(hex) {
  if (!hex.startsWith("#")) return "74,184,112"
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

export default function Knockout() {
  const [data, setData] = useState(null)

  useEffect(() => {
    api.get("/knockout").then(r => setData(r.data))
  }, [])

  if (!data) return <div style={{ color: "#2d5a3d", fontSize: "0.85rem" }}>Loading bracket...</div>

  return (
    <div>
      {/* Qualified teams */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "#2d8a52", letterSpacing: "0.12em", marginBottom: 10 }}>🏅 QUALIFIED TOP 4</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {data.qualified.map((t, i) => {
            const colors = ["#f6d860", "#c0c0c0", "#cd7f32", "#4ab870"]
            const medals = ["🥇", "🥈", "🥉", "4️⃣"]
            return (
              <div key={t.team} style={{ background: `rgba(${hexToRgb(colors[i])},0.08)`, border: `1px solid rgba(${hexToRgb(colors[i])},0.3)`, borderRadius: 8, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "1rem" }}>{medals[i]}</span>
                <div>
                  <div style={{ fontWeight: 800, color: colors[i], fontSize: "0.82rem" }}>{t.team}</div>
                  <div style={{ fontSize: "0.65rem", color: "#2d5a3d" }}>{t.sets_won} sets won</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Bracket */}
      <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "#2d8a52", letterSpacing: "0.12em", marginBottom: 12 }}>🏆 KNOCKOUT BRACKET</div>
      <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
        {/* Semis */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: "0.65rem", color: "#2d5a3d", letterSpacing: "0.1em", marginBottom: 4 }}>SEMI FINALS</div>
          <MatchCard label="SF 1" team1={data.semifinals[0].team1} team2={data.semifinals[0].team2} color="#63b3ed" />
          <MatchCard label="SF 2" team1={data.semifinals[1].team1} team2={data.semifinals[1].team2} color="#63b3ed" />
        </div>

        <div style={{ fontSize: "1.5rem", color: "#1a3a2e" }}>→</div>

        {/* Final + 3rd */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: "0.65rem", color: "#2d5a3d", letterSpacing: "0.1em", marginBottom: 4 }}>FINAL & 3RD PLACE</div>
          <MatchCard label="🏆 FINAL" team1={data.final.team1} team2={data.final.team2} color="#f6d860" />
          <MatchCard label="🥉 3RD PLACE" team1={data.third_place.team1} team2={data.third_place.team2} color="#cd7f32" />
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: "0.7rem", color: "#1a3a2e" }}>
        * Bracket updates automatically as group stage matches are completed
      </div>
    </div>
  )
}
