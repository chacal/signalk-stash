import { SKContext } from '@chacal/signalk-ts'
import { LocalDate } from 'js-joda'
import { StashDB } from '../db/StashDB'

if (process.argv.length < 5) {
  console.error(
    'Usage: getdailytrackstats urn:mrn:imo:mmsi:XXXXXXXXX§§ 2019-07-15 2019-07-18'
  )
  process.exit(-1)
}

const stash = new StashDB()

const firstDate = LocalDate.parse(process.argv[3])
const lastDate = LocalDate.parse(process.argv[4])

stash
  .getDailyTrackStatistics(process.argv[2] as SKContext, firstDate, lastDate)
  .then((x: any) => console.log(JSON.stringify(x, null, 2)))
  .catch((err: Error) => console.error(err))
