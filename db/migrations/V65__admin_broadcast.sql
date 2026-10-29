-- Real backend for the Admin Portal's notification broadcast form, which
-- previously only pushed to local React state and never reached a real
-- learner (see .nova-zip-ui/src/components/admin/GenericAdminViews.tsx's
-- NotificationsAdminView, onBroadcastNotification).
CREATE TABLE IF NOT EXISTS admin_broadcast (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_audience TEXT NOT NULL DEFAULT 'ALL_LEARNERS',
  created_by UUID REFERENCES app_user(id),
  recipient_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_broadcast_created_at ON admin_broadcast (created_at DESC);
