import { createContext, useContext, useState, useCallback } from "react"

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = "success", duration = 3500) => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(t => t.filter(x => x.id !== id))
  }, [])

  const toast = {
    success: (msg) => addToast(msg, "success"),
    error: (msg) => addToast(msg, "error", 5000),
    info: (msg) => addToast(msg, "info"),
    warning: (msg) => addToast(msg, "warning"),
  }

  const colors = {
    success: { bg: "rgba(74,184,112,0.12)", border: "#2d8a52", color: "#4ab870", icon: "✅" },
    error:   { bg: "rgba(252,129,129,0.12)", border: "#7a2a2a", color: "#fc8181", icon: "❌" },
    info:    { bg: "rgba(99,179,237,0.12)", border: "#1a3a5c", color: "#63b3ed", icon: "ℹ️" },
    warning: { bg: "rgba(246,173,85,0.12)", border: "#4a3010", color: "#f6ad55", icon: "⚠️" },
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container */}
      <div style={{
        position: "fixed", bottom: 24, right: 24, zIndex: 9999,
        display: "flex", flexDirection: "column", gap: 10,
        maxWidth: 360, width: "calc(100vw - 48px)"
      }}>
        {toasts.map(t => {
          const c = colors[t.type] || colors.info
          return (
            <div key={t.id} style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              padding: "12px 14px",
              background: c.bg,
              border: `1px solid ${c.border}`,
              borderRadius: 10,
              boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
              animation: "slideIn 0.2s ease",
              backdropFilter: "blur(8px)",
            }}>
              <span style={{ fontSize: "1rem", flexShrink: 0 }}>{c.icon}</span>
              <span style={{ fontSize: "0.78rem", color: c.color, fontWeight: 600, flex: 1, lineHeight: 1.4 }}>{t.message}</span>
              <button onClick={() => removeToast(t.id)} style={{
                background: "none", border: "none", cursor: "pointer",
                color: "#4a6a5a", fontSize: "0.8rem", padding: 0, flexShrink: 0, lineHeight: 1
              }}>✕</button>
            </div>
          )
        })}
      </div>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within ToastProvider")
  return ctx
}
