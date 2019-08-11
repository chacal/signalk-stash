import Debug from 'debug'
import { Writable, WritableOptions } from 'stream'
import CountDownLatch from './CountDownLatch'

const debug = Debug('stash:AbstractDoubleOutputStream')

export type OutputStates = [boolean, boolean]

export default abstract class AbstractDoubleOutputStream<T> extends Writable {
  protected constructor(
    private readonly output1: Writable,
    private readonly output2: Writable,
    opts?: WritableOptions
  ) {
    super(opts)
    this.on('finish', () => {
      debug('finish called')
      output1.end()
      output2.end()
    })
  }

  _write(value: T, encoding: string, done: any) {
    const [output1CanWrite, output2CanWrite] = this.writeToOutputs(value)
    // if either or both out streams is over highwatermark we need to wait
    // for it to drain before processing more input
    const blockedCount = (!output1CanWrite ? 1 : 0) + (!output2CanWrite ? 1 : 0)
    if (blockedCount > 0) {
      const countdown = new CountDownLatch(blockedCount, done)
      if (!output1CanWrite) {
        this.output1.once('drain', () => countdown.signal())
      }
      if (!output2CanWrite) {
        this.output2.once('drain', () => countdown.signal())
      }
    } else {
      done()
    }
  }

  protected abstract writeToOutputs(value: T): OutputStates
}
