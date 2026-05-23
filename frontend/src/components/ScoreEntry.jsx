import { useState } from "react"
import { api } from "../api"

export default function ScoreEntry({ matches, onScoreUpdated }) {
  const pending = matches.filter(m => !m.completed)
  const [selected, setSelected] = useState("")
  const [scores, setScores] = useState({ set1_team1: 0, set1_team2: 0, set2_team1: 0, set2_team2: 0 })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const match = matches.find(m => m.id === Number(selected))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selected) return
    setSaving(true)
    await api.put(`/match/${selected}/score`, scores)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setSelected("")
    setScores({ set1_team1: 0, set1_team2: 0, set2_team1: 0, set2_team2: 0 })
    onScoreUpdated()
  }

  const set = (field, val) => setScores(s => ({ ...s, [field]: Math.max(0, Math.min(30, Number(val))) }))

  if (pending.length === 0) return (
    <div style={{ textAlign: "center", padding: "20px 0" }}>
      <div style={{ fontSize: "2.5rem" }}>🏆</div>
      <p style={{ fontWeight: 700, marginTop: 8, fontSize: "0.85rem", color: "#4ab870", letterSpacing: "0.05em" }}>ALL MATCHES COMPLETE!</p>
    </div>
  )

  return (
    <div>
      <select value={selected} onChange={e => setSelected(e.target.value)} style={{
        width: "100%", padding: "9px 12px", borderRadius: 8,
        border: "1px solid #1a4a2e", background: "rgba(255,255,255,0.04)", color: "#a0c8b0",
        fontSize: "0.78rem", marginBottom: 14, outline: "none", cursor: "pointer"
      }}>
        <option value="">— Select a pending match —</option>
        {pending.map(m => (
          <option key={m.id} value={m.id}>
            S{m.slot} · C{m.court} · {m.pair_group} · {m.team1} vs {m.team2}
          </option>
        ))}
      </select>

      {match && (
        <form onSubmit={handleSubmit}>
          {/* Teams */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid #1a4a2e" }}>
            <span style={{ fontWeight: 800, color: "#4ab870", fontSize: "0.88rem" }}>{match.team1}</span>
            <span style={{ color: "#2d5a3d", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em" }}>VS</span>
            <span style={{ fontWeight: 800, color: "#f6ad55", fontSize: "0.88rem" }}>{match.team2}</span>
          </div>

          {[
            { label: "SET 1", f1: "set1_team1", f2: "set1_team2" },
            { label: "SET 2", f1: "set2_team1", f2: "set2_team2" },
          ].map(({ label, f1, f2 }) => (
            <div key={label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "12px", marginBottom: 10, border: "1px solid #1a3a2e" }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "#2d8a52", marginBottom: 10, textAlign: "center", letterSpacing: "0.12em" }}>{label}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
                <input type="number" value={scores[f1]} onChange={e => set(f1, e.target.value)} style={{ ...scoreInput, borderColor: "#1a4a2e", color: "#4ab870" }} />
                <span style={{ color: "#1a4a2e", fontWeight: 900, fontSize: "1.2rem" }}>–</span>
                <input type="number" value={scores[f2]} onChange={e => set(f2, e.target.value)} style={{ ...scoreInput, borderColor: "#4a3010", color: "#f6ad55" }} />
              </div>
            </div>
          ))}

          <button type="submit" disabled={saving} style={{
            width: "100%", padding: "11px", marginTop: 6, border: "none", cursor: "pointer",
            background: saved
              ? "linear-gradient(135deg, #276749, #2d8a52)"
              : saving
              ? "rgba(74,184,112,0.3)"
              : "linear-gradient(135deg, #2d8a52, #4ab870)",
            color: "white", borderRadius: 8, fontWeight: 800, fontSize: "0.85rem",
            letterSpacing: "0.08em", transition: "all 0.2s",
            boxShadow: saved || saving ? "none" : "0 4px 15px rgba(74,184,112,0.3)"
          }}>
            {saved ? "✅ SAVED!" : saving ? "SAVING..." : "💾 SAVE SCORE"}
          </button>
        </form>
      )}
    </div>
  )
}

const scoreInput = {
  width: 56, textAlign: "center", fontSize: "1.3rem", fontWeight: 900,
  padding: "8px 4px", border: "1px solid", borderRadius: 8,
  background: "rgba(255,255,255,0.05)", outline: "none"
}
