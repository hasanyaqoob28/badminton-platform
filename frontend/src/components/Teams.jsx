import { useState, useEffect } from "react"
import { api } from "../api"
import { useAuth } from "../AuthContext"
import { useToast } from "../ToastContext"

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

function InlineEdit({ value, onSave, color, bold, canEdit }) {
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
      <input autoFocus value={val} onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") { setEditing(false); setVal(value) } }}
        style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${color}`, borderRadius: 6, padding: "4px 8px", color: "#e2e8f0", fontSize: "0.82rem", outline: "none", width: 140 }} />
      <button onClick={handleSave} disabled={saving} style={{ background: color, border: "none", borderRadius: 5, padding: "4px 10px", color: "#0a1628", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer" }}>
        {saving ? "..." : "✓"}
      </button>
      <button onClick={() => { setEditing(false); setVal(value) }} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 5, padding: "4px 8px", color: "#718096", fontSize: "0.72rem", cursor: "pointer" }}>✕</button>
    </div>
  )

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: canEdit ? "pointer" : "default" }}
      onClick={() => canEdit && setEditing(true)}>
      <span style={{ fontWeight: bold ? 800 : 600, color: bold ? color : "#c8d8e8", fontSize: bold ? "1rem" : "0.82rem" }}>{value}</span>
      {canEdit && <span style={{ fontSize: "0.65rem", color: "#2d5a3d", opacity: 0.7 }}>✏️</span>}
    </div>
  )
}

function PlayerRow({ player, index, color, canEdit, isAdmin, onSaveName, onSetCaptain, isCaptain, onError }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(player.name)
  const [saving, setSaving] = useState(false)
  const [settingCaptain, setSettingCaptain] = useState(false)

  const handleSave = async () => {
    if (!val.trim() || val === player.name) { setEditing(false); setVal(player.name); return }
    setSaving(true)
    await onSaveName(player.id, val.trim())
    setSaving(false)
    setEditing(false)
  }

  const handleSetCaptain = async () => {
    setSettingCaptain(true)
    try {
      await onSetCaptain(player.id)
    } catch (e) {
      if (onError) onError(e.response?.data?.detail || "Could not set captain")
    }
    setSettingCaptain(false)
    setEditing(false)
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: "rgba(255,255,255,0.02)", borderRadius: 7, border: `1px solid ${isCaptain ? color : "rgba(255,255,255,0.04)"}` }}>
      <div style={{ width: 22, height: 22, borderRadius: "50%", background: `rgba(${hexToRgb(color)},0.15)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 800, color, flexShrink: 0 }}>
        {isCaptain ? "👑" : index + 1}
      </div>
      {editing ? (
        <div style={{ display: "flex", gap: 6, alignItems: "center", flex: 1, flexWrap: "wrap" }}>
          <input autoFocus value={val} onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") { setEditing(false); setVal(player.name) } }}
            style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${color}`, borderRadius: 6, padding: "4px 8px", color: "#e2e8f0", fontSize: "0.82rem", outline: "none", width: 120 }} />
          <button onClick={handleSave} disabled={saving} style={{ background: color, border: "none", borderRadius: 5, padding: "4px 10px", color: "#0a1628", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer" }}>
            {saving ? "..." : "✓"}
          </button>
          {isAdmin && (
            <button onClick={handleSetCaptain} disabled={settingCaptain || isCaptain} style={{
              background: isCaptain ? "rgba(74,184,112,0.1)" : "rgba(246,173,85,0.1)",
              border: `1px solid ${isCaptain ? "#1a4a2e" : "#4a3010"}`,
              borderRadius: 5, padding: "4px 8px",
              color: isCaptain ? "#4ab870" : "#f6ad55",
              fontSize: "0.68rem", fontWeight: 700, cursor: isCaptain ? "default" : "pointer"
            }}>
              {settingCaptain ? "..." : isCaptain ? "👑 Captain" : "Set Captain"}
            </button>
          )}
          <button onClick={() => { setEditing(false); setVal(player.name) }} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 5, padding: "4px 8px", color: "#718096", fontSize: "0.72rem", cursor: "pointer" }}>✕</button>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, cursor: canEdit ? "pointer" : "default" }}
          onClick={() => canEdit && setEditing(true)}>
          <span style={{ fontWeight: 600, color: "#c8d8e8", fontSize: "0.82rem" }}>{player.name}</span>
          {isCaptain && <span style={{ fontSize: "0.62rem", color: color, fontWeight: 700 }}>CAPTAIN</span>}
          {canEdit && <span style={{ fontSize: "0.65rem", color: "#2d5a3d", opacity: 0.7, marginLeft: "auto" }}>✏️</span>}
        </div>
      )}
    </div>
  )
}

function PairEditRow({ pair, players, color, onSave, canEdit }) {
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

  if (editing && canEdit) return (
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
    <div onClick={() => canEdit && setEditing(true)}
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.04)", cursor: canEdit ? "pointer" : "default" }}
      onMouseEnter={e => canEdit && (e.currentTarget.style.borderColor = color)}
      onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)"}>
      <div style={{ padding: "2px 8px", borderRadius: 12, background: `rgba(${hexToRgb(color)},0.15)`, fontSize: "0.68rem", fontWeight: 800, color, flexShrink: 0 }}>
        {pair.name}
      </div>
      <span style={{ fontSize: "0.8rem", color: "#a0b8c8" }}>
        {pair.player1} <span style={{ color: "#2d5a3d" }}>&</span> {pair.player2}
      </span>
      {canEdit && <span style={{ marginLeft: "auto", fontSize: "0.65rem", color: "#2d5a3d", opacity: 0.7 }}>✏️</span>}
    </div>
  )
}

export default function Teams({ teams, onTeamsUpdated, view, onLoginClick }) {
  const { user } = useAuth()
  const toast = useToast()
  const [selected, setSelected] = useState(teams[0]?.name || "")
  const [captains, setCaptains] = useState([])
  const [loadingCaptains, setLoadingCaptains] = useState(false)
  const [removing, setRemoving] = useState(null)

  const isAdmin = user?.is_admin
  const isCaptain = !!user && !user.is_admin
  const canEdit = isAdmin || isCaptain

  const teamIdx = teams.findIndex(t => t.name === selected)
  const team = teams[teamIdx]
  const color = teamColors[teamIdx % teamColors.length]

  // For captain: only allow editing their own team
  const canEditTeam = isAdmin || (isCaptain && user?.team === team?.name)

  useEffect(() => {
    if (isAdmin && view === "captains") {
      setLoadingCaptains(true)
      api.get("/captains").then(r => { setCaptains(r.data); setLoadingCaptains(false) })
    }
  }, [view, isAdmin])

  const saveTeamName = async (newName) => {
    try {
      await api.put(`/teams/${team.id}`, { name: newName })
      onTeamsUpdated()
      setSelected(newName)
      toast.success("Team name updated!")
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update team name.")
    }
  }

  const savePlayerName = async (playerId, newName) => {
    try {
      await api.put(`/players/${playerId}`, { name: newName })
      onTeamsUpdated()
      toast.success("Player name updated!")
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update player name.")
    }
  }

  const setPlayerAsCaptain = async (playerId) => {
    try {
      await api.put(`/players/${playerId}/set-captain`)
      onTeamsUpdated()
      toast.success("Captain updated!")
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not set captain.")
    }
  }

  const savePair = async (pairId, data) => {
    try {
      await api.put(`/pairs/${pairId}`, data)
      onTeamsUpdated()
      toast.success("Pair updated!")
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update pair.")
    }
  }

  const removeCaptain = async (captainId) => {
    if (!window.confirm("Remove this captain? They will need to re-register.")) return
    setRemoving(captainId)
    try {
      await api.delete(`/captains/${captainId}`)
      setCaptains(c => c.filter(x => x.id !== captainId))
      onTeamsUpdated()
      toast.success("Captain removed.")
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to remove captain.")
    }
    setRemoving(null)
  }

  // ── CAPTAINS VIEW ──────────────────────────────────────────────────────────
  if (view === "captains" && isAdmin) {
    return (
      <div>
        {loadingCaptains ? (
          <p style={{ color: "#2d5a3d", fontSize: "0.8rem" }}>Loading...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {captains.length === 0 && (
              <p style={{ color: "#2d5a3d", fontSize: "0.78rem" }}>No captains registered yet.</p>
            )}
            {captains.map(c => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid #1a3a2e", borderRadius: 10 }}>
                <span style={{ fontSize: "0.9rem" }}>{c.is_admin ? "👑" : "🏸"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#e2e8f0" }}>{c.name || c.username}</div>
                  <div style={{ fontSize: "0.68rem", color: "#2d8a52" }}>{c.team}</div>
                </div>
                {!c.is_admin && (
                  <button onClick={() => removeCaptain(c.id)} disabled={removing === c.id} style={{
                    padding: "4px 12px", background: "rgba(252,129,129,0.1)", border: "1px solid #4a1a1a",
                    borderRadius: 6, color: "#fc8181", fontSize: "0.68rem", fontWeight: 700, cursor: "pointer"
                  }}>
                    {removing === c.id ? "..." : "✕ REMOVE"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── ROSTER / TEAMS VIEW ────────────────────────────────────────────────────
  return (
    <div>
      {/* Team selector tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {teams.map((t, i) => {
          const c = teamColors[i % teamColors.length]
          const active = selected === t.name
          return (
            <button key={t.id} onClick={() => setSelected(t.name)} style={{
              padding: "6px 16px", borderRadius: 20, cursor: "pointer", fontSize: "0.76rem", fontWeight: 700,
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
          {/* Team name + captain */}
          <div style={{ marginBottom: 14, padding: "10px 14px", background: `rgba(${hexToRgb(color.accent)},0.06)`, borderRadius: 10, border: `1px solid ${color.border}`, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "#2d5a3d", letterSpacing: "0.1em" }}>TEAM</span>
            <InlineEdit value={team.name} onSave={saveTeamName} color={color.accent} bold canEdit={canEditTeam} />
            <div style={{ marginLeft: "auto", fontSize: "0.68rem" }}>
              {team.captain
                ? <span style={{ color: "#4a9d6f" }}>👑 {team.captain}</span>
                : <span style={{ color: "#2d5a3d", fontStyle: "italic" }}>No captain</span>}
            </div>
          </div>

          <div className="teams-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {/* Players */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${color.border}`, borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 800, color: color.accent, letterSpacing: "0.12em", marginBottom: 10 }}>
                👥 PLAYERS ({team.players.length})
              </div>
              {!canEditTeam && (
                <div style={{ fontSize: "0.65rem", color: "#2d5a3d", marginBottom: 8, fontStyle: "italic" }}>
                  Login as captain or admin to edit
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {team.players.map((p, i) => (
                  <PlayerRow
                    key={p.id}
                    player={p}
                    index={i}
                    color={color.accent}
                    canEdit={canEditTeam}
                    isAdmin={isAdmin}
                    onSaveName={savePlayerName}
                    onSetCaptain={setPlayerAsCaptain}
                    isCaptain={team.captain === p.name}
                    onError={toast.error}
                  />
                ))}
              </div>
            </div>

            {/* Pairs */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${color.border}`, borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 800, color: color.accent, letterSpacing: "0.12em", marginBottom: 10 }}>
                🏸 PAIRS ({team.pairs.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {team.pairs.map(pair => (
                  <PairEditRow key={pair.id} pair={pair} players={team.players} color={color.accent} onSave={savePair} canEdit={canEditTeam} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
