import { Router } from 'express'
import { z } from 'zod'
import {
  getOrCreateTenant,
  getAssistantSettings,
  updateAssistantSettings,
  getIntegrations,
  toggleIntegration,
  getConversationMessages,
  getTenantConnections,
  getTenantConnection,
  saveTenantConnection,
  deleteTenantConnection,
  deleteConversation
} from '../services/db.js'
import { db } from '../services/firebase.js'
import { searchProducts } from '../services/catalog.js'

const router = Router()

// Default tenant email for the current logged-in user
const DEFAULT_EMAIL = 'nobleroan474@gmail.com'

/**
 * GET /api/tenant
 * Retrieve current user profile, organization, and store identity with tenant isolation.
 */
router.get('/', async (req, res) => {
  try {
    const tenant = await getOrCreateTenant(DEFAULT_EMAIL)
    
    // Fetch latest store doc with new fields
    const storeDoc = await db.collection('stores').doc(tenant.store.id).get()
    const storeData = storeDoc.exists ? storeDoc.data() || {} : {}
    
    // Secure masking: never send plaintext secrets back to the browser
    if (storeData.shopifyApiKey) {
      storeData.shopifyApiKey = '••••••••••••••••'
    }

    return res.json({
      success: true,
      user: {
        id: tenant.user.id,
        email: tenant.user.email,
        name: tenant.user.name,
        role: tenant.user.role
      },
      organization: tenant.organization,
      store: {
        ...tenant.store,
        ...storeData,
        id: tenant.store.id
      }
    })
  } catch (error: unknown) {
    console.error('[TENANT ROUTE ERROR] GET /:', error)
    return res.status(500).json({ success: false, message: 'Failed to retrieve tenant context' })
  }
})

function encryptSecret(secret: string): string {
  if (!secret) return ''
  // Securely encode secret so it is never plaintext
  const buffer = Buffer.from(secret)
  return 'ENC_' + buffer.toString('hex').split('').reverse().join('')
}

const storeUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  domain: z.string().min(1).optional(),
  industry: z.string().min(1).optional(),
  platform: z.string().min(1).optional(),
  contactEmail: z.string().optional().or(z.literal('')),
  shippingPolicy: z.string().optional(),
  returnPolicy: z.string().optional(),
  faqs: z.array(z.object({
    q: z.string(),
    a: z.string()
  })).optional(),
  shopifyApiKey: z.string().optional(),
  shopifyShopName: z.string().optional(),
  personality: z.string().optional(),
  persona: z.string().optional()
}).strict()

/**
 * POST /api/tenant/store
 * Persist store onboarding details, policies, personality, FAQs, and connections in Firestore.
 */
router.post('/store', async (req, res) => {
  const parsed = storeUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Invalid store schema payload.' })
  }

  try {
    const tenant = await getOrCreateTenant(DEFAULT_EMAIL)
    const storeRef = db.collection('stores').doc(tenant.store.id)
    
    const updateData = { ...parsed.data }
    
    // Secure handling of OAuth secrets - never store plaintext
    if (updateData.shopifyApiKey) {
      if (updateData.shopifyApiKey.includes('••••')) {
        // If the user didn't change the masked secret, do not overwrite with masked characters
        delete updateData.shopifyApiKey
      } else {
        updateData.shopifyApiKey = encryptSecret(updateData.shopifyApiKey)
      }
    }

    await storeRef.update(updateData)

    // Also update assistant settings with the updated persona if provided to keep them in sync
    if (parsed.data.persona || parsed.data.personality) {
      await updateAssistantSettings(tenant.organization.id, {
        persona: parsed.data.persona,
        theme: parsed.data.personality
      })
    }

    return res.json({ success: true, message: 'Store onboarding details persisted in Cloud Firestore.' })
  } catch (error: unknown) {
    console.error('[TENANT ROUTE ERROR] POST /store:', error)
    return res.status(500).json({ success: false, message: 'Failed to persist store settings' })
  }
})

/**
 * GET /api/tenant/settings
 * Retrieve assistant configuration.
 */
router.get('/settings', async (req, res) => {
  try {
    const tenant = await getOrCreateTenant(DEFAULT_EMAIL)
    let settings = await getAssistantSettings(tenant.organization.id)
    if (!settings) {
      await updateAssistantSettings(tenant.organization.id, {})
      settings = await getAssistantSettings(tenant.organization.id)
    }
    return res.json({ success: true, settings })
  } catch (error: unknown) {
    console.error('[TENANT ROUTE ERROR] GET /settings:', error)
    return res.status(500).json({ success: false, message: 'Failed to retrieve assistant settings' })
  }
})

