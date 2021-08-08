import request from 'supertest'
import { addAuthCookie, startTestApp } from './test-util'

describe('Backend API', () => {
  const app = startTestApp()

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
})
