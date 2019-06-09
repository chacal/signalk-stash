import { Writable } from 'stream'
import { Callback } from '../api-server/RetryingWritableStream'
import SplittingWritableStream from '../api-server/SplittingWritableStream'

class TestWritable extends Writable {
  constructor(highWaterMark: number) {
    super({ highWaterMark, objectMode: true })
  }

  _write(value: any, encoding: string, done: any) {
    console.log('Buffering', value)
    done()
  }

  _final(cb: Callback) {
    console.log('End')
    cb()
  }
}

describe('SplittingWritableStream', () => {
  it('works', done => {
    let currentWritable: TestWritable
    const createDownstream = () => {
      currentWritable = new TestWritable(10)
      return currentWritable
    }
    const splitter = new SplittingWritableStream(createDownstream, 2)

    let count = 0
    writeNext()

    function writeNext() {
      if (count < 5) {
        const ret = splitter.write('' + count)
        console.log(ret)
        count++
        if (ret) {
          writeNext()
        } else {
          splitter.once('drain', () => {
            console.log('Drain')
            writeNext()
          })
        }
      } else {
        splitter.end(() => {
          console.log('End called')
          done()
        })
      }
    }
  })
})
