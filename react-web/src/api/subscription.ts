import { api } from './client'

export interface SubscriptionPlan {
  name: string
  price: number
  currency: string
  interval: string
}

export interface SubscriptionStatus {
  user: {
    id: number
    name: string
    email: string
    is_admin: boolean
    subscription_status: string | null
    subscription_ends_at: string | null
    has_active_subscription: boolean
  }
  plan: SubscriptionPlan
  airwallex_configured: boolean
}

export const subscriptionApi = {
  status: async () => (await api.get<SubscriptionStatus>('/subscription/status')).data,
  checkout: async () => (await api.post<{ checkout_url: string; checkout_id: string }>('/subscription/checkout')).data,
  sync: async () => (await api.post<{ user: SubscriptionStatus['user'] }>('/subscription/sync')).data,
}
