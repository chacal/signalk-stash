import { SKDelta } from '@chacal/signalk-ts'
import { StashDB } from './db/StashDB'

export default class SignalKDeltaWriter {
  constructor(private readonly db: StashDB) {}

  writeDelta(delta: SKDelta): Promise<void[]> {
    return new Promise((resolve, reject) => {
      const stream = this.db.deltaWriteStream(resolve)
      stream.write(delta)
      stream.end()
    })
  }
}
