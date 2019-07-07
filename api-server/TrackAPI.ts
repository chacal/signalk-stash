import Debug from 'debug'
import { Express, Request, Response } from 'express'
import * as Joi from 'joi'
import { LocalDate } from 'js-joda'
import { asyncHandler } from './API'
import stash from './db/StashDB'
import { BBox, Coords, ZoomLevel } from './domain/Geo'
import { tracksToGeoJSON } from './domain/Trackpoint'
import { Schemas, validate } from './domain/validation'
const debug = Debug('stash:track-api')

export default function setupTrackAPIRoutes(app: Express) {
  app.get('/tracks/daily/stats', asyncHandler(dailyTrackStats))
  app.get('/tracks', asyncHandler(tracks))
}

async function tracks(req: Request, res: Response) {
  debug('Query: %o', req.query)

  const context = contextFromQuery(req)
  const bbox = bboxFromQuery(req)
  const zoomLevel = zoomLevelFromQuery(req)

  const tracks = await stash.getVesselTracks(context, bbox, zoomLevel)
  res.json(tracksToGeoJSON(tracks, zoomLevel))

  function bboxFromQuery(req: Request): BBox | undefined {
    const q = req.query
    if (!!q.n || !!q.w || !!q.s || !!q.e) {
      const bboxSchema = {
        n: Schemas.lat,
        w: Schemas.lng,
        s: Schemas.lat,
        e: Schemas.lng
      }
      validate(req.query, bboxSchema)
      const nw = new Coords({ lat: q.n, lng: q.w })
      const se = new Coords({ lat: q.s, lng: q.e })
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
async function dailyTrackStats(req: Request, res: Response) {
  debug('Query: %o', req.query)

  const context = contextFromQuery(req)
  const firstDay = dayFromQuery(req, 'firstDay')
  const lastDay = dayFromQuery(req, 'lastDay')

  const trackData = await stash.getDailyTrackStatistics(
    context,
    firstDay,
    lastDay
  )
  res.json(trackData)

  function dayFromQuery(req: Request, paramName: string): LocalDate {
    return LocalDate.parse(req.query[paramName])
  }
}

function contextFromQuery(req: Request): string {
  const schema = {
    context: Joi.string().required()
  }
  return validate(req.query, schema).context
}
