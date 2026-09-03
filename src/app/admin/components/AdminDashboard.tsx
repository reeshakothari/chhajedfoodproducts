'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  createProduct,
  deleteProduct,
  fetchAdminProducts,
  logout,
  updateProduct,
} from '@/lib/adminClient';
import type { AdminProduct, ProductInput } from '@/lib/supabase';
import ProductFormModal from './ProductFormModal';

const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export default function AdminDashboard() {
  const router = useRouter();

  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [rowBusy, setRowBusy] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setProducts(await fetchAdminProducts());
    } catch (err) {
      setLoadError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSignOut() {
    await logout();
    router.replace('/admin/login');
    router.refresh();
  }

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // ---- mutations ---------------------------------------------------------
  async function handleSave(input: ProductInput, id?: number) {
    if (id) {
      const updated = await updateProduct(id, input);
      setProducts((list) => list.map((p) => (p.id === id ? updated : p)));
      flash('Product updated');
    } else {
      const created = await createProduct(input);
      setProducts((list) => [...list, created]);
      flash('Product added');
    }
  }

  async function patchRow(id: number, patch: Partial<ProductInput>, note: string) {
    setRowBusy(id);
    try {
      const updated = await updateProduct(id, patch);
      setProducts((list) => list.map((p) => (p.id === id ? updated : p)));
      flash(note);
    } catch (err) {
      flash((err as Error).message);
    } finally {
      setRowBusy(null);
    }
  }

  async function handleDelete(p: AdminProduct) {
    if (!window.confirm(`Delete "${p.name}" (${p.weight})? This cannot be undone.`)) return;
    setRowBusy(p.id);
    try {
      await deleteProduct(p.id);
      setProducts((list) => list.filter((x) => x.id !== p.id));
      flash('Product deleted');
    } catch (err) {
      flash((err as Error).message);
    } finally {
      setRowBusy(null);
    }
  }

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(products.map((p) => p.category))).sort()],
    [products]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (category !== 'All' && p.category !== category) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [products, query, category]);

  // ---- render ----------------------------------------------------------
  return (
    <Shell
      right={
        <button
          onClick={handleSignOut}
          className="px-3 py-1.5 rounded-lg border border-border text-xs font-cta text-foreground hover:bg-muted"
        >
          Sign out
        </button>
      }
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-5">
        <div>
          <h1 className="font-headline text-2xl font-bold text-foreground">Products</h1>
          <p className="font-body text-sm text-muted-foreground">
            {products.length} items · {products.filter((p) => p.featured).length} featured ·{' '}
            {products.filter((p) => !p.inStock).length} out of stock
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="self-start px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-cta font-semibold text-sm hover:bg-primary/90"
        >
          + Add product
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          placeholder="Search name, brand, category…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          onClick={load}
          className="px-3 py-2 rounded-lg border border-border text-sm font-cta text-foreground hover:bg-muted"
        >
          Refresh
        </button>
      </div>

      {loadError && (
        <p className="text-xs font-body text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2 mb-4">
          {loadError}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm font-body">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
              <th className="px-3 py-3">Product</th>
              <th className="px-3 py-3 hidden md:table-cell">Category</th>
              <th className="px-3 py-3">MRP</th>
              <th className="px-3 py-3">Price</th>
              <th className="px-3 py-3 text-center">Stock</th>
              <th className="px-3 py-3 text-center">Featured</th>
              <th className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">
                  Loading products…
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">
                  No products match.
                </td>
              </tr>
            ) : (
              visible.map((p) => (
                <Row
                  key={p.id}
                  product={p}
                  busy={rowBusy === p.id}
                  onEdit={() => {
                    setEditing(p);
                    setModalOpen(true);
                  }}
                  onDelete={() => handleDelete(p)}
                  onPrice={(price) =>
                    patchRow(p.id, { sellingPrice: price }, `${p.name} price → ${inr(price)}`)
                  }
                  onMrp={(mrp) => patchRow(p.id, { mrp }, `${p.name} MRP updated`)}
                  onStock={(inStock) =>
                    patchRow(p.id, { inStock }, inStock ? 'Marked in stock' : 'Marked out of stock')
                  }
                  onFeatured={(featured) =>
                    patchRow(p.id, { featured }, featured ? 'Featured' : 'Unfeatured')
                  }
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <ProductFormModal
          initial={editing}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 rounded-full bg-foreground text-background px-4 py-2 text-xs font-cta shadow-warm-lg">
          {toast}
        </div>
      )}
    </Shell>
  );
}

function Shell({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/admin" className="font-headline font-bold text-foreground">
            Chhajed Admin
          </Link>
          {right}
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}

function Row({
  product,
  busy,
  onEdit,
  onDelete,
  onPrice,
  onMrp,
  onStock,
  onFeatured,
}: {
  product: AdminProduct;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onPrice: (v: number) => void;
  onMrp: (v: number) => void;
  onStock: (v: boolean) => void;
  onFeatured: (v: boolean) => void;
}) {
  return (
    <tr className={`border-b border-border last:border-0 ${busy ? 'opacity-50' : ''}`}>
      <td className="px-3 py-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 shrink-0 rounded-md border border-border bg-muted overflow-hidden flex items-center justify-center">
            {product.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.image} alt={product.alt} className="h-full w-full object-contain" />
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">{product.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {product.brand} · {product.weight || '—'}
            </p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3 hidden md:table-cell text-muted-foreground">{product.category}</td>
      <td className="px-3 py-3">
        <PriceCell value={product.mrp} onSave={onMrp} disabled={busy} />
      </td>
      <td className="px-3 py-3">
        <PriceCell value={product.sellingPrice} onSave={onPrice} disabled={busy} highlight />
      </td>
      <td className="px-3 py-3 text-center">
        <Toggle on={product.inStock} onChange={onStock} disabled={busy} labelOn="Yes" labelOff="No" />
      </td>
      <td className="px-3 py-3 text-center">
        <Toggle on={product.featured} onChange={onFeatured} disabled={busy} labelOn="★" labelOff="—" />
      </td>
      <td className="px-3 py-3">
        <div className="flex justify-end gap-2">
          <button
            onClick={onEdit}
            disabled={busy}
            className="px-2.5 py-1 rounded-md border border-border text-xs font-cta text-foreground hover:bg-muted"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            disabled={busy}
            className="px-2.5 py-1 rounded-md border border-destructive/40 text-xs font-cta text-destructive hover:bg-destructive/10"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

function PriceCell({
  value,
  onSave,
  disabled,
  highlight,
}: {
  value: number;
  onSave: (v: number) => void;
  disabled?: boolean;
  highlight?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  useEffect(() => setDraft(String(value)), [value]);

  if (!editing) {
    return (
      <button
        onClick={() => !disabled && setEditing(true)}
        className={`tabular-nums ${highlight ? 'font-semibold text-primary' : 'text-muted-foreground'} hover:underline`}
      >
        {inr(value)}
      </button>
    );
  }

  const commit = () => {
    const n = Number(draft);
    setEditing(false);
    if (Number.isFinite(n) && n >= 0 && n !== value) onSave(n);
    else setDraft(String(value));
  };

  return (
    <input
      autoFocus
      type="number"
      min={0}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') {
          setDraft(String(value));
          setEditing(false);
        }
      }}
      className="w-20 px-2 py-1 rounded-md border border-primary bg-background text-foreground text-sm tabular-nums focus:outline-none"
    />
  );
}

function Toggle({
  on,
  onChange,
  disabled,
  labelOn,
  labelOff,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  labelOn: string;
  labelOff: string;
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!on)}
      disabled={disabled}
      className={`min-w-[2.5rem] px-2 py-1 rounded-full text-xs font-cta transition-colors ${
        on
          ? 'bg-success/15 text-success border border-success/30'
          : 'bg-muted text-muted-foreground border border-border'
      }`}
    >
      {on ? labelOn : labelOff}
    </button>
  );
}
