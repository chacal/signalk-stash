import { Express, Request, Response } from 'express'
import * as Joi from 'joi'
import stash from './db/StashDB'
import { BBox, Coords } from './domain/Geo'
import { Schemas, validate } from './domain/validation'

export default function setupTrackAPIRoutes(app: Express) {
  app.get('/tracks', tracks)
}

function tracks(req: Request, res: Response): void {
  const context = contextFromQuery(req)
  const bbox = bboxFromQuery(req)

  stash.getVesselTracks(context, bbox).then(tracksData => {
    res.json({
      type: 'MultiLineString',
      coordinates: tracksData.map(trackData =>
        trackData.map(({ coords }) => [coords.lng, coords.lat])
      )
    })
  })

  function contextFromQuery(req: Request): string {
    const schema = {
      context: Joi.string().required()
    }
    return validate(req.query, schema).context
  }

  function bboxFromQuery(req: Request): BBox | undefined {
    const q = req.query
    if (!!q.nwLat || !!q.nwLng || !!q.seLat || !!q.seLng) {
      const bboxSchema = {
        nwLat: Schemas.lat,
        nwLng: Schemas.lng,
        seLat: Schemas.lat,
        seLng: Schemas.lng
      }
      validate(req.query, bboxSchema)
      const nw = new Coords({ lat: q.nwLat, lng: q.nwLng })
      const se = new Coords({ lat: q.seLat, lng: q.seLng })
      return new BBox({ nw, se })
    } else {
      return undefined
    }
  }
}
