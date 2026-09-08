import { Router } from 'express'
import { z } from 'zod'
import { getOrCreateTenant } from '../services/db.js'
import { verifySupabaseToken } from '../services/supabase.js'
import {
  getTenantWebsites,
  getTenantWebsite,
  saveTenantWebsite,
  deleteTenantWebsite,
  getWebsiteKnowledge,
  addWebsiteKnowledge,
  deleteWebsiteKnowledge,
  normalizeWebsiteUrl
} from '../services/websites.js'
import { verifyWebsiteInstallation } from '../services/verification.js'
import { crawlAndIndexWebsite } from '../services/crawler.js'

const router = Router()
const DEFAULT_EMAIL = 'nobleroan474@gmail.com'

/**
 * Middleware / helper to resolve authenticated tenant context.
 */
async function resolveTenant(req: import('express').Request) {
  let email = DEFAULT_EMAIL
  const authHeader = req.headers.authorization
  if (authHeader) {
    const supabaseUser = await verifySupabaseToken(authHeader)
    if (supabaseUser && supabaseUser.email) {
      email = supabaseUser.email
    }
  }
  return await getOrCreateTenant(email)
}

/**
 * GET /api/websites
 * List all connected websites for the authenticated organization.
 */
router.get('/', async (req, res) => {
  try {
    const tenant = await resolveTenant(req)
    const websites = await getTenantWebsites(tenant.organization.id)
    return res.json({ success: true, websites })
  } catch (error: unknown) {
    console.error('[WEBSITES ROUTE] GET / error:', error)
    return res.status(500).json({ success: false, message: 'Failed to retrieve connected websites.' })
  }
})

/**
 * GET /api/websites/:id
 * Retrieve a single website connection by ID.
 */
router.get('/:id', async (req, res) => {
  try {
    const tenant = await resolveTenant(req)
    const website = await getTenantWebsite(req.params.id, tenant.organization.id)
    if (!website) {
      return res.status(404).json({ success: false, message: 'Website not found or access denied.' })
    }
    return res.json({ success: true, website })
  } catch (error: unknown) {
    console.error(`[WEBSITES ROUTE] GET /${req.params.id} error:`, error)
    return res.status(500).json({ success: false, message: 'Failed to retrieve website details.' })
  }
})

const websiteCreateSchema = z.object({
  url: z.string().min(1),
  name: z.string().optional(),
  instructions: z.string().optional(),
  personality: z.string().optional(),
  welcomeMessage: z.string().optional(),
  language: z.string().optional(),
  categories: z.array(z.string()).optional(),
  thingsToKnow: z.string().optional(),
  thingsNotToSay: z.string().optional(),
  crawlOnCreate: z.boolean().optional()
}).strict()

/**
 * POST /api/websites
 * Register and configure a new website connection.
 */
router.post('/', async (req, res) => {
  const parsed = websiteCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Invalid payload schema.', errors: parsed.error.format() })
  }

  try {
    const tenant = await resolveTenant(req)
    
    // Normalize URL & domain
    const { normalizedUrl, domain, name: suggestedName } = normalizeWebsiteUrl(parsed.data.url)
    
    const website = await saveTenantWebsite(tenant.organization.id, tenant.user.id, {
      url: normalizedUrl,
      domain,
      name: parsed.data.name?.trim() || suggestedName,
      instructions: parsed.data.instructions?.trim() || '',
      personality: parsed.data.personality || 'Warm & Professional',
      welcomeMessage: parsed.data.welcomeMessage || "Hi! I'm Rowan. How can I help you today?",
      language: parsed.data.language || 'en',
      categories: parsed.data.categories || ['General'],
      thingsToKnow: parsed.data.thingsToKnow || '',
      thingsNotToSay: parsed.data.thingsNotToSay || '',
      status: 'connected',
      verificationStatus: 'unverified'
    })

    // If initial crawl is requested, trigger asynchronously
    if (parsed.data.crawlOnCreate !== false) {
      crawlAndIndexWebsite(website).catch(err => {
        console.warn(`[CRAWL BACKGROUND ERROR] Site ${website.id}:`, err)
      })
    }

    return res.json({
      success: true,
      message: 'Website connected successfully. You can now install the Rowan widget.',
      website
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to connect website.'
    console.error('[WEBSITES ROUTE] POST / error:', msg)
    return res.status(400).json({ success: false, message: msg })
  }
})

const websiteUpdateSchema = z.object({
  name: z.string().optional(),
  instructions: z.string().optional(),
  personality: z.string().optional(),
  welcomeMessage: z.string().optional(),
  language: z.string().optional(),
  categories: z.array(z.string()).optional(),
  thingsToKnow: z.string().optional(),
  thingsNotToSay: z.string().optional(),
  status: z.enum(['connected', 'pending', 'disconnected']).optional()
}).strict()

/**
 * PUT /api/websites/:id
 * Update an existing website's configuration.
 */
router.put('/:id', async (req, res) => {
  const parsed = websiteUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Invalid payload schema.', errors: parsed.error.format() })
  }

  try {
    const tenant = await resolveTenant(req)
    const existing = await getTenantWebsite(req.params.id, tenant.organization.id)
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Website not found or access denied.' })
    }

    const updated = await saveTenantWebsite(tenant.organization.id, tenant.user.id, {
      id: req.params.id,
      ...parsed.data
    })

    return res.json({
      success: true,
      message: 'Website configuration updated successfully.',
      website: updated
    })
  } catch (error: unknown) {
    console.error(`[WEBSITES ROUTE] PUT /${req.params.id} error:`, error)
    return res.status(500).json({ success: false, message: 'Failed to update website configuration.' })
  }
})

