import { expect } from 'chai'
import CountDownLatch from '../api-server/CountDownLatch'

describe('Countdown latch', () => {
  it('calls onCompletion after correct amount of signals', done => {
    const latch = new CountDownLatch(2, done)
    latch.signal()
    latch.signal()
  })
  it('calls onCompletion with error when signalled with error', done => {
    const error = new Error('test')
    const latch = new CountDownLatch(2, err => {
      expect(err).to.equal(error)
      done()
    })
    latch.signal(error)
  })
  it('calls onCompletion only once when signalled with error', () => {
    let callCount = 0
    const error = new Error('test')
    const latch = new CountDownLatch(2, () => callCount++)
    latch.signal(error)
    latch.signal(error)
    expect(callCount).to.equal(1)
  })
  it('calls onCompletion only once when signalled multiple times', () => {
    let callCount = 0
    const latch = new CountDownLatch(2, () => callCount++)
    latch.signal()
    latch.signal()
    latch.signal()
    expect(callCount).to.equal(1)
  })
  it('postpones onCompletion when capacity is added', () => {
    let callCount = 0
    const latch = new CountDownLatch(2, () => callCount++)
    latch.signal()
    expect(callCount).to.equal(0)
    latch.addCapacity(1)
    latch.signal()
    expect(callCount).to.equal(0)
    latch.signal()
    expect(callCount).to.equal(1)
  })
})
