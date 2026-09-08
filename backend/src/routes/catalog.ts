import { Router } from 'express'
import { z } from 'zod'
import { db } from '../services/firebase.js'
import { getOrCreateTenant } from '../services/db.js'
import crypto from 'crypto'

const router = Router()
const DEFAULT_EMAIL = 'nobleroan474@gmail.com'

const variantSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  price: z.coerce.number().nonnegative(),
  currency: z.string().min(1),
  available: z.boolean()
})

const productInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(''),
  imageUrl: z.string().optional().default(''),
  productUrl: z.string().optional().default(''),
  category: z.string().min(1),
  tags: z.array(z.string()).optional().default([]),
  price: z.coerce.number().nonnegative(),
  currency: z.string().optional().default('USD'),
  available: z.boolean().optional().default(true),
  inventory: z.coerce.number().int().nonnegative().optional().default(10),
  variants: z.array(variantSchema).optional().default([])
})

/**
 * GET /api/catalog/products
 * Retrieve all products in this tenant's isolated catalog.
 */
router.get('/products', async (req, res) => {
  try {
    const tenant = await getOrCreateTenant(DEFAULT_EMAIL)
    const snap = await db.collection('products')
      .where('storeId', '==', tenant.store.id)
      .get()

    const products = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    return res.json({ success: true, products })
  } catch (err: unknown) {
    console.error('[CATALOG ROUTE ERROR] GET /products:', err)
    return res.status(500).json({ success: false, message: 'Failed to retrieve catalog products.' })
  }
})

/**
 * POST /api/catalog/products
 * Create a new product manually in the tenant's catalog.
 */
router.post('/products', async (req, res) => {
  const parsed = productInputSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Invalid product details.', errors: parsed.error.format() })
  }

  try {
    const tenant = await getOrCreateTenant(DEFAULT_EMAIL)
    const productId = 'prod_' + crypto.randomBytes(6).toString('hex')
    
    const newProduct = {
      ...parsed.data,
      id: productId,
      storeId: tenant.store.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await db.collection('products').doc(productId).set(newProduct)

    return res.json({ success: true, message: 'Product created successfully in manual catalog.', product: newProduct })
  } catch (err: unknown) {
    console.error('[CATALOG ROUTE ERROR] POST /products:', err)
    return res.status(500).json({ success: false, message: 'Failed to create product.' })
  }
})

/**
 * PUT /api/catalog/products/:id
 * Update an existing product.
 */
router.put('/products/:id', async (req, res) => {
  const parsed = productInputSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Invalid product update details.', errors: parsed.error.format() })
  }

  try {
    const tenant = await getOrCreateTenant(DEFAULT_EMAIL)
    const productRef = db.collection('products').doc(req.params.id)
    const productDoc = await productRef.get()

    if (!productDoc.exists) {
      return res.status(404).json({ success: false, message: 'Product not found.' })
    }

    const currentData = productDoc.data()
    if (currentData?.storeId !== tenant.store.id) {
      return res.status(403).json({ success: false, message: 'Access denied: Tenant catalog isolation violation.' })
    }

    const updatedProduct = {
      ...parsed.data,
      storeId: tenant.store.id,
      updatedAt: new Date().toISOString()
    }

    await productRef.update(updatedProduct)

    return res.json({ success: true, message: 'Product updated successfully.', product: { id: req.params.id, ...updatedProduct } })
  } catch (err: unknown) {
    console.error('[CATALOG ROUTE ERROR] PUT /products/:id:', err)
    return res.status(500).json({ success: false, message: 'Failed to update product.' })
  }
})

/**
 * DELETE /api/catalog/products/:id
 * Delete a product.
 */
router.delete('/products/:id', async (req, res) => {
  try {
    const tenant = await getOrCreateTenant(DEFAULT_EMAIL)
    const productRef = db.collection('products').doc(req.params.id)
    const productDoc = await productRef.get()

    if (!productDoc.exists) {
      return res.status(404).json({ success: false, message: 'Product not found.' })
    }

    const currentData = productDoc.data()
    if (currentData?.storeId !== tenant.store.id) {
      return res.status(403).json({ success: false, message: 'Access denied: Tenant catalog isolation violation.' })
    }

    await productRef.delete()

    return res.json({ success: true, message: 'Product removed from catalog.' })
  } catch (err: unknown) {
    console.error('[CATALOG ROUTE ERROR] DELETE /products/:id:', err)
    return res.status(500).json({ success: false, message: 'Failed to delete product.' })
  }
})

/**
 * GET /api/catalog/sync
 * Fetch current catalog synchronization details.
 */
router.get('/sync', async (req, res) => {
  try {
    const tenant = await getOrCreateTenant(DEFAULT_EMAIL)
    const storeDoc = await db.collection('stores').doc(tenant.store.id).get()
    const storeData = storeDoc.exists ? storeDoc.data() || {} : {}

    return res.json({
      success: true,
      catalogSource: storeData.catalogSource || 'manual',
      catalogSyncStatus: storeData.catalogSyncStatus || 'idle',
      catalogLastSyncedAt: storeData.catalogLastSyncedAt || null,
      catalogSyncError: storeData.catalogSyncError || null,
      feedUrl: storeData.feedUrl || ''
    })
  } catch (err: unknown) {
    console.error('[CATALOG ROUTE ERROR] GET /sync:', err)
    return res.status(500).json({ success: false, message: 'Failed to retrieve sync status.' })
  }
})

