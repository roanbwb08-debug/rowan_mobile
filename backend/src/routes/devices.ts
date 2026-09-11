import { Router } from 'express'
import crypto from 'crypto'
import { z } from 'zod'
import { requireSupabaseUser } from '../services/supabase.js'
import {
  getOrCreateTenant,
  savePairingSession,
  getPairingSession,
  getPairingSessionByCodeHash,
  updatePairingSession,
  saveRowanDevice,
  getTenantDevices,
  getTenantDevice,
  revokeTenantDevice,
  updateDeviceHeartbeat,
  type PairingSessionDoc,
  type RowanDeviceDoc
} from '../services/db.js'

const router = Router()

// Standard Rowan Mobile Capabilities metadata
export const ROWAN_CAPABILITY_CATALOG = [
  {
    id: 'MICROPHONE',
    name: 'Microphone & Voice',
    description: 'Used for voice conversations and wake activation with Rowan.',
    platformCategory: 'Audio Input'
  },
  {
    id: 'NOTIFICATIONS',
    name: 'Push Notifications',
    description: 'Allows Rowan to work with authorized contextual alerts and follow-ups.',
    platformCategory: 'Alerts'
  },
  {
    id: 'SCREEN_CAPTURE',
    name: 'Screen Context',
    description: 'Allows Rowan to understand your screen when you explicitly enable screen access.',
    platformCategory: 'Display'
  },
  {
    id: 'LOCATION',
    name: 'Location Awareness',
    description: 'Allows location-aware assistance when enabled on your device.',
    platformCategory: 'Sensors'
  },
  {
    id: 'FILES',
    name: 'File & Document Access',
    description: 'Allows Rowan to work with files and notes you authorize.',
    platformCategory: 'Storage'
  }
]

// Cryptographic helpers
function generatePairingCode(): string {
  // 6-character uppercase alphanumeric without ambiguous characters (no 0/O, 1/I)
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  const bytes = crypto.randomBytes(6)
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length]
  }
  return code
}

function hashPairingCode(code: string): string {
  return crypto.createHash('sha256').update(code.trim().toUpperCase()).digest('hex')
}

// Helper to authenticate request and resolve tenant
async function resolveAuthUser(authHeader?: string) {
  const supabaseUser = await requireSupabaseUser(authHeader)
  const userEmail = supabaseUser.email
  const userId = supabaseUser.id
  const tenant = await getOrCreateTenant(userEmail)
  return {
    userId: userId || tenant.user.id,
    userEmail,
    tenant
  }
}

// ---------------------------------------------------------------------------
// 1. Create a Secure, Short-Lived Pairing Session (Web Initiated)
// ---------------------------------------------------------------------------
const createPairingSchema = z.object({
  instructions: z.string().max(2000).optional(),
  requestedCapabilities: z.array(z.string()).optional(),
  environment: z.enum(['production', 'development']).optional()
})

router.post('/pairing/create', async (req, res) => {
  try {
    const { userId, tenant } = await resolveAuthUser(req.headers.authorization)
    const parsed = createPairingSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Invalid pairing request payload.' })
    }

    const { instructions, requestedCapabilities, environment } = parsed.data

    const plainPairingCode = generatePairingCode()
    const codeHash = hashPairingCode(plainPairingCode)
    const sessionId = crypto.randomUUID()
    const now = new Date()
    // Strictly 5 minutes expiration
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString()

    const session: PairingSessionDoc = {
      id: sessionId,
      userId,
      organizationId: tenant.organization.id,
      codeHash,
      status: 'PENDING',
      instructions: instructions || '',
      requestedCapabilities: requestedCapabilities || ['MICROPHONE', 'NOTIFICATIONS'],
      expiresAt,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      environment: environment || 'production'
    }

    await savePairingSession(session)

    // Secure QR payload contains ONLY opaque reference. No secrets or tokens.
    const qrPayload = {
      protocol: 'rowan_pairing_v1',
      sessionId: session.id,
      expiresAt: session.expiresAt
    }

    return res.json({
      success: true,
      sessionId: session.id,
      pairingCode: plainPairingCode, // Plaintext returned ONCE to the creating browser
      expiresAt: session.expiresAt,
      requestedCapabilities: session.requestedCapabilities,
      environment: session.environment,
      qrPayload
    })
  } catch (err) {
    console.error('[PAIRING CREATE ERROR]:', err)
    return res.status(500).json({ success: false, message: 'Failed to create pairing session.' })
  }
})

