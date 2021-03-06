import Debug from 'debug'
import { EventEmitter } from 'events'
import { Duration } from 'js-joda'
import _ from 'lodash'
import { Writable } from 'stream'
import ArrayReadable from './ArrayReadable'
import Timeout = NodeJS.Timeout

const debug = Debug('stash:BufferingWritableStream')

export type Callback = (err?: Error) => void

export default class BufferingWritableStream<T> extends Writable {
  private buffer: T[] = []
  private flushedEmitter: EventEmitter = new EventEmitter()
  private isFlushing = false
  private readonly intervalId: Timeout

  constructor(
    private readonly createNewOutput: (done: Callback) => Writable,
    private readonly maxBufferSize = 100,
    private readonly flushInterval: Duration = Duration.ofMillis(10000),
    private readonly retryInterval: Duration = Duration.ofMillis(1000)
  ) {
    super({ highWaterMark: 1, objectMode: true })
    this.intervalId = setInterval(() => {
      if (!this.isFlushing) {
        debug('Flushing due to timer')
        this.flushCurrentBuffer()
      }
    }, this.flushInterval.toMillis())
  }

  _write(value: T, encoding: string, done: any) {
    this.buffer.push(value)

    if (this.buffer.length < this.maxBufferSize) {
      done()
    } else {
      const flushAndDone = () => {
        this.flushCurrentBuffer()
        done()
      }

      if (this.isFlushing) {
        this.flushedEmitter.once('flushed', flushAndDone)
      } else {
        flushAndDone()
      }
    }
  }

  _final(cb: Callback) {
    debug('_final')
    clearInterval(this.intervalId)
    if (this.isFlushing) {
      this.flushedEmitter.once('flushed', () => this.flushCurrentBuffer(cb))
    } else {
      this.flushCurrentBuffer(cb)
    }
  }

  flushCurrentBuffer(done: Callback = _.noop) {
    this.isFlushing = true
    this.doFlushBuffer(this.buffer, done)
    this.buffer = []
  }

  doFlushBuffer(buffer: T[], done: Callback) {
    debug('doFlushBuffer')
    const output = this.createNewOutput((err?: Error) => {
      if (err) {
        console.error(err)
        setTimeout(
          () => this.doFlushBuffer(buffer, done),
          this.retryInterval.toMillis()
        )
      } else {
        this.isFlushing = false
        this.flushedEmitter.emit('flushed')
        debug('flushed')
        done()
      }
    })

    const bufferReader = new ArrayReadable(buffer)
    bufferReader.pipe(output)
  }
}
