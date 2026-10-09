# Mobile Family: groups, invitations, and Python API

The **Family** tab lets a user create one private family group, invite people, and see every member's moments, wines and countries. Data lives in Supabase (`0005_family.sql`, `0007_family_description_photo.sql`, `0012_family_username_invites.sql`). All reads and writes go through the Python handler [`apps/web/api/family.py`](../../../apps/web/api/family.py) (Bearer JWT + service role, like `wines.py`).

## User flows

### No family yet

- If there are incoming invitations, they show first with **Accept** and **Decline**. The inviter's name falls back to a translated "someone" when `inviter_unknown` is true.
- **Create family** opens `app/family/create.tsx` (`POST /api/family` with name, optional description and cover photo).

### Family exists

- Header card: cover photo, name, description, member count. The owner edits name and description inline (`PATCH /api/family`) and the cover photo through the photo library (`features/family/cover-upload.ts`, `family-covers` bucket).
- Members list: avatar, display name or email, and per-member `moments_count`, `wines_count`, `countries_count`. The owner can remove members (`DELETE`).
- Pending invitations (owner): display name or email, plus expiry date.
- When the owner is the only member, a callout pushes **Invite member** (`app/family/invite-member.tsx`).

### Inviting (`invite-member.tsx`)

There are two paths, and only the first one actually adds someone to the family:

1. **By username (the real invitation).** The owner searches (`members/search`), picks a user, and `invitations/by-username` stores a pending `family_invitations` row for that `invited_user_id`. The recipient sees it in their Family tab (`my-invitations`) and accepts or declines **in app** by `invitationId`. Joining requires consent; nobody is added directly.
2. **By email (an App Store nudge).** For people without an account, `POST members` with `{ email }` sends a Resend email ("X invited you to MomentoVino, download the app"). Nothing is stored and the email holds no token: once the person signs up, the owner invites their username. If the email already belongs to an account, the API returns **409 `email_already_registered`** and the app points the owner to the username search.

## API

Vercel only routes `/api/family` exactly, so sub-actions are sent as `?op=` and mapped by `_OP_TO_SUBPATH` (the Flask shim also accepts the real subpaths).

| Method | `op` | Purpose |
|---|---|---|
| GET | none | Dashboard `{ family, members, pendingInvitations, isOwner }` |
| GET | `my-invitations` | Incoming pending invitations for the signed-in user |
| GET | `search-members&q=` | Username search (admin only) |
| POST | none | Create family |
| POST | `invite-by-username` | Invite a user by id → 201 `{ invited, invitation }` |
| POST | `members` | Email nudge → 200 `{ emailed, email }` |
| POST | `accept-invitation` / `decline-invitation` | Recipient answers an invitation by `invitationId` |
| PATCH | none | Update name, description, `photo_url` (owner) |
| DELETE | `members&user_id=` | Remove a member (owner) |

Errors carry a stable `code` that the app maps to `errors.server.<code>`: `family_not_found`, `not_family_admin`, `not_family_owner`, `already_in_family`, `already_member`, `already_invited`, `target_already_in_family`, `cannot_invite_self`, `user_not_found`, `invalid_email`, `email_already_registered`, `email_send_failed`, `invitation_*`, `family_name_too_short`, `family_description_too_long`, `cannot_remove_self`, `cannot_remove_owner`, `member_not_found`.

## Invite email

- Templates: `apps/web/api/templates/family-invite.{en,pt-BR,pt-PT,es,it}.html`, rendered by `_render_template` with `FAMILY_NAME`, `INVITER_NAME`, `IOS_LINK`, `ANDROID_LINK`. Subjects live in `_INVITE_SUBJECTS`.
- Language: `?lang=` (the app sends `i18n.language`; `pt` and `br` shorthands map to pt-PT and pt-BR), then the inviter's profile language, then `en`.
- Env: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`; `RESEND_SKIP_SEND=1` logs instead of sending.

## Client

- `features/family/api.ts` wraps the endpoints; screens use `features/family/hooks.ts`: `useFamily`, `useMyInvitations`, `useCreateFamily`, `useUpdateFamily`, `useInviteMemberByEmail`, `useInviteMemberByUsername`, `useAcceptInvitation`, `useDeclineInvitation`, `useRemoveFamilyMember`.
- Mutations invalidate `queryKeys.family`; create and accept also invalidate `profile`, and accept and decline invalidate `myInvitations`.
- Routes: `app/family/_layout.tsx` (plain stack), `create.tsx`, `invite-member.tsx`.
