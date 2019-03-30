import express, { NextFunction, Request, Response } from 'express'
import path from 'path'
import { ExpressAppCustomizer } from './APIServerMain'
import { IConfig } from './Config'
import setupTrackAPIRoutes from './TrackAPI'

const publicPath = path.join(__dirname, '../../api-server/public')

class API {
  constructor(
    private readonly config: IConfig,
    private readonly customizer: ExpressAppCustomizer,
    private readonly app = express()
  ) {
    this.customizer(this.app)
    setupTrackAPIRoutes(this.app)
    this.app.use(express.static(publicPath))
    this.app.use(this.validationErrorHandler)
    this.app.use(this.defaultErrorHandler)
  }

  start() {
    this.app.listen(this.config.port, () =>
      console.log(`Listening on port ${this.config.port}!`)
    )
  }

  private validationErrorHandler(
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
  ): any {
    if (err && typeof err === 'object' && err.name === 'ValidationError') {
      res.status(400).json({
        error: err
      })
    } else {
      next(err)
    }
  }

  private defaultErrorHandler(
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
  ): any {
    console.error(err)
    res.status(500).json({
      error: typeof err === 'object' ? err.toString() : JSON.stringify(err)
    })
  }
}

export default API
