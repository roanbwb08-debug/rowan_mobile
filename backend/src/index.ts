import 'dotenv/config'
import cors from 'cors'
import express from 'express'

import chatRouter from './routes/chat.js'
import productsRouter from './routes/products.js'
import integrationsRouter from './routes/integrations.js'
import tenantRouter from './routes/tenant.js'
import catalogRouter from './routes/catalog.js'
import musicRouter from './routes/music.js'

const port = Number(process.env.PORT ?? 3000)
const origin = process.env.FRONTEND_ORIGIN ?? 'http://127.0.0.1:5173'

const app = express()
app.disable('x-powered-by')

app.use(cors({ origin: [origin, 'http://localhost:5173', 'http://127.0.0.1:5173'], methods: ['POST', 'GET', 'PUT', 'DELETE', 'OPTIONS'] }))
app.use(express.json({ limit: '16kb' }))
app.use(express.urlencoded({ extended: true, limit: '16kb' }))

// Health check
app.get('/api/health', (_req, res) => res.json({ success: true }))

// Mount modular routes
app.use('/api/chat', chatRouter)
app.use('/api/products', productsRouter)
app.use('/api/tenant', tenantRouter)
app.use('/api/catalog', catalogRouter)
app.use('/api/music', musicRouter)
app.use('/api', integrationsRouter)

// Fallbacks
app.use((_req, res) => res.status(404).json({ success: false, message: 'Not found.' }))

// Error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof SyntaxError) return res.status(400).json({ success: false, message: 'Invalid JSON request body.' })
  console.error('Unhandled server error:', error instanceof Error ? error.message : error)
  return res.status(500).json({ success: false, message: 'Unexpected server error.' })
})

app.listen(port, '0.0.0.0', () => {
  console.log(`Rowan API listening on http://0.0.0.0:${port}`)
})
