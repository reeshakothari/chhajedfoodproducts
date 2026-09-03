import { NextResponse } from 'next/server';
import { guardAdminRoute } from '@/lib/adminAuth';
import {
  getSupabaseAdmin,
  PRODUCTS_TABLE,
  PRODUCT_IMAGE_BUCKET,
  productInputToRow,
  rowToAdminProduct,
  type ProductRow,
  type ProductInput,
} from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// PATCH /api/admin/products/:id — update any subset of fields
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { error } = await guardAdminRoute(req);
  if (error) return error;

  const id = parseId(params.id);
  if (id === null) return NextResponse.json({ error: 'Invalid product id.' }, { status: 400 });

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

  const row = productInputToRow(body);
  if (Object.keys(row).length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided.' }, { status: 400 });
  }

  const { data, error: dbError } = await supabase
    .from(PRODUCTS_TABLE)
    .update(row)
    .eq('id', id)
    .select('*')
    .single();

  if (dbError) {
    const status = dbError.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: dbError.message }, { status });
  }

  return NextResponse.json({ product: rowToAdminProduct(data as ProductRow) });
}

// DELETE /api/admin/products/:id
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { error } = await guardAdminRoute(req);
  if (error) return error;

  const id = parseId(params.id);
  if (id === null) return NextResponse.json({ error: 'Invalid product id.' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase service role is not configured on the server.' },
      { status: 500 }
    );
  }

  // Best-effort cleanup of an uploaded image that lives in our bucket.
  const { data: existing } = await supabase
    .from(PRODUCTS_TABLE)
    .select('image')
    .eq('id', id)
    .maybeSingle();

  const { error: dbError } = await supabase.from(PRODUCTS_TABLE).delete().eq('id', id);
  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  const imagePath = existing?.image as string | undefined;
  if (imagePath && imagePath.includes(`/${PRODUCT_IMAGE_BUCKET}/`)) {
    const key = imagePath.split(`/${PRODUCT_IMAGE_BUCKET}/`)[1];
    if (key) await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([key]).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
