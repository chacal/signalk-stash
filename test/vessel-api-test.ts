import { expect } from 'chai'
import _ from 'lodash'
import DB from '../api-server/db/StashDB'
import { asVesselId } from '../api-server/domain/Vessel'
import { getJson, startTestApp, testVessel } from './test-util'
import TestDB from './TestDB'

describe('Vessel API', () => {
  const app = startTestApp()

  beforeEach(() => TestDB.resetTables().then(() => DB.upsertVessel(testVessel)))

  it('returns all vessels in db', () => {
    return getJson(app, '/contexts').expect(res => {
      expect(res.body).to.have.lengthOf(1)
      const { vesselId, name } = testVessel
      expect(res.body[0]).to.deep.equal({
        vesselId: asVesselId(vesselId),
        name
      })
    })
  })
})
