-- Server-only tables. The Render backend connects as the database owner.
-- No browser anon/authenticated access; existing admin authentication remains in the app.
BEGIN;
ALTER TABLE public.app_migrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.app_migrations FROM PUBLIC, anon, authenticated;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.chat_sessions FROM PUBLIC, anon, authenticated;
ALTER TABLE public.chat_turns ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.chat_turns FROM PUBLIC, anon, authenticated;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.chat_messages FROM PUBLIC, anon, authenticated;
ALTER TABLE public.chat_session_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.chat_session_state FROM PUBLIC, anon, authenticated;
ALTER TABLE public.demo_bookings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.demo_bookings FROM PUBLIC, anon, authenticated;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.app_settings FROM PUBLIC, anon, authenticated;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.login_attempts FROM PUBLIC, anon, authenticated;
ALTER TABLE public.app_images ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.app_images FROM PUBLIC, anon, authenticated;
ALTER TABLE public.data_imports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.data_imports FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.chat_messages_id_seq FROM PUBLIC, anon, authenticated;
COMMIT;
