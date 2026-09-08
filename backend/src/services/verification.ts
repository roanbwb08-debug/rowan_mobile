import { WebsiteDoc, saveTenantWebsite } from './websites.js'

export interface VerificationResult {
  verified: boolean
  status: 'verified' | 'failed'
  message: string
  details?: {
    checkedUrl: string
    hasScriptTag: boolean
    hasSiteId: boolean
    httpStatus?: number
    timestamp: string
  }
}

/**
 * Performs real verification of Rowan widget installation on an external website.
 */
export async function verifyWebsiteInstallation(website: WebsiteDoc): Promise<VerificationResult> {
  const targetUrl = website.url.startsWith('http') ? website.url : `https://${website.url}`
  const siteId = website.id
  const now = new Date().toISOString()

  console.log(`[VERIFICATION] Verifying installation for ${siteId} at ${targetUrl}...`)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 7000)

  try {
    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RowanAiVerifier/1.0; +https://rowan.ai)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    })
    clearTimeout(timer)

    const httpStatus = response.status
    if (!response.ok) {
      const result: VerificationResult = {
        verified: false,
        status: 'failed',
        message: `HTTP request to ${targetUrl} returned status ${httpStatus}. Please check that your website is online and publicly accessible.`,
        details: {
          checkedUrl: targetUrl,
          hasScriptTag: false,
          hasSiteId: false,
          httpStatus,
          timestamp: now
        }
      }

      await saveTenantWebsite(website.organizationId, website.userId, {
        id: website.id,
        verificationStatus: 'failed',
        lastVerifiedAt: now
      })

      return result
    }

    const html = await response.text()

    // Inspect HTML for the widget script and data-rowan-site attribute
    const hasWidgetScript = html.includes('widget.js') || html.includes('rowan-widget') || html.includes('rowan.ai')
    const hasSiteId = html.includes(siteId)

    if (hasWidgetScript && hasSiteId) {
      // Verified successfully!
      const result: VerificationResult = {
        verified: true,
        status: 'verified',
        message: `Rowan widget successfully detected and verified on ${targetUrl}!`,
        details: {
          checkedUrl: targetUrl,
          hasScriptTag: true,
          hasSiteId: true,
          httpStatus,
          timestamp: now
        }
      }

      await saveTenantWebsite(website.organizationId, website.userId, {
        id: website.id,
        status: 'connected',
        verificationStatus: 'verified',
        lastVerifiedAt: now
      })

      return result
    } else {
      // Failed to find the required snippet
      let failureReason = `We could not detect the Rowan widget on ${targetUrl}.`
      if (!hasWidgetScript) {
        failureReason += ` The <script src=".../widget.js"> tag was not found in your page source.`
      } else if (!hasSiteId) {
        failureReason += ` The script tag was found, but the data-rowan-site="${siteId}" attribute is missing or does not match.`
      }

      const result: VerificationResult = {
        verified: false,
        status: 'failed',
        message: failureReason,
        details: {
          checkedUrl: targetUrl,
          hasScriptTag: hasWidgetScript,
          hasSiteId,
          httpStatus,
          timestamp: now
        }
      }

      await saveTenantWebsite(website.organizationId, website.userId, {
        id: website.id,
        verificationStatus: 'failed',
        lastVerifiedAt: now
      })

      return result
    }
  } catch (err: unknown) {
    clearTimeout(timer)
    const errMessage = err instanceof Error ? err.message : String(err)
    console.warn(`[VERIFICATION] Network failure while verifying ${targetUrl}:`, errMessage)

    const result: VerificationResult = {
      verified: false,
      status: 'failed',
      message: `Could not connect to ${targetUrl} (${errMessage.includes('abort') ? 'Connection timed out' : 'Network error'}). Make sure the domain is resolving and accessible from the public internet.`,
      details: {
        checkedUrl: targetUrl,
        hasScriptTag: false,
        hasSiteId: false,
        timestamp: now
      }
    }

    await saveTenantWebsite(website.organizationId, website.userId, {
      id: website.id,
      verificationStatus: 'failed',
      lastVerifiedAt: now
    })

    return result
  }
}
