import ClickHouse from '@apla/clickhouse'
import { SKContext } from '@chacal/signalk-ts'
import { lineString } from '@turf/helpers'
import length from '@turf/length'
import simplify from '@turf/simplify'
import { LocalDate, ZonedDateTime, ZoneOffset } from 'js-joda'
import { chQuery } from '../db/SKClickHouse'

export default class TrackStatistics {
  constructor(
    readonly context: SKContext,
    readonly start: ZonedDateTime,
    readonly end: ZonedDateTime,
    readonly length: number
  ) {}
}

export function statsFromCoordinates(
  context: SKContext,
  start: ZonedDateTime,
  end: ZonedDateTime,
  coordinates: number[][]
) {
  return new TrackStatistics(context, start, end, trackLength(coordinates))
}

export function getTrackStatisticsForVesselTimespan(
  ch: ClickHouse,
  context: SKContext,
  start: ZonedDateTime,
  end: ZonedDateTime
): Promise<TrackStatistics> {
  const timeResolutionSeconds = 60
  const selectFields = `
  (intDiv(toUnixTimestamp(ts), ${timeResolutionSeconds}) * ${timeResolutionSeconds}) as t,
  median(lat),
  median(lng)`
  const groupByClause = 'GROUP BY t'
  const orderBy = 't'

  const query = `
  SELECT ${selectFields}
  FROM trackpoint
  WHERE context = '${context}'
  AND ts >= ${start.toEpochSecond()} AND ts < ${end.toEpochSecond()}
  ${groupByClause}
  ORDER BY ${orderBy}`

  return chQuery(ch, query)
    .then(x =>
      x.data.map(([t, lat, lon]: [number, number, number]) => [lon, lat])
    )
    .then(
      (coordinates: number[][]): TrackStatistics =>
        statsFromCoordinates(context, start, end, coordinates)
    )
}

function trackLength(coordinates: number[][]): number {
  if (coordinates.length <= 1) {
    return 0
  }
  const linestring = simplify(lineString(coordinates), {
    tolerance: 0.00025,
    mutate: true
  })
  return length(linestring, { units: 'kilometers' }) * 1000
}

export function getDailyTrackStatistics(
  ch: ClickHouse,
  context: SKContext,
  firstDate: LocalDate,
  lastDate: LocalDate
): Promise<TrackStatistics[]> {
  if (!firstDate.isBefore(lastDate)) {
    return Promise.reject(
      `First date must be before last:${firstDate}-${lastDate}`
    )
  }

  let aDate = firstDate
  const jobs: Array<() => Promise<TrackStatistics>> = []
  while (!aDate.isAfter(lastDate)) {
    const theDate = aDate
    jobs.push(() =>
      getTrackStatisticsForVesselTimespan(
        ch,
        context,
        theDate.atStartOfDayWithZone(ZoneOffset.UTC),
        theDate.plusDays(1).atStartOfDayWithZone(ZoneOffset.UTC)
      )
    )
    aDate = aDate.plusDays(1)
  }
  return new Promise((resolve, reject) => {
    // execute the calls in order
    const result: TrackStatistics[] = []
    jobs.reduce(
      (acc: any, f: any, index: number) =>
        acc
          .then(() => {
            const statsP: Promise<TrackStatistics> = f()
            statsP
              .then((stats: TrackStatistics) => {
                if (stats.length > 0) {
                  result.push(stats)
                }
                // this is the last one, so resolve the Promise we returned
                if (index === jobs.length - 1) {
                  resolve(result)
                }
              })
              .catch((err: Error) => reject(err))
            return statsP
          })
          .catch((err: Error) => reject(err)),
      Promise.resolve()
    )
  })
}
