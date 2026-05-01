# revenuecat-webhook

Mirrors RevenueCat subscription state onto `public.profiles` so the app
gates Pro features by reading Supabase, not the local StoreKit cache.

## Deploy

```sh
# from repo root
supabase functions deploy revenuecat-webhook --no-verify-jwt
```

`--no-verify-jwt` is required: RevenueCat sends a static `Authorization`
header (shared secret), not a Supabase JWT. We do auth ourselves.

## Configure

1. **Generate a long random string** for the shared secret (1Password, etc.).
2. Set the secret on Supabase:
   ```sh
   supabase secrets set REVENUECAT_WEBHOOK_AUTH_HEADER="Bearer <your-secret>"
   ```
   Optionally override the default entitlement id:
   ```sh
   supabase secrets set PRO_ENTITLEMENT_ID="momentovino_pro"
   ```
3. **RC Dashboard → Project → Integrations → Webhooks**:
   - URL: `https://<project>.supabase.co/functions/v1/revenuecat-webhook`
   - Authorization header value: paste the SAME `Bearer <your-secret>` string.
4. Send a test event from RC and check Supabase logs.

## Behavior

- Idempotent: each event is applied only if its `event_timestamp_ms` is at-or-after
  the stored `pro_event_at`. Out-of-order webhooks don't clobber newer state.
- Filters by `entitlement_ids` so events for unrelated entitlements are ignored.
- TRANSFER events swap the `pro_active` flag from `transferred_from` user(s) to
  `transferred_to` user(s). This is what catches the "user pays on Apple ID X,
  signs into a different app account" scenario.
- Apple StoreKit prevents double-charging the same Apple ID for the same product;
  RC delivers TRANSFER, never two parallel active subs.
