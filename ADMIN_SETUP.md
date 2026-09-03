# Admin console — setup

The `/admin` page lets you add products, upload/replace product photos, change
prices, and toggle stock / featured status. Edits are saved to Supabase and show
on the live site immediately (the catalog page is rendered on demand).

- **Data + images:** Supabase project `500Kcal` (`tjrnymqmayqpdggtvhjr`)
  - table `cfp_products` (public read-only via RLS; writes only through the admin API)
  - storage bucket `cfp-product-images` (public read)
- **Login:** Firebase Authentication (email + password), restricted to an email allowlist.

If Supabase or Firebase env vars are missing the site still works — the catalog
falls back to the bundled `src/data/products.ts` list and `/admin` shows a
"setup required" message.

---

## 1. Create the Firebase project (one time)

1. <https://console.firebase.google.com> → **Add project** (e.g. `chhajed-food-products`).
2. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable → Save.**
3. **Authentication → Users → Add user** — create one user per person who should
   have admin access (email + password). Note the emails.
4. **Project settings (gear icon) → General → Your apps → Web app (`</>`)** —
   register an app (nickname `admin`, Hosting not needed). Copy the `firebaseConfig`
   values shown.
5. **Authentication → Settings → Authorized domains** — add your production domain
   (e.g. `chhajedfoodproducts.vercel.app` and any custom domain). `localhost` is
   already allowed.

## 2. Get the Supabase service role key

Supabase dashboard → project **500Kcal** → **Project Settings → API →
Project API keys → `service_role`** → **Reveal** and copy it. This is a secret —
only goes in env vars, never in git.

## 3. Set environment variables

Add these in **Vercel → project `chhajedfoodproducts` → Settings → Environment
Variables** (Production + Preview), and in a local `.env.local` for development.

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://tjrnymqmayqpdggtvhjr.supabase.co` *(already in `.env`)* |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key *(already in `.env`)* |
| `NEXT_PUBLIC_SUPABASE_PRODUCTS_BUCKET` | `cfp-product-images` *(already in `.env`)* |
| `SUPABASE_SERVICE_ROLE_KEY` | **secret** — from step 2 |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | from step 1.4 |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `<project>.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `<project-id>` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `<project>.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | from step 1.4 |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | from step 1.4 |
| `ADMIN_EMAILS` | **secret** — comma-separated allowlist, e.g. `owner@chhajed.com,manager@chhajed.com` |

`ADMIN_EMAILS` must contain the exact email(s) of the Firebase user(s) from step
1.3. A signed-in user whose email is not on this list is rejected by the API.

## 4. Redeploy

Trigger a redeploy in Vercel so the new env vars take effect, then open
`https://<your-domain>/admin`, sign in, and manage the catalogue.

---

## How it works

| Piece | File |
|---|---|
| Supabase clients + `getProducts()` storefront helper | `src/lib/supabase.ts` |
| Firebase client SDK + sign-in helpers | `src/lib/firebase.ts` |
| Server-side Firebase token verification + email allowlist | `src/lib/adminAuth.ts` |
| Admin API — list / create / update / delete / image upload | `src/app/api/admin/**` |
| Public catalogue feed | `src/app/api/products/route.ts` |
| Admin UI (client-only, auth-guarded) | `src/app/admin/**` |
| Login page | `src/app/admin/login/page.tsx` |

The storefront reads through `getProducts()` in `src/app/product-catalog/page.tsx`
(`export const dynamic = 'force-dynamic'`) and, on the homepage, via a client
fetch to `/api/products` in `FeaturedProducts.tsx`.

### Editing the schema

Product columns live in the `cfp_products` table. To add a field: add the column
in Supabase, then extend `ProductRow` / `ProductInput` / the mappers in
`src/lib/supabase.ts` and the form in
`src/app/admin/components/ProductFormModal.tsx`.
