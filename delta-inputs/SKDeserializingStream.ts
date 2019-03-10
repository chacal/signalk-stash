import { SKDelta, SKUpdateJSON } from '@chacal/signalk-ts'
import { Transform, TransformCallback } from 'stream'

export default class SKDeserializingStream extends Transform {
  static fill$sourceIfNeeded(update: SKUpdateJSON) {
    if (!update.$source && update.source) {
      update.$source = update.source.src // TODO: Replace with a proper way to populate $source
    }
  }
  constructor() {
    super({ objectMode: true })
  }

  _transform(chunk: any, encoding: string, callback: TransformCallback): void {
    chunk.updates.forEach(SKDeserializingStream.fill$sourceIfNeeded)
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
