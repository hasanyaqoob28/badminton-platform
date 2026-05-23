import { useState } from "react"
import { api } from "../api"

const teamColors = [
  { accent: "#4ab870", glow: "rgba(74,184,112,0.15)", border: "#1a4a2e" },
  { accent: "#63b3ed", glow: "rgba(99,179,237,0.15)", border: "#1a3a5c" },
  { accent: "#f6ad55", glow: "rgba(246,173,85,0.15)", border: "#4a3010" },
  { accent: "#b794f4", glow: "rgba(183,148,244,0.15)", border: "#2d2060" },
  { accent: "#fc8181", glow: "rgba(252,129,129,0.15)", border: "#4a1a1a" },
]

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

function InlineEdit({ value, onSave, color, bold }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!val.trim() || val === value) { setEditing(false); setVal(value); return }
    setSaving(true)
    await onSave(val.trim())
    setSaving(false)
    setEditing(false)
  }

  if (editing) return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <input
        autoFocus
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") { setEditing(false); setVal(value) } }}
        style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${color}`, borderRadius: 6, padding: "4px 8px", color: "#e2e8f0", fontSize: "0.82rem", outline: "none", width: 140 }}
      />
      <button onClick={handleSave} disabled={saving} style={{ background: color, border: "none", borderRadius: 5, padding: "4px 10px", color: "#0a1628", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer" }}>
        {saving ? "..." : "✓"}
      </button>
      <button onClick={() => { setEditing(false); setVal(value) }} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 5, padding: "4px 8px", color: "#718096", fontSize: "0.72rem", cursor: "pointer" }}>✕</button>
    </div>
  )

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", group: true }} onClick={() => setEditing(true)}>
      <span style={{ fontWeight: bold ? 800 : 600, color: bold ? color : "#c8d8e8", fontSize: bold ? "1rem" : "0.82rem" }}>{value}</span>
      <span style={{ fontSize: "0.65rem", color: "#2d5a3d", opacity: 0.7 }}>✏️</span>
    </div>
  )
}

function PairEditRow({ pair, players, color, onSave }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(pair.name)
  const [p1, setP1] = useState(pair.player1_id)
  const [p2, setP2] = useState(pair.player2_id)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (p1 === p2) return
    setSaving(true)
    await onSave(pair.id, { name, player1_id: p1, player2_id: p2 })
    setSaving(false)
    setEditing(false)
  }

  const sel = (val, onChange) => (
    <select value={val} onChange={e => onChange(Number(e.target.value))} style={{
      background: "rgba(255,255,255,0.06)", border: `1px solid ${color}`, borderRadius: 6,
      padding: "4px 6px", color: "#e2e8f0", fontSize: "0.75rem", outline: "none", cursor: "pointer"
    }}>
      {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
  )

  if (editing) return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: `rgba(${hexToRgb(color)},0.08)`, borderRadius: 8, border: `1px solid ${color}`, flexWrap: "wrap" }}>
      <input value={name} onChange={e => setName(e.target.value)}
        style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${color}`, borderRadius: 6, padding: "4px 8px", color: "#e2e8f0", fontSize: "0.75rem", outline: "none", width: 48 }} />
      {sel(p1, setP1)}
      <span style={{ color: "#2d5a3d", fontSize: "0.7rem" }}>&</span>
      {sel(p2, setP2)}
      {p1 === p2 && <span style={{ color: "#fc8181", fontSize: "0.7rem" }}>Same player!</span>}
      <button onClick={handleSave} disabled={saving || p1 === p2} style={{ background: color, border: "none", borderRadius: 5, padding: "4px 10px", color: "#0a1628", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer" }}>
        {saving ? "..." : "✓"}
      </button>
      <button onClick={() => setEditing(false)} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 5, padding: "4px 8px", color: "#718096", fontSize: "0.72rem", cursor: "pointer" }}>✕</button>
    </div>
  )

  return (
    <div onClick={() => setEditing(true)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.04)", cursor: "pointer" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = color}
      onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)"}>
      <div style={{ padding: "2px 8px", borderRadius: 12, background: `rgba(${hexToRgb(color)},0.15)`, fontSize: "0.68rem", fontWeight: 800, color, flexShrink: 0 }}>
        {pair.name}
      </div>
      <span style={{ fontSize: "0.8rem", color: "#a0b8c8" }}>
        {pair.player1} <span style={{ color: "#2d5a3d" }}>&</span> {pair.player2}
      </span>
      <span style={{ marginLeft: "auto", fontSize: "0.65rem", color: "#2d5a3d", opacity: 0.7 }}>✏️</span>
    </div>
  )
}

export default function Teams({ teams, onTeamsUpdated }) {
  const [selected, setSelected] = useState(teams[0]?.name || "")
  const teamIdx = teams.findIndex(t => t.name === selected)
  const team = teams[teamIdx]
  const color = teamColors[teamIdx % teamColors.length]

  const saveTeamName = async (newName) => {
    await api.put(`/teams/${team.id}`, { name: newName })
    onTeamsUpdated()
    setSelected(newName)
  }

  const savePlayerName = async (playerId, newName) => {
    await api.put(`/players/${playerId}`, { name: newName })
    onTeamsUpdated()
  }

  const savePair = async (pairId, data) => {
    await api.put(`/pairs/${pairId}`, data)
    onTeamsUpdated()
  }

  return (
    <div>
      {/* Team tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {teams.map((t, i) => {
          const c = teamColors[i % teamColors.length]
          const active = selected === t.name
          return (
            <button key={t.id} onClick={() => setSelected(t.name)} style={{
              padding: "7px 18px", borderRadius: 20, cursor: "pointer", fontSize: "0.78rem", fontWeight: 700,
              border: `1px solid ${active ? c.accent : "#1a3a2e"}`,
              background: active ? `rgba(${hexToRgb(c.accent)},0.15)` : "transparent",
              color: active ? c.accent : "#4a6a5a",
              letterSpacing: "0.05em", transition: "all 0.2s",
              boxShadow: active ? `0 0 12px ${c.glow}` : "none"
            }}>
              {t.name}
            </button>
          )
        })}
      </div>

      {team && (
        <div>
          {/* Team name edit */}
          <div style={{ marginBottom: 16, padding: "12px 16px", background: `rgba(${hexToRgb(color.accent)},0.06)`, borderRadius: 10, border: `1px solid ${color.border}`, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "#2d5a3d", letterSpacing: "0.1em" }}>TEAM NAME</span>
            <InlineEdit value={team.name} onSave={saveTeamName} color={color.accent} bold />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Players */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${color.border}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 800, color: color.accent, letterSpacing: "0.12em", marginBottom: 12 }}>
                👥 PLAYERS ({team.players.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {team.players.map((p, i) => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: `rgba(${hexToRgb(color.accent)},0.15)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 800, color: color.accent, flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <InlineEdit value={p.name} onSave={(name) => savePlayerName(p.id, name)} color={color.accent} />
                  </div>
                ))}
              </div>
            </div>

            {/* Pairs */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${color.border}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 800, color: color.accent, letterSpacing: "0.12em", marginBottom: 12 }}>
                🏸 PAIRS ({team.pairs.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {team.pairs.map(pair => (
                  <PairEditRow key={pair.id} pair={pair} players={team.players} color={color.accent} onSave={savePair} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
