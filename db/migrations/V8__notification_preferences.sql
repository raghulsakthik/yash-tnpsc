-- Where to send email notifications. Nullable: email notifications are
-- opt-in and need an address before anything can be sent, same as push
-- needs a subscription before anything can be sent.

ALTER TABLE learner_profile ADD COLUMN notify_email TEXT;

-- Where to send WhatsApp notifications. Nullable, same pattern as
-- notify_email: opt-in, needs a number before anything can be sent.
-- Stored in E.164 format (e.g. +919876543210), since that's what the
-- WhatsApp Cloud API's "to" field requires.

ALTER TABLE learner_profile ADD COLUMN notify_whatsapp TEXT;
