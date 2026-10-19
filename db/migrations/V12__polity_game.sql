-- Phase 25: pure content, zero new code — the same precedent Phase 20 set
-- for proving the content pipeline is subject-agnostic, now applied to
-- Phase 22's existing, unchanged game engine. "Constitution Match" is one
-- of the named subject-specific games in the consolidated 25-29 brief;
-- target_topic_ids is resolved from the real gs.indian-polity chapter
-- (Phase 20's 11 real, authored questions), not hardcoded.
INSERT INTO game_definition (id, name, target_topic_ids, difficulty_floor, difficulty_ceiling, question_count, time_limit_seconds, scoring_config, mechanics)
SELECT 'constitution-match-polity', 'Constitution Match',
       (SELECT array_agg(id) FROM topic WHERE chapter_id = 'gs.indian-polity'),
       0, 0.5, 10, 120,
       '{"pointsPerCorrect": 10, "speedBonusMax": 5, "streakBonusPerStreak": 2, "streakBonusCap": 10}'::jsonb,
       'SPEED_ROUND';
