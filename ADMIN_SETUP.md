# Admin & handoff — plain steps for Paulo

## Admin email (done in code)

Your admin email is set to **`paulopackager@gmail.com`** in:

| File | Purpose |
|------|---------|
| `assets/js/config.js` → `adminEmail` | Website blocks login if email doesn’t match |
| `supabase/schema.sql` | Database: only this email can read customer leads |
| `supabase/migrations/20250526_admin_rls.sql` | Same — run this in Supabase if not already |

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

Schema deploy (`npx sanity schema deploy`) timed out once; import succeeded. If Studio shows warnings about new fields (`location`, `avatarUrl` on testimonials), run schema deploy when convenient:

```powershell
npx sanity schema deploy
```

---

## Step 4 — What the client gets at handoff

| Give them | Notes |
|-----------|--------|
| Website URL | e.g. `https://REDACTED.com` |
| Sanity Studio | Invite their email in sanity.io → project members (Editor) |
| Admin dashboard | `https://yoursite.com/admin-login.html` — only if you create a Supabase user for them |
| Contact email | Already `hello@REDACTED.com` in Site Settings |

You keep **`paulopackager@gmail.com`** as admin until you switch the client to their own Supabase user + update `adminEmail` in config and RLS SQL.

---

## Quick test checklist

- [ ] Supabase user `paulopackager@gmail.com` exists  
- [ ] RLS migration SQL executed  
- [ ] Admin login works on live `/admin-login.html`  
- [ ] Submit test quote → appears in admin dashboard  
- [ ] Real phone set in `config.js` + Sanity Site Settings  
