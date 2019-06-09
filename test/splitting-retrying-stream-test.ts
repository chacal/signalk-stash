import { Writable } from 'stream'
import RetryingWritableStream, {
  Callback
} from '../api-server/RetryingWritableStream'
import SplittingWritableStream from '../api-server/SplittingWritableStream'

class TestWritable extends Writable {
  private static failCount = 0

  constructor(highWaterMark: number) {
    super({ highWaterMark, objectMode: true })
  }

  _write(value: any, encoding: string, done: any) {
    console.log('Buffering', value)
    done()
  }

  _final(cb: Callback) {
    console.log('Final')
    if (TestWritable.failCount < 2) {
      cb(new Error('Failed!'))
      TestWritable.failCount++
    } else {
      cb()
    }
  }
}

describe('Splitting and retrying stream', () => {
  it('works', done => {
    const createRetrier = () =>
      new RetryingWritableStream(() => new TestWritable(2))
    const splitter = new SplittingWritableStream(createRetrier, 2)

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
  }).timeout(5000)
})
