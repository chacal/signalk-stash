import { expect } from 'chai'
import _ from 'lodash'
import { Writable } from 'stream'
import AbstractDoubleOutputStream, {
  OutputStates
} from '../api-server/AbstractDoubleOutputStream'

interface Value {
  value: number
}

class TestStream extends AbstractDoubleOutputStream<Value> {
  constructor(
    readonly out1: Writable,
    readonly out2: Writable,
    highWaterMark: number
  ) {
    super(out1, out2, { highWaterMark, objectMode: true })
  }
  protected writeToOutputs(value: Value): OutputStates {
    // Spread evenly to children
    if (value.value % 2 === 0) {
      return [this.out1.write(value), true]
    } else {
      return [true, this.out2.write(value)]
    }
  }
}

class TestWritable extends Writable {
  doneCallbacks: any[] = []
  constructor(readonly name: string, highWaterMark: number) {
    super({ highWaterMark, objectMode: true })
  }

  _write(value: any, encoding: string, done: any) {
    this.doneCallbacks.push(done)
    // We don't call done() here -> the stream blocks
  }

  unblock() {
    const cbs = this.doneCallbacks
    this.doneCallbacks = []
    cbs.forEach(cb => cb())
  }
}

describe('DoubleOutputStream', () => {
  it('blocks when both it outputs block immediately', () => {
    const double = new TestStream(
      new TestWritable('out1', 1),
      new TestWritable('out2', 1),
      4
    )

    // Outputs have highWaterMark of 1
    // -> they return false immediately after the first write
    // -> from then on, objects are buffered by the double stream that has highWaterMark of 4
    // -> for the fourth write double stream should return false as it becomes full
    _.range(3).forEach(i => {
      expect(double.write({ value: i })).to.equal(true)
    })
    // Fourth write, double stream becomes full and should return false
    expect(double.write({ value: 3 })).to.equal(false)
  })
  it('blocks when both it outputs block after a while', () => {
    const double = new TestStream(
      new TestWritable('out1', 3),
      new TestWritable('out2', 3),
      4
    )

    // Outputs have highWaterMark of 3
    // -> they return false for the 5th write (both accept 2 and then out1 becomes full on 5th write)
    // -> 5th, 6th and 7th writes are buffered by double stream
    // -> for the eight write it should return false as it becomes full
    _.range(7).forEach(i => {
      expect(double.write({ value: i })).to.equal(true)
    })
    // Eight write, double stream becomes full and should return false
    expect(double.write({ value: 7 })).to.equal(false)
  })
  it('continues when both of its outputs are not blocked anymore', () => {
    const out1 = new TestWritable('out1', 1)
    const out2 = new TestWritable('out2', 1)
    const double = new TestStream(out1, out2, 4)

    _.range(3).forEach(i => {
      expect(double.write({ value: i })).to.equal(true)
    })
    expect(double.write({ value: 3 })).to.equal(false)
    out1.unblock()
    expect(double.write({ value: 4 })).to.equal(false)
    out2.unblock()
    expect(double.write({ value: 5 })).to.equal(false)
    out1.unblock()
    out2.unblock()
    expect(double.write({ value: 6 })).to.equal(true)
  })
})
