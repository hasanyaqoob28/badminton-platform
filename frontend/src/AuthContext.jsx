import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react"
import { api } from "./api"

const AuthContext = createContext(null)
const INACTIVITY_MS = 30 * 60 * 1000 // 30 minutes

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("badminton_user")
    return stored ? JSON.parse(stored) : null
  })
  const timerRef = useRef(null)

  const logout = useCallback(() => {
    localStorage.removeItem("badminton_token")
    localStorage.removeItem("badminton_refresh_token")
    localStorage.removeItem("badminton_user")
    delete api.defaults.headers.common["Authorization"]
    setUser(null)
  }, [])

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (localStorage.getItem("badminton_token")) {
      timerRef.current = setTimeout(() => logout(), INACTIVITY_MS)
    }
  }, [logout])

  // Start/reset timer on any user activity
  useEffect(() => {
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"]
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer))
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [resetTimer])

  const login = async (username, password) => {
    const form = new FormData()
    form.append("username", username)
    form.append("password", password)
    const res = await api.post("/login", form)
    const data = res.data
    localStorage.setItem("badminton_token", data.access_token)
    if (data.refresh_token) {
      localStorage.setItem("badminton_refresh_token", data.refresh_token)
    }
    localStorage.setItem("badminton_user", JSON.stringify(data))
    api.defaults.headers.common["Authorization"] = `Bearer ${data.access_token}`
    setUser(data)
    resetTimer()
    return data
  }

  const requestPasswordReset = async (username) => {
    const res = await api.post("/request-password-reset", { username })
    return res.data
  }

  const resetPassword = async (token, newPassword) => {
    const res = await api.post("/reset-password", { token, new_password: newPassword })
    return res.data
  }

  const changePassword = async (currentPassword, newPassword) => {
    const res = await api.post("/change-password", { current_password: currentPassword, new_password: newPassword })
    return res.data
  }

  // restore token on load
  useEffect(() => {
    const token = localStorage.getItem("badminton_token")
    if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, requestPasswordReset, resetPassword, changePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
