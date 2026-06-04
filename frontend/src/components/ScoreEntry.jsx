import { useState } from "react"
import { api } from "../api"
import { useAuth } from "../AuthContext"
import { useToast } from "../ToastContext"

// Modal for admin to review/edit disputed match scores before resolving
function ResolveModal({ match, onClose, onResolved, toast }) {
  const [scores, setScores] = useState({
    set1_team1: match.set1_team1,
    set1_team2: match.set1_team2,
    set2_team1: match.set2_team1,
    set2_team2: match.set2_team2,
  })
  const [saving, setSaving] = useState(false)

  const setVal = (field, val) =>
    setScores(s => ({ ...s, [field]: Math.max(0, Math.min(21, Number(val))) }))

  const validate = () => {
    for (const [s1, s2, label] of [
      [scores.set1_team1, scores.set1_team2, "Set 1"],
      [scores.set2_team1, scores.set2_team2, "Set 2"],
    ]) {
      if (s1 === 21 && s2 === 21) { toast.error(`${label}: Both teams cannot score 21`); return false }
      if (s1 !== 21 && s2 !== 21) { toast.error(`${label}: One team must score exactly 21 to win`); return false }
    }
    return true
  }

  const handleResolve = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      // Update scores first, then resolve
      await api.put(`/match/${match.id}/score`, scores)
      await api.post(`/match/${match.id}/resolve`)
      toast.success("Dispute resolved and score confirmed.")
      onResolved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to resolve dispute.")
    }
    setSaving(false)
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 380, background: "linear-gradient(180deg, #0f1e35, #0d1a2e)", border: "1px solid #4a1a1a", borderRadius: 14, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: "1.1rem" }}>⚠️</span>
          <div>
            <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#fc8181" }}>RESOLVE DISPUTE</div>
            <div style={{ fontSize: "0.68rem", color: "#4a6a5a" }}>Review and correct scores before confirming</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: "#4a6a5a", cursor: "pointer", fontSize: "1rem" }}>✕</button>
        </div>

        {/* Teams */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid #1a3a2e" }}>
          <span style={{ fontWeight: 800, color: "#4ab870", fontSize: "0.85rem" }}>{match.team1}</span>
          <span style={{ color: "#2d5a3d", fontSize: "0.7rem", fontWeight: 700 }}>VS</span>
          <span style={{ fontWeight: 800, color: "#f6ad55", fontSize: "0.85rem" }}>{match.team2}</span>
        </div>

        {/* Score inputs */}
        {[
          { label: "SET 1", f1: "set1_team1", f2: "set1_team2" },
          { label: "SET 2", f1: "set2_team1", f2: "set2_team2" },
        ].map(({ label, f1, f2 }) => (
          <div key={label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "10px", marginBottom: 8, border: "1px solid #1a3a2e" }}>
            <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#2d8a52", marginBottom: 8, textAlign: "center", letterSpacing: "0.12em" }}>{label}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <input type="number" value={scores[f1]} onChange={e => setVal(f1, e.target.value)}
                style={{ ...scoreInput, borderColor: "#1a4a2e", color: "#4ab870" }} />
              <span style={{ color: "#1a4a2e", fontWeight: 900 }}>–</span>
              <input type="number" value={scores[f2]} onChange={e => setVal(f2, e.target.value)}
                style={{ ...scoreInput, borderColor: "#4a3010", color: "#f6ad55" }} />
            </div>
          </div>
        ))}

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "9px", border: "1px solid #1a3a2e", borderRadius: 7,
            background: "rgba(255,255,255,0.03)", color: "#4a6a5a",
            fontSize: "0.78rem", fontWeight: 700, cursor: "pointer"
          }}>CANCEL</button>
          <button onClick={handleResolve} disabled={saving} style={{
            flex: 2, padding: "9px", border: "none", borderRadius: 7, cursor: "pointer",
            background: saving ? "rgba(74,184,112,0.3)" : "linear-gradient(135deg, #2d8a52, #4ab870)",
            color: "white", fontSize: "0.78rem", fontWeight: 800,
            boxShadow: saving ? "none" : "0 4px 15px rgba(74,184,112,0.25)"
          }}>
            {saving ? "RESOLVING..." : "👑 CONFIRM & RESOLVE"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ScoreEntry({ matches, onScoreUpdated, onLoginClick }) {
  const { user } = useAuth()
  const toast = useToast()
  const [selected, setSelected] = useState("")
  const [scores, setScores] = useState({ set1_team1: 0, set1_team2: 0, set2_team1: 0, set2_team2: 0 })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [resolveMatch, setResolveMatch] = useState(null)

  const myMatches = user?.is_admin ? matches : matches.filter(m => m.team1 === user?.team || m.team2 === user?.team)
  const pending = myMatches.filter(m => !m.completed)
  const needsAction = myMatches.filter(m => m.disputed || (m.completed && (!m.confirmed_by_team1 || !m.confirmed_by_team2)))
  const match = matches.find(m => m.id === Number(selected))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selected) return
    for (const [s1, s2, label] of [
      [scores.set1_team1, scores.set1_team2, "Set 1"],
      [scores.set2_team1, scores.set2_team2, "Set 2"],
    ]) {
      if (s1 === 21 && s2 === 21) { toast.error(`${label}: Both teams cannot score 21`); return }
      if (s1 !== 21 && s2 !== 21) { toast.error(`${label}: One team must score exactly 21 to win`); return }
    }
    setSaving(true)
    try {
      await api.put(`/match/${selected}/score`, scores)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      setSelected("")
      setScores({ set1_team1: 0, set1_team2: 0, set2_team1: 0, set2_team2: 0 })
      onScoreUpdated()
      toast.success("Score saved successfully!")
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save score.")
    }
    setSaving(false)
  }

  const handleConfirm = async (matchId) => {
    try {
      await api.post(`/match/${matchId}/confirm`)
      onScoreUpdated()
      toast.success("Score confirmed!")
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to confirm score.")
    }
  }

  const handleDispute = async (matchId) => {
    try {
      await api.post(`/match/${matchId}/dispute`)
      onScoreUpdated()
      toast.warning("Score disputed. Admin will review.")
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to dispute score.")
    }
  }

  const set = (field, val) => setScores(s => ({ ...s, [field]: Math.max(0, Math.min(21, Number(val))) }))

  if (!user) return (
    <div style={{ textAlign: "center", padding: "24px 16px" }}>
      <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(74,184,112,0.08)", border: "1px solid #1a4a2e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem" }}>🔒</div>
        <button onClick={onLoginClick} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.72rem", color: "#4ab870", fontWeight: 800, letterSpacing: "0.08em", textDecoration: "underline", padding: 0 }}>CAPTAIN LOGIN</button>
      </div>
      <p style={{ marginTop: 10, fontSize: "0.72rem", color: "#2d5a3d", lineHeight: 1.6 }}>Captains must log in to enter<br />scores for their team.</p>
    </div>
  )

  return (
    <div>
      {/* Resolve modal */}
      {resolveMatch && (
        <ResolveModal
          match={resolveMatch}
          onClose={() => setResolveMatch(null)}
          onResolved={onScoreUpdated}
          toast={toast}
        />
      )}

      {/* Captain badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "6px 10px", background: "rgba(74,184,112,0.06)", borderRadius: 8, border: "1px solid #1a4a2e" }}>
        <span style={{ fontSize: "0.75rem" }}>{user.is_admin ? "👑" : "🏸"}</span>
        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#4ab870" }}>{user.username}</span>
        {!user.is_admin && <span style={{ fontSize: "0.68rem", color: "#2d8a52" }}>· {user.team}</span>}
        {user.is_admin && <span style={{ fontSize: "0.62rem", color: "#f6ad55", marginLeft: "auto", fontWeight: 700 }}>ADMIN</span>}
      </div>

      {/* Score form */}
      {pending.length === 0 ? (
        <div style={{ textAlign: "center", padding: "12px 0", color: "#4ab870" }}>
          <div style={{ fontSize: "1.5rem" }}>🎉</div>
          <p style={{ fontWeight: 700, marginTop: 4, fontSize: "0.78rem" }}>ALL MATCHES DONE!</p>
        </div>
      ) : (
        <>
          <select value={selected} onChange={e => setSelected(e.target.value)} style={{
            width: "100%", padding: "8px 10px", borderRadius: 8,
            border: "1px solid #1a4a2e", background: "rgba(255,255,255,0.04)", color: "#a0c8b0",
            fontSize: "0.76rem", marginBottom: 12, outline: "none", cursor: "pointer"
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid #1a4a2e" }}>
                <span style={{ fontWeight: 800, color: "#4ab870", fontSize: "0.85rem" }}>{match.team1}</span>
                <span style={{ color: "#2d5a3d", fontSize: "0.7rem", fontWeight: 700 }}>VS</span>
                <span style={{ fontWeight: 800, color: "#f6ad55", fontSize: "0.85rem" }}>{match.team2}</span>
              </div>
              {[{ label: "SET 1", f1: "set1_team1", f2: "set1_team2" }, { label: "SET 2", f1: "set2_team1", f2: "set2_team2" }].map(({ label, f1, f2 }) => (
                <div key={label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "10px", marginBottom: 8, border: "1px solid #1a3a2e" }}>
                  <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#2d8a52", marginBottom: 8, textAlign: "center", letterSpacing: "0.12em" }}>{label}</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                    <input type="number" value={scores[f1]} onChange={e => set(f1, e.target.value)} style={{ ...scoreInput, borderColor: "#1a4a2e", color: "#4ab870" }} />
                    <span style={{ color: "#1a4a2e", fontWeight: 900 }}>–</span>
                    <input type="number" value={scores[f2]} onChange={e => set(f2, e.target.value)} style={{ ...scoreInput, borderColor: "#4a3010", color: "#f6ad55" }} />
                  </div>
                </div>
              ))}
              <button type="submit" disabled={saving} style={{
                width: "100%", padding: "10px", border: "none", cursor: "pointer",
                background: saved ? "linear-gradient(135deg, #276749, #2d8a52)" : saving ? "rgba(74,184,112,0.3)" : "linear-gradient(135deg, #2d8a52, #4ab870)",
                color: "white", borderRadius: 8, fontWeight: 800, fontSize: "0.82rem",
                letterSpacing: "0.08em", boxShadow: saved || saving ? "none" : "0 4px 15px rgba(74,184,112,0.3)"
              }}>
                {saved ? "✅ SAVED!" : saving ? "SAVING..." : "💾 SAVE SCORE"}
              </button>
            </form>
          )}
        </>
      )}

      {/* Pending confirmations */}
      {needsAction.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <button onClick={() => setShowConfirm(v => !v)} style={{
            width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "7px 10px", background: "rgba(255,255,255,0.02)", border: "1px solid #1a3a2e",
            borderRadius: 8, cursor: "pointer", color: "#4a9d6f", fontSize: "0.72rem", fontWeight: 700
          }}>
            <span>⏳ PENDING CONFIRMATIONS ({needsAction.length})</span>
            <span>{showConfirm ? "▲" : "▼"}</span>
          </button>

          {showConfirm && (
            <div style={{ marginTop: 8, maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              {needsAction.map(m => {
                const confirmed = user.team === m.team1 ? m.confirmed_by_team1 : m.confirmed_by_team2
                const bothConfirmed = m.confirmed_by_team1 && m.confirmed_by_team2
                return (
                  <div key={m.id} style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${m.disputed ? "#4a1a1a" : bothConfirmed ? "#1a4a2e" : "#1a2a3a"}`, borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#c8d8e8" }}>{m.team1} vs {m.team2}</span>
                      <span style={{ fontSize: "0.68rem", color: "#4ab870", fontWeight: 700 }}>{m.set1_team1}-{m.set1_team2} / {m.set2_team1}-{m.set2_team2}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      {m.disputed ? (
                        <>
                          <span style={{ fontSize: "0.68rem", color: "#fc8181", fontWeight: 700 }}>⚠️ DISPUTED</span>
                          {user.is_admin && (
                            <button onClick={() => setResolveMatch(m)} style={{ padding: "3px 10px", background: "rgba(252,129,129,0.15)", border: "1px solid #4a1a1a", borderRadius: 5, color: "#fc8181", fontSize: "0.68rem", fontWeight: 700, cursor: "pointer" }}>
                              👑 REVIEW & RESOLVE
                            </button>
                          )}
                        </>
                      ) : bothConfirmed ? (
                        <span style={{ fontSize: "0.68rem", color: "#4ab870", fontWeight: 700 }}>✅ CONFIRMED</span>
                      ) : (
                        <>
                          {!confirmed && !user.is_admin && (
                            <button onClick={() => handleConfirm(m.id)} style={{ padding: "3px 10px", background: "rgba(74,184,112,0.15)", border: "1px solid #1a4a2e", borderRadius: 5, color: "#4ab870", fontSize: "0.68rem", fontWeight: 700, cursor: "pointer" }}>
                              ✓ CONFIRM
                            </button>
                          )}
                          {confirmed && <span style={{ fontSize: "0.68rem", color: "#4ab870" }}>✓ You confirmed</span>}
                          {!user.is_admin && (
                            <button onClick={() => handleDispute(m.id)} style={{ padding: "3px 10px", background: "rgba(252,129,129,0.1)", border: "1px solid #4a1a1a", borderRadius: 5, color: "#fc8181", fontSize: "0.68rem", fontWeight: 700, cursor: "pointer" }}>
                              ⚠ DISPUTE
                            </button>
                          )}
                          {user.is_admin && (
                            <button onClick={() => handleConfirm(m.id)} style={{ padding: "3px 10px", background: "rgba(74,184,112,0.15)", border: "1px solid #1a4a2e", borderRadius: 5, color: "#4ab870", fontSize: "0.68rem", fontWeight: 700, cursor: "pointer" }}>
                              👑 FORCE CONFIRM
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const scoreInput = {
  width: 54, textAlign: "center", fontSize: "1.2rem", fontWeight: 900,
  padding: "6px 4px", border: "1px solid", borderRadius: 8,
  background: "rgba(255,255,255,0.05)", outline: "none"
}
