import { Checkbox, ListItem } from '@material-ui/core'
import { configure, mount, ReactWrapper } from 'enzyme'
import Adapter from 'enzyme-adapter-react-16'
import * as React from 'karet'
import * as U from 'karet.util'
import { LoadState, Vessel } from '../../api-server/ui/ui-domain'
import VesselSelectionPanel from '../../api-server/ui/VesselSelectionPanel'

configure({ adapter: new Adapter() })

const defaultProps = (vessels: Vessel[] = []) => ({
  vessels: U.atom(vessels)
})

const testVessel = (context: string = 'self') => ({
  context,
  selected: false,
  trackLoadState: LoadState.NOT_LOADED
})

describe('VesselSelectionPanel', () => {
  it('renders list of vessels', () => {
    const props = defaultProps()
    const vsp = mount(<VesselSelectionPanel {...props} />)
    const F = itemFinder(vsp)

    expect(F.items()).to.have.lengthOf(0)
    props.vessels.set([testVessel()])
    vsp.update()

    expect(F.items()).to.have.lengthOf(1)
    expect(F.item(0).text()).to.equal('self')

    props.vessels.set([testVessel(), testVessel('self2')])
    vsp.update()

    expect(F.items()).to.have.lengthOf(2)
    expect(F.item(1).text()).to.equal('self2')
  })

  it('updates vessels selected state when row or checkbox is clicked', () => {
    const props = defaultProps([testVessel()])
    const vsp = mount(<VesselSelectionPanel {...props} />)
    const F = itemFinder(vsp)

    expect(F.checkbox(0).prop('checked')).to.equal(false)

    F.checkbox(0).simulate('click')

    expect(F.checkbox(0).prop('checked')).to.equal(true)
    expect(props.vessels.get()[0].selected).to.equal(true)

    F.item(0).simulate('click')

    expect(F.checkbox(0).prop('checked')).to.equal(false)
    expect(props.vessels.get()[0].selected).to.equal(false)
  })
})

function itemFinder(vsp: ReactWrapper) {
  return {
    items: () => vsp.find(ListItem),
    item: (index: number) => vsp.find(ListItem).at(index),
    checkbox: (index: number) => vsp.find(Checkbox).at(index)
  }
}
