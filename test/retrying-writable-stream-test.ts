import { Writable } from 'stream'
import RetryingWritableStream, {
  Callback
} from '../api-server/RetryingWritableStream'

class TestWritable extends Writable {
  private static failCount: number = 0

  constructor() {
    super()
  }

  _write(value: any, encoding: string, done: any) {
    console.log('Buffering', value)
    done()
  }

  _final(cb: Callback) {
    console.log('Final')
    if (TestWritable.failCount === 3) {
      cb()
    } else {
      TestWritable.failCount++
      console.log('Creating error')
      cb(new Error('laa'))
    }
  }
}

describe('RetryingStream', () => {
  it('works', done => {
    let currentWritable: TestWritable
    const createDownstream = () => {
      currentWritable = new TestWritable()
      return currentWritable
    }
    const retrier = new RetryingWritableStream(createDownstream)

    let count = 0
    writeNext()

    function writeNext() {
      if (count < 5) {
        const ret = retrier.write('' + count)
        console.log(ret)
        count++
        if (ret) {
          writeNext()
        } else {
          retrier.once('drain', () => {
            console.log('Drain')
            writeNext()
          })
        }
      } else {
        retrier.on('finish', () => console.log('Retrier finished'))
        retrier.end(() => {
          console.log('End called')
          done()
        })
      }
    }
  }).timeout(5000)
})
