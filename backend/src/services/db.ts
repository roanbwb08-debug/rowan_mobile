import { db } from './firebase.js'

export { db }

export interface OrganizationDoc {
  id: string
  name: string
  createdAt: string
}

export interface UserDoc {
  id: string
  email: string
  organizationId: string
  role: string
  name: string
  createdAt: string
}

export interface StoreDoc {
  id: string
  organizationId: string
  name: string
  domain: string
  industry: string
  knowledge: string
  createdAt: string
}

export interface AssistantSettingsDoc {
  id: string
  organizationId: string
  voice: string
  theme: string
  persona: string
  rateLimit: number
  createdAt: string
  
  // Brand Personalization Fields (Phase 14)
  tone?: string
  personality?: string
  brandName?: string
  communicationStyle?: string
  greeting?: string
  forbiddenTopics?: string[]
  escalationRules?: string
  businessPolicies?: string
  faqs?: Array<{ q: string; a: string }>
  productKnowledge?: string
  supportInstructions?: string
  
  // Versioning
  activeVersion?: number
}

export interface AssistantConfigVersionDoc {
  id: string
  organizationId: string
  versionNumber: number
  tone: string
  personality: string
  brandName: string
  communicationStyle: string
  greeting: string
  forbiddenTopics: string[]
  escalationRules: string
  businessPolicies: string
  faqs: Array<{ q: string; a: string }>
  productKnowledge: string
  supportInstructions: string
  voice: string
  theme: string
  createdAt: string
  createdBy: string
}

export interface IntegrationDoc {
  id: string
  organizationId: string
  provider: string
  config: Record<string, unknown>
  enabled: boolean
  createdAt: string
}

export interface ConversationDoc {
  id: string
  userId: string
  organizationId: string
  storeId: string
  title: string
  createdAt: string
  updatedAt: string
}

export interface MusicProjectDoc {
  id: string
  organizationId: string
  title: string
  status: 'QUEUED' | 'ANALYZING' | 'PROCESSING' | 'MIXING' | 'MASTERING' | 'QUALITY_CHECK' | 'RENDERING' | 'COMPLETED' | 'FAILED'
  createdAt: string
  updatedAt: string
  assets: {
    vocalId?: string
    instrumentalId?: string
    finalMasterId?: string
  }
  mixSettings: Record<string, unknown>
  masterSettings: Record<string, unknown>
}

export interface MusicAssetDoc {
  id: string
  projectId: string
  filePath: string
  type: 'VOCAL' | 'INSTRUMENTAL' | 'STEM' | 'FINAL_MASTER'
  analysisData: Record<string, unknown>
  createdAt: string
}

export interface MessageDoc {
  id: string
  conversationId: string
  organizationId: string
  role: 'user' | 'assistant' | 'system'
  text: string
  products?: string[]
  sources?: Array<{
    title: string
    url: string
    snippet?: string
    publicationDate?: string
    sourceDomain?: string
  }>
  timestamp: string
}

export interface ConnectionDoc {
  id: string
  userId: string
  organizationId: string
  type: 'website' | 'phone' | 'device' | 'app' | 'trading'
  name: string
  url?: string
  instructions?: string
  role?: string
  personality?: string
  additional_instructions?: string
  status: string
  createdAt: string
  updatedAt: string
}

// Global cached context to minimize database lookups
const sessionTenantCache = new Map<string, {
  user: UserDoc
  organization: OrganizationDoc
  store: StoreDoc
  conversation: ConversationDoc
}>()

/**
 * Perform a transaction-like setup of the default tenant (user, organization, store, settings)
 * for the given email to make sure rows always exist.
 */