// ---------------------------------------------------------------------------
// 2. Query Pairing Session Status (Web Polling for Real-Time UI Transitions)
// ---------------------------------------------------------------------------
router.get('/pairing/status/:sessionId', async (req, res) => {
  try {
    const { userId, tenant } = await resolveAuthUser(req.headers.authorization)
    const { sessionId } = req.params

    const session = await getPairingSession(sessionId)
    if (!session) {
      return res.status(404).json({ success: false, message: 'Pairing session not found.' })
    }

    // Tenant / user isolation check
    if (session.organizationId !== tenant.organization.id && session.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied to this pairing session.' })
    }

    // Auto-verify expiration
    const now = Date.now()
    if (now > Date.parse(session.expiresAt) && (session.status === 'PENDING' || session.status === 'SCANNED' || session.status === 'CONFIRMING')) {
      session.status = 'EXPIRED'
    }

    return res.json({
      success: true,
      status: session.status,
      deviceId: session.deviceId,
      expiresAt: session.expiresAt,
      environment: session.environment,
      requestedCapabilities: session.requestedCapabilities
    })
  } catch (err) {
    console.error('[PAIRING STATUS ERROR]:', err)
    return res.status(500).json({ success: false, message: 'Failed to retrieve pairing status.' })
  }
})

// ---------------------------------------------------------------------------
// 3. Cancel Pairing Session (User Dismisses on Web)
// ---------------------------------------------------------------------------
router.post('/pairing/cancel/:sessionId', async (req, res) => {
  try {
    const { userId, tenant } = await resolveAuthUser(req.headers.authorization)
    const { sessionId } = req.params

    const session = await getPairingSession(sessionId)
    if (!session) {
      return res.status(404).json({ success: false, message: 'Pairing session not found.' })
    }

    if (session.organizationId !== tenant.organization.id && session.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied to this pairing session.' })
    }

    if (session.status === 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'Cannot cancel a completed session.' })
    }

    await updatePairingSession(sessionId, { status: 'CANCELLED' })
    return res.json({ success: true, message: 'Pairing session cancelled.' })
  } catch (err) {
    console.error('[PAIRING CANCEL ERROR]:', err)
    return res.status(500).json({ success: false, message: 'Failed to cancel pairing session.' })
  }
})

// ---------------------------------------------------------------------------
// 4. Mobile Client Scans QR or Enters Code (State Transition: PENDING -> SCANNED)
// ---------------------------------------------------------------------------
const scanSchema = z.object({
  sessionId: z.string().optional(),
  code: z.string().optional()
})

router.post('/pairing/scan', async (req, res) => {
  try {
    const parsed = scanSchema.safeParse(req.body)
    if (!parsed.success || (!parsed.data.sessionId && !parsed.data.code)) {
      return res.status(400).json({ success: false, message: 'Must supply either sessionId or pairing code.' })
    }

    let session: PairingSessionDoc | null = null

    if (parsed.data.sessionId) {
      session = await getPairingSession(parsed.data.sessionId)
    } else if (parsed.data.code) {
      const codeHash = hashPairingCode(parsed.data.code)
      session = await getPairingSessionByCodeHash(codeHash)
    }

    if (!session) {
      return res.status(404).json({ success: false, message: 'Invalid or non-existent pairing code/session.' })
    }

    // Expiration check
    const now = Date.now()
    if (now > Date.parse(session.expiresAt) || session.status === 'EXPIRED') {
      return res.status(410).json({ success: false, message: 'Pairing session has expired. Please generate a new code.' })
    }

    // State machine check
    if (session.status === 'COMPLETED') {
      return res.status(409).json({ success: false, message: 'This pairing session has already been completed.' })
    }
    if (session.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'This pairing session was cancelled by the user.' })
    }

    // Atomic transition: PENDING -> SCANNED
    const updated = await updatePairingSession(session.id, {
      status: 'SCANNED',
      scannedAt: new Date().toISOString()
    })

    return res.json({
      success: true,
      sessionId: updated.id,
      status: updated.status,
      requestedCapabilities: updated.requestedCapabilities,
      instructions: updated.instructions,
      expiresAt: updated.expiresAt,
      environment: updated.environment
    })
  } catch (err) {
    console.error('[PAIRING SCAN ERROR]:', err)
    return res.status(500).json({ success: false, message: 'Failed to process mobile pairing scan.' })
  }
})

