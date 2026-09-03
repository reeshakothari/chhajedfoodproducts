import { NextResponse } from 'next/server';
import { getProducts } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Public catalogue feed — used by client components that need a live refresh.
export async function GET() {
  try {
    const products = await getProducts();
    return NextResponse.json(
      { products },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('GET /api/products failed:', err);
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 });
  }
}
