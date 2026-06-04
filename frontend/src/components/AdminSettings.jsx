import { useState, useEffect } from "react"
import { useAuth } from "../AuthContext"
import { useToast } from "../ToastContext"
import { api } from "../api"
import PasswordChangeModal from "./PasswordChangeModal"

const validatePassword = (pw) => {
  if (pw.length < 8) return "Password must be at least 8 characters"
  if (!/[A-Z]/.test(pw)) return "Password must contain an uppercase letter"
  if (!/[a-z]/.test(pw)) return "Password must contain a lowercase letter"
  if (!/\d/.test(pw)) return "Password must contain a number"
  return null
}

export default function AdminSettings({ onRequestsChange }) {
  const { user } = useAuth()
  const toast = useToast()
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [resetRequests, setResetRequests] = useState([])
  const [newPasswords, setNewPasswords] = useState({})
  const [processing, setProcessing] = useState({})

  const fetchRequests = async () => {
    try {
      const res = await api.get("/admin-requests")
      setResetRequests(res.data)
    } catch {}
  }

  useEffect(() => {
    if (user?.is_admin) fetchRequests()
  }, [user])

  const handleApprove = async (id, type) => {
    const pw = newPasswords[id]
    if (type === "password_reset") {
      if (!pw) return
      const pwErr = validatePassword(pw)
      if (pwErr) { toast.error(pwErr); return }
    }
    setProcessing(p => ({ ...p, [id]: true }))
    try {
      const body = type === "password_reset" ? { new_password: pw } : {}
      await api.post(`/admin-requests/${id}/approve`, body)
      toast.success("Request approved!")
      fetchRequests()
      onRequestsChange?.()
      setNewPasswords(p => { const n = { ...p }; delete n[id]; return n })
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to approve")
    }
    setProcessing(p => ({ ...p, [id]: false }))
  }

  const handleDeny = async (id) => {
    setProcessing(p => ({ ...p, [id]: true }))
    try {
      await api.post(`/admin-requests/${id}/deny`)
      toast.success("Request denied.")
      fetchRequests()
      onRequestsChange?.()
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to deny")
    }
    setProcessing(p => ({ ...p, [id]: false }))
  }

  if (!user?.is_admin) return (
    <div style={{ padding: "20px", textAlign: "center", color: "#2d5a3d" }}>
      Admin settings only available to administrators
    </div>
  )

  const TYPE_LABELS = {
    password_reset: { icon: "🔑", label: "Password Reset" },
    registration_approval: { icon: "📝", label: "New Registration" },
    team_rename: { icon: "✏️", label: "Team Rename" },
  }

  const pending = resetRequests.filter(r => r.status === "pending")
  const past = resetRequests.filter(r => r.status !== "pending")

  const rowStyle = {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid #1a3a2e",
    borderRadius: 8,
    padding: "12px 14px",
    marginBottom: 8,
  }

  const inp = {
    padding: "7px 10px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid #1a3a2e",
    borderRadius: 6,
    color: "white",
    fontSize: "0.82rem",
    marginRight: 6,
    width: 160,
  }

  return (
    <div>
      {/* Password Reset Requests */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: "0.9rem", fontWeight: 800, color: "#4ab870", letterSpacing: "0.1em", marginBottom: 12 }}>
          🔑 PASSWORD RESET REQUESTS
          {pending.length > 0 && (
            <span style={{ marginLeft: 8, background: "#fc8181", color: "white", borderRadius: 10, padding: "1px 7px", fontSize: "0.7rem" }}>
              {pending.length}
            </span>
          )}
        </h3>

        {pending.length === 0 ? (
          <p style={{ fontSize: "0.8rem", color: "#2d5a3d" }}>No pending requests</p>
        ) : (
          pending.map(r => (
            <div key={r.id} style={rowStyle}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <span style={{ fontSize: "0.72rem", color: TYPE_LABELS[r.type]?.icon ? "#f6ad55" : "#4a9d6f", fontWeight: 700, marginRight: 6 }}>
                    {TYPE_LABELS[r.type]?.icon} {TYPE_LABELS[r.type]?.label || r.type}
                  </span>
                  <span style={{ fontWeight: 700, color: "#e2e8f0", fontSize: "0.85rem" }}>{r.username}</span>
                  <span style={{ color: "#4a9d6f", fontSize: "0.78rem", marginLeft: 8 }}>{r.team}</span>
                  {r.type === "team_rename" && (
                    <span style={{ color: "#f6ad55", fontSize: "0.75rem", marginLeft: 8 }}>→ "{r.reason}"</span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  {r.type === "password_reset" && (
                    <input
                      style={inp}
                      type="password"
                      placeholder="New password"
                      value={newPasswords[r.id] || ""}
                      onChange={e => setNewPasswords(p => ({ ...p, [r.id]: e.target.value }))}
                    />
                  )}
                  <button
                    onClick={() => handleApprove(r.id, r.type)}
                    disabled={(r.type === "password_reset" && !newPasswords[r.id]) || processing[r.id]}
                    style={{
                      padding: "7px 12px", background: "linear-gradient(135deg, #2d8a52, #4ab870)",
                      border: "none", borderRadius: 6, color: "white", fontWeight: 700,
                      fontSize: "0.75rem", cursor: "pointer",
                      opacity: ((r.type === "password_reset" && !newPasswords[r.id]) || processing[r.id]) ? 0.5 : 1
                    }}
                  >
                    APPROVE
                  </button>
                  <button
                    onClick={() => handleDeny(r.id)}
                    disabled={processing[r.id]}
                    style={{
                      padding: "7px 12px", background: "rgba(252,129,129,0.1)",
                      border: "1px solid #4a1a1a", borderRadius: 6, color: "#fc8181",
                      fontWeight: 700, fontSize: "0.75rem", cursor: "pointer"
                    }}
                  >
                    DENY
                  </button>
                </div>
              </div>
            </div>
          ))
        )}

        {past.length > 0 && (
          <details style={{ marginTop: 8 }}>
            <summary style={{ fontSize: "0.75rem", color: "#2d5a3d", cursor: "pointer" }}>
              Show processed ({past.length})
            </summary>
            {past.map(r => (
              <div key={r.id} style={{ ...rowStyle, opacity: 0.5, marginTop: 4 }}>
                <span style={{ fontSize: "0.8rem", color: "#e2e8f0" }}>{r.username}</span>
                <span style={{ marginLeft: 8, fontSize: "0.72rem", color: r.status === "approved" ? "#4ab870" : "#fc8181", fontWeight: 700 }}>
                  {r.status.toUpperCase()}
                </span>
              </div>
            ))}
          </details>
        )}
      </div>

      {/* Change Password */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: "0.9rem", fontWeight: 800, color: "#4ab870", letterSpacing: "0.1em", marginBottom: 16 }}>
          🔐 ACCOUNT SECURITY
        </h3>
        <div style={{
          background: "rgba(255,255,255,0.02)", border: "1px solid #1a3a2e",
          borderRadius: 10, padding: "16px 18px", display: "flex",
          alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>Change Password</div>
            <div style={{ fontSize: "0.75rem", color: "#2d5a3d" }}>Update your password to keep your account secure</div>
          </div>
          <button
            onClick={() => setShowPasswordModal(true)}
            style={{
              padding: "8px 16px", background: "linear-gradient(135deg, #2d8a52, #4ab870)",
              border: "none", borderRadius: 8, color: "white", fontWeight: 700,
              fontSize: "0.78rem", letterSpacing: "0.08em", cursor: "pointer",
            }}
          >
            CHANGE PASSWORD
          </button>
        </div>
      </div>

      <PasswordChangeModal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
    </div>
  )
}
