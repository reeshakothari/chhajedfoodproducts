import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { products as staticProducts, type Product } from '@/data/products';

export const PRODUCTS_TABLE = 'cfp_products';
export const PRODUCT_IMAGE_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_PRODUCTS_BUCKET || 'cfp-product-images';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function isPlaceholder(value: string): boolean {
  return (
    !value ||
    value.includes('dummy') ||
    value.includes('your-') ||
    value.includes('updateyour')
  );
}

export const isSupabaseConfigured = !isPlaceholder(SUPABASE_URL) && !isPlaceholder(SUPABASE_ANON_KEY);
export const isSupabaseAdminConfigured =
  !isPlaceholder(SUPABASE_URL) && !isPlaceholder(SUPABASE_SERVICE_ROLE_KEY);

// Next.js patches global fetch and caches GET requests by default inside route
// handlers / RSC. Force every Supabase request to bypass that data cache so the
// storefront always reflects the latest admin edits.
const noStoreFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: 'no-store' });

/** Public, anon-key client. Safe for the browser and RSC reads. Null when unconfigured. */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { fetch: noStoreFetch },
  });
}

/**
 * Service-role client. SERVER ONLY — never import into a client component.
 * Bypasses RLS, so every caller must have already authorised the request.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!isSupabaseAdminConfigured) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: noStoreFetch },
  });
}

// ---------------------------------------------------------------------------
// Row <-> Product mapping
// ---------------------------------------------------------------------------

export interface ProductRow {
  id: number;
  name: string;
  brand: string;
  category: string;
  image: string;
  alt: string;
  mrp: number | string;
  selling_price: number | string;
  description: string;
  weight: string;
  prep_time: string;
  dietary: string[] | null;
  nutritional: Product['nutritional'] | null;
  in_stock: boolean;
  featured: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

const EMPTY_NUTRITION: Product['nutritional'] = { calories: 0, protein: 0, carbs: 0, fat: 0 };

export function rowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    category: row.category,
    image: row.image || '/assets/images/no_image.png',
    alt: row.alt || row.name,
    mrp: Number(row.mrp) || 0,
    sellingPrice: Number(row.selling_price) || 0,
    description: row.description || '',
    weight: row.weight || '',
    prepTime: row.prep_time || 'Ready to use',
    dietary: Array.isArray(row.dietary) ? row.dietary : [],
    nutritional: row.nutritional || EMPTY_NUTRITION,
    inStock: row.in_stock,
    featured: row.featured,
  };
}

/** Admin-facing shape: a Product plus the columns the storefront type omits. */
export interface AdminProduct extends Product {
  sortOrder: number;
  updatedAt: string | null;
}

export function rowToAdminProduct(row: ProductRow): AdminProduct {
  return {
    ...rowToProduct(row),
    sortOrder: row.sort_order ?? 0,
    updatedAt: row.updated_at || null,
  };
}

/** Payload accepted by the admin create/update API. */
export interface ProductInput {
  name: string;
  brand: string;
  category: string;
  image: string;
  alt: string;
  mrp: number;
  sellingPrice: number;
  description: string;
  weight: string;
  prepTime: string;
  dietary: string[];
  nutritional: Product['nutritional'];
  inStock: boolean;
  featured: boolean;
  sortOrder?: number;
}

export function productInputToRow(input: Partial<ProductInput>): Partial<ProductRow> {
  const row: Partial<ProductRow> = {};
  if (input.name !== undefined) row.name = input.name.trim();
  if (input.brand !== undefined) row.brand = input.brand.trim();
  if (input.category !== undefined) row.category = input.category.trim();
  if (input.image !== undefined) row.image = input.image.trim();
  if (input.alt !== undefined) row.alt = input.alt.trim();
  if (input.mrp !== undefined) row.mrp = Number(input.mrp) || 0;
  if (input.sellingPrice !== undefined) row.selling_price = Number(input.sellingPrice) || 0;
  if (input.description !== undefined) row.description = input.description.trim();
  if (input.weight !== undefined) row.weight = input.weight.trim();
  if (input.prepTime !== undefined) row.prep_time = input.prepTime.trim() || 'Ready to use';
  if (input.dietary !== undefined) {
    row.dietary = Array.isArray(input.dietary)
      ? input.dietary.map((d) => String(d).trim()).filter(Boolean)
      : [];
  }
  if (input.nutritional !== undefined) {
    row.nutritional = {
      calories: Number(input.nutritional?.calories) || 0,
      protein: Number(input.nutritional?.protein) || 0,
      carbs: Number(input.nutritional?.carbs) || 0,
      fat: Number(input.nutritional?.fat) || 0,
    };
  }
  if (input.inStock !== undefined) row.in_stock = Boolean(input.inStock);
  if (input.featured !== undefined) row.featured = Boolean(input.featured);
  if (input.sortOrder !== undefined) row.sort_order = Number(input.sortOrder) || 0;
  return row;
}

// ---------------------------------------------------------------------------
// Storefront read helper (used by Server Components)
// ---------------------------------------------------------------------------

/**
 * Returns the product catalogue. Falls back to the bundled static list when
 * Supabase is not configured or the query fails, so the site never breaks.
 */
export async function getProducts(): Promise<Product[]> {
  const supabase = getSupabase();
  if (!supabase) return staticProducts;

  try {
    const { data, error } = await supabase
      .from(PRODUCTS_TABLE)
      .select('*')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });

    if (error || !data || data.length === 0) {
      if (error) console.error('getProducts: Supabase error, using static data:', error.message);
      return staticProducts;
    }
    return (data as ProductRow[]).map(rowToProduct);
  } catch (err) {
    console.error('getProducts: unexpected error, using static data:', err);
    return staticProducts;
  }
}

export { staticProducts };
export type { Product };
