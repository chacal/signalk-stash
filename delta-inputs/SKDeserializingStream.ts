import { SKDelta } from '@chacal/signalk-ts'
import { Transform, TransformCallback } from 'stream'

export default class SKDeserializingStream extends Transform {
  constructor() {
    super({ objectMode: true })
  }

  _transform(chunk: any, encoding: string, callback: TransformCallback): void {
    let delta
    try {
      delta = SKDelta.fromJSON(chunk)
    } catch (e) {
      console.error(
        `Failed to validate Signal K input! Skipping. Error: ${e.toString()} Input: ${JSON.stringify(
          chunk
        )}`
      )
    }
    if (delta) {
      this.push(delta)
    }
    callback()
  }
}
