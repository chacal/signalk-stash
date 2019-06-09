import { Writable } from 'stream'
import ArrayReadable from './ArrayReadable'

export type Callback = (err?: Error) => void

export default class RetryingWritableStream<T> extends Writable {
  private output: Writable
  private buffer: T[] = []
  private retryIntervalMs: number = 1000

  constructor(private readonly createNewOutput: () => Writable) {
    super({ highWaterMark: 1 })
    this.output = createNewOutput()
    this.output.on('error', this.onOutputError.bind(this))
  }

  _write(value: T, encoding: string, done: any) {
    this.buffer.push(value)
    const ret = this.output.write(value)

    if (ret) {
      done()
    } else {
      this.output.once('drain', done)
    }
  }

  onOutputError(err: Error) {
    console.log('Output error', err)
    const listeners = this.output.listeners('finish')
    this.output.removeAllListeners('finish')
    this.output.destroy()

    this.output = this.createNewOutput()
    this.output.on('error', this.onOutputError.bind(this))
    listeners.forEach(l => this.output.addListener('finish', () => l()))

    setTimeout(() => {
      const bufferReader = new ArrayReadable(this.buffer)
      bufferReader.pipe(this.output)
    }, this.retryIntervalMs)
  }

  _final(cb: Callback) {
    console.log('Flushing output')
    this.output.on('finish', cb)
    this.output.end()
  }
}
