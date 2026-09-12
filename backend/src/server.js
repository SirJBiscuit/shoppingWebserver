require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const shoppingRoutes = require('./routes/shopping');
const itemsRoutes = require('./routes/items');
const suggestionsRoutes = require('./routes/suggestions');
const inventoryRoutes = require('./routes/inventory_enhanced');
const stagingRoutes = require('./routes/staging');
const categoriesRoutes = require('./routes/categories');
const recipesRoutes = require('./routes/recipes');
const pantryRoutes = require('./routes/pantry');
const imagesRoutes = require('./routes/images');
const systemRoutes = require('./routes/system');
const cosmeticsRoutes = require('./routes/cosmetics');
const xpRoutes = require('./routes/xp');
const expirationRoutes = require('./routes/expiration');
const storesRoutes = require('./routes/stores');
const dealsRoutes = require('./routes/deals');
const gitRoutes = require('./routes/git');
const aiAppsRoutes = require('./routes/aiApps');
const subscriptionRoutes = require('./routes/subscription');
const featuresRoutes = require('./routes/features');
const usersRoutes = require('./routes/users');
const fingerprintsRoutes = require('./routes/fingerprints');
const versionRoutes = require('./routes/version');
const soundsRoutes = require('./routes/sounds');
const mdlRoutes = require('./routes/mdl');
const adminTrainingRoutes = require('./routes/admin/training');
const priceTrainingRoutes = require('./routes/admin/priceTraining');
const priceTrendsRoutes = require('./routes/priceTrends');

const app = express();
const PORT = process.env.PORT || 3007;

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Increased for development
  message: 'Too many requests from this IP, please try again later.',
});

app.use('/api/', limiter);

app.use('/api/auth', authRoutes);
app.use('/api/shopping', shoppingRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/suggestions', suggestionsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/staging', stagingRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/recipes', recipesRoutes);
app.use('/api/pantry', pantryRoutes);
app.use('/api/images', imagesRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/cosmetics', cosmeticsRoutes);
app.use('/api/xp', xpRoutes);
app.use('/api/expiration', expirationRoutes);
app.use('/api/stores', storesRoutes);
app.use('/api/deals', dealsRoutes);
app.use('/api/admin/git', gitRoutes);
app.use('/api/admin/ai-apps', aiAppsRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/features', featuresRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/fingerprints', fingerprintsRoutes);
app.use('/api/version', versionRoutes);
app.use('/api/sounds', soundsRoutes);
app.use('/api/mdl', mdlRoutes);
app.use('/api/admin/training', adminTrainingRoutes);
app.use('/api/admin/price-training', priceTrainingRoutes);
app.use('/api/price-trends', priceTrendsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Run migrations on startup
const runMigrations = async () => {
  try {
    const fs = require('fs');
    const path = require('path');
    const db = require('./database/db');
    
    const migrationPath = path.join(__dirname, '../migrations/add_sound_system.sql');
    
    // Check if migration file exists
    if (fs.existsSync(migrationPath)) {
      console.log('Running sound system migration...');
      const migration = fs.readFileSync(migrationPath, 'utf8');
      await db.query(migration);
      console.log('✅ Sound system migration completed');
    }
  } catch (error) {
    // Ignore errors if tables already exist
    if (error.message && error.message.includes('already exists')) {
      console.log('Sound system tables already exist, skipping migration');
    } else {
      console.warn('Migration warning:', error.message);
    }
  }
};

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Run migrations after server starts
  await runMigrations();
  
  // Initialize auto-updater (non-blocking, runs in background)
  if (process.env.NODE_ENV === 'production') {
    setImmediate(async () => {
      try {
        const autoUpdater = require('./services/autoUpdater');
        await autoUpdater.initialize();
        console.log('✅ Auto-updater initialized');
      } catch (error) {
        console.error('❌ Failed to initialize auto-updater:', error.message);
      }
    });
  } else {
    console.log('ℹ️  Auto-updater disabled in development mode');
  }
});
