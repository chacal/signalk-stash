import { expect } from 'chai'
import DB from '../api-server/db/StashDB'
import { asVesselId } from '../api-server/domain/Vessel'
import {
  authIt,
  getAuthorizedJson,
  getJson,
  startTestApp,
  testVessel
} from './test-util'
import TestDB from './TestDB'

describe('Vessel API', () => {
  const app = startTestApp()

  beforeEach(() => TestDB.resetTables())

  authIt('returns all vessels in db', async token => {
    await DB.upsertVessel(testVessel)

    return getAuthorizedJson(app, token, '/contexts').expect(res => {
      expect(res.body).to.have.lengthOf(1)
      const { vesselId, name } = testVessel
      expect(res.body[0]).to.deep.equal({
        vesselId: asVesselId(vesselId),
        name
      })
    })
  })

  it('requires authorization', async () => {
    return getJson(app, '/contexts', 401)
  })

  authIt('requires vessel associated to authorized email', async token => {
    // There are no vessels in DB here -> authorization should fail
    await getAuthorizedJson(app, token, '/contexts', 401)

    // Insert one vessel, but with non-matching owner email -> authorization should still fail
    await DB.upsertVessel(
      Object.assign({}, testVessel, { ownerEmail: 'different_email@test.com' })
    )
    await getAuthorizedJson(app, token, '/contexts', 401)

    // Update vessel to match the owner email -> authorization should succeed
    await DB.upsertVessel(testVessel)
    await getAuthorizedJson(app, token, '/contexts')
  })
})
