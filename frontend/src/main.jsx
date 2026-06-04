import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import App from "./App"
import { AuthProvider } from "./AuthContext"
import { ToastProvider, useToast } from "./ToastContext"
import "./index.css"

// Bridge: wire up global axios error handler to toast system
function ToastBridge() {
  const toast = useToast()
  React.useEffect(() => {
    window.__toastError = toast.error
    return () => { delete window.__toastError }
  }, [toast])
  return null
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router>
      <ToastProvider>
        <ToastBridge />
        <AuthProvider>
          <Routes>
            <Route path="/" element={<App />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </Router>
  </React.StrictMode>
)
