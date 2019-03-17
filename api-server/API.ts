import express, { NextFunction, Request, Response } from 'express'
import path from 'path'
import { IConfig } from './Config'
import setupTrackAPIRoutes from './TrackAPI'
import bindWebpackMiddlewares from './WebpackMiddlewares'

const isDeveloping =
  process.env.ENVIRONMENT !== 'production' && process.env.ENVIRONMENT !== 'test'
const publicPath = path.join(__dirname, '../../api-server/public')

class API {
  constructor(
    private readonly config: IConfig,
    private readonly app = express()
  ) {
    if (isDeveloping) {
      bindWebpackMiddlewares(this.app)
    }
    setupTrackAPIRoutes(this.app)
    this.app.use(express.static(publicPath))
    this.app.use(this.defaultErrorHandler)
  }

  start() {
    this.app.listen(this.config.port, () =>
      console.log(`Listening on port ${this.config.port}!`)
    )
  }

  private defaultErrorHandler(
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
  ): any {
    res.status(500).json({
      error: typeof err === 'object' ? err : JSON.stringify(err)
    })
  }
}

export default API
