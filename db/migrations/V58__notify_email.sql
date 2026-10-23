-- Where to send email notifications. Nullable: email notifications are
-- opt-in and need an address before anything can be sent, same as push
-- needs a subscription before anything can be sent.

ALTER TABLE learner_profile ADD COLUMN notify_email TEXT;
