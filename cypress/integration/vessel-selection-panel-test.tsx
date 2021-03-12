import { Checkbox, ListItem } from '@material-ui/core'
import Color = require('color')
import { configure, mount, ReactWrapper } from 'enzyme'
import Adapter from 'enzyme-adapter-react-16'
import * as React from 'react'

import { asVesselId, VesselId } from '../../api-server/domain/Vessel'
import {
  Vessel,
  VesselSelectionState
} from '../../api-server/ui/vesselselection-state'
import VesselSelectionPanel from '../../api-server/ui/VesselSelectionPanel'
import { updateAndWait } from '../../test/waiting'

configure({ adapter: new Adapter() })

const defaultProps = (vessels: Vessel[] = []) => {
  const vesselSelectionState = new VesselSelectionState()
  vesselSelectionState.vessels.next(vessels)
  return { selectionState: vesselSelectionState }
}

const defaultId = 'urn:mrn:imo:mmsi:200000000'

const testVessel = (vesselId: VesselId = asVesselId(defaultId)) => ({
  vesselId,
  name: vesselId,
  trackColor: Color('#0000AA')
})

describe('VesselSelectionPanel', () => {
  it('renders list of vessels', async () => {
    const props = defaultProps()
    const vsp = mount(<VesselSelectionPanel {...props} />)
    const F = listItemFinder(vsp)

    //toggle is list item 0
    expect(F.items()).to.have.lengthOf(1)
    props.selectionState.vessels.next([testVessel()])

    await updateAndWait(vsp, () => F.items(), items => items.length === 2)

    expect(F.items()).to.have.lengthOf(2)
    expect(F.item(1).text()).to.equal(defaultId)
    expect(F.checkbox(0).prop('style')).to.deep.equal({ color: '#0000AA' })

    props.selectionState.vessels.next([
      testVessel(),
      testVessel(asVesselId('urn:mrn:imo:mmsi:200000001'))
    ])

    await updateAndWait(vsp, () => F.items(), items => items.length === 3)

    expect(F.item(2).text()).to.equal('urn:mrn:imo:mmsi:200000001')
  })

  it('updates vessels selected state when row or checkbox is clicked', async () => {
    const props = defaultProps([testVessel()])
    const vsp = mount(<VesselSelectionPanel {...props} />)
    const F = listItemFinder(vsp)

    expect(F.checkbox(0).prop('checked')).to.equal(false)

    F.checkbox(0).simulate('click')

    await updateAndWait(
      vsp,
      () => F.checkbox(0).prop('checked'),
      checked => checked === true
    )

    expect(props.selectionState.selectedVessels.value).to.have.members([
      asVesselId(defaultId)
    ])

    // first vessel is list item 1
    F.item(1).simulate('click')

    await updateAndWait(
      vsp,
      () => F.checkbox(0).prop('checked'),
      checked => checked === false
    )

    expect(props.selectionState.selectedVessels.value).to.have.members([])
  })
})

function listItemFinder(vsp: ReactWrapper) {
  return {
    items: () => vsp.find(ListItem),
    item: (index: number) => vsp.find(ListItem).at(index),
    checkbox: (index: number) => vsp.find(Checkbox).at(index)
  }
}
