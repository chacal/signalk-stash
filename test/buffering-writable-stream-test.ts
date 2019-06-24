import { expect } from 'chai'
import { Duration } from 'js-joda'
import _ from 'lodash'
import { Writable } from 'stream'
import BufferingWritableStream, {
  Callback
} from '../api-server/BufferingWritableStream'
import CountDownLatch from '../api-server/CountDownLatch'
import EventEmitter = NodeJS.EventEmitter
import { waitFor } from './test-util'

class TestWritable extends Writable {
  static endFailCount: number = 0
  static writeFailCount: number = 0
  buffer: string[] = []

  constructor(
    private readonly done: Callback,
    private readonly endFailCount: number = 0,
    private readonly writeFailCount: number = 0
  ) {
    super({ objectMode: true })
  }

  _write(value: any, encoding: string, done: any) {
    this.buffer.push(value)
    if (TestWritable.writeFailCount < this.writeFailCount) {
      TestWritable.writeFailCount++
      this.done(new Error('Write failed!'))
    } else {
      done()
    }
  }

  _final(cb: Callback) {
    if (TestWritable.endFailCount < this.endFailCount) {
      TestWritable.endFailCount++
      this.done(new Error('End failed'))
    } else {
      cb()
      this.done()
    }
  }
}

let currentOutput = new TestWritable(_.identity)
let outputCreateCount = 0
let streamToTest: BufferingWritableStream<object>

describe('BufferingWritableStream', () => {
  // Initialize shared state for each test
  beforeEach(() => {
    TestWritable.endFailCount = 0
    TestWritable.writeFailCount = 0
    outputCreateCount = 0
  })

  it('writes to output when ending', done => {
    // Test is done when this latch triggers
    const latch = new CountDownLatch(2, done)
    streamToTest = new BufferingWritableStream(createDownstream())

    // Stream should block immediately as it doesn't use internal buffers
    const ret = streamToTest.write({ a: 1 })
    expect(ret).to.equal(false)

    streamToTest.once('drain', () => {
      // Output should be empty as the stream hasn't flushed yet
      expect(currentOutput.buffer).to.eql([])
      latch.signal()
    })
    streamToTest.once('finish', () => {
      expect(currentOutput.buffer).to.eql([{ a: 1 }])
      latch.signal()
    })

    streamToTest.end()
  })

  it('flushes to output when buffer gets full', async () => {
    streamToTest = new BufferingWritableStream(createDownstream(), 2)

    await writeToStream({ a: 1 })
    await writeToStream({ a: 2 })
    expect(currentOutput.buffer).to.eql([{ a: 1 }, { a: 2 }])

    await writeToStream({ a: 3 })
    await writeToStream({ a: 4 })
    expect(currentOutput.buffer).to.eql([{ a: 3 }, { a: 4 }])

    streamToTest.write({ a: 5 })
    streamToTest.end()
    await eventP(streamToTest, 'finish')
    expect(currentOutput.buffer).to.eql([{ a: 5 }])
  })

  it('retries flushing buffer if ending or writing to output fails', async () => {
    streamToTest = new BufferingWritableStream(
      createDownstream(1, 1),
      2,
      Duration.ofMillis(100)
    )

    const start = new Date()
    await writeToStream({ a: 1 })
    await writeToStream({ a: 2 })
    await waitFor(
      () => Promise.resolve(currentOutput.buffer),
      outputBuffer => _.isEqual(outputBuffer, [{ a: 1 }, { a: 2 }])
    )
    // Three outputs should have been created:
    // - First for the failing write to output during flush
    // - Second for the failing end() of the output
    // - Third for the succeeding output
    await waitFor(
      () => Promise.resolve(outputCreateCount),
      createCount => createCount === 3
    )
    expect(new Date().getTime() - start.getTime()).to.be.at.least(100)

    streamToTest.write({ a: 3 })
    streamToTest.end()
    await eventP(streamToTest, 'finish')
    expect(currentOutput.buffer).to.eql([{ a: 3 }])
  })
  it('retries flushing multiple times', async () => {
    streamToTest = new BufferingWritableStream(
      createDownstream(3),
      2,
      Duration.ofMillis(100)
    )

    const start = new Date()
    await writeToStream({ a: 1 })
    await writeToStream({ a: 2 })
    await waitFor(
      () => Promise.resolve(currentOutput.buffer),
      outputBuffer => _.isEqual(outputBuffer, [{ a: 1 }, { a: 2 }])
    )

    // Four outputs should have been created:
    // - Three for the failing flushes
    // - Fourth for the succeeding one
    await waitFor(
      () => Promise.resolve(outputCreateCount),
      createCount => createCount === 4
    )
    expect(new Date().getTime() - start.getTime()).to.be.at.least(3 * 100)

    streamToTest.write({ a: 3 })
    streamToTest.end()
    await eventP(streamToTest, 'finish')
    expect(currentOutput.buffer).to.eql([{ a: 3 }])
  })
  it('flushes periodically', async () => {
    streamToTest = new BufferingWritableStream(
      createDownstream(),
      100,
      Duration.ofMillis(1000),
      Duration.ofMillis(100)
    )

    const start = new Date()
    await writeToStream({ a: 1 })
    await writeToStream({ a: 2 })
    await waitFor(
      () => Promise.resolve(currentOutput.buffer),
      outputBuffer => _.isEqual(outputBuffer, [{ a: 1 }, { a: 2 }])
    )
    expect(new Date().getTime() - start.getTime()).to.be.at.least(100)
  })
})

function createDownstream(
  endFailCount: number = 0,
  writeFailCount: number = 0
) {
  return (done: Callback) => {
    outputCreateCount++
    currentOutput = new TestWritable(done, endFailCount, writeFailCount)
    return currentOutput
  }
}

async function writeToStream(obj: object) {
  streamToTest.write(obj)
  await eventP(streamToTest, 'drain')
}

function eventP(source: EventEmitter, eventName: string) {
  return new Promise((resolve, reject) => {
    source.once(eventName, err => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}
