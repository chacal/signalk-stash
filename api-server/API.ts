import express, {
  Express,
  NextFunction,
  Request,
  RequestHandler,
  Response
} from 'express'
import jwt from 'express-jwt'
import jwtAuthz from 'express-jwt-authz'
import jwksRsa from 'jwks-rsa'
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
    setupTrackAPIRoutes(this.app)
    setupVesselAPIRoutes(this.app)
    setupMqttCredentialsAPIRoutes(this.app)
    setupMMLTilesAPIRoutes(this.app)
    this.app.use(express.static(publicPath))
    this.app.use(this.validationErrorHandler)
    this.app.use(this.authorizationErrorHandler)
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
      res.status(400).json({ error: err })
    } else {
      next(err)
    }
  }

  private authorizationErrorHandler(
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
  ): any {
    if (err && (err.status === 401 || err.statusCode === 403)) {
      res.status(err.status || err.statusCode).json({ error: err })
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

const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: 'https://signalk-stash.eu.auth0.com/.well-known/jwks.json'
  }),
  audience: 'https://signalk-stash.chacal.fi',
  issuer: 'https://signalk-stash.eu.auth0.com/',
  algorithms: ['RS256']
})

const checkScope = jwtAuthz(['read:signalk_stash'], {
  failWithError: true
})

export function authorizedGet<T>(
  app: Express,
  url: string,
  requestHandler: (req: Request, res: Response) => Promise<T>
) {
  app.get(url, checkJwt, checkScope, asyncHandler(requestHandler))
}
