-- Real, unlockable achievements (not decorative badges) and the device
-- tokens needed to notify a learner the moment one unlocks -- on Android
-- via FCM, on the web via the existing push_subscription table.

CREATE TABLE achievement (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT NOT NULL,
    icon        TEXT NOT NULL,
    sort_order  INT NOT NULL DEFAULT 0
);

CREATE TABLE learner_achievement (
    learner_id     UUID NOT NULL REFERENCES learner (id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL REFERENCES achievement (id) ON DELETE CASCADE,
    unlocked_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (learner_id, achievement_id)
);

-- One row per Android device registered for FCM push. Mirrors
-- push_subscription's shape (web push) so the two can share calling code
-- where it makes sense, but kept as a separate table since the token
-- format and expiry semantics differ from a Web Push subscription.
CREATE TABLE fcm_token (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_id  UUID NOT NULL REFERENCES learner (id) ON DELETE CASCADE,
    token       TEXT NOT NULL UNIQUE,
    device_info TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX fcm_token_learner_id_idx ON fcm_token (learner_id);

INSERT INTO achievement (id, name, description, icon, sort_order) VALUES
    ('first-step',        'First Step',        'Answer your first question',                              '🌱', 1),
    ('streak-3',          'Three in a Row',    'Reach a 3-day streak',                                     '🔥', 2),
    ('streak-7',          'Full Week',         'Reach a 7-day streak',                                     '🔥', 3),
    ('streak-30',         'Iron Habit',        'Reach a 30-day streak',                                    '🏅', 4),
    ('hundred-questions', 'Century',           'Answer 100 questions',                                     '💯', 5),
    ('five-hundred-questions', 'Half Thousand', 'Answer 500 questions',                                    '🚀', 6),
    ('first-topic-mastered', 'First Mastery',  'Master your first topic',                                  '⭐', 7),
    ('five-topics-mastered', 'Rising Scholar', 'Master 5 topics',                                          '🌟', 8),
    ('first-test',        'Test Pilot',        'Complete your first weekly test',                          '📝', 9),
    ('high-scorer',       'High Scorer',       'Score 80% or above on a weekly test',                      '🎯', 10),
    ('clean-sweep',       'Clean Sweep',       'Score 100% on a weekly test',                               '🏆', 11),
    ('mistake-fixer',     'Mistake Fixer',     'Clear 10 mistakes through revision',                       '🔧', 12);
