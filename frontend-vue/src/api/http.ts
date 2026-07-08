import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig
} from 'axios'
import { ElMessage } from 'element-plus'
import type { TokenPair } from '@/types/ssgl'

const API_BASE = import.meta.env.VITE_API_URL || '/'
export const SSGL_API_BASE = '/api/v1'
export const SSGL_AI_BASE = '/ai/api/v1'

export function getAccessToken(): string | null {
  return localStorage.getItem('access_token')
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('refresh_token')
}

export function setTokens(tokens: TokenPair): void {
  localStorage.setItem('access_token', tokens.access_token)
  localStorage.setItem('refresh_token', tokens.refresh_token)
}

export function clearTokens(): void {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

function createApiInstance(baseURL: string): AxiosInstance {
  const instance = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' }
  })

  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  instance.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error) => {
      const originalRequest = error.config

      if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
        originalRequest._retry = true
        const refreshToken = getRefreshToken()
        if (!refreshToken) {
          clearTokens()
          return Promise.reject(error)
        }

        try {
          const response = await axios.post(`${API_BASE}${SSGL_API_BASE}/auth/refresh`, {
            refresh_token: refreshToken
          })
          const tokens = response.data as TokenPair
          setTokens(tokens)
          originalRequest.headers.Authorization = `Bearer ${tokens.access_token}`
          return instance(originalRequest)
        } catch (refreshError) {
          clearTokens()
          return Promise.reject(refreshError)
        }
      }

      if (error.response?.status === 403) {
        ElMessage.error('权限不足')
      }

      return Promise.reject(error)
    }
  )

  return instance
}

export const api = createApiInstance(SSGL_API_BASE)
export const aiApi = createApiInstance(SSGL_AI_BASE)
