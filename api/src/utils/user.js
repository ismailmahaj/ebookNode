export function hasActiveSubscription(user) {
  if (user.is_admin) return true
  const status = user.subscription_status
  if (status === 'active' || status === 'canceled') {
    if (!user.subscription_ends_at) return status === 'active'
    return new Date(user.subscription_ends_at) > new Date()
  }
  return false
}

export function formatUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    is_admin: user.is_admin,
    subscription_status: user.subscription_status,
    subscription_ends_at: user.subscription_ends_at
      ? new Date(user.subscription_ends_at).toISOString()
      : null,
    trial_ends_at: user.trial_ends_at
      ? new Date(user.trial_ends_at).toISOString()
      : null,
    has_active_subscription: hasActiveSubscription(user),
    created_at: new Date(user.created_at).toISOString(),
  }
}

export function formatAuthUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    is_admin: Boolean(user.is_admin),
    subscription_status: user.subscription_status,
    subscription_ends_at: user.subscription_ends_at
      ? new Date(user.subscription_ends_at).toISOString()
      : null,
    has_active_subscription: hasActiveSubscription(user),
  }
}
