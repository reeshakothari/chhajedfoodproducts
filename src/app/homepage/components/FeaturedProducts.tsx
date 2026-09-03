'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppImage from '@/components/ui/AppImage';
import Icon from '@/components/ui/AppIcon';
import { products as realProducts } from '@/data/products';
import { useCart } from '@/context/CartContext';

interface Product {
  id: number;
  name: string;
  brand: string;
  category: string;
  description: string;
  image: string;
  alt: string;
  features: string[];
  preparationTime: string;
  dietary: string[];
  price: number;
  weight: string;
}

type CatalogProduct = typeof realProducts[number];

// Adapt catalog products to this component's card interface
function adaptFeatured(list: CatalogProduct[]): Product[] {
  return list
    .filter(p => p.featured)
    .slice(0, 12)
    .map(p => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      description: p.description,
      image: p.image,
      alt: p.alt,
      features: [
        `${p.weight} pack`,
        'Premium quality',
        p.dietary[0] || 'Quality ingredients'
      ],
      preparationTime: p.prepTime,
      dietary: p.dietary,
      price: p.sellingPrice,
      weight: p.weight
    }));
}

const staticFeatured: Product[] = adaptFeatured(realProducts);

const categories = ['All Products', 'Dips & Spreads', 'Syrups', 'Chatni', 'Fragrances'];

export default function FeaturedProducts() {
  const [selectedCategory, setSelectedCategory] = useState('All Products');
  const [hoveredProduct, setHoveredProduct] = useState<number | null>(null);
  const [addedToCart, setAddedToCart] = useState<number | null>(null);
  const [mockProducts, setMockProducts] = useState<Product[]>(staticFeatured);
  const { addToCart } = useCart();

  useEffect(() => {
    let active = true;
    fetch('/api/products', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.products?.length) setMockProducts(adaptFeatured(data.products));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleAddToCart = (product: Product) => {
    addToCart({
      id: product.id,
      name: product.name,
      brand: product.brand,
      image: product.image,
      weight: product.weight,
      price: product.price,
    });
    setAddedToCart(product.id);
    setTimeout(() => setAddedToCart(null), 2000);
  };

  const filteredProducts = selectedCategory === 'All Products' ?
  mockProducts :
  mockProducts.filter((product) => product.category === selectedCategory);

  return (
    <section className="py-8 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-6">
          <h2 className="font-headline text-2xl font-bold text-foreground mb-2">
            Featured Products
          </h2>
          <p className="font-body text-sm text-muted-foreground max-w-2xl mx-auto">
            Discover our premium range of products crafted with quality ingredients and traditional expertise
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {categories.map((category) =>
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-6 py-2.5 font-cta font-semibold rounded-full transition-all duration-300 ${
            selectedCategory === category ?
            'bg-primary text-primary-foreground shadow-warm' :
            'bg-card text-foreground hover:bg-muted border border-border'}`
            }>

              {category}
            </button>
          )}
        </div>

        <div className="grid grid-cols-4 gap-4">
          {filteredProducts.map((product) =>
          <div
            key={product.id}
            className="bg-card rounded-lg overflow-hidden shadow-warm hover:shadow-warm-lg transition-all duration-300 max-w-xs mx-auto"
            onMouseEnter={() => setHoveredProduct(product.id)}
            onMouseLeave={() => setHoveredProduct(null)}>

              <div className="relative h-40 bg-gradient-to-b from-muted/50 to-muted p-2">
                <AppImage
                src={product.image}
                alt={product.alt}
                fill
                objectFit="contain"
                className="transition-transform duration-500 hover:scale-105" />

                <div className="absolute top-2 left-2">
                  <span className="px-2 py-0.5 bg-primary/90 text-primary-foreground text-xs font-cta font-semibold rounded-full">
                    {product.brand}
                  </span>
                </div>
              </div>

              <div className="p-3">
                <h3 className="font-headline text-base font-semibold text-foreground mb-1.5">
                  {product.name}
                </h3>

                <p className="font-body text-xs text-muted-foreground mb-2 line-clamp-2">
                  {product.description}
                </p>

                <div className="flex items-center gap-2 mb-2 text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Icon name="ClockIcon" size={12} />
                    <span className="font-body text-xs">{product.preparationTime}</span>
                  </div>
                  <div className="flex gap-1">
                    {product.dietary.slice(0, 2).map((diet, index) =>
                  <span
                    key={index}
                    className="px-1.5 py-0.5 bg-muted text-foreground text-xs font-body rounded">

                        {diet}
                      </span>
                  )}
                  </div>
                </div>

                {hoveredProduct === product.id &&
              <div className="space-y-1 mb-2">
                    {product.features.map((feature, index) =>
                <div key={index} className="flex items-center gap-1.5">
                        <Icon
                    name="CheckCircleIcon"
                    size={12}
                    variant="solid"
                    className="text-success" />

                        <span className="font-body text-xs text-foreground">
                          {feature}
                        </span>
                      </div>
                )}
                  </div>
              }

                <button
                  onClick={() => handleAddToCart(product)}
                  className="w-full px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-cta font-semibold text-xs rounded-md transition-all duration-300 flex items-center justify-center gap-1.5">
                  {addedToCart === product.id ? (
                    <>
                      <Icon name="CheckCircleIcon" size={16} variant="solid" />
                      Added to Cart
                    </>
                  ) : (
                    <>
                      <Icon name="ShoppingCartIcon" size={16} />
                      Add to Cart
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="text-center mt-8">
          <Link
            href="/product-catalog"
            className="inline-block px-6 py-3 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-cta font-semibold rounded-md shadow-warm transition-all duration-300">
            View All Products
          </Link>
        </div>
      </div>
    </section>);

}