export async function getOrCreateTenant(email: string = 'nobleroan474@gmail.com'): Promise<{
  user: UserDoc
  organization: OrganizationDoc
  store: StoreDoc
}> {
  const usersRef = db.collection('users')
  const userSnap = await usersRef.where('email', '==', email).limit(1).get()

  if (!userSnap.empty) {
    const userDoc = userSnap.docs[0]
    const userData = userDoc.data() as UserDoc
    userData.id = userDoc.id

    // Fetch Organization
    const orgDoc = await db.collection('organizations').doc(userData.organizationId).get()
    const orgData = orgDoc.data() as OrganizationDoc
    orgData.id = orgDoc.id

    // Fetch Store
    const storesSnap = await db.collection('stores').where('organizationId', '==', orgData.id).limit(1).get()
    let storeData: StoreDoc
    if (!storesSnap.empty) {
      const sDoc = storesSnap.docs[0]
      storeData = sDoc.data() as StoreDoc
      storeData.id = sDoc.id
    } else {
      const newStoreRef = db.collection('stores').doc()
      storeData = {
        id: newStoreRef.id,
        organizationId: orgData.id,
        name: 'Personal Workspace',
        domain: 'workspace.local',
        industry: 'general',
        knowledge: '',
        createdAt: new Date().toISOString()
      }
      await newStoreRef.set(storeData)
    }

    return { user: userData, organization: orgData, store: storeData }
  }

  // Create organization
  const orgRef = db.collection('organizations').doc()
  const organization: OrganizationDoc = {
    id: orgRef.id,
    name: 'Rowan AI Workspace',
    createdAt: new Date().toISOString()
  }
  await orgRef.set(organization)

  // Create user
  const userRef = db.collection('users').doc()
  const user: UserDoc = {
    id: userRef.id,
    email,
    organizationId: organization.id,
    role: 'administrator',
    name: 'Rowan User',
    createdAt: new Date().toISOString()
  }
  await userRef.set(user)

  // Create default store / connection baseline
  const storeRef = db.collection('stores').doc()
  const store: StoreDoc = {
    id: storeRef.id,
    organizationId: organization.id,
    name: 'Personal Workspace',
    domain: 'workspace.local',
    industry: 'general',
    knowledge: '',
    createdAt: new Date().toISOString()
  }
  await storeRef.set(store)

  // Create default assistant settings
  const settingsRef = db.collection('assistant_settings').doc()
  const settings: AssistantSettingsDoc = {
    id: settingsRef.id,
    organizationId: organization.id,
    voice: 'natural-male',
    theme: 'light',
    persona: 'Universal Personal AI Assistant',
    rateLimit: 60,
    createdAt: new Date().toISOString()
  }
  await settingsRef.set(settings)

  // Create default integrations
  const integrations = [
    { provider: 'shopify', enabled: true, name: 'Shopify Store Connection' },
    { provider: 'twilio', enabled: true, name: 'Twilio SMS Webhooks' },
    { provider: 'github', enabled: true, name: 'GitHub Integration' },
    { provider: 'woocommerce', enabled: false, name: 'WooCommerce API Connector' }
  ]
  for (const item of integrations) {
    const intRef = db.collection('integrations').doc()
    await intRef.set({
      id: intRef.id,
      organizationId: organization.id,
      provider: item.provider,
      config: { name: item.name },
      enabled: item.enabled,
      createdAt: new Date().toISOString()
    })
  }

  return { user, organization, store }
}

/**
 * Resolves or establishes tenant context for an active chat session with strict isolation.
 */
