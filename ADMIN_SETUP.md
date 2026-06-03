# Admin & handoff — plain steps for Paulo

## If a password was ever committed to GitHub

1. **Rotate immediately** in [Supabase → Authentication → Users](https://supabase.com/dashboard/project/hbacogyhftngwoxenttv/auth/users) (edit user → set a new password).
2. Never store passwords in the repo. Use `scripts/set-ryann-admin-auth.ps1` with env vars only (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ADMIN_PASSWORD`, `SUPABASE_ADMIN_USER_ID`).
3. Mark the GitGuardian alert as resolved after rotation.

---

## Admin email (done in code)

Admin access is managed in the **`admin_users`** table in Supabase (see migration `supabase/migrations/20250530_admin_users_delete.sql`).

`assets/js/config.js` → `adminEmails` is a **fallback** allowlist until that migration is run.

---

## Admin dashboard features

| Feature | Where |
|---------|--------|
| Delete records | Each contact / quote / booking card → **Delete** |
| View website | Sidebar **View website** or top bar button |
| Return to admin | While logged in, public pages show a floating **Admin** button (bottom-right) |
| Create another admin | **Settings** → Admin team (super admins only) |
| Remove a standard admin | **Settings** → Admin team → **Remove** (super admins only) |
| Export data | **Settings** → pick **From/To** dates, format (Excel, CSV, JSON), and record type |
| Offline invoices | **Invoices** → create locked-price quote, Square link, optional Gmail send — see `OFFLINE_INVOICES_SETUP.md` |

### Super admin vs standard admin

- **Super admins** (`rs.cleaning@collective.com`, `paulopackager@gmail.com`) can create and remove standard admins.
- **Standard admins** can manage leads/bookings but **cannot** invite or remove other admins.
- Super admins do not see other super admins in the team list — only standard admins they manage.

### One-time Supabase setup for new admin features

1. **SQL Editor** → run `supabase/migrations/20250530_admin_users_delete.sql`
2. **SQL Editor** → run `supabase/migrations/20250531_admin_superuser.sql`
3. **Edge Functions** → deploy `admin-create-user` and `admin-delete-user` (JWT verify **OFF**)
4. **Offline invoices** → run `supabase/migrations/20250536_offline_invoices.sql`, deploy invoice functions, configure Gmail per `OFFLINE_INVOICES_SETUP.md`

---

## Step 1 — Create your Supabase login (one time, ~3 min)

This is **not** on the website login page. You do it in **Supabase**:

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → your project.
2. **Authentication** → **Users** → **Add user** → **Create new user**.
3. Email: `paulopackager@gmail.com`  
   Password: pick a strong password (you can change it later).
4. **SQL Editor** → paste and run the full file:  
   `supabase/migrations/20250526_admin_rls.sql`  
   (Also run `20250526_quote_booking_fields.sql` if booking columns are missing.)

Then open your live site → **`/admin-login.html`** → sign in with that email and password.

### “Password reset” — where is it?

There is **no “Forgot password?”** on `admin-login.html` today.

To reset or set a password:

- **Supabase Dashboard** → **Authentication** → **Users** → click your user → **Send password recovery**  
  **or** set a new password directly there.

If you later hand the site to a **client**, create **their** user in Supabase the same way and update `adminEmail` + `schema.sql` to their email.

---

## Step 2 — Phone number (before handoff)

Two places (set **both** to the same real number):

### A. Quick / fallback — `assets/js/config.js`

```js
phone: "(512) 555-1234",  // your real number
```

Push to GitHub so Cloudflare redeploys.

### B. CMS — Sanity (updates site without code deploy)

1. Open Sanity Studio: run `npm run studio` locally **or** your deployed Studio URL if you have one.
2. Open **Site Settings**.
3. Edit **Phone** → **Publish**.

The live website reads phone from Sanity on each page load and updates all “Call us” / footer links.

**Right now in Sanity:** phone is still `(555) 014-7820` until you change it there.

---

## Images in Sanity Studio (upload & replace)

Each content type now has **uploadable image fields** on the same document:

| Studio document | Image fields |
|-----------------|--------------|
| **Testimonials** | Customer photo |
| **Gallery Items** | Before photo + After photo |
| **Services** | Hero image |
| **Home Page** | Hero image + card images on service cards |
| **Pages** | Hero image + section images |

Click the image → upload or replace → **Publish**. No URL copying.

### One-time migration (move existing URL images into uploads)

1. [sanity.io/manage](https://www.sanity.io/manage) → project **hjrx2q9w** → **API** → **Tokens** → Add token (Editor).
2. PowerShell:
   ```powershell
   $env:SANITY_API_TOKEN="paste-token-here"
   npm run sanity:migrate-images
   ```
3. Deploy updated schema (once, when disk space allows):
   ```powershell
   npx sanity schema deploy
   ```

After migration, gallery/review photos live in Sanity’s CDN and show as thumbnails in Studio.

### Regenerate gallery from website files (optional)

```powershell
node scripts/generate-gallery-seed.mjs
npm run sanity:import
npm run sanity:migrate-images
```


Seed content was imported to dataset **`production`** (39 documents): heroes, FAQs, testimonials, gallery, etc.

- **You do not need local deployment** to see Sanity content on the **live** site — the site fetches from Sanity’s API in the browser.
- **Code fixes** (quote bugs, admin email in config) still need **push + Cloudflare build** (`npm run build` → deploy `dist/`).

If Studio shows **Unknown fields found** (for example `afterImage` on gallery items), the hosted Studio bundle is out of date. Rebuild and deploy Studio plus schema:

```powershell
npm run studio:deploy
npm run sanity:schema-deploy
```

Studio URL: https://cleaning-websitepaulkelvin-cleaning.sanity.studio/

To restore the six Maryland/DC service area documents from seed:

```powershell
npm run sanity:sync-service-areas
```

### Keep Sanity aligned with the website (recommended)

The live site loads marketing content from Sanity (`assets/js/sanity-content.js`). HTML still contains Unsplash placeholders as fallbacks; **Sanity is what visitors see when the API loads.**

To push **current website copy + real gallery photos** into Sanity:

```powershell
npm run sanity:sync-website
```

This script:

1. Reads text from your HTML pages and `assets/js/config.js`
2. Builds gallery items from `assets/images/Before*.jpeg` and `After*.jpeg` (same rules as `gallery-data.js`)
3. Uploads local images into Sanity image fields
4. Removes stale FAQ/testimonial/gallery documents that no longer exist on the site

Re-run after you change website copy or add new before/after photos.

---

## Step 4 — What the client gets at handoff

| Give them | Notes |
|-----------|--------|
| Website URL | e.g. `https://rscleaningcollective.com` |
| Sanity Studio | Invite their email in sanity.io → project members (Editor) |
| Admin dashboard | `https://yoursite.com/admin-login.html` — only if you create a Supabase user for them |
| Contact email | Already `hello@rscleaningcollective.com` in Site Settings |

You keep **`paulopackager@gmail.com`** as admin until you switch the client to their own Supabase user + update `adminEmail` in config and RLS SQL.

---

## Quick test checklist

- [ ] Supabase user `paulopackager@gmail.com` exists  
- [ ] RLS migration SQL executed  
- [ ] Admin login works on live `/admin-login.html`  
- [ ] Submit test quote → appears in admin dashboard  
- [ ] Real phone set in `config.js` + Sanity Site Settings  
