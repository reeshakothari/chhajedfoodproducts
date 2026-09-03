'use client';

import type { AdminProduct, ProductInput } from '@/lib/supabase';

// The admin session cookie is sent automatically with same-origin requests.

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (res.status === 401) {
    // Session expired — bounce to login.
    if (typeof window !== 'undefined') window.location.href = '/admin/login';
    throw new Error('Your session expired. Please sign in again.');
  }
  if (!res.ok) throw new Error((data as { error?: string })?.error || `Request failed (${res.status})`);
  return data as T;
}

export async function login(username: string, password: string): Promise<void> {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error((data as { error?: string })?.error || 'Sign in failed.');
}

export async function logout(): Promise<void> {
  await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
}

export async function fetchAdminProducts(): Promise<AdminProduct[]> {
  const res = await fetch('/api/admin/products', { cache: 'no-store' });
  const data = await parse<{ products: AdminProduct[] }>(res);
  return data.products;
}

export async function createProduct(input: ProductInput): Promise<AdminProduct> {
  const res = await fetch('/api/admin/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  const data = await parse<{ product: AdminProduct }>(res);
  return data.product;
}

export async function deleteProduct(id: number): Promise<void> {
  const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
  await parse(res);
}

export async function uploadProductImage(file: File, name?: string): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  if (name) form.append('name', name);
  const res = await fetch('/api/admin/upload', { method: 'POST', body: form });
  const data = await parse<{ url: string }>(res);
  return data.url;
}
