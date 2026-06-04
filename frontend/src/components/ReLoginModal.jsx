import { useState } from "react"
import { useAuth } from "../AuthContext"

export default function ReLoginModal({ isOpen, onClose }) {
  const { login } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await login(username, password)
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed. Please try again.")
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
        maxWidth: 400,
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
            Session Expired
          </h2>
          <p style={{
            fontSize: "0.9rem",
            color: "#4a9d6f",
            margin: 0,
          }}>
            Your session has expired. Please log in again.
          </p>
        </div>

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
              USERNAME
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
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
              placeholder="captain1"
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
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
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

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "12px 16px",
              background: "linear-gradient(135deg, #2d8a52, #4ab870)",
              border: "none",
              borderRadius: 8,
              color: "white",
              fontWeight: 800,
              fontSize: "0.9rem",
              letterSpacing: "0.08em",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              transition: "all 0.2s",
            }}
          >
            {loading ? "LOGGING IN..." : "LOGIN"}
          </button>
        </form>
      </div>
    </div>
  )
}
