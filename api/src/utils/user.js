export function hasActiveSubscription(user) {
  if (user.is_admin) return true
  if (user.subscription_status === 'active') {
    if (!user.subscription_ends_at) return true
    return new Date(user.subscription_ends_at) > new Date()
  }
  if (user.trial_ends_at && new Date(user.trial_ends_at) > new Date()) {
    return true
  }
  return false
}

export function isOnTrial(user) {
  if (user.subscription_status === 'active') return false
  return user.trial_ends_at && new Date(user.trial_ends_at) > new Date()
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
    is_on_trial: isOnTrial(user),
    created_at: new Date(user.created_at).toISOString(),
  }
}

export function formatAuthUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    is_admin: Boolean(user.is_admin),
  }
}
