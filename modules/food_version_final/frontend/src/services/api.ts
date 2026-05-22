import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/food-api',
  timeout: 30000,
  headers: { 
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
})

// Request interceptor - attach token + timezone
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  // Send user's local timezone automatically (e.g. "America/Bogota")
  config.headers['X-Timezone'] = Intl.DateTimeFormat().resolvedOptions().timeZone
  return config
})

// Response interceptor - handle 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const isAuthEndpoint = err.config?.url?.includes('/auth/login') ||
                           err.config?.url?.includes('/auth/register') ||
                           err.config?.url?.includes('/auth/request-renewal')
    if (err.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('subscription')
      window.location.href = import.meta.env.VITE_FOOD_EMBEDDED === 'true' ? '/' : '/login'
    }
    return Promise.reject(err)
  }
)

export { api }
export default api
