import { Writable } from 'stream'
import BufferingWritableStream from '../api-server/BufferingWritableStream'
import { Callback } from '../api-server/RetryingWritableStream'

class TestWritable extends Writable {
  private static failCount: number = 0

  constructor() {
    super()
  }

  _write(value: any, encoding: string, done: any) {
    console.log('Flushing', value)
    if (TestWritable.failCount === 1) {
      TestWritable.failCount++
      this.emit('error', new Error('Kuikka!'))
    }
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

describe('BufferingWritableStream', () => {
  it('works', done => {
    const createDownstream = () => new TestWritable()
    const stream = new BufferingWritableStream(createDownstream, 2)

    let count = 0
    writeNext()

    function writeNext() {
      if (count < 5) {
        const ret = stream.write('' + count)
        console.log(ret)
        count++
        if (ret) {
          writeNext()
        } else {
          stream.once('drain', () => {
            console.log('Drain')
            writeNext()
          })
        }
      } else {
        stream.end(() => {
          console.log('End called')
          done()
        })
      }
    }
  }).timeout(5000)
})
