import { SKDelta } from '@chacal/signalk-ts'
import { Transform, TransformCallback } from 'stream'

export default class SKDeserializingStream extends Transform {
  constructor() {
    super({ objectMode: true })
  }

  _transform(chunk: any, encoding: string, callback: TransformCallback): void {
    try {
      this.push(SKDelta.fromJSON(chunk))
    } catch (e) {
      console.error(
        `Failed to validate Signal K input! Skipping. Error: ${e} Input: ${JSON.stringify(
          chunk
        )}`
      )
    }
    callback()
  }
}
