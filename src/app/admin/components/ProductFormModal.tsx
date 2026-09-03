'use client';

import { useEffect, useRef, useState } from 'react';
import { uploadProductImage } from '@/lib/adminClient';
import type { AdminProduct, ProductInput } from '@/lib/supabase';

const CATEGORY_SUGGESTIONS = ['Dips & Spreads', 'Syrups', 'Chatni', 'Sweet Chatni', 'Fragrances'];
const BRAND_SUGGESTIONS = ['Divya Kamal', 'Divya Samrat', 'Tajmahak', "Yuhvi's"];
const DIETARY_SUGGESTIONS = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Protein-Rich'];

type Props = {
  initial?: AdminProduct | null;
  onClose: () => void;
  onSave: (input: ProductInput, id?: number) => Promise<void>;
};

function emptyForm(): ProductInput {
  return {
    name: '',
    brand: BRAND_SUGGESTIONS[0],
    category: CATEGORY_SUGGESTIONS[0],
    image: '',
    alt: '',
    mrp: 0,
    sellingPrice: 0,
    description: '',
    weight: '',
    prepTime: 'Ready to use',
    dietary: ['Vegetarian'],
    nutritional: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    inStock: true,
    featured: false,
  };
}

function fromProduct(p: AdminProduct): ProductInput {
  return {
    name: p.name,
    brand: p.brand,
    category: p.category,
    image: p.image,
    alt: p.alt,
    mrp: p.mrp,
    sellingPrice: p.sellingPrice,
    description: p.description,
    weight: p.weight,
    prepTime: p.prepTime,
    dietary: p.dietary,
    nutritional: p.nutritional,
    inStock: p.inStock,
    featured: p.featured,
  };
}

export default function ProductFormModal({ initial, onClose, onSave }: Props) {
  const [form, setForm] = useState<ProductInput>(initial ? fromProduct(initial) : emptyForm());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  function set<K extends keyof ProductInput>(key: K, value: ProductInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleDietary(tag: string) {
    setForm((f) => ({
      ...f,
      dietary: f.dietary.includes(tag) ? f.dietary.filter((d) => d !== tag) : [...f.dietary, tag],
    }));
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadProductImage(file, form.name || file.name);
      setForm((f) => ({ ...f, image: url, alt: f.alt || f.name }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) return setError('Name is required.');
    if (!form.category.trim()) return setError('Category is required.');
    if (!form.brand.trim()) return setError('Brand is required.');
    setSaving(true);
    try {
      await onSave(
        { ...form, alt: form.alt.trim() || form.name.trim() },
        initial?.id
      );
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  const inputCls =
    'w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary';
  const labelCls = 'block text-xs font-body font-medium text-muted-foreground mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8">
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-warm-lg my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-headline text-lg font-bold text-foreground">
            {initial ? `Edit: ${initial.name}` : 'Add product'}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xl leading-none px-2"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>Product name *</label>
              <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} required />
            </div>

            <div>
              <label className={labelCls}>Brand *</label>
              <input
                className={inputCls}
                list="brand-suggestions"
                value={form.brand}
                onChange={(e) => set('brand', e.target.value)}
                required
              />
              <datalist id="brand-suggestions">
                {BRAND_SUGGESTIONS.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>

            <div>
              <label className={labelCls}>Category *</label>
              <input
                className={inputCls}
                list="category-suggestions"
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                required
              />
              <datalist id="category-suggestions">
                {CATEGORY_SUGGESTIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div>
              <label className={labelCls}>MRP (₹)</label>
              <input
                type="number"
                min={0}
                step="1"
                className={inputCls}
                value={form.mrp}
                onChange={(e) => set('mrp', Number(e.target.value))}
              />
            </div>

            <div>
              <label className={labelCls}>Selling price (₹)</label>
              <input
                type="number"
                min={0}
                step="1"
                className={inputCls}
                value={form.sellingPrice}
                onChange={(e) => set('sellingPrice', Number(e.target.value))}
              />
            </div>

            <div>
              <label className={labelCls}>Weight / pack size</label>
              <input
                className={inputCls}
                placeholder="750g, 5kg, 900g…"
                value={form.weight}
                onChange={(e) => set('weight', e.target.value)}
              />
            </div>

            <div>
              <label className={labelCls}>Preparation</label>
              <input
                className={inputCls}
                value={form.prepTime}
                onChange={(e) => set('prepTime', e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelCls}>Description</label>
              <textarea
                className={`${inputCls} min-h-[72px]`}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </div>
          </div>

          {/* Image */}
          <div>
            <label className={labelCls}>Product image</label>
            <div className="flex items-start gap-4">
              <div className="h-24 w-24 shrink-0 rounded-lg border border-border bg-muted overflow-hidden flex items-center justify-center">
                {form.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.image} alt="preview" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-[10px] text-muted-foreground text-center px-1">No image</span>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
                  onChange={handleFile}
                  className="block w-full text-xs font-body text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground file:font-cta file:text-xs hover:file:bg-primary/90"
                />
                {uploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
                <input
                  className={inputCls}
                  placeholder="…or paste an image URL / path"
                  value={form.image}
                  onChange={(e) => set('image', e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">JPG, PNG, WebP, AVIF or GIF · up to 5 MB.</p>
              </div>
            </div>
          </div>

          {/* Dietary */}
          <div>
            <label className={labelCls}>Dietary tags</label>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set([...DIETARY_SUGGESTIONS, ...form.dietary])).map((tag) => (
                <button
                  type="button"
                  key={tag}
                  onClick={() => toggleDietary(tag)}
                  className={`px-3 py-1 rounded-full text-xs font-cta border transition-colors ${
                    form.dietary.includes(tag)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-border hover:bg-muted'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Nutrition */}
          <div>
            <label className={labelCls}>Nutrition (per serving)</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(['calories', 'protein', 'carbs', 'fat'] as const).map((k) => (
                <div key={k}>
                  <span className="text-[11px] capitalize text-muted-foreground">{k}</span>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    className={inputCls}
                    value={form.nutritional[k]}
                    onChange={(e) =>
                      set('nutritional', { ...form.nutritional, [k]: Number(e.target.value) })
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Flags */}
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm font-body text-foreground">
              <input
                type="checkbox"
                checked={form.inStock}
                onChange={(e) => set('inStock', e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              In stock
            </label>
            <label className="flex items-center gap-2 text-sm font-body text-foreground">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => set('featured', e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              Featured on homepage
            </label>
          </div>

          {error && (
            <p className="text-xs font-body text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-border font-cta text-sm text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-cta font-semibold text-sm hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'Saving…' : initial ? 'Save changes' : 'Create product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
