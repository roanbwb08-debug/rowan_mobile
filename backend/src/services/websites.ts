import { db } from './firebase.js'
import crypto from 'crypto'

export interface WebsiteDoc {
  id: string // e.g. site_xxxx
  userId: string
  organizationId: string
  domain: string
  url: string
  name: string
  instructions: string
  personality: string
  welcomeMessage: string
  language: string
  categories: string[]
  thingsToKnow: string
  thingsNotToSay: string
  status: 'connected' | 'pending' | 'disconnected'
  verificationStatus: 'verified' | 'unverified' | 'failed'
  lastVerifiedAt?: string
  lastCrawledAt?: string
  pagesCrawled?: number
  createdAt: string
  updatedAt: string
}

export interface WebsiteKnowledgeDoc {
  id: string
  siteId: string
  organizationId: string
  url: string
  title: string
  content: string
  snippet: string
  createdAt: string
}

/**
 * Normalizes a website URL and extracts the clean domain.
 */
export function normalizeWebsiteUrl(rawUrl: string): { normalizedUrl: string; domain: string; name: string } {
  let cleaned = rawUrl.trim()
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = 'https://' + cleaned
  }
  
  try {
    const parsed = new URL(cleaned)
    const domain = parsed.hostname.toLowerCase().replace(/^www\./, '')
    // Generate a default human-friendly site name from domain (e.g. acme-corp.com -> Acme Corp)
    const baseName = domain.split('.')[0] || 'Website'
    const formattedName = baseName
      .split(/[-_]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')

    return {
      normalizedUrl: parsed.origin,
      domain: parsed.hostname.toLowerCase(),
      name: formattedName
    }
  } catch {
    throw new Error('Invalid website URL provided. Please enter a valid URL (e.g. https://example.com).')
  }
}

/**
 * Generates a clean, unique site ID.
 */
export function generateSiteId(): string {
  const randomSuffix = crypto.randomBytes(6).toString('hex')
  return `site_${randomSuffix}`
}

/**
 * Retrieve all websites for a given organization.
 */
