import { Router } from 'express'
import { z } from 'zod'
import { getOrCreateTenant } from '../services/db.js'
import { getProduct, searchProducts } from '../services/catalog.js'

const router = Router()
const DEFAULT_EMAIL = 'nobleroan474@gmail.com'

const filtersSchema = z.object({
  search: z.string().max(200).optional(),
  category: z.string().max(80).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  available: z.enum(['true', 'false']).optional(),
  tags: z.string().optional()
})

router.get('/', async (req, res) => {
  const parsed = filtersSchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Invalid product filters.' })
  }

  const f = parsed.data
  if (f.minPrice !== undefined && f.maxPrice !== undefined && f.minPrice > f.maxPrice) {
    return res.status(400).json({ success: false, message: 'Invalid price range.' })
  }

  try {
    const tenant = await getOrCreateTenant(DEFAULT_EMAIL)
    const products = await searchProducts(tenant.store.id, {
      ...f,
      available: f.available === undefined ? undefined : f.available === 'true',
      tags: f.tags?.split(',').map(x => x.trim()).filter(Boolean)
    })

    return res.json({ success: true, products })
  } catch (error) {
    console.error('Failed to search products:', error)
    return res.status(500).json({ success: false, message: 'Internal server error.' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const tenant = await getOrCreateTenant(DEFAULT_EMAIL)
    const product = await getProduct(tenant.store.id, req.params.id)
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' })
    }
    return res.json({ success: true, product })
  } catch (error) {
    console.error('Failed to get product:', error)
    return res.status(500).json({ success: false, message: 'Internal server error.' })
  }
})

export default router
