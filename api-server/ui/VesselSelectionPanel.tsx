import {
  Checkbox,
  Collapse,
  createStyles,
  List,
  ListItem,
  ListItemText,
  Paper,
  WithStyles,
  withStyles
} from '@material-ui/core'
import { KeyboardArrowDown, KeyboardArrowUp } from '@material-ui/icons'
import _ from 'lodash'
import * as React from 'react'
import { useState } from 'react'

import { useObservable } from 'rxjs-hooks'
import { VesselId } from '../domain/Vessel'
import { Vessel, VesselSelectionState } from './vesselselection-state'

//
//   VesselSelection
//
const vsStyles = createStyles({
  button: {
    padding: '0 6px 0 16px'
  }
})
interface VSProps extends WithStyles<typeof vsStyles> {
  vessel: Vessel
  selected: boolean
  selectionChanged: (selected: boolean) => void
}

const VesselSelection = withStyles(vsStyles)(
  ({ vessel, selected, selectionChanged, classes }: VSProps) => {
    return (
      <ListItem
        button
        classes={classes}
        onClick={e => selectionChanged(!selected)}
        data-cy="vessel-selection-panel__vessel"
      >
        <ListItemText primary={vessel.name} />
        <Checkbox
          color={'primary'}
          checked={selected}
          style={{ color: vessel.trackColor.hex() }}
          data-cy="vessel-selection-panel__vessel_checkbox"
        />
      </ListItem>
    )
  }
)

//
//   VesselSelectionPanel
//
const vspStyles = createStyles({
  root: {
    position: 'absolute',
    bottom: '10px',
    left: '10px',
    'z-index': 2000
  }
})

interface VSPProps extends WithStyles<typeof vspStyles> {
  selectionState: VesselSelectionState
}

const VesselSelectionPanel = withStyles(vspStyles)(
  ({ selectionState, classes }: VSPProps) => {
    const [collapsed, setCollapsed] = useState(true)
    const theVessels = useObservable(() => selectionState.vessels)
    const theSelectedVessels = useObservable(
      () => selectionState.selectedVessels
    )

    const vesselSelectionChanged = (vessel: Vessel) => (selected: boolean) => {
      const newSelection = selected
        ? _.concat(theSelectedVessels, vessel.vesselId)
        : _.without(theSelectedVessels, vessel.vesselId)
      selectionState.selectedVessels.next(newSelection as VesselId[])
    }

    return (
      <Paper classes={classes}>
        <span
          onClick={() => setCollapsed(!collapsed)}
          data-cy="vessel-selection-panel-caret"
        >
          <ListItem>
            {collapsed ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </ListItem>
        </span>
        <Collapse in={!collapsed}>
          <List>
            {(theVessels || []).map(v => (
              <VesselSelection
                key={v.vesselId}
                vessel={v}
                selected={(theSelectedVessels || []).includes(v.vesselId)}
                selectionChanged={vesselSelectionChanged(v)}
              />
            ))}
          </List>
        </Collapse>
      </Paper>
    )
  }
)

export default VesselSelectionPanel