// ---------------------------------------------------------------------------
// 5. Mobile Client Confirms Connection (State Transition: SCANNED -> COMPLETED)
// ---------------------------------------------------------------------------
const confirmSchema = z.object({
  sessionId: z.string(),
  deviceName: z.string().min(1).max(100),
  platform: z.enum(['Android', 'iOS', 'Other']),
  deviceInstallationId: z.string().min(1).max(200),
  capabilities: z.array(z.string()).optional(),
  permissions: z.record(z.enum(['GRANTED', 'DENIED', 'PROMPTED', 'UNSUPPORTED'])).optional(),
  appVersion: z.string().optional(),
  environment: z.enum(['production', 'development']).optional()
})

router.post('/pairing/confirm', async (req, res) => {
  try {
    const { userId, tenant } = await resolveAuthUser(req.headers.authorization)
    const parsed = confirmSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Invalid device confirmation parameters.', errors: parsed.error.issues })
    }

    const {
      sessionId,
      deviceName,
      platform,
      deviceInstallationId,
      capabilities,
      permissions,
      appVersion,
      environment
    } = parsed.data

    const session = await getPairingSession(sessionId)
    if (!session) {
      return res.status(404).json({ success: false, message: 'Pairing session not found.' })
    }

    // User & Organization isolation check
    if (session.organizationId !== tenant.organization.id && session.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Cross-tenant/user pairing prohibited.' })
    }

    // Expiration verification
    const now = Date.now()
    if (now > Date.parse(session.expiresAt) || session.status === 'EXPIRED') {
      return res.status(410).json({ success: false, message: 'Pairing session has expired.' })
    }

    // State machine check
    if (session.status === 'COMPLETED') {
      return res.status(409).json({ success: false, message: 'Pairing session has already been used and completed.' })
    }
    if (session.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Pairing session was cancelled.' })
    }

    const nowIso = new Date().toISOString()
    const deviceId = `dev_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`

    // Determine target environment:
    // If request or session is 'development', flag as development, otherwise production
    const targetEnv = (environment === 'development' || session.environment === 'development') ? 'development' : 'production'

    const newDevice: RowanDeviceDoc = {
      id: deviceId,
      userId,
      organizationId: tenant.organization.id,
      deviceName: deviceName.trim(),
      platform,
      deviceInstallationId: deviceInstallationId.trim(),
      status: 'CONNECTED',
      capabilities: capabilities || session.requestedCapabilities || ['MICROPHONE', 'NOTIFICATIONS'],
      permissions: permissions || {},
      environment: targetEnv,
      appVersion: appVersion || 'v1.0.0',
      lastSeenAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
      revokedAt: null,
      pairingSessionId: session.id
    }

    // Save device in Firestore
    await saveRowanDevice(newDevice)

    // Atomically transition pairing session to COMPLETED
    await updatePairingSession(session.id, {
      status: 'COMPLETED',
      deviceId: newDevice.id,
      completedAt: nowIso
    })

    return res.json({
      success: true,
      message: 'Device paired and registered successfully.',
      device: newDevice
    })
  } catch (err) {
    console.error('[PAIRING CONFIRM ERROR]:', err)
    return res.status(500).json({ success: false, message: 'Failed to complete device pairing.' })
  }
})

// ---------------------------------------------------------------------------
// 6. Device List (All registered devices under authenticated user)
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const { userId, tenant } = await resolveAuthUser(req.headers.authorization)
    const includeRevoked = req.query.includeRevoked !== 'false'
    const envFilter = req.query.environment as 'production' | 'development' | undefined

    const devices = await getTenantDevices(tenant.organization.id, userId, includeRevoked, envFilter)

    return res.json({
      success: true,
      devices,
      capabilities: ROWAN_CAPABILITY_CATALOG
    })
  } catch (err) {
    console.error('[GET DEVICES ERROR]:', err)
    return res.status(500).json({ success: false, message: 'Failed to fetch registered devices.' })
  }
})

