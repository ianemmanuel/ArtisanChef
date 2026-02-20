import { Router } from 'express'
import v1Routes from './v1'

const metaRouter: Router = Router()

metaRouter.use('/v1', v1Routes)


metaRouter.get('/', (req, res) => {
  res.json({
    module: 'meta',
    description: 'Metadata management module',
    availableVersions: ['v1'],
    currentVersion: 'v1',
    endpoints: {
      root: '/',
      v1: '/v1'
    }
  })
})

export default metaRouter