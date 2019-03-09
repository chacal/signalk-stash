import express from 'express'
import { IConfig } from './config'

class API {
  constructor(
    private readonly config: IConfig,
    private readonly app = express()
  ) {}

  start() {
    this.app.listen(this.config.port, () =>
      console.log(`Listening on port ${this.config.port}!`)
    )
  }
}

export default API
