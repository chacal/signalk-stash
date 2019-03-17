import Debug from 'debug'
import { Express, Request, Response } from 'express'
import * as Joi from 'joi'
import stash from './db/StashDB'
import { BBox, Coords, ZoomLevel } from './domain/Geo'
import { Schemas, validate } from './domain/validation'
const debug = Debug('stash:track-api')

export default function setupTrackAPIRoutes(app: Express) {
  app.get('/tracks', tracks)
}

function tracks(req: Request, res: Response): void {
  debug('Query: %o', req.query)

  const context = contextFromQuery(req)
  const bbox = bboxFromQuery(req)
  const zoomLevel = zoomLevelFromQuery(req)
  stash.getVesselTracks(context, bbox, zoomLevel).then(tracksData => {
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

  function zoomLevelFromQuery(req: Request): ZoomLevel | undefined {
    if (req.query.zoomLevel) {
      const schema = {
        zoomLevel: Joi.number()
          .greater(0)
          .less(25)
          .required()
      }
      return validate(req.query, schema).zoomLevel
    } else {
      return undefined
    }
  }
}