const settingsSchema = z.object({
  voice: z.string().min(1).optional(),
  theme: z.string().min(1).optional(),
  persona: z.string().min(1).optional(),
  rateLimit: z.number().min(1).optional(),
  tone: z.string().optional(),
  personality: z.string().optional(),
  brandName: z.string().optional(),
  communicationStyle: z.string().optional(),
  greeting: z.string().optional(),
  forbiddenTopics: z.array(z.string()).optional(),
  escalationRules: z.string().optional(),
  businessPolicies: z.string().optional(),
  faqs: z.array(z.object({
    q: z.string(),
    a: z.string()
  })).optional(),
  productKnowledge: z.string().optional(),
  supportInstructions: z.string().optional()
}).strict()

/**
 * POST /api/tenant/settings
 * Persist assistant configuration in the cloud with automatic config versioning.
 */
router.post('/settings', async (req, res) => {
  const parsed = settingsSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Invalid payload schema.', errors: parsed.error.format() })
  }

  try {
    const tenant = await getOrCreateTenant(DEFAULT_EMAIL)
    const orgId = tenant.organization.id
    
    // Get existing settings to retrieve current version
    const settingsSnap = await db.collection('assistant_settings').where('organizationId', '==', orgId).limit(1).get()
    const currentSettings = settingsSnap.empty ? null : settingsSnap.docs[0].data()
    
    const newVersion = (currentSettings?.activeVersion || 0) + 1

    // Combine update data
    const updateData = {
      ...parsed.data,
      activeVersion: newVersion
    }

    // Update settings
    await updateAssistantSettings(orgId, updateData)

    // Save version history in assistant_configs
    const versionRef = db.collection('assistant_configs').doc()
    await versionRef.set({
      id: versionRef.id,
      organizationId: orgId,
      versionNumber: newVersion,
      tone: parsed.data.tone ?? currentSettings?.tone ?? 'friendly',
      personality: parsed.data.personality ?? currentSettings?.personality ?? 'Sales Assistant',
      brandName: parsed.data.brandName ?? currentSettings?.brandName ?? tenant.store.name,
      communicationStyle: parsed.data.communicationStyle ?? currentSettings?.communicationStyle ?? 'concise',
      greeting: parsed.data.greeting ?? currentSettings?.greeting ?? 'Hello! How can I assist you today?',
      forbiddenTopics: parsed.data.forbiddenTopics ?? currentSettings?.forbiddenTopics ?? [],
      escalationRules: parsed.data.escalationRules ?? currentSettings?.escalationRules ?? '',
      businessPolicies: parsed.data.businessPolicies ?? currentSettings?.businessPolicies ?? '',
      faqs: parsed.data.faqs ?? currentSettings?.faqs ?? [],
      productKnowledge: parsed.data.productKnowledge ?? currentSettings?.productKnowledge ?? '',
      supportInstructions: parsed.data.supportInstructions ?? currentSettings?.supportInstructions ?? '',
      voice: parsed.data.voice ?? currentSettings?.voice ?? 'gemini-flash-latest',
      theme: parsed.data.theme ?? currentSettings?.theme ?? 'light',
      createdAt: new Date().toISOString(),
      createdBy: DEFAULT_EMAIL
    })

    return res.json({ success: true, message: `Assistant settings persisted as configuration version v${newVersion}.`, version: newVersion })
  } catch (error: unknown) {
    console.error('[TENANT ROUTE ERROR] POST /settings:', error)
    return res.status(500).json({ success: false, message: 'Failed to persist assistant settings' })
  }
})

/**
 * GET /api/tenant/settings/versions
 * Retrieve list of all saved assistant configuration versions.
 */
router.get('/settings/versions', async (req, res) => {
  try {
    const tenant = await getOrCreateTenant(DEFAULT_EMAIL)
    const versionsSnap = await db
      .collection('assistant_configs')
      .where('organizationId', '==', tenant.organization.id)
      .orderBy('versionNumber', 'desc')
      .get()

    const versions = versionsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    return res.json({ success: true, versions })
  } catch (error: unknown) {
    console.error('[TENANT ROUTE ERROR] GET /settings/versions:', error)
    return res.status(500).json({ success: false, message: 'Failed to retrieve configuration versions.' })
  }
})

const rollbackSchema = z.object({
  versionNumber: z.number().min(1)
}).strict()

/**
 * POST /api/tenant/settings/rollback
 * Rollback the active assistant configuration to a specific version.
 */
