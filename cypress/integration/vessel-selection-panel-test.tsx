import { Checkbox, ListItem } from '@material-ui/core'
import Color = require('color')
import { configure, mount, ReactWrapper } from 'enzyme'
import Adapter from 'enzyme-adapter-react-16'
import * as React from 'react'

import { BehaviorSubject } from 'rxjs'
import { asVesselId, VesselId } from '../../api-server/domain/Vessel'
import { Vessel } from '../../api-server/ui/vesselselection-state'
import VesselSelectionPanel from '../../api-server/ui/VesselSelectionPanel'
import { waitFor } from '../../test/waiting'

configure({ adapter: new Adapter() })

const defaultProps = (vessels: Vessel[] = []) => ({
  vesselsP: new BehaviorSubject<Vessel[]>(vessels),
  selectedVesselsA: new BehaviorSubject<VesselId[]>([])
})

const defaultId = 'urn:mrn:imo:mmsi:200000000'

const testVessel = (vesselId: VesselId = asVesselId(defaultId)) => ({
  vesselId,
  name: vesselId,
  trackColor: Color('#0000AA')
})

describe('VesselSelectionPanel', () => {
  it('renders list of vessels', async done => {
    const props = defaultProps()
    const vsp = mount(<VesselSelectionPanel {...props} />)
    const F = itemFinder(vsp)

    expect(F.items()).to.have.lengthOf(0)
    props.vesselsP.next([testVessel()])

    await updateAndWait(vsp, () => F.items(), items => items.length === 1)

    expect(F.items()).to.have.lengthOf(1)
    expect(F.item(0).text()).to.equal(defaultId)
    expect(F.checkbox(0).prop('style')).to.deep.equal({ color: '#0000AA' })

    props.vesselsP.next([
      testVessel(),
      testVessel(asVesselId('urn:mrn:imo:mmsi:200000001'))
    ])

    await updateAndWait(vsp, () => F.items(), items => items.length === 2)

    expect(F.item(1).text()).to.equal('urn:mrn:imo:mmsi:200000001')
    done()
  })

  it('updates vessels selected state when row or checkbox is clicked', async done => {
    const props = defaultProps([testVessel()])
    const vsp = mount(<VesselSelectionPanel {...props} />)
    const F = itemFinder(vsp)

    expect(F.checkbox(0).prop('checked')).to.equal(false)

    F.checkbox(0).simulate('click')

    await updateAndWait(
      vsp,
      () => F.checkbox(0).prop('checked'),
      checked => checked === true
    )

    expect(props.selectedVesselsA.value).to.have.members([
      asVesselId(defaultId)
    ])

    F.item(0).simulate('click')

    await updateAndWait(
      vsp,
      () => F.checkbox(0).prop('checked'),
      checked => checked === false
    )

    expect(props.selectedVesselsA.value).to.have.members([])

    done()
  })
})

function itemFinder(vsp: ReactWrapper) {
  return {
    items: () => vsp.find(ListItem),
    item: (index: number) => vsp.find(ListItem).at(index),
    checkbox: (index: number) => vsp.find(Checkbox).at(index)
  }
}

function updateAndWait<T>(
  component: ReactWrapper,
  action: () => T,
  predicate: (t: T) => boolean
): Promise<T> {
  return waitFor(() => {
    component.update()
    return Promise.resolve(action())
  }, predicate)
}
