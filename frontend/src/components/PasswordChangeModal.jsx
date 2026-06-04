import { useState } from "react"
import { useAuth } from "../AuthContext"

const PASSWORD_STRENGTH_REQUIREMENTS = {
  minLength: 8,
  hasUppercase: /[A-Z]/,
  hasLowercase: /[a-z]/,
  hasDigit: /\d/,
}

function validatePasswordStrength(password) {
  const errors = []
  
  if (password.length < PASSWORD_STRENGTH_REQUIREMENTS.minLength) {
    errors.push("At least 8 characters")
  }
  if (!PASSWORD_STRENGTH_REQUIREMENTS.hasUppercase.test(password)) {
    errors.push("At least one uppercase letter")
  }
  if (!PASSWORD_STRENGTH_REQUIREMENTS.hasLowercase.test(password)) {
    errors.push("At least one lowercase letter")
  }
  if (!PASSWORD_STRENGTH_REQUIREMENTS.hasDigit.test(password)) {
    errors.push("At least one number")
  }
  
  return errors
}

export default function PasswordChangeModal({ isOpen, onClose }) {
  const { changePassword } = useAuth()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess(false)

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match")
      return
    }

    // Validate password strength
    const strengthErrors = validatePasswordStrength(newPassword)
    if (strengthErrors.length > 0) {
      setError(`Password must have: ${strengthErrors.join(", ")}`)
      return
    }

    // Validate new password differs from current
    if (newPassword === currentPassword) {
      setError("New password must be different from current password")
      return
    }

    setLoading(true)

    try {
      await changePassword(currentPassword, newPassword)
      setSuccess(true)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setTimeout(() => {
        onClose()
        setSuccess(false)
      }, 1500)
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to change password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.7)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
    }}>
      <div style={{
        background: "linear-gradient(135deg, #0f1e35, #0d2137)",
        border: "1px solid #2d5a3d",
        borderRadius: 16,
        padding: "32px 36px",
        maxWidth: 420,
        width: "90%",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      }}>
        <div style={{ marginBottom: 24, textAlign: "center" }}>
          <h2 style={{
            fontSize: "1.3rem",
            fontWeight: 900,
            color: "white",
            marginBottom: 8,
          }}>
            Change Password
          </h2>
          <p style={{
            fontSize: "0.9rem",
            color: "#4a9d6f",
            margin: 0,
          }}>
            Update your account password securely
          </p>
        </div>

        {success && (
          <div style={{
            background: "rgba(76,175,80,0.1)",
            border: "1px solid #4caf50",
            borderRadius: 8,
            padding: "12px 14px",
            fontSize: "0.9rem",
            color: "#4caf50",
            marginBottom: 16,
            textAlign: "center",
            fontWeight: 600,
          }}>
            ✓ Password changed successfully
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{
              display: "block",
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "#4a9d6f",
              marginBottom: 6,
              letterSpacing: "0.08em",
            }}>
              CURRENT PASSWORD
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              disabled={loading || success}
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid #1a3a2e",
                borderRadius: 8,
                color: "white",
                fontSize: "0.9rem",
                boxSizing: "border-box",
              }}
              placeholder="••••••••"
            />
          </div>

          <div>
            <label style={{
              display: "block",
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "#4a9d6f",
              marginBottom: 6,
              letterSpacing: "0.08em",
            }}>
              NEW PASSWORD
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={loading || success}
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid #1a3a2e",
                borderRadius: 8,
                color: "white",
                fontSize: "0.9rem",
                boxSizing: "border-box",
              }}
              placeholder="••••••••"
            />
          </div>

          <div>
            <label style={{
              display: "block",
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "#4a9d6f",
              marginBottom: 6,
              letterSpacing: "0.08em",
            }}>
              CONFIRM PASSWORD
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading || success}
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid #1a3a2e",
                borderRadius: 8,
                color: "white",
                fontSize: "0.9rem",
                boxSizing: "border-box",
              }}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div style={{
              background: "rgba(252,129,129,0.1)",
              border: "1px solid #4a1a1a",
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: "0.85rem",
              color: "#fc8181",
            }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading || success}
              style={{
                flex: 1,
                padding: "12px 16px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid #1a3a2e",
                borderRadius: 8,
                color: "#4a9d6f",
                fontWeight: 800,
                fontSize: "0.9rem",
                letterSpacing: "0.08em",
                cursor: loading || success ? "not-allowed" : "pointer",
                opacity: loading || success ? 0.6 : 1,
                transition: "all 0.2s",
              }}
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={loading || success}
              style={{
                flex: 1,
                padding: "12px 16px",
                background: "linear-gradient(135deg, #2d8a52, #4ab870)",
                border: "none",
                borderRadius: 8,
                color: "white",
                fontWeight: 800,
                fontSize: "0.9rem",
                letterSpacing: "0.08em",
                cursor: loading || success ? "not-allowed" : "pointer",
                opacity: loading || success ? 0.6 : 1,
                transition: "all 0.2s",
              }}
            >
              {loading ? "CHANGING..." : success ? "SUCCESS" : "CHANGE PASSWORD"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
