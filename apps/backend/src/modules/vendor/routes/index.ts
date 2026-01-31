import { Router } from 'express'
import v1Routes from './v1'

const vendorRouter: Router = Router()

// Mount versioned routes
vendorRouter.use('/v1', v1Routes)

// Root vendor module endpoint
vendorRouter.get('/', (req, res) => {
  res.json({
    module: 'vendor',
    description: 'Vendor management module',
    availableVersions: ['v1'],
    currentVersion: 'v1',
    endpoints: {
      root: '/',
      v1: '/v1'
    }
  })
})

export default vendorRouter