import express, {
  NextFunction,
  Request,
  RequestHandler,
  Response
} from 'express'
import { auth } from 'express-openid-connect'
import path from 'path'
import { ExpressAppCustomizer } from './APIServerMain'
import { IConfig } from './Config'
import setupMMLTilesAPIRoutes from './MMLTilesAPI'
import setupMqttCredentialsAPIRoutes, {
  insertLatestDeltaReaderAccountFromConfig
} from './MqttCredentialsAPI'
import setupTrackAPIRoutes from './TrackAPI'
import setupVesselAPIRoutes from './VesselAPI'

const publicPath = path.join(__dirname, '../../api-server/public')

class API {
  constructor(
    private readonly config: IConfig,
    private readonly customizer: ExpressAppCustomizer,
    private readonly app = express()
  ) {
    this.customizer(this.app)
    this.app.use(
      auth({
        authRequired: false,
        auth0Logout: true,
        secret: 'random string',
        baseURL: 'http://localhost:3000',
        clientID: '',
        issuerBaseURL: ''
      })
    )
    const isAuthenticatedHttp = (req: Request, res: Response, next: NextFunction) => {
      req.oidc.isAuthenticated() ? next() : res.status(401).send('Not authenticated')
    }
    setupTrackAPIRoutes(this.app, isAuthenticatedHttp)
    setupVesselAPIRoutes(this.app, isAuthenticatedHttp)
    setupMqttCredentialsAPIRoutes(this.app, isAuthenticatedHttp)
    setupMMLTilesAPIRoutes(this.app)
    this.app.get('/', (req, res, next) => {
      req.oidc.isAuthenticated() ? next() : res.redirect('/login')
    })
    this.app.use(express.static(publicPath), )
    this.app.use(this.validationErrorHandler)
    this.app.use(this.defaultErrorHandler)
  }

  async start() {
    await insertLatestDeltaReaderAccountFromConfig()
    return new Promise<void>(resolve => {
      this.app.listen(this.config.port, () => {
        console.log(`Listening on port ${this.config.port}!`)
        resolve()
      })
    })
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

export function asyncHandler<T>(
  requestHandler: (req: Request, res: Response) => Promise<T>
): RequestHandler {
  return (req2: Request, res2: Response, next: NextFunction) => {
    requestHandler(req2, res2).catch(next)
  }
}
