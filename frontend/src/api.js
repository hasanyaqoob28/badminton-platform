import axios from "axios"

export const api = axios.create({ baseURL: "http://localhost:8000" })

// Attach token from localStorage on every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem("badminton_token")
  if (token) config.headers["Authorization"] = `Bearer ${token}`
  return config
})

// Global response error handler — fires toastError if registered
api.interceptors.response.use(
  res => res,
  err => {
    const detail = err.response?.data?.detail
    const status = err.response?.status

    // 401 — token expired or invalid, clear session
    if (status === 401) {
      localStorage.removeItem("badminton_token")
      localStorage.removeItem("badminton_user")
      delete api.defaults.headers.common["Authorization"]
      if (window.__toastError) window.__toastError("Session expired. Please log in again.")
    } else if (status === 403) {
      if (window.__toastError) window.__toastError(detail || "You don't have permission to do that.")
    } else if (status >= 500) {
      if (window.__toastError) window.__toastError("Server error. Please try again.")
    }
    // Let individual callers handle 400s themselves
    return Promise.reject(err)
  }
)
