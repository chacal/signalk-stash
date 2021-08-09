import Debug from 'debug'
import express, {
  NextFunction,
  Request,
  RequestHandler,
  Response
} from 'express'
import { auth } from 'express-openid-connect'
import Joi from 'joi'
import path from 'path'
import { ExpressAppCustomizer } from './APIServerMain'
import { IConfig } from './Config'
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

class API {
  constructor(
    private readonly config: IConfig,
    private readonly customizer: ExpressAppCustomizer,
    private readonly app = express()
  ) {
    this.customizer(this.app)
    this.app.use(
      auth({
        ...config.auth,
        errorOnRequiredAuth: true,
        idpLogout: true
      })
    )
    this.app.use(this.requireVesselOwnership)
    app.get('/user-info', this.getUserInfo)
    setupTrackAPIRoutes(this.app)
    setupVesselAPIRoutes(this.app)
    setupMqttCredentialsAPIRoutes(this.app)
    setupMMLTilesAPIRoutes(this.app)
    this.app.use(express.static(publicPath))
    this.app.use(this.validationErrorHandler)
    this.app.use(this.authErrorHandler)
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

  private async getUserInfo(req: Request, res: Response) {
    return res.json(req.oidc.user)
  }

  private requireVesselOwnership(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    validate(
      req.oidc.user?.email,
      Joi.string()
        .email()
        .required()
    )

    validate(
      req.oidc.user?.email_verified,
      Joi.boolean()
        .required()
        .valid(true)
    )

    const ownerEmail = req.oidc.user?.email
    debug(`Authorizing vessel for owner email ${ownerEmail}`)
    stash
      .getVesselByOwnerEmail(ownerEmail)
      .then(() => next()) // We only check that user is associated to _some_ vessel
      .catch(e => {
        debug(`Failed vessel authorization for owner email ${ownerEmail}.`, e)
        res
          .status(401)
          .json({ error: `No vessel found for owner email ${ownerEmail}` })
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

  private authErrorHandler(
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
  ): any {
    if (err && err.statusCode === 401) {
      if (req.path === '/') {
        res.redirect('/login')
      } else {
        res.status(401).json({ error: 'Not authenticated' })
      }
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
