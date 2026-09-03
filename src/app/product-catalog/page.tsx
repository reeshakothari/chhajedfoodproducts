import type { Metadata } from 'next';
import Header from '@/components/common/Header';
import ProductCatalogInteractive from './components/ProductCatalogInteractive';
import { getProducts } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'Product Catalog - Chhajed Food Products Hub',
  description: 'Explore our comprehensive range of premium snacks, dips, nuts, and pasta products. Filter by brand, dietary preferences, and bulk pricing options to find the perfect products for your business.',
};

// Always render fresh so price / stock edits from the admin console show immediately.
export const dynamic = 'force-dynamic';

export default async function ProductCatalogPage() {
  const products = await getProducts();

  return (
    <>
      <Header />
      <main className="pt-16 sm:pt-20">
        <ProductCatalogInteractive initialProducts={products} />
      </main>
    </>
  );
}