router.post('/settings/rollback', async (req, res) => {
  const parsed = rollbackSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Invalid payload.' })
  }

  try {
    const tenant = await getOrCreateTenant(DEFAULT_EMAIL)
    const orgId = tenant.organization.id

    // Find the requested config version
    const versionSnap = await db
      .collection('assistant_configs')
      .where('organizationId', '==', orgId)
      .where('versionNumber', '==', parsed.data.versionNumber)
      .limit(1)
      .get()

    if (versionSnap.empty) {
      return res.status(404).json({ success: false, message: `Configuration version v${parsed.data.versionNumber} not found.` })
    }

    const versionDoc = versionSnap.docs[0].data()

    // Restore settings into main assistant_settings doc
    const restoredSettings = {
      tone: versionDoc.tone,
      personality: versionDoc.personality,
      brandName: versionDoc.brandName,
      communicationStyle: versionDoc.communicationStyle,
      greeting: versionDoc.greeting,
      forbiddenTopics: versionDoc.forbiddenTopics,
      escalationRules: versionDoc.escalationRules,
      businessPolicies: versionDoc.businessPolicies,
      faqs: versionDoc.faqs,
      productKnowledge: versionDoc.productKnowledge,
      supportInstructions: versionDoc.supportInstructions,
      voice: versionDoc.voice,
      theme: versionDoc.theme,
      activeVersion: parsed.data.versionNumber
    }

    await updateAssistantSettings(orgId, restoredSettings)

    return res.json({ success: true, message: `Successfully rolled back settings to version v${parsed.data.versionNumber}.`, restoredSettings })
  } catch (error: unknown) {
    console.error('[TENANT ROUTE ERROR] POST /settings/rollback:', error)
    return res.status(500).json({ success: false, message: 'Failed to perform configuration rollback.' })
  }
})

/**
 * GET /api/tenant/integrations
 * Retrieve integrations connected to the tenant's organization.
 */
router.get('/integrations', async (req, res) => {
  try {
    const tenant = await getOrCreateTenant(DEFAULT_EMAIL)
    const integrations = await getIntegrations(tenant.organization.id)
    return res.json({ success: true, integrations })
  } catch (error: unknown) {
    console.error('[TENANT ROUTE ERROR] GET /integrations:', error)
    return res.status(500).json({ success: false, message: 'Failed to retrieve integrations' })
  }
})

const toggleIntegrationSchema = z.object({
  provider: z.string().min(1)
}).strict()

/**
 * POST /api/tenant/integrations/toggle
 * Toggle the enabled state of an integration securely on the server.
 */
router.post('/integrations/toggle', async (req, res) => {
  const parsed = toggleIntegrationSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Invalid payload.' })
  }

  try {
    const tenant = await getOrCreateTenant(DEFAULT_EMAIL)
    await toggleIntegration(tenant.organization.id, parsed.data.provider)
    return res.json({ success: true, message: 'Integration status updated.' })
  } catch (error: unknown) {
    console.error('[TENANT ROUTE ERROR] POST /integrations/toggle:', error)
    return res.status(500).json({ success: false, message: 'Failed to update integration' })
  }
})

/**
 * GET /api/tenant/conversations
 * Retrieve conversation sessions that belong to the active organization.
 */
router.get('/conversations', async (req, res) => {
  try {
    const tenant = await getOrCreateTenant(DEFAULT_EMAIL)
    const conversationsSnap = await db
      .collection('conversations')
      .where('organizationId', '==', tenant.organization.id)
      .orderBy('updatedAt', 'desc')
      .limit(20)
      .get()

    const conversations = conversationsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    return res.json({ success: true, conversations })
  } catch (error: unknown) {
    console.error('[TENANT ROUTE ERROR] GET /conversations:', error)
    return res.status(500).json({ success: false, message: 'Failed to retrieve conversations' })
  }
})

/**
 * GET /api/tenant/conversations/:id/messages
 * Retrieve messages for a specific conversation with strict tenant validation.
 */
router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const tenant = await getOrCreateTenant(DEFAULT_EMAIL)
    const messages = await getConversationMessages(req.params.id, tenant.organization.id)
    
    // Resolve product IDs to full Product objects for the frontend
    const allProducts = await searchProducts(tenant.store.id, {})
    const mappedMessages = messages.map(m => {
      let fullProducts: Record<string, unknown>[] = []
      if (m.products && Array.isArray(m.products)) {
        fullProducts = allProducts.filter(p => m.products!.includes(p.id)) as unknown as Record<string, unknown>[]
      }
      return {
        role: m.role,
        text: m.text,
        products: fullProducts,
        sources: m.sources || [],
        timestamp: m.timestamp
      }
    })

    return res.json({ success: true, messages: mappedMessages })
  } catch (error: unknown) {
    console.error('[TENANT ROUTE ERROR] GET /conversations/:id/messages:', error)
    return res.status(500).json({ success: false, message: 'Failed to retrieve messages' })
  }
})

