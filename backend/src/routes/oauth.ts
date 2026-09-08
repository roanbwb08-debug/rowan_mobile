import { Router } from 'express'
import axios from 'axios'
import { db } from '../services/firebase.js'
import { getOrCreateTenant } from '../services/db.js'

const router = Router()

// GitHub OAuth Config
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET
const GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/api/oauth/github/callback'

/**
 * Initiate GitHub OAuth Flow
 */
router.get('/github/authorize', (req, res) => {
  const { userId } = req.query
  if (!userId) {
    return res.status(400).json({ success: false, message: 'userId is required' })
  }

  // Demo Mode Fallback
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    console.warn('GitHub OAuth Credentials missing. Entering Demo Mode.')
    const demoRedirect = `${GITHUB_REDIRECT_URI}?code=demo_code&state=${userId}`
    return res.redirect(demoRedirect)
  }

  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${GITHUB_REDIRECT_URI}&scope=repo,read:user,user:email&state=${userId}`
  
  res.redirect(githubAuthUrl)
})

/**
 * GitHub OAuth Callback
 */
router.get('/github/callback', async (req, res) => {
  const { code, state: userId } = req.query

  if (!code || !userId) {
    return res.status(400).send('Invalid callback parameters.')
  }

  try {
    let access_token = 'demo_token'
    let githubUser = { login: 'demo_user', id: 12345 }

    if (code !== 'demo_code') {
      // Exchange code for access token
      const tokenResponse = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: GITHUB_REDIRECT_URI
        },
        {
          headers: {
            Accept: 'application/json'
          }
        }
      )

      const { access_token: token, error, error_description } = tokenResponse.data
      access_token = token

      if (error) {
        console.error('GitHub OAuth Error:', error_description)
        return res.status(400).send(`OAuth Error: ${error_description}`)
      }

      // Get GitHub User Info
      const userResponse = await axios.get('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      })

      githubUser = userResponse.data
    }

    // Fetch Tenant
    const { organization } = await getOrCreateTenant() // For demo we use default, in real app we'd resolve from userId state

    // Store Connection in Firestore
    const connectionId = `app-github-${userId}`
    const connectionRef = db.collection('connections').doc(connectionId)
    
    await connectionRef.set({
      id: connectionId,
      userId: userId,
      organizationId: organization.id,
      type: 'app',
      name: `GitHub (${githubUser.login})`,
      status: 'connected',
      metadata: {
        service: 'github',
        githubUser: githubUser.login,
        githubId: githubUser.id,
        // In production, encrypt this token!
        accessToken: access_token,
        connectedAt: new Date().toISOString()
      },
      permissions: {
        'Read repositories': true,
        'Read issues': true,
        'Create issues': true,
        'Read pull requests': true
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    // Redirect back to frontend
    res.redirect('/connect?tab=apps&status=success&service=github')
  } catch (err) {
    console.error('GitHub OAuth Callback Failed:', err)
    res.status(500).send('Internal Server Error during OAuth callback.')
  }
})

export default router
