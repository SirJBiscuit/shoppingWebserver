-- Beta tester A/B choice system — testers pick between two candidate
-- terms ("do you like A or B?") to pre-filter the MDL pending pool.
-- Votes surface on the admin review rows so crowd-approved terms float up.
CREATE TABLE IF NOT EXISTS mdl_ab_votes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind VARCHAR(40) NOT NULL,
    term_a_id INTEGER NOT NULL REFERENCES mdl_custom_terms(id) ON DELETE CASCADE,
    term_b_id INTEGER NOT NULL REFERENCES mdl_custom_terms(id) ON DELETE CASCADE,
    choice CHAR(1) NOT NULL CHECK (choice IN ('a', 'b')),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id, term_a_id, term_b_id)
);
CREATE INDEX IF NOT EXISTS idx_mdl_ab_votes_terms ON mdl_ab_votes(term_a_id, term_b_id);
CREATE INDEX IF NOT EXISTS idx_mdl_ab_votes_user ON mdl_ab_votes(user_id);
