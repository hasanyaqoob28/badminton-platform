const medals = ["🥇", "🥈", "🥉"]
const rankColors = ["#f6d860", "#c0c0c0", "#cd7f32"]

function Stat({ label, value, color, signed }) {
  const display = signed && value > 0 ? `+${value}` : value
  return (
    <div style={{ textAlign: "center", minWidth: 36 }}>
      <div style={{ fontWeight: 800, color, fontSize: "0.88rem" }}>{display}</div>
      <div style={{ color: "#2d4a3e", fontSize: "0.62rem", marginTop: 2, letterSpacing: "0.06em" }}>{label}</div>
    </div>
  )
}

export default function Standings({ standings }) {
  if (!standings.length) return (
    <div style={{ textAlign: "center", padding: "20px 0" }}>
      <div style={{ fontSize: "2rem", marginBottom: 8 }}>📊</div>
      <span style={{ color: "#2d4a3e", fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.05em" }}>LOADING STANDINGS...</span>
    </div>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {standings.map((s, i) => (
        <div key={s.team} style={{
          background: i === 0
            ? "linear-gradient(135deg, rgba(246,216,96,0.08), rgba(246,216,96,0.03))"
            : "rgba(255,255,255,0.03)",
          border: `1px solid ${i === 0 ? "rgba(246,216,96,0.3)" : i === 1 ? "rgba(192,192,192,0.2)" : i === 2 ? "rgba(205,127,50,0.2)" : "#1a2a3a"}`,
          borderRadius: 10, padding: "10px 14px",
          display: "grid",
          gridTemplateColumns: "28px 1fr repeat(4, 38px)",
          alignItems: "center",
          gap: 8,
          boxShadow: i === 0 ? "0 0 20px rgba(246,216,96,0.08)" : "none"
        }}>
          <div style={{ fontSize: i < 3 ? "1.1rem" : "0.8rem", textAlign: "center", fontWeight: 800, color: i < 3 ? rankColors[i] : "#2d4a3e" }}>
            {i < 3 ? medals[i] : `#${i + 1}`}
          </div>
          <div style={{ fontWeight: 700, fontSize: "0.85rem", color: i === 0 ? "#f6d860" : "#c8d8e8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {s.team}
          </div>
          <Stat label="SW" value={s.sets_won} color="#63b3ed" />
          <Stat label="SD" value={s.sets_diff} color={s.sets_diff >= 0 ? "#4ab870" : "#fc8181"} signed />
          <Stat label="PD" value={s.points_diff} color={s.points_diff >= 0 ? "#4ab870" : "#fc8181"} signed />
          <Stat label="PF" value={s.points_for} color="#b794f4" />
        </div>
      ))}
      <div style={{ fontSize: "0.65rem", color: "#1a3a2e", marginTop: 4, letterSpacing: "0.06em" }}>
        SW = SETS WON · SD = SETS DIFF · PD = PTS DIFF · PF = PTS FOR
      </div>
    </div>
  )
}
