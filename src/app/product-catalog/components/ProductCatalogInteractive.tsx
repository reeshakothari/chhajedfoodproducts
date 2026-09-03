'use client';

import { useState, useEffect, useMemo } from 'react';
import Icon from '@/components/ui/AppIcon';
import ProductCard from './ProductCard';
import FilterSidebar from './FilterSidebar';
import ProductComparisonModal from './ProductComparisonModal';
import SampleRequestModal from './SampleRequestModal';
import BulkInquiryModal from './BulkInquiryModal';
import { products as realProducts, type Product } from '@/data/products';

// Group products by name and brand to create variants
interface ProductGroup {
  key: string;
  name: string;
  brand: string;
  variants: Product[];
  primaryProduct: Product;
}

function groupProductsByNameAndBrand(products: Product[]): ProductGroup[] {
  const groups = new Map<string, Product[]>();

  products.forEach(product => {
    // Create a key based on name and brand (to group same products with different sizes)
    const key = `${product.name.toLowerCase()}-${product.brand.toLowerCase()}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(product);
  });

  return Array.from(groups.entries()).map(([key, variants]) => {
    // Sort variants by weight (smaller first) for consistent ordering
    const sortedVariants = variants.sort((a, b) => {
      const weightA = parseFloat(a.weight.replace(/[^\d.]/g, ''));
      const weightB = parseFloat(b.weight.replace(/[^\d.]/g, ''));
      return weightA - weightB;
    });

    // Use the first (smallest) variant as the primary product
    const primaryProduct = sortedVariants[0];

    return {
      key,
      name: primaryProduct.name,
      brand: primaryProduct.brand,
      variants: sortedVariants,
      primaryProduct
    };
  });
}

interface Filters {
  brands: string[];
  categories: string[];
  dietary: string[];
  prepTime: string[];
}

interface ActiveFilters {
  brands: string[];
  categories: string[];
  dietary: string[];
  prepTime: string[];
  priceRange: [number, number];
  inStockOnly: boolean;
}

interface ProductCatalogInteractiveProps {
  initialProducts?: Product[];
}

export default function ProductCatalogInteractive({ initialProducts }: ProductCatalogInteractiveProps) {
  const sourceProducts: Product[] =
    initialProducts && initialProducts.length > 0 ? initialProducts : realProducts;
  const initialGroups = useMemo(() => groupProductsByNameAndBrand(sourceProducts), [sourceProducts]);

  const [isHydrated, setIsHydrated] = useState(false);
  const [productGroups] = useState<ProductGroup[]>(initialGroups);
  const [filteredGroups, setFilteredGroups] = useState<ProductGroup[]>(initialGroups);
  const [sortBy, setSortBy] = useState('featured');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [comparisonProducts, setComparisonProducts] = useState<Product[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [sampleRequestProduct, setSampleRequestProduct] = useState<string | null>(null);
  const [bulkInquiryProduct, setBulkInquiryProduct] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    brands: [],
    categories: [],
    dietary: [],
    prepTime: [],
    priceRange: [0, 1000],
    inStockOnly: false
  });

  const filters: Filters = {
    brands: ['Divya Kamal', 'Divya Samrat', 'Tajmahak', 'Yuhvi'],
    categories: ['Dips & Spreads', 'Syrups', 'Chatni', 'Fragrances', 'Nuts & Seeds', 'Snacks', 'Pasta'],
    dietary: ['Vegetarian', 'Vegan', 'Gluten-Free', 'Protein-Rich'],
    prepTime: ['Ready to use', 'Ready to eat', '8-10 mins', '10-12 mins']
  };

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    let filtered = [...productGroups];

    // Filter by brand (check primary product)
    if (activeFilters.brands.length > 0) {
      filtered = filtered.filter((group) => activeFilters.brands.includes(group.brand));
    }

    // Filter by category (check primary product)
    if (activeFilters.categories.length > 0) {
      filtered = filtered.filter((group) => activeFilters.categories.includes(group.primaryProduct.category));
    }

    // Filter by dietary (check if any variant matches)
    if (activeFilters.dietary.length > 0) {
      filtered = filtered.filter((group) =>
        group.variants.some(variant =>
          activeFilters.dietary.some((diet) => variant.dietary.includes(diet))
        )
      );
    }

    // Filter by prep time (check primary product)
    if (activeFilters.prepTime.length > 0) {
      filtered = filtered.filter((group) => activeFilters.prepTime.includes(group.primaryProduct.prepTime));
    }

    // Filter by stock (check if any variant is in stock)
    if (activeFilters.inStockOnly) {
      filtered = filtered.filter((group) => group.variants.some(v => v.inStock));
    }

    // Sort
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.primaryProduct.sellingPrice - b.primaryProduct.sellingPrice);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.primaryProduct.sellingPrice - a.primaryProduct.sellingPrice);
        break;
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'featured':
      default:
        filtered.sort((a, b) => (b.primaryProduct.featured ? 1 : 0) - (a.primaryProduct.featured ? 1 : 0));
        break;
    }

    setFilteredGroups(filtered);
  }, [activeFilters, sortBy, productGroups, isHydrated]);

  const handleFilterChange = (filterType: string, value: string | boolean | [number, number]) => {
    if (filterType === 'inStockOnly') {
      setActiveFilters((prev) => ({
        ...prev,
        inStockOnly: value as boolean
      }));
    } else if (Array.isArray(value)) {
      setActiveFilters((prev) => ({
        ...prev,
        priceRange: value
      }));
    } else {
      const filterKey = filterType as keyof Omit<ActiveFilters, 'priceRange' | 'inStockOnly'>;
      setActiveFilters((prev) => {
        const currentValues = prev[filterKey];
        const newValues = currentValues.includes(value as string) ?
        currentValues.filter((v) => v !== value) :
        [...currentValues, value as string];
        return { ...prev, [filterKey]: newValues };
      });
    }
  };

  const handleClearFilters = () => {
    setActiveFilters({
      brands: [],
      categories: [],
      dietary: [],
      prepTime: [],
      priceRange: [0, 1000],
      inStockOnly: false
    });
  };

  const handleAddToComparison = (productId: number) => {
    const product = sourceProducts.find((p) => p.id === productId);
    if (product && comparisonProducts.length < 4 && !comparisonProducts.find((p) => p.id === productId)) {
      setComparisonProducts((prev) => [...prev, product]);
    }
  };

  const handleRemoveFromComparison = (productId: number) => {
    setComparisonProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const handleSampleRequest = (productId: number) => {
    const product = sourceProducts.find((p) => p.id === productId);
    if (product) {
      setSampleRequestProduct(product.name);
    }
  };

  const handleBulkInquiry = (productId: number) => {
    const product = sourceProducts.find((p) => p.id === productId);
    if (product) {
      setBulkInquiryProduct(product.name);
    }
  };

  const handleSampleRequestSubmit = (data: any) => {
    console.log('Sample request submitted:', data);
    setSampleRequestProduct(null);
    setSuccessMessage('Sample request submitted successfully! We will contact you soon.');
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleBulkInquirySubmit = (data: any) => {
    console.log('Bulk inquiry submitted:', data);
    setBulkInquiryProduct(null);
    setSuccessMessage('Bulk inquiry submitted successfully! Our team will reach out to you shortly.');
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
          <div className="animate-pulse space-y-4 sm:space-y-6 md:space-y-8">
            <div className="h-8 sm:h-10 md:h-12 bg-muted rounded w-2/3 sm:w-1/2 md:w-1/3"></div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
              <div className="h-64 sm:h-80 lg:h-96 bg-muted rounded hidden lg:block"></div>
              <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) =>
                <div key={i} className="h-64 sm:h-80 md:h-96 bg-muted rounded"></div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>);

  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        <div className="mb-4 sm:mb-6 md:mb-8">
          <h1 className="font-headline font-bold text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-foreground mb-2 sm:mb-3 md:mb-4">
            Product Catalog
          </h1>
          <p className="font-body text-sm sm:text-base md:text-lg text-muted-foreground max-w-3xl">
            Explore our complete range of premium snacks, dips, nuts, and pasta products. Filter by
            brand, dietary preferences, and more to find exactly what you need.
          </p>
        </div>

        {successMessage &&
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-success/10 border border-success rounded-lg flex items-start gap-2 sm:gap-3">
            <Icon name="CheckCircleIcon" size={20} variant="solid" className="sm:w-6 sm:h-6 text-success flex-shrink-0 mt-0.5" />
            <p className="font-body text-xs sm:text-sm text-success flex-grow">{successMessage}</p>
            <button
            onClick={() => setSuccessMessage(null)}
            className="text-success hover:text-success/80 flex-shrink-0">

              <Icon name="XMarkIcon" size={18} variant="outline" className="sm:w-5 sm:h-5" />
            </button>
          </div>
        }

        <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:gap-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 font-body font-medium text-sm sm:text-base text-foreground bg-card border border-border rounded-md hover:bg-muted transition-colors duration-300">

              <Icon name="AdjustmentsHorizontalIcon" size={18} variant="outline" className="sm:w-5 sm:h-5" />
              Filters
              {activeFilters.brands.length +
              activeFilters.categories.length +
              activeFilters.dietary.length +
              activeFilters.prepTime.length + (
              activeFilters.inStockOnly ? 1 : 0) > 0 &&
              <span className="bg-primary text-primary-foreground px-1.5 py-0.5 sm:px-2 rounded-full text-xs font-semibold">
                  {activeFilters.brands.length +
                activeFilters.categories.length +
                activeFilters.dietary.length +
                activeFilters.prepTime.length + (
                activeFilters.inStockOnly ? 1 : 0)}
                </span>
              }
            </button>

            <div className="flex items-center gap-2">
              <label htmlFor="sort" className="font-body text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                Sort by:
              </label>
              <select
                id="sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-2 sm:px-3 py-1.5 sm:py-2 font-body text-xs sm:text-sm text-foreground bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary">

                <option value="featured">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="name">Name: A to Z</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="hidden sm:flex items-center gap-2 bg-card border border-border rounded-md p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded transition-colors duration-300 ${
                viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`
                }
                aria-label="Grid view">

                <Icon name="Squares2X2Icon" size={20} variant={viewMode === 'grid' ? 'solid' : 'outline'} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition-colors duration-300 ${
                viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`
                }
                aria-label="List view">

                <Icon name="ListBulletIcon" size={20} variant={viewMode === 'list' ? 'solid' : 'outline'} />
              </button>
            </div>

            {comparisonProducts.length > 0 &&
            <button
              onClick={() => setShowComparison(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 font-cta font-semibold text-xs sm:text-sm text-primary-foreground bg-secondary hover:bg-secondary/90 rounded-md shadow-warm-sm transition-all duration-300">

                <Icon name="ScaleIcon" size={16} variant="outline" className="sm:w-5 sm:h-5" />
                <span className="whitespace-nowrap">Compare ({comparisonProducts.length})</span>
              </button>
            }
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          <div className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
            <FilterSidebar
              filters={filters}
              activeFilters={activeFilters}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters} />

          </div>

          <div className="lg:col-span-3">
            <div className="mb-4 sm:mb-6 flex items-center justify-between">
              <p className="font-body text-xs sm:text-sm text-muted-foreground">
                Showing {filteredGroups.length} of {productGroups.length} products
              </p>
            </div>

            {filteredGroups.length === 0 ?
            <div className="text-center py-12 sm:py-16">
                <Icon name="FaceFrownIcon" size={48} variant="outline" className="sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                <h3 className="font-headline font-bold text-xl sm:text-2xl text-foreground mb-2">
                  No products found
                </h3>
                <p className="font-body text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
                  Try adjusting your filters to see more results
                </p>
                <button
                onClick={handleClearFilters}
                className="px-4 sm:px-6 py-2.5 sm:py-3 font-cta font-semibold text-sm sm:text-base text-primary-foreground bg-primary hover:bg-primary/90 rounded-md shadow-warm-sm transition-all duration-300">

                  Clear All Filters
                </button>
              </div> :

            <div
              className={
              viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 md:gap-6' : 'space-y-4 sm:space-y-6'
              }>

                {filteredGroups.map((group) =>
              <div key={group.key} className="relative">
                    <ProductCard
                  product={group.primaryProduct}
                  variants={group.variants}
                  onSampleRequest={handleSampleRequest}
                  onBulkInquiry={handleBulkInquiry} />

                    <button
                  onClick={() => handleAddToComparison(group.primaryProduct.id)}
                  disabled={
                  comparisonProducts.length >= 4 ||
                  comparisonProducts.some((p) => p.id === group.primaryProduct.id)
                  }
                  className="absolute top-2 sm:top-3 right-2 sm:right-3 p-1.5 sm:p-2 bg-card/90 backdrop-blur-sm border border-border rounded-lg hover:bg-card transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed z-10"
                  aria-label="Add to comparison">

                      <Icon
                    name="ScaleIcon"
                    size={16}
                    className={`sm:w-5 sm:h-5 ${
                    comparisonProducts.some((p) => p.id === group.primaryProduct.id) ?
                    'text-primary' : 'text-foreground'
                    }`}
                    variant={comparisonProducts.some((p) => p.id === group.primaryProduct.id) ? 'solid' : 'outline'} />

                    </button>
                  </div>
              )}
              </div>
            }
          </div>
        </div>
      </div>

      {showComparison &&
      <ProductComparisonModal
        products={comparisonProducts}
        onClose={() => setShowComparison(false)}
        onRemoveProduct={handleRemoveFromComparison} />

      }

      {sampleRequestProduct &&
      <SampleRequestModal
        productName={sampleRequestProduct}
        onClose={() => setSampleRequestProduct(null)}
        onSubmit={handleSampleRequestSubmit} />

      }

      {bulkInquiryProduct &&
      <BulkInquiryModal
        productName={bulkInquiryProduct}
        onClose={() => setBulkInquiryProduct(null)}
        onSubmit={handleBulkInquirySubmit} />

      }
    </div>);

}