import { SKDelta } from '@chacal/signalk-ts'
import { Transform, TransformCallback } from 'stream'
import { trackpointsFromDelta } from './domain/Trackpoint'

export default class DeltaToTrackpointStream extends Transform {
  constructor() {
    super({ objectMode: true })
  }

  _transform(delta: SKDelta, encoding: string, done: TransformCallback) {
    trackpointsFromDelta(delta).forEach(trackpoint => this.push(trackpoint))
    done()
  }
}
