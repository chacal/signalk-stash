import {
  Checkbox,
  createStyles,
  List,
  ListItem,
  ListItemText,
  Paper,
  WithStyles,
  withStyles
} from '@material-ui/core'
import _ from 'lodash'
import * as React from 'react'

import { Subject } from 'rxjs'
import { useObservable } from 'rxjs-hooks'
import { VesselId } from '../domain/Vessel'
import { Vessel } from './vesselselection-state'

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
        onClick={() => selectionChanged(!selected)}
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
  vessels: Subject<Vessel[]>
  selectedVessels: Subject<VesselId[]>
}

const VesselSelectionPanel = withStyles(vspStyles)(
  ({ vessels, selectedVessels, classes }: VSPProps) => {
    const theVessels = useObservable(() => vessels)
    const theSelectedVessels = useObservable(() => selectedVessels)

    const vesselSelectionChanged = (vessel: Vessel) => (selected: boolean) => {
      const newSelection = selected
        ? _.concat(theSelectedVessels, vessel.vesselId)
        : _.without(theSelectedVessels, vessel.vesselId)
      selectedVessels.next(newSelection as VesselId[])
    }

    return (
      <Paper classes={classes}>
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
      </Paper>
    )
  }
)

export default VesselSelectionPanel
