import { Express, Request, Response } from 'express'
import stash from './db/StashDB'

export default function setupTrackAPIRoutes(app: Express) {
  app.get('/tracks', tracks)
}

function tracks(req: Request, res: Response): void {
  // TODO: Get vessel ID from query parameters
  stash.getVesselTracks('self').then(tracksData => {
    res.json({
      type: 'MultiLineString',
      coordinates: tracksData.map(trackData =>
        trackData.map(({ coords }) => [coords.lng, coords.lat])
      )
    })
  })
}
