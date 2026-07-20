const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken: auth } = require('../middleware/auth');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Pricing configuration
const PRICING = {
  weekly: {
    amount: 500, // $5.00
    interval: 'week',
    priceId: process.env.STRIPE_PRICE_WEEKLY,
    name: 'Premium Weekly',
  },
  monthly: {
    amount: 1500, // $15.00
    interval: 'month',
    priceId: process.env.STRIPE_PRICE_MONTHLY,
    name: 'Premium Monthly',
  },
};

// Get current subscription status
router.get('/status', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT subscription_status, subscription_tier, subscription_start_date, 
              subscription_end_date, subscription_cancel_at_period_end
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    const user = result.rows[0];
    
    res.json({
      status: user.subscription_status || 'free',
      tier: user.subscription_tier,
      startDate: user.subscription_start_date,
      endDate: user.subscription_end_date,
      cancelAtPeriodEnd: user.subscription_cancel_at_period_end,
      isPremium: user.subscription_status === 'active' || user.subscription_status === 'trialing',
    });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

// Create Stripe checkout session
router.post('/create-checkout-session', auth, async (req, res) => {
  try {
    const { tier } = req.body; // 'weekly' or 'monthly'
    
    if (!PRICING[tier]) {
      return res.status(400).json({ error: 'Invalid subscription tier' });
    }

    const userResult = await db.query(
      'SELECT email, stripe_customer_id FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = userResult.rows[0];

    let customerId = user.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: req.user.id.toString(),
        },
      });
      customerId = customer.id;

      await db.query(
        'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
        [customerId, req.user.id]
      );
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'], // Will add google_pay, paypal later
      line_items: [
        {
          price: PRICING[tier].priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/premium/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/premium`,
      metadata: {
        userId: req.user.id.toString(),
        tier: tier,
      },
      subscription_data: {
        metadata: {
          userId: req.user.id.toString(),
          tier: tier,
        },
      },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Create customer portal session (manage subscription)
router.post('/create-portal-session', auth, async (req, res) => {
  try {
    const userResult = await db.query(
      'SELECT stripe_customer_id FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = userResult.rows[0];

    if (!user.stripe_customer_id) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${process.env.FRONTEND_URL}/premium`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// Cancel subscription
router.post('/cancel', auth, async (req, res) => {
  try {
    const userResult = await db.query(
      'SELECT stripe_subscription_id FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = userResult.rows[0];

    if (!user.stripe_subscription_id) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    // Cancel at period end (don't immediately revoke access)
    await stripe.subscriptions.update(user.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    await db.query(
      'UPDATE users SET subscription_cancel_at_period_end = TRUE WHERE id = $1',
      [req.user.id]
    );

    res.json({ message: 'Subscription will be canceled at the end of the billing period' });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = parseInt(session.metadata.userId);
        const tier = session.metadata.tier;

        await db.query(
          `UPDATE users 
           SET subscription_status = 'active',
               subscription_tier = $1,
               stripe_subscription_id = $2,
               subscription_start_date = NOW()
           WHERE id = $3`,
          [tier, session.subscription, userId]
        );

        // Log event
        await db.query(
          `INSERT INTO subscription_history (user_id, event_type, subscription_tier, amount, stripe_event_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, 'subscription_created', tier, session.amount_total, event.id]
        );
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const userId = parseInt(subscription.metadata.userId);

        await db.query(
          `UPDATE users 
           SET subscription_status = $1,
               subscription_cancel_at_period_end = $2,
               subscription_end_date = $3
           WHERE stripe_subscription_id = $4`,
          [
            subscription.status,
            subscription.cancel_at_period_end,
            subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
            subscription.id,
          ]
        );

        await db.query(
          `INSERT INTO subscription_history (user_id, event_type, subscription_tier, stripe_event_id)
           VALUES ($1, $2, $3, $4)`,
          [userId, 'subscription_updated', subscription.metadata.tier, event.id]
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;

        await db.query(
          `UPDATE users 
           SET subscription_status = 'canceled',
               subscription_end_date = NOW()
           WHERE stripe_subscription_id = $1`,
          [subscription.id]
        );

        await db.query(
          `INSERT INTO subscription_history (user_id, event_type, stripe_event_id)
           VALUES ((SELECT id FROM users WHERE stripe_subscription_id = $1), $2, $3)`,
          [subscription.id, 'subscription_canceled', event.id]
        );
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;

        await db.query(
          `UPDATE users 
           SET subscription_status = 'past_due'
           WHERE stripe_customer_id = $1`,
          [invoice.customer]
        );
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;
