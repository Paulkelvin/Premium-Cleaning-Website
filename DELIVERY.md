# Client delivery checklist — RS Cleaning Collective

Use this after deploying the site. It answers the open audit questions and lists what you (dev) vs the client must do in Supabase/Sanity.

---

## Open questions — answers & actions

### 1. Is Supabase deployed with the current schema/RLS?

**You don’t know yet — verify in 5 minutes:**

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**.
2. Run the contents of `supabase/migrations/20250526_admin_rls.sql` (or re-run full `supabase/schema.sql` on a fresh project).
3. Submit a test quote on the live site → **Table Editor** → `quote_requests` should show a new row.
4. If insert fails, read the error:
   - **RLS** → migration not applied
   - **column does not exist** → run `supabase/migrations/20250526_quote_booking_fields.sql` too
   - **Invalid API key** → copy anon/publishable key again into `assets/js/config.js`

### 2. Admin access — best practice (one client email)

**Current setup (good for a small client):**

| Layer | What we did |
|--------|-------------|
| Supabase Auth | One user: **`paulopackager@gmail.com`** (set in `assets/js/config.js` → `adminEmail`) |
| RLS | Only that email can **read/update** leads (`supabase/schema.sql`) |
| Admin UI | `admin-login.html` checks `CLEANCO_CONFIG.adminEmail` after sign-in |
| Delivery | **Do not** share your dev login. Create the client’s user in Supabase → send them `admin-login.html` URL + one-time password reset |

**Do not:** use demo mode (`cleanco_admin` localStorage) in production.

**Optional hardening later:** Cloudflare Access in front of `/admin-*.html`, or move dashboard to a subdomain with HTTP auth.

### 3. Is production deployed from `dist/`?

**Yes — if you use Cloudflare Pages with `wrangler.jsonc`:**

```json
"assets": { "directory": "./dist" }
```

**Before every deploy:**

```bash
npm run build
```

`build.js` now copies HTML, `assets/`, `services/`, **`sitemap.xml`**, and **`robots.txt`** into `dist/`.

Confirm in Cloudflare: build command = `npm run build`, output directory = `dist`.

### 4. Email & phone — what’s best?

| Field | Status | Recommendation |
|--------|--------|----------------|
| **hello@REDACTED.com** | Live ✓ | Keep as primary contact + form replies |
| **Phone `(555) 014-7820`** | Placeholder | Replace with client’s **real local number** in Sanity **Site Settings → Phone** (updates all `tel:` links site-wide). Until then, remove or hide “Call us” if they have no phone yet. |

**Best practice:** one real phone, one real inbox, both edited in **Sanity Site Settings** (not hard-coded in HTML).

### 6. Was `20250526_quote_booking_fields.sql` applied?

**Verify:** Supabase → Table Editor → `bookings` must have columns: `property_type`, `quote_id`, `payment_method`, `estimated_total`, etc.

If missing, run `supabase/migrations/20250526_quote_booking_fields.sql` in SQL Editor.

---

## Sanity — content the client can edit

All public copy should be managed in Sanity project **`hjrx2q9w`** / dataset **`production`**.

| Document type | Controls |
|---------------|----------|
| **Site Settings** | Business name, phone, email, footer, CTAs |
| **Home Page** | Hero, trust strip, service cards, section titles |
| **Page** | About, Services, Quote, Book, Contact, Areas, FAQ, Gallery, Testimonials, Privacy, Terms heroes + meta |
| **Service** | Each service detail page |
| **FAQ** | FAQ page + homepage FAQ block |
| **Testimonial** | Homepage review carousel + testimonials page |
| **Gallery Item** | Gallery + homepage preview (overrides static `gallery-data.js` when published) |
| **Service Area** | Service areas page cards |

**After schema changes (testimonial `location` / `avatarUrl`, gallery `slug`):**

```bash
npm run studio:deploy
npm run sanity:import
```

Or edit documents in Sanity Studio and publish.

**Carpet cleaning:** stays a **service info page** + **quote add-on** (“Carpet cleaning”) — not a primary quote service type.

---

## What was fixed in code (summary)

- Quote submit crash (`assistantBubble`), full wizard validation on submit, URL add-on aliases
- Book page gate (no flash redirect), stale quote context cleared
- XSS escapes (service area check, Sanity HTML)
- Tighter Supabase RLS + insert checks (requires SQL migration)
- Admin email check, `noindex` on admin pages
- Single pricing source in `config.js`
- Sanity hooks for reviews, testimonials page, service area list, CMS gallery
- Build copies sitemap/robots; Lucide pinned to `0.469.0`
- Contact honeypot + friendly form errors

---

## Handoff to client (minimal)

1. Sanity Studio URL + editor invite  
2. Admin URL: `https://yourdomain.com/admin-login.html`  
3. Supabase password reset for their admin email (once)  
4. Ask them to update **Site Settings → Phone** and review testimonials/gallery  
5. Optional: Stripe Payment Link → `CLEANCO_CONFIG.stripePaymentLink` when ready for pay-online

---

## Your pre-launch test (15 min)

- [ ] `npm run build` → open `dist/index.html` via `npm run serve`  
- [ ] Full quote → book handoff with session  
- [ ] Contact form → row in Supabase  
- [ ] Admin login with **client email only** → see submissions  
- [ ] Second Supabase user (if any) **cannot** read quotes (RLS)  
- [ ] Edit hero in Sanity → refresh site → hero updates  