/**
 * POST /api/catalog/sync
 * Trigger automated catalog synchronization from selected platform source.
 */
router.post('/sync', async (req, res) => {
  const syncSchema = z.object({
    source: z.enum(['manual', 'woocommerce', 'api', 'feed', 'json']),
    feedUrl: z.string().optional().or(z.literal(''))
  })

  const parsed = syncSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Invalid sync payload.' })
  }

  try {
    const tenant = await getOrCreateTenant(DEFAULT_EMAIL)
    const storeRef = db.collection('stores').doc(tenant.store.id)

    // Set status to syncing immediately
    await storeRef.update({
      catalogSource: parsed.data.source,
      catalogSyncStatus: 'syncing',
      catalogSyncError: null,
      feedUrl: parsed.data.feedUrl || ''
    })

    // Perform background-like processing
    setTimeout(async () => {
      try {
        console.log(`[SYNC ENGINE] Synchronizing from source: ${parsed.data.source}`)
        
        let fetchedProducts: Record<string, unknown>[] = []
        
        if (parsed.data.source === 'woocommerce') {
          // Mock WooCommerce API fetch
          fetchedProducts = [
            {
              name: 'Woo Premium Leather Boot',
              description: 'Handcrafted classic leather boots designed for rugged comfort and timeless style.',
              imageUrl: 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?auto=format&fit=crop&w=900&q=80',
              productUrl: '/products/woo-leather-boot',
              category: 'Shoes',
              tags: ['leather', 'boots', 'comfort', 'woo'],
              price: 159,
              currency: 'USD',
              available: true,
              inventory: 15,
              variants: [
                { id: 'v1', name: 'Size 9', price: 159, currency: 'USD', available: true },
                { id: 'v2', name: 'Size 10', price: 159, currency: 'USD', available: true }
              ]
            },
            {
              name: 'Woo Trail Crewneck Sweater',
              description: 'Ultra-soft organic cotton heather sweater for warmth on the windy trails.',
              imageUrl: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=900&q=80',
              productUrl: '/products/woo-sweater',
              category: 'Clothing',
              tags: ['sweater', 'cotton', 'cozy', 'woo'],
              price: 65,
              currency: 'USD',
              available: true,
              inventory: 24,
              variants: []
            }
          ]
        } else if (parsed.data.source === 'api') {
          // Mock REST API payload mapper
          fetchedProducts = [
            {
              name: 'API Smart Wireless Charger',
              description: 'High-speed 15W Qi-certified magnetic wireless charging dock with metal stands.',
              imageUrl: 'https://images.unsplash.com/photo-1622445262465-2481c4574875?auto=format&fit=crop&w=900&q=80',
              productUrl: '/products/api-charger',
              category: 'Electronics',
              tags: ['charger', 'wireless', 'accessories', 'api'],
              price: 39,
              currency: 'USD',
              available: true,
              inventory: 50,
              variants: []
            }
          ]
        } else if (parsed.data.source === 'feed') {
          // Mock Product Feed (XML/CSV RSS) parser
          fetchedProducts = [
            {
              name: 'Feed Explorer Travel Pack',
              description: 'Water-resistant tactical adventure backpack with multi-layer compartments.',
              imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80',
              productUrl: '/products/feed-backpack',
              category: 'Accessories',
              tags: ['backpack', 'travel', 'waterproof', 'feed'],
              price: 110,
              currency: 'USD',
              available: true,
              inventory: 8,
              variants: []
            }
          ]
        } else if (parsed.data.source === 'json') {
          // Mock JSON raw feed fetcher
          fetchedProducts = [
            {
              name: 'JSON Curated Coffee Set',
              description: 'An elegant trio of whole-bean micro-lot single origin roasts from Rwanda.',
              imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=900&q=80',
              productUrl: '/products/json-coffee-trio',
              category: 'Food & Beverage',
              tags: ['coffee', ' Rwanda', 'whole-bean', 'curated'],
              price: 42,
              currency: 'USD',
              available: true,
              inventory: 30,
              variants: []
            }
          ]
        }

        if (parsed.data.source !== 'manual') {
          // Delete existing products for this store first to keep it fully updated
          const existingSnap = await db.collection('products').where('storeId', '==', tenant.store.id).get()
          const deletePromises = existingSnap.docs.map(doc => doc.ref.delete())
          await Promise.all(deletePromises)

          // Insert newly synced products with strict storeId scoping
          const batch = db.batch()
          fetchedProducts.forEach(prod => {
            const prodId = 'prod_' + crypto.randomBytes(6).toString('hex')
            const docRef = db.collection('products').doc(prodId)
            batch.set(docRef, {
              ...prod,
              id: prodId,
              storeId: tenant.store.id,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            })
          })
          await batch.commit()
        }

        // Set status to success
        await storeRef.update({
          catalogSyncStatus: 'success',
          catalogLastSyncedAt: new Date().toISOString()
        })
      } catch (err: unknown) {
        console.error('[SYNC ENGINE RUN ERROR]:', err)
        const errMsg = err instanceof Error ? err.message : 'Unknown synchronization error.'
        await storeRef.update({
          catalogSyncStatus: 'error',
          catalogSyncError: errMsg
        })
      }
    }, 1200)

    return res.json({ success: true, message: 'Catalog synchronization triggered successfully.' })
  } catch (err: unknown) {
    console.error('[CATALOG ROUTE ERROR] POST /sync:', err)
    return res.status(500).json({ success: false, message: 'Failed to trigger synchronization.' })
  }
})

export default router
