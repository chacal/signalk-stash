describe('Stash UI', () => {
  before(() => {
    cy.request('POST', '/test/reset-tables')
    cy.request('POST', '/test/insert-positions')
  })

  it('works', () => {
    cy.visit('/')
  })
})
