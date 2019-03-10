import express from 'express'
import path from 'path'
import { IConfig } from './Config'
import stash from './db/StashDB'
import { BBox } from './domain/Geo'

class API {
  constructor(
    private readonly config: IConfig,
    private readonly app = express()
  ) {}

  start() {
    this.setupRoutes()
    this.app.listen(this.config.port, () =>
      console.log(`Listening on port ${this.config.port}!`)
    )
  }

  setupRoutes() {
    this.app.use(express.static(path.join(__dirname, '../../public')))
    this.app.get('/tracks', (req, res) => {
      stash
        .getVesselTracks(
          'self',
          BBox.fromProps(req.query),
          Number(req.query.zoom)
        )
        .then(tracksData => {
          res.json({
            type: 'MultiLineString',
            coordinates: tracksData.map(trackData =>
              trackData.map(({ coords }) => [coords.lng, coords.lat])
            )
          })
        })
    })
  }
}

export default API
