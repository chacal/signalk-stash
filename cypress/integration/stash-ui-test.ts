describe('Stash UI', () => {
  before(() => {
    cy.request('POST', '/test/reset-tables')
    cy.request('POST', '/test/insert-positions')
    cy.request('POST', '/test/login')
    cy.visit('/')
  })

  it('renders vessel list', () => {
    vesselItems().should('have.length', 2)

    vesselItem(0).should('not.be.visible')
    vesselItem(1).should('not.be.visible')

    vesselToggle().click()

    vesselItem(0).should('be.visible')
    vesselItem(1).should('be.visible')

    checkboxContainers().should($items =>
      expect($items.get(0).style.color).to.not.equal($items.get(1).style.color)
    )

    vesselItem(0).contains('bar')
    vesselItem(1).contains('foo')
    checkbox(0).should('not.be.checked')
    checkbox(1).should('not.be.checked')

    checkbox(0).click()

    checkbox(0).should('be.checked')
    checkbox(1).should('not.be.checked')

    vesselItem(0).click()

    checkbox(0).should('not.be.checked')
    checkbox(1).should('not.be.checked')
  })

  it('shows logged in email', () => {
    cy.get('[data-cy=account-toolbar__email]').should(
      'have.text',
      'unittest@signalk-stash-dev.chacal.fi'
    )
  })
})

function vesselToggle() {
  return cy.get('[data-cy=vessel-selection-panel-caret]')
}

function vesselItems() {
  return cy.get('[data-cy=vessel-selection-panel__vessel]')
}
function vesselItem(idx: number) {
  return vesselItems().eq(idx)
}

function checkboxContainers() {
  return cy.get('[data-cy=vessel-selection-panel__vessel_checkbox]')
}

function checkbox(idx: number) {
  return vesselItems()
    .find('input[type=checkbox]')
    .eq(idx)
}
