import { Request, Response, Router } from "express"
import applicationRouter from './application.routes'
import documentRouter from './documents.routes'

const v1Router: Router = Router()

// Mount vendor routes
v1Router.use('/applications', applicationRouter)
v1Router.use('/documents', documentRouter)

// Vendor module info endpoint (optional)
v1Router.get('/', (req: Request, res: Response) => {
  res.json({
    module: 'vendor',
    version: 'v1',
    endpoints: {
      applications: {
        GET: '/applications',
        POST: '/applications',
        submit: 'POST /applications/submit'
      },
      documents: {
        POST: '/documents',
        DELETE: '/documents/:id'
      }
    }
  })
})

// V1 vendor health check
v1Router.get('/health', (req: Request, res: Response) => {
  res.json({
    module: 'vendor',
    version: 'v1',
    status: 'healthy',
    timestamp: new Date().toISOString()
  })
})

export default v1Router