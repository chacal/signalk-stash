import { Duration } from 'js-joda'
import { Writable } from 'stream'
import ArrayReadable from './ArrayReadable'

export type Callback = (err?: Error) => void

export default class BufferingWritableStream<T> extends Writable {
  private buffer: T[] = []

  constructor(
    private readonly createNewOutput: (done: Callback) => Writable,
    private readonly maxBufferSize = 100,
    private readonly retryInterval: Duration = Duration.ofMillis(1000)
  ) {
    super({ highWaterMark: 1, objectMode: true })
  }

  _write(value: T, encoding: string, done: any) {
    this.buffer.push(value)

    if (this.buffer.length < this.maxBufferSize) {
      done()
    } else {
      this.flushBuffer(done)
    }
  }

  _final(cb: Callback) {
    this.flushBuffer(cb)
  }

  flushBuffer(done: Callback) {
    const output = this.createNewOutput((err?: Error) => {
      if (err) {
        setTimeout(() => this.flushBuffer(done), this.retryInterval.toMillis())
      } else {
        this.buffer = []
        done()
      }
    })

    const bufferReader = new ArrayReadable(this.buffer)
    bufferReader.pipe(output)
  }
}
