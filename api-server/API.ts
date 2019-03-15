import express from 'express'
import path from 'path'
import { IConfig } from './Config'
import bindWebpackMiddlewares from './WebpackMiddlewares'

const isDeveloping = process.env.NODE_ENV !== 'production'
const publicPath = path.join(__dirname, '../../api-server/public')

class API {
  constructor(
    private readonly config: IConfig,
    private readonly app = express()
  ) {}

  start() {
    if (isDeveloping) {
      bindWebpackMiddlewares(this.app)
    }
    this.app.use(express.static(publicPath))
    this.app.listen(this.config.port, () =>
      console.log(`Listening on port ${this.config.port}!`)
    )
  }
}

export default API