export async function getOrCreateSessionContext(
  sessionId: string,
  userEmail: string = 'nobleroan474@gmail.com'
): Promise<{
  user: UserDoc
  organization: OrganizationDoc
  store: StoreDoc
  conversation: ConversationDoc
}> {
  const cached = sessionTenantCache.get(sessionId)
  if (cached) {
    return cached
  }

  const { user, organization, store } = await getOrCreateTenant(userEmail)

  // Resolve or create Conversation linked to this sessionId
  const convRef = db.collection('conversations').doc(sessionId)
  const convSnap = await convRef.get()

  let conversation: ConversationDoc
  if (convSnap.exists) {
    conversation = convSnap.data() as ConversationDoc
    conversation.id = convSnap.id
    
    // Strict Tenant Isolation Guard
    if (conversation.organizationId !== organization.id) {
      throw new Error(`Access Denied: Conversation does not belong to authorized organization.`)
    }
  } else {
    conversation = {
      id: sessionId,
      userId: user.id,
      organizationId: organization.id,
      storeId: store.id,
      title: 'Store Assistant Chat',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    await convRef.set(conversation)
  }

  const result = { user, organization, store, conversation }
  sessionTenantCache.set(sessionId, result)
  return result
}

/**
 * Retrieve messages for a given conversation with strict isolation check.
 */
export async function getConversationMessages(
  conversationId: string,
  organizationId: string,
  limit: number = 30
): Promise<MessageDoc[]> {
  // Verify conversation belongs to tenant
  const convDoc = await db.collection('conversations').doc(conversationId).get()
  if (!convDoc.exists) {
    return []
  }
  const convData = convDoc.data() as ConversationDoc
  if (convData.organizationId !== organizationId) {
    throw new Error('Access Denied: Tenant isolation violation during message fetch')
  }

  // Fetch messages sorted by timestamp
  const messagesSnap = await db
    .collection('conversations')
    .doc(conversationId)
    .collection('messages')
    .orderBy('timestamp', 'asc')
    .limit(limit)
    .get()

  return messagesSnap.docs.map(doc => {
    const data = doc.data() as MessageDoc
    data.id = doc.id
    return data
  })
}

/**
 * Append a message to a conversation under strict tenant validation.
 */
export async function appendConversationMessage(
  conversationId: string,
  organizationId: string,
  role: 'user' | 'assistant' | 'system',
  text: string,
  products?: string[],
  sources?: Array<{
    title: string
    url: string
    snippet?: string
    publicationDate?: string
    sourceDomain?: string
  }>
): Promise<MessageDoc> {
  // Verify conversation belongs to tenant
  const convDoc = await db.collection('conversations').doc(conversationId).get()
  if (!convDoc.exists) {
    throw new Error('Conversation does not exist')
  }
  const convData = convDoc.data() as ConversationDoc
  if (convData.organizationId !== organizationId) {
    throw new Error('Access Denied: Tenant isolation violation during message save')
  }

  const msgRef = db.collection('conversations').doc(conversationId).collection('messages').doc()
  const message: MessageDoc = {
    id: msgRef.id,
    conversationId,
    organizationId,
    role,
    text,
    timestamp: new Date().toISOString()
  }
  
  if (products !== undefined) {
    message.products = products
  }
  
  if (sources !== undefined) {
    message.sources = JSON.parse(JSON.stringify(sources))
  }

  await msgRef.set(message)

  // Update conversation updatedAt timestamp
  await db.collection('conversations').doc(conversationId).update({
    updatedAt: new Date().toISOString()
  })

  return message
}

/**
 * Get or update assistant settings for an organization
 */
export async function getAssistantSettings(organizationId: string): Promise<AssistantSettingsDoc | null> {
  const snap = await db.collection('assistant_settings').where('organizationId', '==', organizationId).limit(1).get()
  if (snap.empty) return null
  const doc = snap.docs[0]
  const data = doc.data() as AssistantSettingsDoc
  data.id = doc.id
  return data
}

export async function updateAssistantSettings(
  organizationId: string,
  settings: Partial<Omit<AssistantSettingsDoc, 'id' | 'organizationId' | 'createdAt'>>
): Promise<void> {
  const snap = await db.collection('assistant_settings').where('organizationId', '==', organizationId).limit(1).get()
  if (snap.empty) {
    const newRef = db.collection('assistant_settings').doc()
    await newRef.set({
      id: newRef.id,
      organizationId,
      voice: 'natural-male',
      theme: 'light',
      persona: 'Universal Personal AI Assistant',
      rateLimit: 60,
      createdAt: new Date().toISOString(),
      ...settings
    })
  } else {
    await snap.docs[0].ref.update(settings)
  }
}

/**
 * Get or update integrations for an organization
 */
export async function getIntegrations(organizationId: string): Promise<IntegrationDoc[]> {
  const snap = await db.collection('integrations').where('organizationId', '==', organizationId).get()
  return snap.docs.map(doc => {
    const data = doc.data() as IntegrationDoc
    data.id = doc.id
    return data
  })
}

export async function toggleIntegration(organizationId: string, provider: string): Promise<void> {
  const snap = await db
    .collection('integrations')
    .where('organizationId', '==', organizationId)
    .where('provider', '==', provider)
    .limit(1)
    .get()

  if (!snap.empty) {
    const doc = snap.docs[0]
    const currentStatus = doc.data().enabled
    await doc.ref.update({ enabled: !currentStatus })
  }
}

/**
 * Connection-specific personalization CRUD (Websites, Phones, Devices, Apps)
 */
export async function getTenantConnections(organizationId: string, type?: string): Promise<ConnectionDoc[]> {
  let query = db.collection('connections').where('organizationId', '==', organizationId)
  if (type) {
    query = query.where('type', '==', type)
  }
  const snap = await query.get()
  return snap.docs.map(doc => {
    const data = doc.data() as ConnectionDoc
    data.id = doc.id
    return data
  })
}

export async function getTenantConnection(id: string, organizationId: string): Promise<ConnectionDoc | null> {
  const doc = await db.collection('connections').doc(id).get()
  if (!doc.exists) return null
  const data = doc.data() as ConnectionDoc
  if (data.organizationId !== organizationId) return null
  data.id = doc.id
  return data
}

export async function saveTenantConnection(
  organizationId: string,
  userId: string,
  data: Partial<ConnectionDoc>
): Promise<ConnectionDoc> {
  const id = data.id || db.collection('connections').doc().id
  const now = new Date().toISOString()
  const record: ConnectionDoc = {
    id,
    userId,
    organizationId,
    type: data.type || 'website',
    name: data.name || 'Website Connection',
    url: data.url || '',
    instructions: data.instructions || '',
    role: data.role || '',
    personality: data.personality || '',
    additional_instructions: data.additional_instructions || '',
    status: data.status || 'connected',
    createdAt: data.createdAt || now,
    updatedAt: now
  }

  await db.collection('connections').doc(id).set(record, { merge: true })
  return record
}

export async function deleteTenantConnection(id: string, organizationId: string): Promise<void> {
  const doc = await db.collection('connections').doc(id).get()
  if (!doc.exists) return
  const data = doc.data() as ConnectionDoc
  if (data.organizationId !== organizationId) {
    throw new Error('Access Denied: Connection does not belong to authorized organization.')
  }
  await db.collection('connections').doc(id).delete()
}

export async function createMusicProject(organizationId: string, title: string): Promise<MusicProjectDoc> {
  const projectId = db.collection('musicProjects').doc().id
  const now = new Date().toISOString()
  const project: MusicProjectDoc = {
    id: projectId,
    organizationId,
    title,
    status: 'QUEUED',
    createdAt: now,
    updatedAt: now,
    assets: {},
    mixSettings: {},
    masterSettings: {}
  }
  await db.collection('musicProjects').doc(projectId).set(project)
  return project
}

export async function addMusicAsset(
  projectId: string,
  filePath: string,
  type: 'VOCAL' | 'INSTRUMENTAL' | 'STEM' | 'FINAL_MASTER'
): Promise<MusicAssetDoc> {
  const assetId = db.collection('musicAssets').doc().id
  const now = new Date().toISOString()
  const asset: MusicAssetDoc = {
    id: assetId,
    projectId,
    filePath,
    type,
    analysisData: {},
    createdAt: now
  }
  await db.collection('musicAssets').doc(assetId).set(asset)
  
  // Update project asset references
  const projectRef = db.collection('musicProjects').doc(projectId)
  const projectDoc = await projectRef.get()
  const projectData = projectDoc.data() as MusicProjectDoc
  
  const updatedAssets = { ...projectData.assets }
  if (type === 'VOCAL') updatedAssets.vocalId = assetId
  if (type === 'INSTRUMENTAL') updatedAssets.instrumentalId = assetId
  if (type === 'FINAL_MASTER') updatedAssets.finalMasterId = assetId
  
  await projectRef.update({ assets: updatedAssets, updatedAt: now })
  
  return asset
}

export async function deleteConversation(id: string, organizationId: string): Promise<void> {
  const convRef = db.collection('conversations').doc(id)
  const doc = await convRef.get()
  if (!doc.exists) return
  const data = doc.data() as ConversationDoc
  if (data.organizationId !== organizationId) {
    throw new Error('Access Denied: Conversation does not belong to authorized organization.')
  }
  // Delete all messages subcollection
  const messagesSnap = await convRef.collection('messages').get()
  console.log(`[DELETE CONVERSATION] Found ${messagesSnap.docs.length} messages to delete.`)
  for (const msg of messagesSnap.docs) {
    if (msg.ref && typeof msg.ref.delete === 'function') {
        await msg.ref.delete()
    } else {
        console.error(`[DELETE CONVERSATION] Document ${msg.id} has no valid ref.delete() method.`)
        if (msg.ref) {
            await msg.ref.delete()
        }
    }
  }
  // Delete the conversation document
  console.log(`[DELETE CONVERSATION] Deleting conversation document ${id}.`)
  if (!convRef) {
      throw new Error(`[DELETE CONVERSATION] convRef is undefined.`)
  }
  await convRef.delete()
}

// ---------------------------------------------------------------------------
// Canonical Rowan Phone & Device Pairing Data Models (Firestore-backed)
// ---------------------------------------------------------------------------

export interface PairingSessionDoc {
  id: string
  userId: string
  organizationId: string
  codeHash: string // SHA-256 of 6-character alphanumeric pairing code
  status: 'PENDING' | 'SCANNED' | 'CONFIRMING' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED'
  instructions?: string
  requestedCapabilities: string[]
  expiresAt: string // ISO string (strictly 5 minutes from generation)
  createdAt: string
  updatedAt: string
  environment: 'production' | 'development'
  scannedAt?: string
  confirmedAt?: string
  completedAt?: string
  deviceId?: string
}

export interface RowanDeviceDoc {
  id: string
  userId: string
  organizationId: string
  deviceName: string
  platform: 'Android' | 'iOS' | 'Other'
  deviceInstallationId: string // Secure application installation identifier
  status: 'CONNECTED' | 'OFFLINE' | 'REVOKED'
  capabilities: string[]
  permissions: Record<string, 'GRANTED' | 'DENIED' | 'PROMPTED' | 'UNSUPPORTED'>
  environment: 'production' | 'development'
  appVersion?: string
  lastSeenAt: string
  createdAt: string
  updatedAt: string
  revokedAt?: string | null
  pairingSessionId?: string
}

export async function savePairingSession(session: PairingSessionDoc): Promise<PairingSessionDoc> {
  await db.collection('pairing_sessions').doc(session.id).set(session)
  return session
}

export async function getPairingSession(sessionId: string): Promise<PairingSessionDoc | null> {
  const snap = await db.collection('pairing_sessions').doc(sessionId).get()
  if (!snap.exists) return null
  const session = snap.data() as PairingSessionDoc
  session.id = snap.id

  // Auto-expire if timestamp has passed and session is still open
  const now = Date.now()
  const exp = Date.parse(session.expiresAt)
  if (now > exp && (session.status === 'PENDING' || session.status === 'SCANNED' || session.status === 'CONFIRMING')) {
    session.status = 'EXPIRED'
    session.updatedAt = new Date().toISOString()
    await db.collection('pairing_sessions').doc(sessionId).update({
      status: 'EXPIRED',
      updatedAt: session.updatedAt
    })
  }

  return session
}

export async function getPairingSessionByCodeHash(codeHash: string): Promise<PairingSessionDoc | null> {
  const snap = await db.collection('pairing_sessions').where('codeHash', '==', codeHash).limit(1).get()
  if (snap.empty) return null
  const session = snap.docs[0].data() as PairingSessionDoc
  session.id = snap.docs[0].id

  // Auto-expire check
  const now = Date.now()
  const exp = Date.parse(session.expiresAt)
  if (now > exp && (session.status === 'PENDING' || session.status === 'SCANNED' || session.status === 'CONFIRMING')) {
    session.status = 'EXPIRED'
    session.updatedAt = new Date().toISOString()
    await db.collection('pairing_sessions').doc(session.id).update({
      status: 'EXPIRED',
      updatedAt: session.updatedAt
    })
  }

  return session
}

export async function updatePairingSession(
  sessionId: string,
  updates: Partial<PairingSessionDoc>
): Promise<PairingSessionDoc> {
  const ref = db.collection('pairing_sessions').doc(sessionId)
  const snap = await ref.get()
  if (!snap.exists) {
    throw new Error('Pairing session not found.')
  }
  const current = snap.data() as PairingSessionDoc
  current.id = snap.id

  const updated: PairingSessionDoc = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString()
  }

  await ref.set(updated, { merge: true })
  return updated
}

