import { expect } from 'chai'
import _ from 'lodash'
import {
  getJson,
  startTestApp,
  testVesselUuids,
  writeDeltasFromPositionFixture
} from './test-util'
import TestDB from './TestDB'

describe('Vessel API', () => {
  const app = startTestApp()

  beforeEach(() => TestDB.resetTables().then(writeDeltasFromPositionFixture))

  it('returns all contexts of trackpoints', () => {
    return getJson(app, '/contexts').expect(res => {
      expect(res.body).to.have.lengthOf(3)
      expect(res.body).to.have.ordered.members(_.orderBy(testVesselUuids))
    })
  })
})
