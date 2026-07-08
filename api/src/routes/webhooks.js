import { Router } from 'express'
import express from 'express'
import { query } from '../db/pool.js'
import { verifyWebhookSignature } from '../services/airwallex.js'

const router = Router()

router.post(
  '/airwallex',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const rawBody = req.body.toString('utf8')
    const timestamp = req.headers['x-timestamp']
    const signature = req.headers['x-signature']

    if (signature && !verifyWebhookSignature(rawBody, timestamp, signature)) {
      return res.status(400).json({ message: 'Signature invalide' })
    }

    let event
    try {
      event = JSON.parse(rawBody)
    } catch {
      return res.status(400).json({ message: 'JSON invalide' })
    }

    res.sendStatus(200)

    try {
      await processAirwallexEvent(event)
    } catch (err) {
      console.error('Erreur traitement webhook Airwallex:', err)
    }
  }
)

async function markEventProcessed(eventId) {
  if (!eventId) return false
  const existing = await query('SELECT id FROM billing_events WHERE id = $1', [eventId])
  if (existing.rows.length) return false
  await query(
    'INSERT INTO billing_events (id, event_type) VALUES ($1, $2)',
    [eventId, 'processed']
  )
  return true
}

async function findUserFromEvent(event) {
  const data = event.data?.object || event.data || {}
  const email =
    data.customer_email ||
    data.customer?.email ||
    data.billing_customer?.email ||
    data.email

  if (email) {
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()])
    if (rows.length) return rows[0]
  }

  const subscriptionId = data.subscription_id || data.id
  if (subscriptionId) {
    const { rows } = await query(
      'SELECT * FROM users WHERE airwallex_subscription_id = $1',
      [subscriptionId]
    )
    if (rows.length) return rows[0]
  }

  return null
}

function periodEndFromEvent(data) {
  const end =
    data.current_period_end_at ||
    data.current_period_end ||
    data.period_end_at ||
    data.next_billing_at

  if (end) return new Date(end).toISOString().slice(0, 10)

  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  return d.toISOString().slice(0, 10)
}

async function activateSubscription(user, data) {
  const subscriptionId = data.subscription_id || data.id || user.airwallex_subscription_id
  const customerId = data.customer_id || data.billing_customer_id || user.airwallex_customer_id
  const endsAt = periodEndFromEvent(data)

  await query(
    `UPDATE users SET
      subscription_status = 'active',
      subscription_ends_at = $1,
      airwallex_subscription_id = COALESCE($2, airwallex_subscription_id),
      airwallex_customer_id = COALESCE($3, airwallex_customer_id),
      updated_at = NOW()
     WHERE id = $4`,
    [endsAt, subscriptionId, customerId, user.id]
  )
}

async function deactivateSubscription(user) {
  await query(
    `UPDATE users SET
      subscription_status = 'inactive',
      subscription_ends_at = NULL,
      updated_at = NOW()
     WHERE id = $1`,
    [user.id]
  )
}

async function processAirwallexEvent(event) {
  const eventId = event.id
  const eventType = event.type || event.name

  if (!(await markEventProcessed(eventId))) return

  const user = await findUserFromEvent(event)
  if (!user) {
    console.warn('Webhook Airwallex: utilisateur introuvable', eventType)
    return
  }

  const data = event.data?.object || event.data || {}

  switch (eventType) {
    case 'subscription.active':
    case 'subscription.activated':
    case 'invoice.payment.paid':
    case 'invoice.paid':
      await activateSubscription(user, data)
      break

    case 'subscription.renewed':
    case 'subscription.updated':
      if (data.status === 'ACTIVE' || data.status === 'active') {
        await activateSubscription(user, data)
      }
      break

    case 'subscription.cancelled':
    case 'subscription.canceled':
      // Accès jusqu'à la fin de période si fournie, sinon couper
      if (data.current_period_end_at || data.current_period_end) {
        await activateSubscription(user, data)
        await query(
          `UPDATE users SET subscription_status = 'canceled', updated_at = NOW() WHERE id = $1`,
          [user.id]
        )
      } else {
        await deactivateSubscription(user)
      }
      break

    case 'subscription.unpaid':
    case 'subscription.past_due':
      await query(
        `UPDATE users SET subscription_status = 'past_due', updated_at = NOW() WHERE id = $1`,
        [user.id]
      )
      break

    default:
      console.log('Webhook Airwallex non géré:', eventType)
  }
}

export default router
