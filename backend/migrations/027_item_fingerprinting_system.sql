-- Migration: Item Fingerprinting and Global Learning System
-- This creates a system where each item gets a unique fingerprint
-- and the system learns from all users globally

-- ============================================
-- ITEM FINGERPRINTS TABLE
-- ============================================
-- Stores unique identifiers for each type of item
-- Example: "Bread" from Store A might have fingerprint "BRD-WH-001"
CREATE TABLE IF NOT EXISTS item_fingerprints (
    id SERIAL PRIMARY KEY,
    fingerprint VARCHAR(50) UNIQUE NOT NULL, -- Unique identifier (e.g., "BRD-WH-001")
    item_name VARCHAR(255) NOT NULL, -- Base item name (e.g., "Bread")
    normalized_name VARCHAR(255) NOT NULL, -- Lowercase, trimmed version for matching
    category VARCHAR(100), -- Category (e.g., "Bakery & Bread")
    brand VARCHAR(255), -- Brand name if applicable
    store VARCHAR(255), -- Common store where purchased
    barcode VARCHAR(50), -- UPC/EAN barcode if available
    
    -- Aggregated learning data from all users
    total_instances INTEGER DEFAULT 0, -- How many times this item has been tracked
    avg_shelf_life_days DECIMAL(10, 2), -- Average shelf life across all users
    avg_price DECIMAL(10, 2), -- Average price
    common_storage_location VARCHAR(50), -- Most common storage (pantry/fridge/freezer)
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookups
CREATE INDEX idx_fingerprints_normalized_name ON item_fingerprints(normalized_name);
CREATE INDEX idx_fingerprints_barcode ON item_fingerprints(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_fingerprints_category ON item_fingerprints(category);

-- ============================================
-- ITEM INSTANCES TABLE
-- ============================================
-- Tracks each individual instance of an item
-- Links inventory items to their fingerprint
CREATE TABLE IF NOT EXISTS item_instances (
    id SERIAL PRIMARY KEY,
    fingerprint_id INTEGER REFERENCES item_fingerprints(id) ON DELETE SET NULL,
    inventory_id INTEGER REFERENCES inventory(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    -- Instance-specific data
    bought_date DATE,
    opened_date DATE,
    expiry_date DATE,
    actual_disposal_date DATE, -- When item was actually thrown out/consumed
    disposal_reason VARCHAR(50), -- 'consumed', 'expired', 'went_bad', 'still_good'
    
    -- User-provided data
    user_shelf_life_estimate INTEGER, -- Days user thinks it will last
    actual_shelf_life INTEGER, -- Calculated: disposal_date - bought_date
    
    -- Price and store tracking
    purchase_price DECIMAL(10, 2),
    purchase_store VARCHAR(255),
    
    -- Learning contribution
    contributed_to_learning BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_instances_fingerprint ON item_instances(fingerprint_id);
CREATE INDEX idx_instances_inventory ON item_instances(inventory_id);
CREATE INDEX idx_instances_user ON item_instances(user_id);
CREATE INDEX idx_instances_bought_date ON item_instances(bought_date);

-- ============================================
-- GLOBAL LEARNING STATS TABLE
-- ============================================
-- Aggregated statistics for the entire system
CREATE TABLE IF NOT EXISTS global_learning_stats (
    id SERIAL PRIMARY KEY,
    stat_type VARCHAR(50) NOT NULL, -- 'total_items', 'total_users', 'accuracy_rate', etc.
    stat_value DECIMAL(15, 2) NOT NULL,
    metadata JSONB, -- Additional data
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial stats
INSERT INTO global_learning_stats (stat_type, stat_value, metadata) VALUES
('total_fingerprints', 0, '{"description": "Total unique item fingerprints"}'),
('total_instances', 0, '{"description": "Total item instances tracked"}'),
('total_learning_contributions', 0, '{"description": "Total items that contributed to learning"}'),
('average_prediction_accuracy', 0, '{"description": "Average accuracy of shelf life predictions"}'),
('most_tracked_category', 0, '{"description": "Category with most tracked items"}')
ON CONFLICT DO NOTHING;

-- ============================================
-- SHELF LIFE PREDICTIONS TABLE
-- ============================================
-- Stores ML predictions for shelf life
CREATE TABLE IF NOT EXISTS shelf_life_predictions (
    id SERIAL PRIMARY KEY,
    fingerprint_id INTEGER REFERENCES item_fingerprints(id) ON DELETE CASCADE,
    storage_location VARCHAR(50) NOT NULL, -- pantry, fridge, freezer
    
    -- Prediction data
    predicted_days DECIMAL(10, 2) NOT NULL,
    confidence_score DECIMAL(5, 4), -- 0.0000 to 1.0000
    sample_size INTEGER, -- Number of instances used for prediction
    
    -- Factors affecting prediction
    factors JSONB, -- {"temperature": "cold", "humidity": "low", "opened": false}
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(fingerprint_id, storage_location)
);

-- ============================================
-- ADD FINGERPRINT COLUMN TO INVENTORY
-- ============================================
-- Link existing inventory to fingerprints
ALTER TABLE inventory 
ADD COLUMN IF NOT EXISTS fingerprint_id INTEGER REFERENCES item_fingerprints(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS user_shelf_life_estimate INTEGER, -- User's guess for how long it will last
ADD COLUMN IF NOT EXISTS actual_shelf_life INTEGER; -- Calculated when item is disposed

-- Index
CREATE INDEX IF NOT EXISTS idx_inventory_fingerprint ON inventory(fingerprint_id);

-- ============================================
-- FUNCTIONS FOR FINGERPRINT GENERATION
-- ============================================

-- Function to generate a fingerprint from item details
CREATE OR REPLACE FUNCTION generate_item_fingerprint(
    p_item_name VARCHAR,
    p_category VARCHAR DEFAULT NULL,
    p_brand VARCHAR DEFAULT NULL,
    p_barcode VARCHAR DEFAULT NULL
) RETURNS VARCHAR AS $$
DECLARE
    v_fingerprint VARCHAR(50);
    v_normalized_name VARCHAR(255);
    v_category_code VARCHAR(3);
    v_counter INTEGER;
BEGIN
    -- Normalize the item name
    v_normalized_name := LOWER(TRIM(p_item_name));
    
    -- Generate category code (first 3 letters of category, uppercase)
    IF p_category IS NOT NULL THEN
        v_category_code := UPPER(SUBSTRING(REPLACE(p_category, ' ', ''), 1, 3));
    ELSE
        v_category_code := 'GEN';
    END IF;
    
    -- Get counter for this item type
    SELECT COUNT(*) + 1 INTO v_counter
    FROM item_fingerprints
    WHERE normalized_name = v_normalized_name;
    
    -- Generate fingerprint: CATEGORY-ITEMCODE-NUMBER
    -- Example: BRD-WHT-001 (Bread, White, instance 1)
    v_fingerprint := v_category_code || '-' || 
                     UPPER(SUBSTRING(REPLACE(v_normalized_name, ' ', ''), 1, 3)) || '-' ||
                     LPAD(v_counter::TEXT, 3, '0');
    
    RETURN v_fingerprint;
END;
$$ LANGUAGE plpgsql;

-- Function to update global learning stats
CREATE OR REPLACE FUNCTION update_global_stats() RETURNS TRIGGER AS $$
BEGIN
    -- Update total fingerprints
    UPDATE global_learning_stats 
    SET stat_value = (SELECT COUNT(*) FROM item_fingerprints),
        updated_at = CURRENT_TIMESTAMP
    WHERE stat_type = 'total_fingerprints';
    
    -- Update total instances
    UPDATE global_learning_stats 
    SET stat_value = (SELECT COUNT(*) FROM item_instances),
        updated_at = CURRENT_TIMESTAMP
    WHERE stat_type = 'total_instances';
    
    -- Update learning contributions
    UPDATE global_learning_stats 
    SET stat_value = (SELECT COUNT(*) FROM item_instances WHERE contributed_to_learning = TRUE),
        updated_at = CURRENT_TIMESTAMP
    WHERE stat_type = 'total_learning_contributions';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to update stats
CREATE TRIGGER trigger_update_stats_on_fingerprint
AFTER INSERT OR DELETE ON item_fingerprints
FOR EACH STATEMENT
EXECUTE FUNCTION update_global_stats();

CREATE TRIGGER trigger_update_stats_on_instance
AFTER INSERT OR UPDATE OR DELETE ON item_instances
FOR EACH STATEMENT
EXECUTE FUNCTION update_global_stats();

-- ============================================
-- ITEM REVIEW QUEUE TABLE
-- ============================================
-- Items flagged for manual review due to low confidence or suspicious patterns
CREATE TABLE IF NOT EXISTS item_review_queue (
    id SERIAL PRIMARY KEY,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    barcode VARCHAR(50),
    brand VARCHAR(255),
    reason VARCHAR(500), -- Why it was flagged
    confidence_score DECIMAL(5, 4), -- Original confidence score
    
    -- Review status
    reviewed BOOLEAN DEFAULT FALSE,
    approved BOOLEAN DEFAULT NULL,
    reviewer_notes TEXT,
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    
    flagged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for pending reviews
CREATE INDEX idx_review_queue_pending ON item_review_queue(reviewed) WHERE reviewed = FALSE;
CREATE INDEX idx_review_queue_flagged_at ON item_review_queue(flagged_at);

-- ============================================
-- ENHANCED FINGERPRINT COLUMNS
-- ============================================
-- Add validation and classification data to fingerprints
ALTER TABLE item_fingerprints
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(5, 4) DEFAULT 0.5000,
ADD COLUMN IF NOT EXISTS quality_score INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS food_types JSONB, -- Array of food types: ['fruit', 'organic']
ADD COLUMN IF NOT EXISTS nutritional_info JSONB, -- Detailed nutritional classification
ADD COLUMN IF NOT EXISTS extracted_size JSONB, -- Size extracted from name: {"amount": 16, "unit": "oz"}
ADD COLUMN IF NOT EXISTS is_validated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS requires_review BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS should_contribute_to_learning BOOLEAN DEFAULT TRUE;

-- Indexes for filtering
CREATE INDEX IF NOT EXISTS idx_fingerprints_confidence ON item_fingerprints(confidence_score);
CREATE INDEX IF NOT EXISTS idx_fingerprints_quality ON item_fingerprints(quality_score);
CREATE INDEX IF NOT EXISTS idx_fingerprints_validated ON item_fingerprints(is_validated);
CREATE INDEX IF NOT EXISTS idx_fingerprints_requires_review ON item_fingerprints(requires_review) WHERE requires_review = TRUE;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE item_fingerprints IS 'Unique identifiers for each type of item with global learning data';
COMMENT ON TABLE item_instances IS 'Individual instances of items linked to fingerprints for tracking';
COMMENT ON TABLE global_learning_stats IS 'System-wide statistics for the learning algorithm';
COMMENT ON TABLE shelf_life_predictions IS 'ML-based predictions for item shelf life';
COMMENT ON TABLE item_review_queue IS 'Items flagged for manual review due to validation concerns';
COMMENT ON COLUMN item_fingerprints.fingerprint IS 'Unique identifier like BRD-WH-001';
COMMENT ON COLUMN item_fingerprints.confidence_score IS 'Confidence that this is a valid item (0.0000 to 1.0000)';
COMMENT ON COLUMN item_fingerprints.quality_score IS 'Overall data quality score (0 to 100)';
COMMENT ON COLUMN item_fingerprints.food_types IS 'Array of food type classifications';
COMMENT ON COLUMN item_fingerprints.should_contribute_to_learning IS 'Whether this item should contribute to global learning';
COMMENT ON COLUMN item_instances.actual_shelf_life IS 'Calculated days between bought_date and disposal_date';
COMMENT ON COLUMN item_instances.contributed_to_learning IS 'Whether this instance data was used to improve predictions';
