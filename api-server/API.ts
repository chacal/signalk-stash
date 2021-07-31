import Debug from 'debug'
import express, {
  Express,
  NextFunction,
  Request,
  RequestHandler,
  Response
} from 'express'
import jwt from 'express-jwt'
import * as Joi from 'joi'
import jwksRsa from 'jwks-rsa'
import path from 'path'
import { ExpressAppCustomizer } from './APIServerMain'
import config, { IConfig } from './Config'
import stash from './db/StashDB'
import { validate } from './domain/validation'
import setupMMLTilesAPIRoutes from './MMLTilesAPI'
import setupMqttCredentialsAPIRoutes, {
  insertLatestDeltaReaderAccountFromConfig
} from './MqttCredentialsAPI'
import setupTrackAPIRoutes from './TrackAPI'
import setupVesselAPIRoutes from './VesselAPI'

const publicPath = path.join(__dirname, '../../api-server/public')
const debug = Debug('stash:API')

// Add 'user' field to Express Request type. The field is added by checkJwt
// middleware
declare global {
  namespace Express {
    interface Request {
      user: {
        'https://signalk-stash.chacal.fi/email': string
        'https://signalk-stash.chacal.fi/email_verified': boolean
      }
    }
  }
}

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
    jwksUri: config.auth0.jwksUri
  }),
  audience: config.auth0.audience,
  issuer: config.auth0.issuer,
  algorithms: ['RS256']
})

const checkVesselOwner = (req: Request, res: Response, next: NextFunction) => {
  validate(
    req.user['https://signalk-stash.chacal.fi/email'],
    Joi.string()
      .email()
      .required()
  )
  // Require verified email in production
  validate(
    req.user['https://signalk-stash.chacal.fi/email_verified'],
    Joi.boolean()
      .required()
      .valid(config.isProduction ? true : [false, true])
  )

  const ownerEmail = req.user['https://signalk-stash.chacal.fi/email']
  debug(`Authorizing vessel for owner email ${ownerEmail}`)
  stash
    .getVesselByOwnerEmail(ownerEmail)
    .then(v => next()) // We only check that user is associated to _some_ vessel
    .catch(e => {
      debug(`Failed vessel authorization for owner email ${ownerEmail}.`, e)
      res
        .status(401)
        .json({ error: `No vessel found for owner email ${ownerEmail}` })
    })
}

export function authorizedGet<T>(
  app: Express,
  url: string,
  requestHandler: (req: Request, res: Response) => Promise<T>
) {
  app.get(url, checkJwt, checkVesselOwner, asyncHandler(requestHandler))
}
