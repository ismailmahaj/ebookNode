import { api } from './client'

export const authApi = {
  register: async (data: { name: string; email: string; password: string; password_confirmation: string }) =>
    (await api.post('/auth/register', data)).data,
  login: async (email: string, password: string) =>
    (await api.post('/auth/login', { email, password })).data,
  logout: async () => {
    await api.post('/auth/logout')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  },
  me: async () => (await api.get('/auth/me')).data,
}
