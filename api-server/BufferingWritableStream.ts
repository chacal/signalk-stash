import { Writable } from 'stream'
import ArrayReadable from './ArrayReadable'
import { Callback } from './RetryingWritableStream'

export default class BufferingWritableStream<T> extends Writable {
  private buffer: T[] = []
  private retryIntervalMs: number = 1000

  constructor(
    private readonly createNewOutput: () => Writable,
    private readonly maxBufferSize = 10
  ) {
    super({ highWaterMark: 1 })
  }

  _write(value: T, encoding: string, done: any) {
    console.log('Buffering')
    this.buffer.push(value)

    if (this.buffer.length < this.maxBufferSize) {
      done()
    } else {
      this.flushBuffer(done)
    }
  }

  _final(cb: Callback) {
    console.log('Stream ending')
    this.flushBuffer(cb)
  }

  flushBuffer(done: Callback) {
    console.log('Flushing buffer')
    const output = this.createNewOutput()
    output.on('finish', () => {
      this.buffer = []
      done()
    })
    output.on('error', () => {
      output.removeAllListeners('finish')
      setTimeout(() => this.flushBuffer(done), this.retryIntervalMs)
    })

    const bufferReader = new ArrayReadable(this.buffer)
    bufferReader.pipe(output)
  }
}