export async function saveRowanDevice(device: RowanDeviceDoc): Promise<RowanDeviceDoc> {
  await db.collection('rowan_devices').doc(device.id).set(device, { merge: true })
  return device
}

export async function getTenantDevices(
  organizationId: string,
  userId: string,
  includeRevoked = true,
  environment?: 'production' | 'development'
): Promise<RowanDeviceDoc[]> {
  const q = db.collection('rowan_devices').where('organizationId', '==', organizationId)
  const snap = await q.get()
  const now = Date.now()

  const devices: RowanDeviceDoc[] = []
  for (const doc of snap.docs) {
    const data = doc.data() as RowanDeviceDoc
    data.id = doc.id

    // Strict user isolation
    if (data.userId !== userId) continue

    // Environment filter
    if (environment && data.environment !== environment) continue

    // Revoked filter
    if (!includeRevoked && data.status === 'REVOKED') continue

    // Dynamic heart-beat based online/offline computation (threshold: 2 minutes)
    if (data.status !== 'REVOKED') {
      const lastSeenMs = data.lastSeenAt ? Date.parse(data.lastSeenAt) : 0
      if (now - lastSeenMs > 120_000) {
        data.status = 'OFFLINE'
      } else {
        data.status = 'CONNECTED'
      }
    }

    devices.push(data)
  }

  // Sort by updatedAt or createdAt desc
  devices.sort((a, b) => Date.parse(b.updatedAt || b.createdAt) - Date.parse(a.updatedAt || a.createdAt))
  return devices
}

