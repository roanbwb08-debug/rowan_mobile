import { WebsiteDoc, addWebsiteKnowledge, saveTenantWebsite } from './websites.js'

interface CrawledPage {
  url: string
  title: string
  text: string
  headings: string[]
}

/**
 * Strips HTML tags, comments, script/style blocks, and extra whitespace to extract readable text.
 */
export function extractCleanTextFromHtml(html: string): { title: string; description: string; text: string; sublinks: string[] } {
  // Extract Title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'Website Homepage'

  // Extract Meta Description
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i) ||
                    html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i)
  const rawDescription = descMatch ? descMatch[1].trim() : ''

  // Extract internal links for multi-page crawling
  const linkMatches = Array.from(html.matchAll(/<a[^>]*href=["']([^"'#]+)["'][^>]*>/gi))
  const sublinks = linkMatches.map(m => m[1]).filter(l => Boolean(l))

  // Clean scripts, styles, noscripts, iframes, svgs, header, footer, nav
  let clean = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')

  // Convert headings & line break elements into newlines
  clean = clean
    .replace(/<\/(h[1-6]|p|div|section|article|li|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')

  // Decode common HTML entities
  clean = clean
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")

  // Collapse consecutive whitespaces and empty lines
  const lines = clean
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(line => line.length > 0)

  const fullText = lines.join('\n')

  return {
    title: rawTitle,
    description: rawDescription,
    text: fullText,
    sublinks
  }
}

/**
 * Safely fetches a single webpage with strict timeouts and size limits.
 */
async function fetchPage(url: string, timeoutMs: number = 8000): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RowanAiBot/1.0; +https://rowan.ai)',
        'Accept': 'text/html,application/xhtml+xml,text/plain;q=0.9'
      }
    })
    clearTimeout(timer)

    if (!res.ok) {
      console.warn(`[CRAWLER] Fetch failed for ${url}: status ${res.status}`)
      return null
    }

    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      return null
    }

    const html = await res.text()
    // Cap at 1MB
    return html.slice(0, 1024 * 1024)
  } catch (err: unknown) {
    clearTimeout(timer)
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[CRAWLER] Error fetching ${url}:`, msg)
    return null
  }
}

/**
 * Chunks a large text into digestible knowledge paragraphs for AI retrieval.
 */
function chunkText(text: string, maxChunkSize: number = 1000): string[] {
  const paragraphs = text.split(/\n\s*\n/)
  const chunks: string[] = []
  let currentChunk = ''

  for (const para of paragraphs) {
    const trimmed = para.trim()
    if (!trimmed) continue

    if ((currentChunk + '\n\n' + trimmed).length <= maxChunkSize) {
      currentChunk = currentChunk ? currentChunk + '\n\n' + trimmed : trimmed
    } else {
      if (currentChunk) {
        chunks.push(currentChunk)
      }
      if (trimmed.length > maxChunkSize) {
        // Break large single paragraph by sentences
        const sentences = trimmed.match(/[^.!?]+[.!?]+/g) || [trimmed]
        let subChunk = ''
        for (const sentence of sentences) {
          if ((subChunk + ' ' + sentence).length <= maxChunkSize) {
            subChunk = subChunk ? subChunk + ' ' + sentence : sentence
          } else {
            if (subChunk) chunks.push(subChunk)
            subChunk = sentence
          }
        }
        currentChunk = subChunk
      } else {
        currentChunk = trimmed
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk)
  }

  return chunks.filter(c => c.length > 40)
}

/**
 * Crawls authorized public content for a connected website and stores knowledge chunks in Firestore.
 */
export async function crawlAndIndexWebsite(website: WebsiteDoc): Promise<{
  success: boolean
  pagesCrawled: number
  chunksIndexed: number
  message: string
}> {
  const baseUrl = website.url.startsWith('http') ? website.url : `https://${website.url}`
  const targetDomain = website.domain.toLowerCase()

  const visitedUrls = new Set<string>()
  const pagesToVisit = [baseUrl]
  const crawledPages: CrawledPage[] = []

  console.log(`[CRAWLER] Initiating crawl for site ${website.id} (${baseUrl})...`)

  // Max 5 pages per crawl to maintain high speed and respectful ingestion
  const MAX_PAGES = 4

  while (pagesToVisit.length > 0 && crawledPages.length < MAX_PAGES) {
    const currentUrl = pagesToVisit.shift()!
    if (visitedUrls.has(currentUrl)) continue
    visitedUrls.add(currentUrl)

    const html = await fetchPage(currentUrl)
    if (!html) continue

    const { title, description, text, sublinks } = extractCleanTextFromHtml(html)

    if (text.length > 50) {
      crawledPages.push({
        url: currentUrl,
        title: title || `${website.name} Content`,
        text: (description ? `Overview: ${description}\n\n` : '') + text,
        headings: []
      })
    }

    // Discover prioritized sublinks (e.g. /about, /services, /products, /faq, /contact, /pricing)
    const priorityKeywords = ['about', 'service', 'product', 'faq', 'contact', 'price', 'pricing', 'help', 'docs', 'feature']
    for (const link of sublinks) {
      try {
        const resolved = new URL(link, currentUrl).href
        const resolvedUrlObj = new URL(resolved)
        
        // Ensure same domain & HTTP/HTTPS
        if (
          (resolvedUrlObj.hostname.toLowerCase() === targetDomain ||
           resolvedUrlObj.hostname.toLowerCase() === `www.${targetDomain}` ||
           resolvedUrlObj.hostname.toLowerCase().replace(/^www\./, '') === targetDomain) &&
          !visitedUrls.has(resolved) &&
          !pagesToVisit.includes(resolved)
        ) {
          const lowerPath = resolvedUrlObj.pathname.toLowerCase()
          // Prioritize relevant informational pages
          if (priorityKeywords.some(kw => lowerPath.includes(kw))) {
            pagesToVisit.unshift(resolved)
          } else if (pagesToVisit.length < 10) {
            pagesToVisit.push(resolved)
          }
        }
      } catch {
        // Ignore malformed sublinks
      }
    }
  }

  // Index the crawled chunks into website_knowledge
  let totalChunks = 0

  for (const page of crawledPages) {
    const chunks = chunkText(page.text, 800)
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const chunkTitle = `${page.title} (Part ${i + 1})`
      await addWebsiteKnowledge(website.id, website.organizationId, {
        url: page.url,
        title: chunkTitle,
        content: chunk
      })
      totalChunks++
    }
  }

  // Update website record with crawl telemetry
  const now = new Date().toISOString()
  await saveTenantWebsite(website.organizationId, website.userId, {
    id: website.id,
    lastCrawledAt: now,
    pagesCrawled: crawledPages.length
  })

  console.log(`[CRAWLER] Crawl completed for site ${website.id}: ${crawledPages.length} pages crawled, ${totalChunks} chunks indexed.`)

  return {
    success: crawledPages.length > 0,
    pagesCrawled: crawledPages.length,
    chunksIndexed: totalChunks,
    message: crawledPages.length > 0
      ? `Successfully indexed ${crawledPages.length} page(s) and generated ${totalChunks} knowledge chunk(s).`
      : `Could not fetch content from ${baseUrl}. Make sure the website is publicly reachable.`
  }
}