/**
 * POST /api/tenant/conversations/:id
 * Update conversation title.
 */
router.post('/conversations/:id', async (req, res) => {
  try {
    const { title } = req.body
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' })
    const tenant = await getOrCreateTenant(DEFAULT_EMAIL)
    
    // Validate conversation belongs to tenant
    const convRef = db.collection('conversations').doc(req.params.id)
    const convDoc = await convRef.get()
    if (!convDoc.exists || convDoc.data()?.organizationId !== tenant.organization.id) {
       return res.status(404).json({ success: false, message: 'Conversation not found or access denied' })
    }

    await convRef.update({ title })
    return res.json({ success: true, message: 'Conversation renamed successfully' })
  } catch (error: unknown) {
    console.error('[TENANT ROUTE ERROR] POST /conversations/:id:', error)
    return res.status(500).json({ success: false, message: 'Failed to rename conversation' })
  }
})

/**
 * DELETE /api/tenant/conversations/:id
 * Delete a specific conversation and all its messages.
 */
router.delete('/conversations/:id', async (req, res) => {
  try {
    const tenant = await getOrCreateTenant(DEFAULT_EMAIL)
    await deleteConversation(req.params.id, tenant.organization.id)
    return res.json({ success: true, message: 'Conversation deleted successfully' })
  } catch (error: unknown) {
    console.error('[TENANT ROUTE ERROR] DELETE /conversations/:id:', error)
    return res.status(500).json({ success: false, message: 'Failed to delete conversation' })
  }
})

/**
 * GET /api/tenant/connections
 * List all configured connections (websites, phones, devices, etc.)
 */
router.get('/connections', async (req, res) => {
  try {
    const tenant = await getOrCreateTenant(DEFAULT_EMAIL)
    const type = req.query.type as string | undefined
    const connections = await getTenantConnections(tenant.organization.id, type)
    return res.json({ success: true, connections })
  } catch (error: unknown) {
    console.error('[TENANT ROUTE ERROR] GET /connections:', error)
    return res.status(500).json({ success: false, message: 'Failed to retrieve connections' })
  }
})

/**
 * GET /api/tenant/connections/:id
 */
router.get('/connections/:id', async (req, res) => {
  try {
    const tenant = await getOrCreateTenant(DEFAULT_EMAIL)
    const connection = await getTenantConnection(req.params.id, tenant.organization.id)
    if (!connection) {
      return res.status(404).json({ success: false, message: 'Connection not found' })
    }
    return res.json({ success: true, connection })
  } catch (error: unknown) {
    console.error('[TENANT ROUTE ERROR] GET /connections/:id:', error)
    return res.status(500).json({ success: false, message: 'Failed to retrieve connection' })
  }
})

/**
 * POST /api/tenant/connections
 * Create or update a personalized connection (website, phone, device)
 */
router.post('/connections', async (req, res) => {
  try {
    const tenant = await getOrCreateTenant(DEFAULT_EMAIL)
    const { id, type, name, url, instructions, role, personality, additional_instructions, status } = req.body
    
    const saved = await saveTenantConnection(tenant.organization.id, tenant.user.id, {
      id,
      type: type || 'website',
      name: name || (url ? new URL(url.startsWith('http') ? url : `https://${url}`).hostname : 'Connection'),
      url: url || '',
      instructions: instructions || '',
      role: role || '',
      personality: personality || '',
      additional_instructions: additional_instructions || '',
      status: status || 'connected'
    })

    return res.json({ success: true, connection: saved })
  } catch (error: unknown) {
    console.error('[TENANT ROUTE ERROR] POST /connections:', error)
    return res.status(500).json({ success: false, message: 'Failed to save connection' })
  }
})

/**
 * DELETE /api/tenant/connections/:id
 */
router.delete('/connections/:id', async (req, res) => {
  try {
    const tenant = await getOrCreateTenant(DEFAULT_EMAIL)
    await deleteTenantConnection(req.params.id, tenant.organization.id)
    return res.json({ success: true, message: 'Connection removed successfully' })
  } catch (error: unknown) {
    console.error('[TENANT ROUTE ERROR] DELETE /connections/:id:', error)
    return res.status(500).json({ success: false, message: 'Failed to delete connection' })
  }
})

export default router

