import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor — attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('laptrack_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — handle expired token (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || ''
    const isAuthRoute = url.includes('/auth/') || url.includes('/responses/')
    if (error.response?.status === 401 && !isAuthRoute) {
      localStorage.removeItem('laptrack_token')
      localStorage.removeItem('laptrack_user')
      window.location.href = '/'
    }
    return Promise.reject(error)
  }
)

export default api