export async function getTenantDevice(
  deviceId: string,
  organizationId: string,
  userId: string
): Promise<RowanDeviceDoc | null> {
  const snap = await db.collection('rowan_devices').doc(deviceId).get()
  if (!snap.exists) return null
  const data = snap.data() as RowanDeviceDoc
  data.id = snap.id

  // Strict isolation checks
  if (data.organizationId !== organizationId || data.userId !== userId) {
    return null
  }

  // Dynamic heartbeat computation
  if (data.status !== 'REVOKED') {
    const lastSeenMs = data.lastSeenAt ? Date.parse(data.lastSeenAt) : 0
    if (Date.now() - lastSeenMs > 120_000) {
      data.status = 'OFFLINE'
    } else {
      data.status = 'CONNECTED'
    }
  }

  return data
}

export async function revokeTenantDevice(
  deviceId: string,
  organizationId: string,
  userId: string
): Promise<RowanDeviceDoc> {
  const device = await getTenantDevice(deviceId, organizationId, userId)
  if (!device) {
    throw new Error('Device not found or not authorized.')
  }

  const now = new Date().toISOString()
  const updated: RowanDeviceDoc = {
    ...device,
    status: 'REVOKED',
    revokedAt: now,
    updatedAt: now
  }

  await db.collection('rowan_devices').doc(deviceId).set(updated, { merge: true })
  return updated
}

export async function updateDeviceHeartbeat(
  deviceId: string,
  organizationId: string,
  userId: string,
  deviceInstallationId: string,
  permissions?: Record<string, 'GRANTED' | 'DENIED' | 'PROMPTED' | 'UNSUPPORTED'>,
  appVersion?: string
): Promise<RowanDeviceDoc> {
  const device = await getTenantDevice(deviceId, organizationId, userId)
  if (!device) {
    throw new Error('Device not found or not authorized.')
  }

  // Revocation security guard
  if (device.status === 'REVOKED' || device.revokedAt) {
    throw new Error('Device authorization has been revoked.')
  }

  // Installation ID verification
  if (device.deviceInstallationId && device.deviceInstallationId !== deviceInstallationId) {
    throw new Error('Device installation mismatch.')
  }

  const now = new Date().toISOString()
  const updated: RowanDeviceDoc = {
    ...device,
    lastSeenAt: now,
    updatedAt: now,
    status: 'CONNECTED'
  }

  if (permissions) {
    updated.permissions = { ...device.permissions, ...permissions }
  }
  if (appVersion) {
    updated.appVersion = appVersion
  }

  await db.collection('rowan_devices').doc(deviceId).set(updated, { merge: true })
  return updated
}



