import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import path from 'path'
import { createServer as createViteServer } from 'vite'

import chatRouter from './backend/src/routes/chat.js'
import productsRouter from './backend/src/routes/products.js'
import integrationsRouter from './backend/src/routes/integrations.js'
import tenantRouter from './backend/src/routes/tenant.js'
import devicesRouter from './backend/src/routes/devices.js'
import tradingRouter from './backend/src/routes/trading.js'
import analyticsRouter from './backend/src/routes/analytics.js'
import websitesRouter from './backend/src/routes/websites.js'
import widgetRouter from './backend/src/routes/widget.js'
import voiceRouter from './backend/src/routes/voice.js'
import imageRouter from './backend/src/routes/image.js'
import oauthRouter from './backend/src/routes/oauth.js'

async function startServer() {
  const app = express()
  const port = 3000
  const origin = process.env.FRONTEND_ORIGIN ?? 'http://127.0.0.1:5173'

  app.disable('x-powered-by')

  // Public widget routes with open CORS (mount before restricted CORS if needed)
  app.use('/', widgetRouter)

  app.use(cors({ origin: [origin, 'http://localhost:5173', 'http://127.0.0.1:5173'], methods: ['POST', 'GET', 'PATCH', 'DELETE', 'OPTIONS'] }))
  app.use(express.json({ limit: '5mb' }))
  app.use(express.urlencoded({ extended: true, limit: '5mb' }))

  // Health endpoint
  app.get('/api/health', (_req, res) => res.json({ success: true }))

  // Mount modular routes
  app.use('/api/chat', chatRouter)
  app.use('/api/products', productsRouter)
  app.use('/api/tenant', tenantRouter)
  app.use('/api/websites', websitesRouter)
  app.use('/api/devices', devicesRouter)
  app.use('/api/trading', tradingRouter)
  app.use('/api/analytics', analyticsRouter)
  app.use('/api/voice', voiceRouter)
  app.use('/api/image', imageRouter)
  app.use('/api/oauth', oauthRouter)
  app.use('/api', integrationsRouter)

  // Serve Vite in dev mode, static files in production mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    })
    app.use(vite.middlewares)
  } else {
    const distPath = path.join(process.cwd(), 'dist')
    app.use(express.static(distPath))
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'))
    })
  }

  // Fallbacks
  app.use((_req, res) => res.status(404).json({ success: false, message: 'Not found.' }))
  
  // Error handling middleware
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof SyntaxError) return res.status(400).json({ success: false, message: 'Invalid JSON request body.' })
    console.error('Unhandled server error:', error instanceof Error ? error.message : error)
    return res.status(500).json({ success: false, message: 'Unexpected server error.' })
  })

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`)
  })
}

startServer().catch((err) => {
  console.error('Failed to start server:', err)
})
