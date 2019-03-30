import { Express } from 'express'
import startAPIServer from '../api-server/APIServerMain'
import config from '../api-server/Config'
import setupTestAPIRoutes from './TestAPI'
import bindWebpackMiddlewares from './WebpackMiddlewares'

function addDevelopmentRoutes(app: Express): void {
  if (config.isDeveloping || config.isIntegrationTesting) {
    bindWebpackMiddlewares(app)
    setupTestAPIRoutes(app)
  }
}

startAPIServer(addDevelopmentRoutes)
