import crypto from 'crypto'
import { config } from '../config.js'

let cachedToken = null
let tokenExpiresAt = 0

export function isAirwallexConfigured() {
  return Boolean(
    config.airwallex.clientId &&
    config.airwallex.apiKey &&
    config.airwallex.priceId
  )
}

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken
  }

  const headers = {
    'Content-Type': 'application/json',
    'x-client-id': config.airwallex.clientId,
    'x-api-key': config.airwallex.apiKey,
  }

  if (config.airwallex.loginAs) {
    headers['x-login-as'] = config.airwallex.loginAs
  }

  const res = await fetch(`${config.airwallex.apiBase}/api/v1/authentication/login`, {
    method: 'POST',
    headers,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Airwallex auth failed: ${err}`)
  }

  const data = await res.json()
  cachedToken = data.token
  tokenExpiresAt = new Date(data.expires_at).getTime()
  return cachedToken
}

async function airwallexRequest(path, body) {
  const token = await getAccessToken()
  const res = await fetch(`${config.airwallex.apiBase}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.message || data.error || `Airwallex error ${res.status}`)
  }
  return data
}

export async function createSubscriptionCheckout({ email, requestId }) {
  const payload = {
    request_id: requestId,
    mode: 'SUBSCRIPTION',
    customer_data: { email },
    line_items: [{ price_id: config.airwallex.priceId, quantity: 1 }],
    success_url: `${config.frontendUrl}/subscription/success`,
    back_url: `${config.frontendUrl}/subscription`,
    cancel_url: `${config.frontendUrl}/subscription/cancel`,
    locale: 'fr',
  }

  if (config.airwallex.legalEntityId) {
    payload.legal_entity_id = config.airwallex.legalEntityId
  }
  if (config.airwallex.linkedPaymentAccountId) {
    payload.linked_payment_account_id = config.airwallex.linkedPaymentAccountId
  }

  // Essayer les deux chemins d'API selon la version Airwallex
  try {
    return await airwallexRequest('/api/v1/billing/billing_checkouts/create', payload)
  } catch {
    return airwallexRequest('/api/v1/billing_checkouts/create', payload)
  }
}

export function verifyWebhookSignature(rawBody, timestamp, signature) {
  if (!config.airwallex.webhookSecret) return false
  const value = `${timestamp}${rawBody}`
  const expected = crypto
    .createHmac('sha256', config.airwallex.webhookSecret)
    .update(value)
    .digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}
