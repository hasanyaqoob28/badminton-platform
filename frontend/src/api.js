import axios from "axios"

export const api = axios.create({ baseURL: "http://localhost:8000" })

// Store for pending requests during token refresh
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

// Attach token from localStorage on every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem("badminton_token")
  if (token) config.headers["Authorization"] = `Bearer ${token}`
  return config
})

// Response interceptor for auto-refresh on 401
api.interceptors.response.use(
  res => res,
  async err => {
    const originalRequest = err.config
    const detail = err.response?.data?.detail
    const status = err.response?.status
    const url = err.config?.url || ""

    // Don't intercept login/register errors — let the form handle them
    if (url.includes("/login") || url.includes("/register")) {
      return Promise.reject(err)
    }

    // /refresh with session conflict — clear and notify
    if (url.includes("/refresh")) {
      if (err.response?.data?.detail?.includes("logged in elsewhere")) {
        localStorage.removeItem("badminton_token")
        localStorage.removeItem("badminton_refresh_token")
        localStorage.removeItem("badminton_user")
        delete api.defaults.headers.common["Authorization"]
        window.dispatchEvent(new CustomEvent("auth:session-conflict"))
      }
      return Promise.reject(err)
    }

    // 401 — attempt token refresh
    if (status === 401 && !originalRequest._retry) {
      // Session conflict — logged in elsewhere, don't refresh, just clear and notify
      if (err.response?.data?.detail?.includes("logged in elsewhere")) {
        localStorage.removeItem("badminton_token")
        localStorage.removeItem("badminton_refresh_token")
        localStorage.removeItem("badminton_user")
        delete api.defaults.headers.common["Authorization"]
        processQueue(err, null)
        window.dispatchEvent(new CustomEvent("auth:session-conflict"))
        return Promise.reject(err)
      }
      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then(token => {
            originalRequest.headers["Authorization"] = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch(err => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const refreshToken = localStorage.getItem("badminton_refresh_token")
        if (!refreshToken) throw new Error("No refresh token")

        const res = await axios.post(`${api.defaults.baseURL}/refresh`, {
          refresh_token: refreshToken,
        })

        const newAccessToken = res.data.access_token

        // Update stored token and headers
        localStorage.setItem("badminton_token", newAccessToken)
        api.defaults.headers.common["Authorization"] = `Bearer ${newAccessToken}`

        // Process queued requests
        processQueue(null, newAccessToken)

        // Retry original request
        originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`
        return api(originalRequest)
      } catch (refreshErr) {
        // Refresh failed — clear tokens and trigger re-login
        localStorage.removeItem("badminton_token")
        localStorage.removeItem("badminton_refresh_token")
        localStorage.removeItem("badminton_user")
        delete api.defaults.headers.common["Authorization"]

        // Process queued requests with error
        processQueue(refreshErr, null)

        // Dispatch event to trigger re-login modal
        window.dispatchEvent(new CustomEvent("auth:relogin-required"))

        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }

    // Other errors
    if (status === 403) {
      if (window.__toastError) window.__toastError(detail || "You don't have permission to do that.")
    } else if (status >= 500) {
      if (window.__toastError) window.__toastError("Server error. Please try again.")
    }

    return Promise.reject(err)
  }
)