/**
 * DELETE /api/websites/:id
 * Disconnect and remove a website.
 */
router.delete('/:id', async (req, res) => {
  try {
    const tenant = await resolveTenant(req)
    await deleteTenantWebsite(req.params.id, tenant.organization.id)
    return res.json({ success: true, message: 'Website disconnected and removed.' })
  } catch (error: unknown) {
    console.error(`[WEBSITES ROUTE] DELETE /${req.params.id} error:`, error)
    return res.status(500).json({ success: false, message: 'Failed to remove website.' })
  }
})

/**
 * POST /api/websites/:id/verify
 * Run real installation verification by fetching the website.
 */
router.post('/:id/verify', async (req, res) => {
  try {
    const tenant = await resolveTenant(req)
    const website = await getTenantWebsite(req.params.id, tenant.organization.id)
    if (!website) {
      return res.status(404).json({ success: false, message: 'Website not found or access denied.' })
    }

    const result = await verifyWebsiteInstallation(website)
    return res.json({ success: true, result })
  } catch (error: unknown) {
    console.error(`[WEBSITES ROUTE] POST /${req.params.id}/verify error:`, error)
    return res.status(500).json({ success: false, message: 'Verification process failed.' })
  }
})

/**
 * POST /api/websites/:id/crawl
 * Trigger a live crawl/re-index of the website.
 */
router.post('/:id/crawl', async (req, res) => {
  try {
    const tenant = await resolveTenant(req)
    const website = await getTenantWebsite(req.params.id, tenant.organization.id)
    if (!website) {
      return res.status(404).json({ success: false, message: 'Website not found or access denied.' })
    }

    const result = await crawlAndIndexWebsite(website)
    return res.json({ success: true, result })
  } catch (error: unknown) {
    console.error(`[WEBSITES ROUTE] POST /${req.params.id}/crawl error:`, error)
    return res.status(500).json({ success: false, message: 'Crawl process failed.' })
  }
})

/**
 * GET /api/websites/:id/knowledge
 * Retrieve knowledge documents for a website.
 */
router.get('/:id/knowledge', async (req, res) => {
  try {
    const tenant = await resolveTenant(req)
    const website = await getTenantWebsite(req.params.id, tenant.organization.id)
    if (!website) {
      return res.status(404).json({ success: false, message: 'Website not found.' })
    }

    const knowledge = await getWebsiteKnowledge(req.params.id, tenant.organization.id)
    return res.json({ success: true, knowledge })
  } catch (error: unknown) {
    console.error(`[WEBSITES ROUTE] GET /${req.params.id}/knowledge error:`, error)
    return res.status(500).json({ success: false, message: 'Failed to retrieve website knowledge.' })
  }
})

const addKnowledgeSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  url: z.string().optional()
}).strict()

/**
 * POST /api/websites/:id/knowledge
 * Manually add a knowledge document for a website.
 */
router.post('/:id/knowledge', async (req, res) => {
  const parsed = addKnowledgeSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Invalid knowledge document schema.' })
  }

  try {
    const tenant = await resolveTenant(req)
    const website = await getTenantWebsite(req.params.id, tenant.organization.id)
    if (!website) {
      return res.status(404).json({ success: false, message: 'Website not found.' })
    }

    const item = await addWebsiteKnowledge(req.params.id, tenant.organization.id, parsed.data)
    return res.json({ success: true, item, message: 'Knowledge document added to Rowan.' })
  } catch (error: unknown) {
    console.error(`[WEBSITES ROUTE] POST /${req.params.id}/knowledge error:`, error)
    return res.status(500).json({ success: false, message: 'Failed to add knowledge document.' })
  }
})

/**
 * DELETE /api/websites/:id/knowledge/:kId
 * Delete a specific knowledge document.
 */
router.delete('/:id/knowledge/:kId', async (req, res) => {
  try {
    const tenant = await resolveTenant(req)
    await deleteWebsiteKnowledge(req.params.id, req.params.kId, tenant.organization.id)
    return res.json({ success: true, message: 'Knowledge document removed.' })
  } catch (error: unknown) {
    console.error(`[WEBSITES ROUTE] DELETE /${req.params.id}/knowledge/${req.params.kId} error:`, error)
    return res.status(500).json({ success: false, message: 'Failed to delete knowledge document.' })
  }
})

export default router
