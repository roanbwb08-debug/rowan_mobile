import { Router } from 'express'
import { getOrCreateTenant, createMusicProject, addMusicAsset } from '../services/db.js'
import { analyzeMedia } from '../services/gemini.js'
import fs from 'fs'

const router = Router()
const DEFAULT_EMAIL = 'nobleroan474@gmail.com'

/**
 * POST /api/music/projects
 * Create a new music project
 */
router.post('/projects', async (req, res) => {
  try {
    const tenant = await getOrCreateTenant(DEFAULT_EMAIL)
    const { title } = req.body
    if (!title) {
        return res.status(400).json({ success: false, message: 'Title is required' })
    }
    const project = await createMusicProject(tenant.organization.id, title)
    return res.json({ success: true, project })
  } catch (error: unknown) {
    console.error('[MUSIC ROUTE ERROR] POST /projects:', error)
    return res.status(500).json({ success: false, message: 'Failed to create music project' })
  }
})

/**
 * POST /api/music/projects/:projectId/assets
 * Add an asset to a music project
 */
router.post('/projects/:projectId/assets', async (req, res) => {
  try {
    await getOrCreateTenant(DEFAULT_EMAIL)
    const { projectId } = req.params
    const { filePath, type } = req.body
    if (!filePath || !type) {
        return res.status(400).json({ success: false, message: 'FilePath and Type are required' })
    }
    
    // In a real implementation, you would check if the project belongs to the tenant here.
    
    const asset = await addMusicAsset(projectId, filePath, type)
    return res.json({ success: true, asset })
  } catch (error: unknown) {
    console.error('[MUSIC ROUTE ERROR] POST /projects/:projectId/assets:', error)
    return res.status(500).json({ success: false, message: 'Failed to add music asset' })
  }
})

/**
 * POST /api/music/analyze
 * Analyze an asset using Gemini
 */
router.post('/analyze', async (req, res) => {
    try {
        const { filePath, prompt, mimeType } = req.body
        if (!filePath || !prompt || !mimeType) {
            return res.status(400).json({ success: false, message: 'FilePath, Prompt, and MimeType are required' })
        }
        
        const fileBuffer = fs.readFileSync(filePath)
        const result = await analyzeMedia(prompt, new Uint8Array(fileBuffer), mimeType)
        const response = await result.response
        const text = response.text()
        
        return res.json({ success: true, analysis: text })
    } catch (error: unknown) {
        console.error('[MUSIC ROUTE ERROR] POST /analyze:', error)
        return res.status(500).json({ success: false, message: 'Failed to analyze asset' })
    }
})

export default router