// ---------------------------------------------------------------------------
// 7. Get Specific Device Details
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res) => {
  try {
    const { userId, tenant } = await resolveAuthUser(req.headers.authorization)
    const { id } = req.params

    const device = await getTenantDevice(id, tenant.organization.id, userId)
    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found.' })
    }

    return res.json({
      success: true,
      device,
      capabilities: ROWAN_CAPABILITY_CATALOG
    })
  } catch (err) {
    console.error('[GET DEVICE ERROR]:', err)
    return res.status(500).json({ success: false, message: 'Failed to fetch device details.' })
  }
})

// ---------------------------------------------------------------------------
// 8. Device Heartbeat (Periodically sent by authenticated mobile client)
// ---------------------------------------------------------------------------
const heartbeatSchema = z.object({
  deviceInstallationId: z.string().min(1),
  permissions: z.record(z.enum(['GRANTED', 'DENIED', 'PROMPTED', 'UNSUPPORTED'])).optional(),
  appVersion: z.string().optional()
})

router.post('/:id/heartbeat', async (req, res) => {
  try {
    const { userId, tenant } = await resolveAuthUser(req.headers.authorization)
    const { id } = req.params

    const parsed = heartbeatSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Invalid heartbeat payload.' })
    }

    const { deviceInstallationId, permissions, appVersion } = parsed.data

    try {
      const updated = await updateDeviceHeartbeat(
        id,
        tenant.organization.id,
        userId,
        deviceInstallationId,
        permissions,
        appVersion
      )

      return res.json({
        success: true,
        status: updated.status,
        lastSeenAt: updated.lastSeenAt
      })
    } catch (heartbeatErr: unknown) {
      const hbMessage = heartbeatErr instanceof Error ? heartbeatErr.message : String(heartbeatErr)
      if (hbMessage.includes('revoked')) {
        return res.status(403).json({ success: false, message: 'Device authorization has been revoked.' })
      }
      if (hbMessage.includes('not found')) {
        return res.status(404).json({ success: false, message: 'Device not found.' })
      }
      throw heartbeatErr
    }
  } catch (err) {
    console.error('[DEVICE HEARTBEAT ERROR]:', err)
    return res.status(500).json({ success: false, message: 'Heartbeat processing failed.' })
  }
})

// ---------------------------------------------------------------------------
// 9. Revoke Device Authorization
// ---------------------------------------------------------------------------
router.post('/:id/revoke', async (req, res) => {
  try {
    const { userId, tenant } = await resolveAuthUser(req.headers.authorization)
    const { id } = req.params

    const revoked = await revokeTenantDevice(id, tenant.organization.id, userId)
    return res.json({
      success: true,
      message: 'Device authorization revoked. Active sessions invalidated.',
      device: revoked
    })
  } catch (err) {
    console.error('[DEVICE REVOKE ERROR]:', err)
    return res.status(500).json({ success: false, message: 'Failed to revoke device.' })
  }
})

// ---------------------------------------------------------------------------
// 10. Device Permissions Synchronization
// ---------------------------------------------------------------------------
router.get('/:id/permissions', async (req, res) => {
  try {
    const { userId, tenant } = await resolveAuthUser(req.headers.authorization)
    const { id } = req.params

    const device = await getTenantDevice(id, tenant.organization.id, userId)
    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found.' })
    }

    return res.json({
      success: true,
      permissions: device.permissions || {},
      capabilities: device.capabilities || []
    })
  } catch (err) {
    console.error('[DEVICE GET PERMISSIONS ERROR]:', err)
    return res.status(500).json({ success: false, message: 'Failed to get device permissions.' })
  }
})

router.patch('/:id/permissions', async (req, res) => {
  try {
    const { userId, tenant } = await resolveAuthUser(req.headers.authorization)
    const { id } = req.params
    const { permissions } = req.body

    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({ success: false, message: 'Permissions dictionary required.' })
    }

    const device = await getTenantDevice(id, tenant.organization.id, userId)
    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found.' })
    }

    if (device.status === 'REVOKED') {
      return res.status(403).json({ success: false, message: 'Cannot modify permissions for revoked device.' })
    }

    device.permissions = { ...device.permissions, ...permissions }
    device.updatedAt = new Date().toISOString()
    await saveRowanDevice(device)

    return res.json({
      success: true,
      message: 'Permissions updated.',
      permissions: device.permissions
    })
  } catch (err) {
    console.error('[DEVICE PATCH PERMISSIONS ERROR]:', err)
    return res.status(500).json({ success: false, message: 'Failed to update device permissions.' })
  }
})

export default router
