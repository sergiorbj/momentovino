-- ============================================================
-- 0013_profile_language_expand.sql — Expand profile.language to 5 codes
-- ============================================================
-- The original constraint only allowed 'en' and 'pt-BR'. The app now
-- supports manual selection of English, Brazilian Portuguese, European
-- Portuguese, Spanish, and Italian, with automatic detection from the
-- device locale on first launch (handled client-side).

alter table public.profiles
  drop constraint if exists profiles_language_check;

alter table public.profiles
  add constraint profiles_language_check
  check (language in ('en', 'pt-BR', 'pt-PT', 'es', 'it'));
