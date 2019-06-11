import { Duration } from 'js-joda'
import { Writable } from 'stream'
import ArrayReadable from './ArrayReadable'
import { Callback } from './RetryingWritableStream'

export default class BufferingWritableStream<T> extends Writable {
  private buffer: T[] = []

  constructor(
    private readonly createNewOutput: () => Writable,
    private readonly maxBufferSize = 10,
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
    const output = this.createNewOutput()
    output.on('finish', () => {
      this.buffer = []
      done()
    })
    output.on('error', () => {
      output.removeAllListeners('finish')
      setTimeout(() => this.flushBuffer(done), this.retryInterval.toMillis())
    })

    const bufferReader = new ArrayReadable(this.buffer)
    bufferReader.pipe(output)
  }
}
