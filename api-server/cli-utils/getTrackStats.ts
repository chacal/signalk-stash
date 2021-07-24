import { SKContext } from '@chacal/signalk-ts'
import { ZonedDateTime } from '@js-joda/core'
import SKClickHouse from '../db/SKClickHouse'

if (process.argv.length < 5) {
  console.error(
    'Usage: gettrackstats urn:mrn:imo:mmsi:XXXXXXXXX§§ 2019-07-15T00:00Z 2019-07-16T00:00Z'
  )
  process.exit(-1)
}

const ch = new SKClickHouse()
ch.getTrackStatisticsForVesselTimespan(
  process.argv[2] as SKContext,
  ZonedDateTime.parse(process.argv[3]),
  ZonedDateTime.parse(process.argv[4])
)
  .then(stats => console.log(stats.length))
  .catch(err => console.error(err))
