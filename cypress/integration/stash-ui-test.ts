describe('Stash UI', () => {
  before(() => {
    cy.request('POST', '/test/reset-tables')
    cy.request('POST', '/test/insert-positions')
  })

  it('renders vessel list', () => {
    cy.visit('/')
    const vesselItem = cy.get('[data-cy=vessel-selection-panel__vessel]')
    vesselItem.should('have.length', 1)
    vesselItem.contains('self')

    const checkBox = vesselItem.get('input[type=checkbox]')
    checkBox.should('not.be.checked')
    checkBox.click()
    checkBox.should('be.checked')

    vesselItem.click()
    checkBox.should('not.be.checked')
  })
})