export async function getTenantWebsites(organizationId: string): Promise<WebsiteDoc[]> {
  const snap = await db
    .collection('websites')
    .where('organizationId', '==', organizationId)
    .get()

  const websites = snap.docs.map((doc: { id: string; data: () => Record<string, unknown> }) => {
    const data = doc.data() as unknown as WebsiteDoc
    data.id = doc.id
    return data
  })

  // Sort descending by createdAt
  return websites.sort((a: WebsiteDoc, b: WebsiteDoc) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

/**
 * Retrieve a specific website by ID with strict organization isolation.
 */
export async function getTenantWebsite(id: string, organizationId: string): Promise<WebsiteDoc | null> {
  const doc = await db.collection('websites').doc(id).get()
  if (!doc.exists) return null
  const data = doc.data() as WebsiteDoc
  if (data.organizationId !== organizationId) {
    return null // Strict isolation: cross-tenant access prohibited
  }
  data.id = doc.id
  return data
}

/**
 * Retrieve a website by its public siteId (used by the public widget).
 * Returns only safe, public-facing configuration fields.
 */
export async function getWebsiteBySiteId(siteId: string): Promise<WebsiteDoc | null> {
  const doc = await db.collection('websites').doc(siteId).get()
  if (!doc.exists) return null
  const data = doc.data() as WebsiteDoc
  data.id = doc.id
  return data
}

/**
 * Create or update a website connection.
 */
export async function saveTenantWebsite(
  organizationId: string,
  userId: string,
  data: Partial<WebsiteDoc>
): Promise<WebsiteDoc> {
  const id = data.id || generateSiteId()
  const now = new Date().toISOString()

  let normalizedDomain = data.domain || ''
  let normalizedUrl = data.url || ''
  let suggestedName = data.name || ''

  if (data.url) {
    try {
      const parsed = normalizeWebsiteUrl(data.url)
      normalizedUrl = parsed.normalizedUrl
      normalizedDomain = parsed.domain
      if (!suggestedName) suggestedName = parsed.name
    } catch {
      // Keep existing values if URL already normalized
    }
  }

  const existingDoc = await db.collection('websites').doc(id).get()
  const existing = existingDoc.exists ? (existingDoc.data() as WebsiteDoc) : null

  if (existing && existing.organizationId !== organizationId) {
    throw new Error('Access Denied: Website belongs to another organization.')
  }

  const websiteDoc: WebsiteDoc = {
    id,
    userId: existing ? existing.userId : userId,
    organizationId,
    domain: normalizedDomain || (existing?.domain ?? 'example.com'),
    url: normalizedUrl || (existing?.url ?? `https://${normalizedDomain}`),
    name: suggestedName || (existing?.name ?? 'My Website'),
    instructions: data.instructions !== undefined ? data.instructions : (existing?.instructions ?? ''),
    personality: data.personality !== undefined ? data.personality : (existing?.personality ?? 'Warm & Professional'),
    welcomeMessage: data.welcomeMessage !== undefined ? data.welcomeMessage : (existing?.welcomeMessage ?? "Hi! I'm Rowan. How can I help you today?"),
    language: data.language !== undefined ? data.language : (existing?.language ?? 'en'),
    categories: data.categories !== undefined ? data.categories : (existing?.categories ?? ['General']),
    thingsToKnow: data.thingsToKnow !== undefined ? data.thingsToKnow : (existing?.thingsToKnow ?? ''),
    thingsNotToSay: data.thingsNotToSay !== undefined ? data.thingsNotToSay : (existing?.thingsNotToSay ?? ''),
    status: data.status || existing?.status || 'connected',
    verificationStatus: data.verificationStatus || existing?.verificationStatus || 'unverified',
    lastVerifiedAt: data.lastVerifiedAt !== undefined ? data.lastVerifiedAt : existing?.lastVerifiedAt,
    lastCrawledAt: data.lastCrawledAt !== undefined ? data.lastCrawledAt : existing?.lastCrawledAt,
    pagesCrawled: data.pagesCrawled !== undefined ? data.pagesCrawled : (existing?.pagesCrawled ?? 0),
    createdAt: existing?.createdAt || now,
    updatedAt: now
  }

  await db.collection('websites').doc(id).set(websiteDoc, { merge: true })
  return websiteDoc
}

/**
 * Delete a website connection and all associated knowledge docs.
 */
export async function deleteTenantWebsite(id: string, organizationId: string): Promise<void> {
  const doc = await db.collection('websites').doc(id).get()
  if (!doc.exists) return
  const data = doc.data() as WebsiteDoc
  if (data.organizationId !== organizationId) {
    throw new Error('Access Denied: Website does not belong to authorized organization.')
  }

  // Delete website record
  await db.collection('websites').doc(id).delete()

  // Clean up knowledge docs for this site
  const knowledgeSnap = await db
    .collection('website_knowledge')
    .where('siteId', '==', id)
    .get()

  for (const kDoc of knowledgeSnap.docs) {
    await kDoc.ref.delete()
  }
}

/**
 * Retrieve knowledge documents for a given site.
 */
export async function getWebsiteKnowledge(siteId: string, organizationId?: string): Promise<WebsiteKnowledgeDoc[]> {
  let query = db.collection('website_knowledge').where('siteId', '==', siteId)
  if (organizationId) {
    query = query.where('organizationId', '==', organizationId)
  }
  const snap = await query.get()
  return snap.docs.map((doc: { id: string; data: () => Record<string, unknown> }) => {
    const data = doc.data() as unknown as WebsiteKnowledgeDoc
    data.id = doc.id
    return data
  })
}

/**
 * Add a knowledge document for a site.
 */
export async function addWebsiteKnowledge(
  siteId: string,
  organizationId: string,
  knowledge: { url?: string; title: string; content: string }
): Promise<WebsiteKnowledgeDoc> {
  const id = `k_${crypto.randomBytes(6).toString('hex')}`
  const snippet = knowledge.content.slice(0, 200).replace(/\s+/g, ' ').trim() + (knowledge.content.length > 200 ? '...' : '')
  const doc: WebsiteKnowledgeDoc = {
    id,
    siteId,
    organizationId,
    url: knowledge.url || '',
    title: knowledge.title || 'Untitled Knowledge',
    content: knowledge.content,
    snippet,
    createdAt: new Date().toISOString()
  }

  await db.collection('website_knowledge').doc(id).set(doc)
  return doc
}

/**
 * Delete a specific knowledge document.
 */
export async function deleteWebsiteKnowledge(siteId: string, knowledgeId: string, organizationId: string): Promise<void> {
  const doc = await db.collection('website_knowledge').doc(knowledgeId).get()
  if (!doc.exists) return
  const data = doc.data() as WebsiteKnowledgeDoc
  if (data.organizationId !== organizationId || data.siteId !== siteId) {
    throw new Error('Access Denied: Knowledge document does not belong to authorized organization.')
  }
  await db.collection('website_knowledge').doc(knowledgeId).delete()
}

/**
 * Search and retrieve the most relevant website knowledge chunks for a visitor's query.
 */
export async function searchWebsiteKnowledge(siteId: string, query: string, limit: number = 4): Promise<WebsiteKnowledgeDoc[]> {
  const allKnowledge = await getWebsiteKnowledge(siteId)
  if (allKnowledge.length === 0) return []

  const queryTerms = query
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(t => t.length > 2)

  if (queryTerms.length === 0) {
    return allKnowledge.slice(0, limit)
  }

  // Score knowledge docs based on keyword term frequency and title matching
  const scored = allKnowledge.map(k => {
    const titleLower = k.title.toLowerCase()
    const contentLower = k.content.toLowerCase()
    let score = 0

    for (const term of queryTerms) {
      if (titleLower.includes(term)) {
        score += 10
      }
      // Count occurrences in content
      const matches = contentLower.split(term).length - 1
      score += Math.min(matches, 5) * 2
    }

    return { knowledge: k, score }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored
    .filter(item => item.score > 0)
    .slice(0, limit)
    .map(item => item.knowledge)
}
