import { Router } from 'express'
import crypto from 'crypto'
import { query } from '../db/pool.js'
import { authenticate } from '../middleware/auth.js'
import { formatAuthUser } from '../utils/user.js'
import { createSubscriptionCheckout, isAirwallexConfigured } from '../services/airwallex.js'
import { config } from '../config.js'

const router = Router()

router.get('/status', authenticate, (req, res) => {
  res.json({
    user: formatAuthUser(req.user),
    plan: {
      name: 'E-BOOK Premium',
      price: config.subscription.priceEur,
      currency: 'EUR',
      interval: 'month',
    },
    airwallex_configured: isAirwallexConfigured(),
  })
})

router.post('/checkout', authenticate, async (req, res, next) => {
  try {
    if (req.user.is_admin) {
      return res.status(422).json({ message: 'Les administrateurs n\'ont pas besoin d\'abonnement' })
    }

    if (!isAirwallexConfigured()) {
      return res.status(503).json({
        message: 'Paiement non configuré. Définissez les variables Airwallex sur le serveur.',
      })
    }

    const requestId = crypto.randomUUID()
    const checkout = await createSubscriptionCheckout({
      email: req.user.email,
      requestId,
    })

    res.json({
      checkout_url: checkout.url,
      checkout_id: checkout.id,
    })
  } catch (err) {
    next(err)
  }
})

// Secours après retour Airwallex si le webhook est lent
router.post('/sync', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.user.id])
    res.json({ user: formatAuthUser(rows[0]) })
  } catch (err) {
    next(err)
  }
})

export default router
