import { NextResponse } from 'next/server';
import { guardAdminRoute } from '@/lib/adminAuth';
import { getSupabaseAdmin, PRODUCT_IMAGE_BUCKET } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']);
const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
};

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60) || 'product'
  );
}

// POST /api/admin/upload — multipart form: `file` (required), `name` (optional label)
export async function POST(req: Request) {
  const { error } = await guardAdminRoute(req);
  if (error) return error;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase service role is not configured on the server.' },
      { status: 500 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart form data.' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: 'Unsupported image type. Use JPG, PNG, WebP, AVIF or GIF.' },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Image is larger than 5 MB.' }, { status: 400 });
  }

  const label = slugify(String(form.get('name') || file.name || 'product'));
  const ext = EXT[file.type] || 'jpg';
  const key = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(key, buffer, { contentType: file.type, upsert: false, cacheControl: '31536000' });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(key);
  return NextResponse.json({ url: data.publicUrl, path: key });
}
