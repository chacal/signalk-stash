import {
  Checkbox,
  createStyles,
  List,
  ListItem,
  ListItemText,
  makeStyles,
  Paper,
  useMediaQuery,
  WithStyles,
  withStyles
} from '@material-ui/core'
import { Property } from 'baconjs'
import _ from 'lodash'
import * as React from 'react'

import { Atom } from '../domain/Atom'
import { VesselId } from '../domain/Vessel'
import { useObservable } from './bacon-react'
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
interface Props {
  showOnTheMap: boolean
}
const vspStyles = makeStyles({
  root: ({ showOnTheMap: overtheMap }: Props) => {
    if (overtheMap) {
      return {
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        'z-index': 2000
      }
    } else {
      return {}
    }
  }
})

interface VSPProps {
  vesselsP: Property<Vessel[]>
  selectedVesselsA: Atom<VesselId[]>
}

const VesselSelectionPanel = ({ vesselsP, selectedVesselsA }: VSPProps) => {
  const vessels = useObservable(vesselsP)
  const selectedVessels = useObservable(selectedVesselsA)
  const classes = vspStyles({
    showOnTheMap: useMediaQuery('(min-width: 1000px)')
  })

  const vesselSelectionChanged = (vessel: Vessel) => (selected: boolean) => {
    const newSelection = selected
      ? _.concat(selectedVessels, vessel.vesselId)
      : _.without(selectedVessels, vessel.vesselId)
    selectedVesselsA.set(newSelection)
  }

  return (
    <Paper classes={classes}>
      <List>
        {vessels.map(v => (
          <VesselSelection
            key={v.vesselId}
            vessel={v}
            selected={selectedVessels.includes(v.vesselId)}
            selectionChanged={vesselSelectionChanged(v)}
          />
        ))}
      </List>
    </Paper>
  )
}

export default VesselSelectionPanel
