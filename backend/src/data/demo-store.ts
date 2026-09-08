import type { Merchant, Product, Store } from '../types.js'
// Sample catalog data for testing product search tools when connected to a store
export const demoMerchant: Merchant = { id: 'demo-merchant', name: 'Personal Workspace Commerce' }
export const demoStore: Store = {
  id: 'demo-store',
  merchantId: demoMerchant.id,
  name: 'Sample Catalog',
  knowledge: {
    storeName: 'Sample Catalog',
    description: 'Sample store catalog for testing product search and catalog interactions.',
    shipping: 'Standard shipping details are provided at checkout.',
    returns: 'Returns are accepted within 30 days in unused condition.',
    contact: 'support@example.com',
    hours: 'Monday–Friday, 9am–5pm.',
    faqs: [
      { question: 'Do you offer returns?', answer: 'Returns are accepted within 30 days in unused condition.' }
    ]
  }
}
export const demoProducts: Product[] = [
  { id: 'trail-black', storeId: 'demo-store', name: 'Trail Black Runner', description: 'Lightweight black everyday running shoe with breathable mesh.', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80', productUrl: '/products/trail-black', category: 'shoes', tags: ['black', 'running', 'shoes'], price: 89, currency: 'USD', available: true, variants: [] },
  { id: 'city-shirt', storeId: 'demo-store', name: 'Midnight Oxford Shirt', description: 'Black cotton Oxford shirt with a relaxed modern fit.', imageUrl: 'https://images.unsplash.com/photo-1598032895397-b9472444bf93?auto=format&fit=crop&w=900&q=80', productUrl: '/products/city-shirt', category: 'clothing', tags: ['black', 'shirt', 'cotton'], price: 48, currency: 'USD', available: true, variants: [] },
  { id: 'studio-headphones', storeId: 'demo-store', name: 'Studio Wireless Headphones', description: 'Over-ear wireless headphones with soft memory-foam cushions.', imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80', productUrl: '/products/studio-headphones', category: 'electronics', tags: ['headphones', 'wireless', 'audio'], price: 129, currency: 'USD', available: true, variants: [] },
  { id: 'canvas-tote', storeId: 'demo-store', name: 'Everyday Canvas Tote', description: 'Durable natural canvas tote for daily essentials.', imageUrl: 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=900&q=80', productUrl: '/products/canvas-tote', category: 'accessories', tags: ['tote', 'bag', 'canvas'], price: 35, currency: 'USD', available: false, variants: [] }
]

