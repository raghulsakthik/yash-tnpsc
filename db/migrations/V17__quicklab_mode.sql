-- Quick Lab's question generators are procedural code (src/domain/quicklab.mjs)
-- and stay that way -- rewriting arithmetic-generation logic into database
-- config is a different, much bigger project than this table buys. What
-- *is* genuinely admin-editable without touching code: which modes are
-- enabled/visible, and their display name/description/"recommended" flag.
-- mode_key must match a real key in quicklab.mjs's GENERATORS map.

CREATE TABLE quicklab_mode (
    mode_key     TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    description  TEXT NOT NULL,
    enabled      BOOLEAN NOT NULL DEFAULT true,
    recommended  BOOLEAN NOT NULL DEFAULT false,
    sort_order   INTEGER NOT NULL DEFAULT 0,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO quicklab_mode (mode_key, display_name, description, recommended, sort_order) VALUES
    ('quick-math', 'Quick Math', 'Addition, subtraction and multiplication, one tap each. A fresh pair of numbers every round.', false, 1),
    ('number-rush', 'Number Rush', 'The same idea with bigger numbers -- three-digit arithmetic under time pressure.', false, 2),
    ('percentage-rush', 'Percentage Rush', 'Of, increase, and reverse. The three shapes TNPSC keeps asking for.', true, 3),
    ('fraction-lab', 'Fraction Lab', 'Compare two fractions or simplify one to its lowest terms.', false, 4),
    ('missing-number', 'Missing Number', 'Find the pattern -- arithmetic or geometric -- and complete the sequence.', false, 5),
    ('memory-math', 'Memory Math', 'Hold a few digits in your head, then recall their sum. Trains working memory, not arithmetic.', false, 6),
    ('formula-match', 'Formula Match', 'Match the real formula to the concept -- SI, CI, area, volume, time and work.', false, 7);
