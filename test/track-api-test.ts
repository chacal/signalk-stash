import { expect } from 'chai'
import {
  getJson,
  startTestApp,
  writeDeltasFromPositionFixture
} from './test-util'
import TestDB from './TestDB'

describe('Track API', () => {
  const app = startTestApp()

  beforeEach(() => TestDB.resetTables().then(writeDeltasFromPositionFixture))

  it('return tracks for self vessel', () => {
    return getJson(app, '/tracks')
      .expect(res => {
        expect(res.body.type).to.equal('MultiLineString')
        expect(res.body.coordinates).to.have.lengthOf(1)
        expect(res.body.coordinates[0]).to.have.lengthOf(3)
      })
      .expect(200)
  })
})
