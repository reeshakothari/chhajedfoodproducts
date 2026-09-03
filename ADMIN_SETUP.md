# Admin console — setup

The `/admin` page lets you add products, upload/replace product photos, change
prices, and toggle stock / featured status. Edits are saved to Supabase and show
on the live site immediately (the catalog page is rendered on demand).

- **Data + images:** Supabase project `500Kcal` (`tjrnymqmayqpdggtvhjr`)
  - table `cfp_products` (public read-only via RLS; writes only through the admin API)
  - storage bucket `cfp-product-images` (public read)
- **Login:** one shared username + password (env vars). A successful login sets a
  signed, http-only session cookie; Edge middleware guards every `/admin` route.

If Supabase or the admin credentials are missing the site still works — the
catalog falls back to the bundled `src/data/products.ts` list and the admin API
returns a clear "not configured" error.

---

## 1. Get the Supabase service role key

Supabase dashboard → project **500Kcal** → **Project Settings → API →
Project API keys → `service_role`** → **Reveal** and copy it. This is a secret —
it only goes in env vars, never in git.

## 2. Choose an admin username, password and session secret

- `ADMIN_USERNAME` — e.g. `chhajed`
- `ADMIN_PASSWORD` — a strong password
- `ADMIN_SESSION_SECRET` — a long random string. Generate one with:
  ```
  openssl rand -base64 32
  ```

## 3. Set environment variables

Add these in **Vercel → project `chhajedfoodproducts` → Settings → Environment
Variables** (Production + Preview), and in a local `.env.local` for development.

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://tjrnymqmayqpdggtvhjr.supabase.co` *(already in `.env`)* |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key *(already in `.env`)* |
| `NEXT_PUBLIC_SUPABASE_PRODUCTS_BUCKET` | `cfp-product-images` *(already in `.env`)* |
| `SUPABASE_SERVICE_ROLE_KEY` | **secret** — from step 1 |
| `ADMIN_USERNAME` | from step 2 |
| `ADMIN_PASSWORD` | **secret** — from step 2 |
| `ADMIN_SESSION_SECRET` | **secret** — from step 2 |

## 4. Redeploy

Trigger a redeploy in Vercel so the new env vars take effect, then open
`https://<your-domain>/admin`, sign in, and manage the catalogue. The session
lasts 7 days; "Sign out" clears it.

---

## How it works

| Piece | File |
|---|---|
| Supabase clients + `getProducts()` storefront helper | `src/lib/supabase.ts` |
| Credentials check, session cookie sign/verify, route guard | `src/lib/adminAuth.ts` |
| Route protection (redirect to login) | `src/middleware.ts` |
| Login / logout endpoints | `src/app/api/admin/login`, `.../logout` |
| Admin API — list / create / update / delete / image upload | `src/app/api/admin/**` |
| Public catalogue feed | `src/app/api/products/route.ts` |
| Admin UI (client, cookie-guarded) | `src/app/admin/**` |

The storefront reads through `getProducts()` in `src/app/product-catalog/page.tsx`
(`export const dynamic = 'force-dynamic'`) and, on the homepage, via a client
fetch to `/api/products` in `FeaturedProducts.tsx`.

### Editing the schema

Product columns live in the `cfp_products` table. To add a field: add the column
in Supabase, then extend `ProductRow` / `ProductInput` / the mappers in
`src/lib/supabase.ts` and the form in
`src/app/admin/components/ProductFormModal.tsx`.

### Rotating credentials

Change the env vars in Vercel and redeploy. Changing `ADMIN_SESSION_SECRET`
immediately invalidates all existing sessions.
