# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 14 e-commerce website for Chhajed Food Products, a B2B food manufacturer in Pune, India. The site showcases their product catalog (dips, spreads, syrups, and chatnis) and allows bulk orders through inquiry forms.

## Development Commands

```bash
# Development server (runs on port 4028)
npm run dev

# Production build
npm run build

# Start production server
npm run serve

# Type checking
npm run type-check

# Linting
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix issues

# Code formatting
npm run format      # Format all TypeScript/CSS/MD/JSON files in src/
```

**Note**: The dev server runs on port **4028**, not the default 3000.

## Architecture Overview

### Project Structure

- **App Router Pattern**: Uses Next.js 14 App Router (`src/app/`)
- **Page-Based Organization**: Each route has its own folder with co-located components
  - `src/app/[route]/page.tsx` - Page component
  - `src/app/[route]/components/` - Page-specific components
- **Shared Components**:
  - `src/components/common/` - Reusable components (Header)
  - `src/components/ui/` - Base UI components (AppIcon, AppImage)
  - `src/components/cart/` - Cart-related components (CartModal)
- **Global State**: Context API for cart management (`src/context/CartContext.tsx`)
- **Static Data**:
  - Product catalog stored in `src/data/products.ts`
  - Recipe data hardcoded in `src/app/recipe-hub/components/RecipeHubInteractive.tsx` as `mockRecipes` array

### Key Routes

The root `/` redirects to `/homepage` (configured in `next.config.mjs`):

- `/homepage` - Landing page
- `/product-catalog` - Product listing with filters and cart functionality
- `/manufacturing-story` - Company story and facility tour
- `/quality-commitment` - Quality standards and certifications
- `/recipe-hub` - Recipe showcase with filters
- `/contact` - Contact forms and information

### State Management

**Cart System** (`src/context/CartContext.tsx`):
- Global cart state using React Context API
- Persists to `localStorage` with hydration handling
- Provides: `addToCart`, `removeFromCart`, `updateQuantity`, `clearCart`, `getTotalItems`, `getTotalPrice`
- Accessed via `useCart()` hook
- Wrapped around entire app in `src/app/layout.tsx`

### Component Patterns

**Client vs Server Components**:
- Most components use `'use client'` directive due to interactivity
- Interactive features: filters, modals, cart, forms

**Icon System** (`src/components/ui/AppIcon.tsx`):
- Wrapper around Heroicons with dynamic name resolution
- Accepts icon name as string (e.g., `name="ShoppingCartIcon"`)
- Supports both outline and solid variants
- Fallback to QuestionMarkCircleIcon for missing icons

**Image Component** (`src/components/ui/AppImage.tsx`):
- Wrapper around Next.js Image component for consistent image handling

**Path Aliasing**:
- `@/` maps to `src/` directory (configured in `tsconfig.json`)

### Product Data Structure

Products are stored in the Supabase table `cfp_products` (project `500Kcal`) and
managed through the `/admin` console. `src/data/products.ts` remains the type
source and an offline fallback used when Supabase is not configured. See
`ADMIN_SETUP.md` for the full setup (env vars).

- Storefront reads: `getProducts()` in `src/lib/supabase.ts` (Supabase, falls back to the static list).
- `src/app/product-catalog/page.tsx` is `dynamic = 'force-dynamic'` so edits appear immediately.
- Admin auth: one shared `ADMIN_USERNAME` / `ADMIN_PASSWORD`; login sets a signed
  http-only cookie (`src/lib/adminAuth.ts`), and `src/middleware.ts` guards `/admin/*`.
- Admin writes go through `src/app/api/admin/**`, which check the session cookie
  before using the Supabase service role.

The `Product` schema (in `src/data/products.ts`):

```typescript
interface Product {
  id: number;
  name: string;
  brand: string;          // "Divya Kamal", "Tajmahak", "Divya Samrat", "Yuhvi's"
  category: string;       // "Dips & Spreads", "Syrups", "Chatni", "Sweet Chatni"
  image: string;          // Path: /products/[category]/[filename]
  mrp: number;            // Maximum Retail Price (shown with strikethrough)
  sellingPrice: number;   // Actual selling price (discounted price)
  weight: string;
  dietary: string[];
  nutritional: { calories, protein, carbs, fat };
  inStock: boolean;
  featured: boolean;
}
```

**Pricing Display**: Products show MRP (crossed out) followed by the selling price, with savings percentage calculated automatically.

### Recipe Data Structure

Recipes are defined in `src/app/recipe-hub/components/RecipeHubInteractive.tsx` with the following schema:

```typescript
interface Recipe {
  id: number;
  title: string;
  description: string;
  image: string;
  alt: string;
  prepTime: number;         // In minutes
  cookTime: number;         // In minutes
  difficulty: 'Easy' | 'Medium' | 'Hard';
  servings: number;
  products: string[];       // Array of product names used in recipe
  category: string;         // "Appetizers", "Snacks", "Main Course", etc.
  likes: number;
  author: string;
  authorImage: string;
  authorAlt: string;
  ingredients: string[];
  instructions: string[];
  nutritionalInfo: { calories, protein, carbs, fat };
  tips: string[];
}
```

## Configuration Notes

### Next.js Config (`next.config.mjs`)

- **TypeScript**: Build errors are ignored (`ignoreBuildErrors: true`)
- **ESLint**: Ignored during builds (`ignoreDuringBuilds: true`)
- **Images**: Whitelisted domains (Unsplash, Pexels, Pixabay)
- **Root Redirect**: `/` → `/homepage`

### ESLint Config

- Extends: `next/core-web-vitals`, TypeScript recommended, Prettier
- Prettier rules enforced as errors with auto-fix
- Style: Single quotes, 100-char line width, 2-space tabs
- Warnings for: unused vars (with `_` prefix exception), `console` (except warn/error/info)

### TypeScript

- Strict mode enabled
- Path alias: `@/*` → `src/*`
- Target: ES5 for broad compatibility

## Critical Dependencies

**Never remove these** (see `package.json` rocketCritical section):
- `next` (14.2.0), `react` (18.2.0), `react-dom` (18.2.0)
- `@heroicons/react`, `recharts`, `@tailwindcss/typography`
- TypeScript tooling and ESLint/Prettier configs

## Styling

- **Tailwind CSS 3.4.6** with custom theme configuration
- **Design System**: Uses semantic color tokens (primary, secondary, muted, etc.)
- **Custom Fonts** (defined in `tailwind.config.js`):
  - `font-headline`: Playfair Display (serif)
  - `font-body`: Source Sans 3 (sans-serif)
  - `font-cta`: Outfit (sans-serif)
  - `font-accent`: Crimson Text (serif)
- **Custom Shadows**: Three "warm" shadow variants (`shadow-warm`, `shadow-warm-sm`, `shadow-warm-lg`) with amber tones
- **Animations**: `tailwindcss-animate` plugin with accordion animations
- **Dark Mode**: Class-based dark mode support configured
- Global styles: `src/styles/index.css`

## Development Notes

- All page routes have their own component folders - keep page-specific components co-located
- When adding new products, update `src/data/products.ts` with proper product structure
- When adding new recipes, update the `mockRecipes` array in `src/app/recipe-hub/components/RecipeHubInteractive.tsx`
- The cart uses localStorage - handle hydration correctly in client components
- **Header Pattern**: Header component is shared across all pages via individual page imports (not in root layout)
- **Footer Pattern**: Each page has its own Footer component in its components directory (not a shared component)
- Images are stored in `/public/products/[category]/` directories
- Company logo is located at `/public/assets/images/chhajedfoodproducts logo.jpg` and used in Header and all Footer components
