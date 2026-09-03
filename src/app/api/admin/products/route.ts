import { NextResponse } from 'next/server';
import { guardAdminRoute } from '@/lib/adminAuth';
import {
  getSupabaseAdmin,
  PRODUCTS_TABLE,
  productInputToRow,
  rowToAdminProduct,
  type ProductRow,
  type ProductInput,
} from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const REQUIRED_FIELDS: (keyof ProductInput)[] = ['name', 'category', 'brand'];

// GET /api/admin/products — full list including out-of-stock items
export async function GET(req: Request) {
  const denied = await guardAdminRoute(req);
  if (denied) return denied;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase service role is not configured on the server.' },
      { status: 500 }
    );
  }

  const { data, error: dbError } = await supabase
    .from(PRODUCTS_TABLE)
    .select('*')
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ products: (data as ProductRow[]).map(rowToAdminProduct) });
}

// POST /api/admin/products — create a product
export async function POST(req: Request) {
  const denied = await guardAdminRoute(req);
  if (denied) return denied;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase service role is not configured on the server.' },
      { status: 500 }
    );
  }

  let body: Partial<ProductInput>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  for (const field of REQUIRED_FIELDS) {
    if (!body[field] || String(body[field]).trim() === '') {
      return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
    }
  }

  const row = productInputToRow(body);

  if (row.sort_order === undefined) {
    const { data: maxRow } = await supabase
      .from(PRODUCTS_TABLE)
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    row.sort_order = ((maxRow?.sort_order as number) || 0) + 10;
  }

  const { data, error: dbError } = await supabase
    .from(PRODUCTS_TABLE)
    .insert(row)
    .select('*')
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ product: rowToAdminProduct(data as ProductRow) }, { status: 201 });
}
