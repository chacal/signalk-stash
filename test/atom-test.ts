import { expect } from 'chai'
import { Atom } from '../api-server/domain/Atom'

describe('Atom', () => {
  it('has an initial value', () => {
    const a = Atom(1)
    expect(a.get()).to.eql(1)
  })

  it('can be set', () => {
    const a = Atom(1)
    a.set(5)
    expect(a.get()).to.eql(5)
  })

  it('can be subscribed', done => {
    const expected: number[] = []

    const a = Atom(1)

    a.onValue(v => {
      expected.push(v)
      if (expected.length === 2) {
        expect(expected).to.eql([1, 5])
        done()
      }
    })

    a.set(5)
  })

  it('can be decomposed keeping the initial value', done => {
    const a = Atom(1)
    a.map(v => v + 1).onValue(v => {
      expect(v).to.eql(2)
      done()
    })
  })
})
