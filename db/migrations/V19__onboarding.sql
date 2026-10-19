-- Tracks whether a learner has completed the first-login onboarding +
-- placement quiz (src/app/onboarding/*, src/app/placement/*). Existing
-- learners (the real Yashika account, the dev test account) must never be
-- interrupted by this on their next login, so the ADD COLUMN default
-- back-fills every current row to true; only after that do we flip the
-- column default to false so any learner created from now on starts
-- un-onboarded and sees the flow once, on their very first login.
ALTER TABLE learner_profile ADD COLUMN onboarded BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE learner_profile ALTER COLUMN onboarded SET DEFAULT false;
