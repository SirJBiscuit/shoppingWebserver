require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

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
const betaTestingRoutes = require('./routes/betaTesting');
const betaFeedbackRoutes = require('./routes/betaFeedback');
const layoutsRoutes = require('./routes/layouts');
const aveRoutes = require('../routes/ave');
const storageRoutes = require('../routes/storage');
const sidebarRoutes = require('../routes/sidebar');
const householdRoutes = require('./routes/household');
const changelogRoutes = require('./routes/changelog');
const notificationsRoutes = require('./routes/notifications');
const priceReviewRoutes = require('./routes/priceReview');
const spicesRoutes = require('./routes/spices');
const plateRoutes = require('./routes/plate');

const app = express();
const PORT = process.env.PORT || 3007;

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // Allow 5000 requests per 15 minutes (333/min, 5.5/sec) - enough for rapid item adding
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
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
app.use('/api/beta', betaTestingRoutes);
app.use('/api/beta/feedback', betaFeedbackRoutes);
app.use('/api/layouts', layoutsRoutes);
app.use('/api/ave', aveRoutes);
app.use('/api/admin/storage', storageRoutes);

// Serve uploaded files — storage.js writes to ../../storage/{category}
app.use('/storage', express.static(path.join(__dirname, '../../storage'), {
  maxAge: '30d',
  immutable: true
}));
app.use('/api/sidebar', sidebarRoutes);
app.use('/api/household', householdRoutes);
app.use('/api/changelog', changelogRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/price-review', priceReviewRoutes);
app.use('/api/spices', spicesRoutes);
app.use('/api/plate', plateRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Run migrations on startup
const runMigrations = async () => {
  const fs = require('fs');
  const path = require('path');
  const db = require('./database/db');
  
  const migrations = [
    { file: 'add_sound_system.sql', name: 'Sound System' },
    { file: '015_ai_app_builder.sql', name: 'AI App Builder' },
    { file: '020_feature_flags.sql', name: 'Feature Flags' },
    { file: '035_create_mdl_system.sql', name: 'MDL Product Database' },
    { file: '037_auto_update_system.sql', name: 'Auto Update System' },
    { file: '039_item_training_system.sql', name: 'Item Training System' },
    { file: '040_mdl_system.sql', name: 'MDL Learning System' },
    { file: '041_mdl_user_preferences.sql', name: 'MDL User Preferences' },
    { file: '043_beta_testing_system.sql', name: 'Beta Testing System' },
    { file: '044_beta_feedback_system.sql', name: 'Beta Feedback System' },
    { file: '041_admin_storage_system.sql', name: 'Admin Storage System' },
    { file: '046_fix_sidebar_pages.sql', name: 'Sidebar Pages Fix' },
    { file: '047_household_members.sql', name: 'Household Members' },
    { file: '048_mdl_hardening.sql', name: 'MDL Hardening' },
    { file: '049_store_unification.sql', name: 'Store Unification' },
    { file: '050_beta_admin_extensions.sql', name: 'Beta Admin Extensions' },
    { file: '051_changelog_notifications_review.sql', name: 'Changelog & Notifications' },
    { file: '052_canonical_categories.sql', name: 'Canonical Categories' },
    { file: '053_spice_system.sql', name: 'Spice System' },
    { file: '054_spice_levels.sql', name: 'Spice Levels' },
    { file: '055_household_eatout.sql', name: 'Household Eating Out' },
    { file: '056_spices_sidebar_and_mdl_categories.sql', name: 'Spice Sidebar & MDL Categories' },
    { file: '057_spice_catalog_expansion.sql', name: 'Spice Catalog Expansion' },
    { file: '058_mdl_product_enhancements.sql', name: 'MDL Product Enhancements' },
    { file: '059_list_budgets.sql', name: 'List Budgets' },
    { file: '060_homemade_lab_sidebar.sql', name: 'Homemade Lab Sidebar' },
    { file: '061_mix_lab_preset_recipes.sql', name: 'Mix Lab Preset Recipes' },
    { file: '062_changelog_admin_enhancements.sql', name: 'Changelog Admin Enhancements' },
    { file: '063_smoothie_lab_preset_recipes.sql', name: 'Smoothie Lab Preset Recipes' },
    { file: '064_mdl_auto_categorization.sql', name: 'MDL Auto-Categorization' },
    { file: '065_plate_system.sql', name: 'Plate System' },
    { file: '066_spice_lab_sidebar_remove.sql', name: 'Spice Lab Sidebar Remove' },
    { file: '067_changelog_voting_progress.sql', name: 'Changelog Voting + Progress' }
  ];

  for (const migration of migrations) {
    try {
      const migrationPath = path.join(__dirname, '../migrations', migration.file);
      
      // Check if migration file exists
      if (fs.existsSync(migrationPath)) {
        console.log(`Running ${migration.name} migration...`);
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        await db.query(migrationSQL);
        console.log(`✅ ${migration.name} migration completed`);
      } else {
        console.log(`⚠️  ${migration.name} migration file not found, skipping`);
      }
    } catch (error) {
      // Ignore errors if tables already exist
      if (error.message && error.message.includes('already exists')) {
        console.log(`${migration.name} tables already exist, skipping migration`);
      } else {
        console.warn(`${migration.name} migration warning:`, error.message);
      }
    }
  }
};

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Run migrations after server starts
  await runMigrations();

  // Daily MDL training-data backups (first run ~30s after boot)
  try {
    require('./services/mdlBackup').startDailyBackup();
  } catch (error) {
    console.error('❌ Failed to start MDL backup service:', error.message);
  }

  // Initialize auto-updater (non-blocking, runs in background)
  if (process.env.NODE_ENV === 'production') {
    setImmediate(async () => {
      try {
        const autoUpdater = require('./services/autoUpdaterSimple');
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
