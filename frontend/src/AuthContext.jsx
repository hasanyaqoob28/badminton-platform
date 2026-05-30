import { createContext, useContext, useState } from "react"
import { api } from "./api"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("badminton_user")
    return stored ? JSON.parse(stored) : null
  })

  const login = async (username, password) => {
    const form = new FormData()
    form.append("username", username)
    form.append("password", password)
    const res = await api.post("/login", form)
    const data = res.data
    localStorage.setItem("badminton_token", data.access_token)
    localStorage.setItem("badminton_user", JSON.stringify(data))
    api.defaults.headers.common["Authorization"] = `Bearer ${data.access_token}`
    setUser(data)
    return data
  }

  const logout = () => {
    localStorage.removeItem("badminton_token")
    localStorage.removeItem("badminton_user")
    delete api.defaults.headers.common["Authorization"]
    setUser(null)
  }

  // restore token on load
  const token = localStorage.getItem("badminton_token")
  if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
