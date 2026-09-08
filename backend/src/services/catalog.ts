import { db } from './firebase.js'
import { demoProducts } from '../data/demo-store.js'
import type { Product } from '../types.js'

export type ProductFilters = {
  search?: string
  category?: string
  minPrice?: number
  maxPrice?: number
  available?: boolean
  tags?: string[]
}

export async function searchProducts(storeId: string, filters: ProductFilters): Promise<Product[]> {
  try {
    const productsRef = db.collection('products')
    const snap = await productsRef.where('storeId', '==', storeId).get()
    
    let products: Product[] = []
    
    if (!snap.empty) {
      products = snap.docs.map(doc => {
        const data = doc.data() as Product
        data.id = doc.id
        return data
      })
    } else {
      // Fallback to demo products mapped to this store to make sure things look beautiful instantly
      products = demoProducts.map(p => ({ ...p, storeId }))
    }

    const rawQuery = (filters.search ?? '').toLowerCase().trim()
    const stopwords = new Set(['show', 'me', 'a', 'the', 'is', 'are', 'find', 'get', 'for', 'want', 'need', 'i', 'please', 'any', 'some', 'looking', 'about', 'of', 'to', 'in', 'with', 'on'])
    const words = rawQuery.replace(/[^\w\s]/g, " ").split(/\s+/).filter(w => w && !stopwords.has(w))

    return products
      .filter(p => {
        if (!rawQuery) return true
        const text = [p.name, p.description, p.category, ...(p.tags ?? [])].join(' ').toLowerCase()
        if (words.length === 0) return text.includes(rawQuery)
        return words.some(word => text.includes(word))
      })
      .filter(p => !filters.category || p.category.toLowerCase() === filters.category.toLowerCase())
      .filter(p => filters.minPrice === undefined || p.price >= filters.minPrice)
      .filter(p => filters.maxPrice === undefined || p.price <= filters.maxPrice)
      .filter(p => filters.available === undefined || p.available === filters.available)
      .filter(p => !filters.tags?.length || filters.tags.every(tag => p.tags?.map(t => t.toLowerCase()).includes(tag.toLowerCase())))
      .slice(0, 6)
  } catch (error) {
    console.error('Error in searchProducts:', error)
    return []
  }
}

export async function getProduct(storeId: string, id: string): Promise<Product | null> {
  try {
    const docSnap = await db.collection('products').doc(id).get()
    if (docSnap.exists) {
      const data = docSnap.data() as Product
      if (data.storeId === storeId) {
        data.id = docSnap.id
        return data
      }
    }
    
    // Fallback to demoProducts
    const demo = demoProducts.find(p => p.id === id)
    if (demo) {
      return { ...demo, storeId }
    }
    return null
  } catch (error) {
    console.error('Error in getProduct:', error)
    return null
  }
}

export function productContext(products: Product[]) {
  return products.map(({ id, name, description, price, currency, available, category, tags }) => ({
    id,
    name,
    description,
    price,
    currency,
    available,
    category,
    tags
  }))
}
