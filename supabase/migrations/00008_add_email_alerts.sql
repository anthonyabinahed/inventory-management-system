-- Add email alert preference to profiles
ALTER TABLE public.profiles
  ADD COLUMN receive_email_alerts BOOLEAN NOT NULL DEFAULT false;

-- Track sent alert digests to prevent duplicates and provide audit trail
CREATE TABLE public.alert_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  alert_summary JSONB NOT NULL,
  email_status TEXT NOT NULL DEFAULT 'sent'
    CHECK (email_status IN ('sent', 'failed')),
  error_message TEXT
);

CREATE INDEX idx_alert_notifications_user_sent
  ON public.alert_notifications(user_id, sent_at DESC);

-- RLS
ALTER TABLE public.alert_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all alert notifications"
  ON public.alert_notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view own alert notifications"
  ON public.alert_notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Only server-side (service role) inserts notifications;
-- authenticated users can read via the SELECT policies above.
GRANT SELECT ON public.alert_notifications TO authenticated;
