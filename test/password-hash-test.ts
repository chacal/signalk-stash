import { expect } from 'chai'
import { passwordHash } from '../api-server/domain/Auth'

describe('Password hash', () => {
  it('generates unique hashes for same password', () => {
    const pw = 'password'
    const hash1 = passwordHash(pw)
    const hash2 = passwordHash(pw)
    expect(hash1).to.not.equal(hash2)
  })
  it('has correct parameters', () => {
    const [name, hashAlgorithm, iterations, salt, hash] = passwordHash(
      'password'
    ).split('$')
    expect(name).to.equal('PBKDF2')
    expect(hashAlgorithm).to.equal('sha256')
    expect(iterations).to.equal('901')
    expect(salt).to.have.length(16)
    expect(hash).to.have.length(32)
  })
})
