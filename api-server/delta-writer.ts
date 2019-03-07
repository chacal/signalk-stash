import { SKDelta } from '@chartedsails/strongly-signalk'
import { ITrackDB } from './StashDB'
import { trackpointsFromDelta } from './Trackpoint'

export default class SignalKDeltaWriter {
  constructor(private readonly db: ITrackDB) {}

  writeDelta(delta: SKDelta): Promise<void[]> {
    return Promise.all(
      trackpointsFromDelta(delta).map(trackpoint =>
        this.db.insertTrackpoint(trackpoint)
      )
    )
  }
}
