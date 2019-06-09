import { Writable } from 'stream'
import { Callback } from './RetryingWritableStream'

export default class SplittingWritableStream<T> extends Writable {
  private currentOutput: Writable
  private writeCount: number = 0

  constructor(
    private readonly createNewOutput: () => Writable,
    private readonly splitSize = 10
  ) {
    super({ highWaterMark: 1 })
    this.currentOutput = createNewOutput()
    this.currentOutput.on('error', err => this.emit('error', err))
  }

  _write(value: T, encoding: string, done: any) {
    const ret = this.currentOutput.write(value)
    this.writeCount++

    const nextOp =
      this.writeCount < this.splitSize ? done : () => this.switchOutput(done)

    if (ret) {
      nextOp()
    } else {
      this.currentOutput.once('drain', nextOp)
    }
  }

  _final(cb: Callback) {
    console.log('Stream final')
    this.currentOutput.end(cb)
  }

  switchOutput(done: Callback) {
    this.currentOutput.end(() => {
      console.log('Creating new output stream')
      // Previous output was successfully flushed, create a new one
      this.writeCount = 0
      this.currentOutput = this.createNewOutput()
      this.currentOutput.on('error', err => this.emit('error', err))
      done()
    })
  }
}
