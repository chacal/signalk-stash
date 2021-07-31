import { expect } from 'chai'
import DB from '../api-server/db/StashDB'
import { asVesselId } from '../api-server/domain/Vessel'
import {
  getAccessToken,
  getAuthorizedJson,
  getJson,
  startTestApp,
  testVessel
} from './test-util'
import TestDB from './TestDB'

describe('Vessel API', () => {
  const app = startTestApp()

  beforeEach(() => TestDB.resetTables())

  it('returns all vessels in db', async () => {
    await DB.upsertVessel(testVessel)
    const token = await getAccessToken()

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

  it('requires vessel associated to authorized email', async () => {
    // There are no vessels in DB here -> authorization should fail
    const token = await getAccessToken()
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
