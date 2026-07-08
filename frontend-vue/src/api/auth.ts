import type { LoginRequest, LoginResponse, TokenPair, User } from '@/types/ssgl'
import { api, clearTokens, setTokens } from './http'

export const authAPI = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', credentials)
    if (response.data.tokens) {
      setTokens(response.data.tokens)
    }
    return response.data
  },

  async refresh(refreshToken: string): Promise<TokenPair> {
    const response = await api.post<TokenPair>('/auth/refresh', { refresh_token: refreshToken })
    setTokens(response.data)
    return response.data
  },

  async getMe(): Promise<{ user: User }> {
    const response = await api.get<{ user: User }>('/users/me')
    return response.data
  },

  logout(): void {
    clearTokens()
  }
}

// Backward-compatible aliases for template code
export async function fetchLogin(params: { username: string; password: string }) {
  return authAPI.login(params)
}

export async function fetchGetUserInfo() {
  return authAPI.getMe()
}
