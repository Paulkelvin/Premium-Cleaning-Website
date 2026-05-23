# Premium Cleaning Website

A complete professional local-service website for a premium cleaning business. The site is built with static HTML, CSS, and JavaScript so it can be deployed on Netlify, Vercel, GitHub Pages, Cloudflare Pages, or any standard web host.

## Pages included

- Home
- About Us
- Services
- Individual service detail pages
- Get a Quote
- Book Appointment / Schedule a Call
- Before & After Gallery
- Testimonials / Reviews
- Service Areas
- Contact
- FAQs
- Privacy Policy
- Terms of Service
- Admin Login
- Admin Dashboard

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Edit `assets/js/config.js` and add your Supabase project URL and public anon/publishable key.
4. Enable email auth in Supabase if you want real admin login.

When Supabase credentials are not configured, the forms and dashboard use local browser storage as a demo fallback.

If Supabase returns `Invalid API key`, copy the `anon public` or `publishable` key again from Project Settings > API. A valid public key should be accepted by the REST API before form submissions can save. If Supabase returns `Could not find the table`, run `supabase/schema.sql` in the SQL Editor. If Supabase returns a row-level security error, run the latest `supabase/schema.sql` again so the public insert policies are recreated.

Some browsers restrict `sessionStorage` on `file://` pages. The admin dashboard includes a fallback for local testing, but running the site from a local HTTP server or deployed host is still recommended for the cleanest auth behavior.

## Sanity CMS next step

Sanity is configured for project `hjrx2q9w` and dataset `production`. The dataset is public, so the website can read editable content without a read token.

Studio and content commands:

```powershell
npm install
npm run studio
```

Then open `http://127.0.0.1:3333`.

The first content migration lives in `sanity/seed.ndjson`. To re-import it after logging in with the Sanity CLI:

```powershell
npm run sanity:import
```

The public website loads Sanity content through `assets/js/sanity-content.js`. If Sanity is unavailable, the original HTML copy remains visible as fallback content. Supabase remains responsible for contact submissions, quote requests, bookings, and admin workflow.

For best SEO and long-term maintainability, the next major upgrade should move the public frontend from static HTML into Next.js or Astro so Sanity content can be rendered before page load.

## Local preview

Open `index.html` directly in a browser, or serve the folder with any static server. Admin auth works best over HTTP instead of `file://`.

```powershell
node local-server.js
```

Then open `http://127.0.0.1:4173/admin-login.html`.

If `http://127.0.0.1:4173` shows `Not found`, stop the old terminal process running the server and start it again with `npm run serve`. The local server maps `/` to `index.html`.
