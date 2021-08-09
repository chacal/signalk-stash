import { expect } from 'chai'
import request from 'supertest'
import DB from '../api-server/db/StashDB'
import {
  addAuthCookie,
  getAuthorizedJson,
  getJson,
  startTestApp,
  testVessel
} from './test-util'
import TestDB from './TestDB'

describe('Backend API', () => {
  const app = startTestApp()

  beforeEach(() => TestDB.resetTables().then(() => DB.upsertVessel(testVessel)))

  it('redirects unauthorized root request to /login', () => {
    return request(app)
      .get('/')
      .expect(302)
      .expect('Location', '/login')
  })

  it('returns index.html with authorized root request', () => {
    return addAuthCookie(request(app).get('/'))
      .expect(200)
      .expect('Content-Type', 'text/html; charset=UTF-8')
  })

  it('returns 401 for unauthorized static resource request', () => {
    return request(app)
      .get('/favicon.ico')
      .expect(401)
      .expect('Content-Type', 'application/json; charset=utf-8')
  })

  it('returns user info for authorized requests', () => {
    return getAuthorizedJson(app, '/user-info').expect(res => {
      expect(res.body.email).to.eq('unittest@signalk-stash-dev.chacal.fi')
    })
  })

  it('requires vessel associated to authorized email', async () => {
    await TestDB.resetTables()
    // There are no vessels in DB here -> authorization should fail
    await getAuthorizedJson(app, '/contexts', 401)

    // Insert one vessel, but with non-matching owner email -> authorization should still fail
    await DB.upsertVessel(
      Object.assign({}, testVessel, { ownerEmail: 'different_email@test.com' })
    )
    await getAuthorizedJson(app, '/contexts', 401)

    // Update vessel to match the owner email -> authorization should succeed
    await DB.upsertVessel(testVessel)
    await getAuthorizedJson(app, '/contexts')
  })

  it('requires valid email', async () => {
    const req = getJson(app, '/contexts', 400)
    await addAuthCookie(req, 'not-valid-email')
  })

  it('requires verified email', async () => {
    const req = getJson(app, '/contexts', 400)
    await addAuthCookie(req, 'unittest@signalk-stash-dev.chacal.fi', false)
  })
})
