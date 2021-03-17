import * as React from 'react'
import { configure, mount } from 'enzyme'
import Adapter from 'enzyme-adapter-react-16'
configure({ adapter: new Adapter() })

import TimeSelectionState, { YEARS } from '../../api-server/ui/timeselection-state'

import TimeSelectionPanel from '../../api-server/ui/TimeSelectionPanel'
import { Checkbox, ListItem } from '@material-ui/core'
import { updateAndWait } from '../../test/waiting'
import { take } from 'rxjs/operators'

describe('VesselSelectionPanel', () => {
  it('renders list of years and updates the state when clicked', async () => {
    const timeSelectionState = new TimeSelectionState()
    const ysp = mount(<TimeSelectionPanel timeselection= {timeSelectionState}/>)
  
    //toggle plug 3 years
    expect(ysp.find(ListItem)).to.have.lengthOf(4)

    const checkBoxes = ysp.find(Checkbox)

    expect(checkBoxes.at(1).prop('checked')).to.equal(true)

    timeSelectionState.toggleYear(YEARS.toArray()[1])
    await updateAndWait(
      ysp,
      () => ysp.find(Checkbox).at(1).prop('checked'),
      checked => checked === false
    )

    checkBoxes.at(0).simulate('click')
    await updateAndWait(
      ysp,
      () => ysp.find(Checkbox).at(0).prop('checked'),
      checked => checked === false
    )
    const selectedYears = await timeSelectionState.selectedYears.pipe(take(1)).toPromise()
    expect(selectedYears.toArray()).to.have.length(1)
  })
})
