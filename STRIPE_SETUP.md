# Stripe Subscription Setup Guide

## Pricing Structure
- **Weekly:** $5/week
- **Monthly:** $15/month (40% savings vs weekly)
- **Tax Code:** `txcd_10103000` (SaaS)

## Step 1: Create Stripe Account
1. Go to https://stripe.com
2. Sign up for a Stripe account
3. Complete business verification

## Step 2: Create Products in Stripe Dashboard

### Weekly Product
1. Go to **Products** → **Add Product**
2. **Name:** Shopping List Premium - Weekly
3. **Description:** Unlimited lists, recipes, and premium features
4. **Pricing:**
   - **Price:** $5.00
   - **Billing period:** Weekly
   - **Currency:** USD
5. **Tax behavior:** Exclusive (tax added on top)
6. **Tax code:** `txcd_10103000` (Software as a Service)
7. Click **Save product**
8. **Copy the Price ID** (starts with `price_...`)

### Monthly Product
1. Go to **Products** → **Add Product**
2. **Name:** Shopping List Premium - Monthly
3. **Description:** Save 40% with monthly billing
4. **Pricing:**
   - **Price:** $15.00
   - **Billing period:** Monthly
   - **Currency:** USD
5. **Tax behavior:** Exclusive
6. **Tax code:** `txcd_10103000`
7. Click **Save product**
8. **Copy the Price ID** (starts with `price_...`)

## Step 3: Enable Stripe Tax (Recommended)
1. Go to **Settings** → **Tax**
2. Click **Enable Stripe Tax**
3. Register for tax collection in your jurisdictions
4. Stripe will automatically calculate and collect taxes

## Step 4: Set Up Webhooks
1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. **Endpoint URL:** `https://yourdomain.com/api/subscription/webhook`
4. **Events to send:**
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. **Copy the Signing secret** (starts with `whsec_...`)

## Step 5: Configure Environment Variables

Add to `backend/.env`:

```env
# Stripe Keys (from Stripe Dashboard → Developers → API keys)
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Price IDs (from Step 2)
STRIPE_PRICE_WEEKLY=price_your_weekly_price_id
STRIPE_PRICE_MONTHLY=price_your_monthly_price_id

# Frontend URL
FRONTEND_URL=https://shop.cloudmc.online
```

Add to `frontend/.env`:

```env
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

## Step 6: Run Database Migration

```bash
# Copy migration to Docker container
docker cp backend/migrations/019_add_subscriptions.sql shop_postgres:/tmp/

# Run migration
docker exec -it shop_postgres psql -U shopuser -d shopdb -f /tmp/019_add_subscriptions.sql
```

## Step 7: Update Backend Server

Add subscription routes to `backend/src/server.js`:

```javascript
const subscriptionRoutes = require('./routes/subscription');

// Add BEFORE other routes (webhook needs raw body)
app.use('/api/subscription/webhook', subscriptionRoutes);

// Add AFTER body parser middleware
app.use('/api/subscription', subscriptionRoutes);
```

## Step 8: Add Premium Route to Frontend

Update `frontend/src/App.js`:

```javascript
import Premium from './pages/Premium';

// Add route
<Route path="/premium" element={<Premium />} />
```

## Step 9: Update Sidebar Navigation

Add Premium link to sidebar navigation.

## Payment Methods Support

### Current (Web):
- ✅ Credit/Debit Cards (Stripe)

### Coming Soon (Android App):
- 🔜 Google Pay (via Stripe)
- 🔜 PayPal (via Stripe)
- 🔜 Credit Cards (via Stripe)

To enable Google Pay and PayPal:
1. Go to **Settings** → **Payment methods**
2. Enable **Google Pay** and **PayPal**
3. Update checkout session:
```javascript
payment_method_types: ['card', 'google_pay', 'paypal']
```

## Testing

### Test Mode
Use Stripe test cards:
- **Success:** 4242 4242 4242 4242
- **Decline:** 4000 0000 0000 0002
- **3D Secure:** 4000 0025 0000 3155

### Test Webhooks Locally
```bash
# Install Stripe CLI
stripe login
stripe listen --forward-to localhost:3007/api/subscription/webhook
```

## Production Checklist

- [ ] Switch to live Stripe keys
- [ ] Create live products with same pricing
- [ ] Update environment variables with live keys
- [ ] Set up live webhook endpoint
- [ ] Enable Stripe Tax in production
- [ ] Test full subscription flow
- [ ] Set up monitoring for failed payments

## Feature Gating

Premium features are automatically gated using middleware:

```javascript
// Require premium for route
router.get('/premium-feature', auth, requirePremium, handler);

// Check limits
router.post('/lists', auth, checkLimit('maxLists'), handler);
```

## Free vs Premium Limits

| Feature | Free | Premium |
|---------|------|---------|
| Shopping Lists | 3 | Unlimited |
| Inventory Items | 50 | Unlimited |
| Recipes | 10 | Unlimited |
| Custom Stores | 1 | Unlimited |
| Meal Planning | ❌ | ✅ |
| Smart Suggestions | ❌ | ✅ |
| Barcode Scanning | ❌ | ✅ |
| Voice Input | ❌ | ✅ |
| Share Lists | ❌ | ✅ |
| Export Data | ❌ | ✅ |
| Priority Support | ❌ | ✅ |

## Support

For Stripe integration issues:
- Stripe Dashboard → Help
- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com
