'use client';

import { getFirebaseAuth } from '@/lib/firebase';
import type { AdminProduct, ProductInput } from '@/lib/supabase';

async function authHeader(): Promise<Record<string, string>> {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!user) throw new Error('You are signed out. Please log in again.');
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data as T;
}

export async function fetchAdminProducts(): Promise<AdminProduct[]> {
  const res = await fetch('/api/admin/products', {
    headers: await authHeader(),
    cache: 'no-store',
  });
  const data = await parse<{ products: AdminProduct[] }>(res);
  return data.products;
}

export async function createProduct(input: ProductInput): Promise<AdminProduct> {
  const res = await fetch('/api/admin/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify(input),
  });
  const data = await parse<{ product: AdminProduct }>(res);
  return data.product;
}

export async function updateProduct(
  id: number,
  patch: Partial<ProductInput>
): Promise<AdminProduct> {
  const res = await fetch(`/api/admin/products/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify(patch),
  });
  const data = await parse<{ product: AdminProduct }>(res);
  return data.product;
}

export async function deleteProduct(id: number): Promise<void> {
  const res = await fetch(`/api/admin/products/${id}`, {
    method: 'DELETE',
    headers: await authHeader(),
  });
  await parse(res);
}

export async function uploadProductImage(file: File, name?: string): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  if (name) form.append('name', name);
  const res = await fetch('/api/admin/upload', {
    method: 'POST',
    headers: await authHeader(),
    body: form,
  });
  const data = await parse<{ url: string }>(res);
  return data.url;
}
