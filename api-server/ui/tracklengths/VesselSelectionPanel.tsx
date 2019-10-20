import {
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel
} from '@material-ui/core'
import _ from 'lodash'
import * as React from 'react'
import { useObservable } from '../bacon-react'
import { Vessel, VesselSelectionState } from '../vesselselection-state'

interface VesselSelectionPanelProps {
  selectionState: VesselSelectionState
}

const VesselSelectionPanel = ({
  selectionState
}: VesselSelectionPanelProps) => {
  const vessels = useObservable(selectionState.vessels)
  const selectedVessels = useObservable(selectionState.selectedVessels)

  const vesselSelectionChanged = (vessel: Vessel) => (
    event: React.ChangeEvent<HTMLInputElement>,
    checked: boolean
  ) => {
    const newSelection = checked
      ? _.concat(selectedVessels, vessel.vesselId)
      : _.without(selectedVessels, vessel.vesselId)
    selectionState.selectedVessels.set(newSelection)
  }

  return (
    <FormControl component="fieldset">
      <FormLabel component="legend">Select vessels</FormLabel>
      <FormGroup>
        {vessels.map(v => (
          <FormControlLabel
            key={v.vesselId}
            control={
              <Checkbox
                checked={selectedVessels.includes(v.vesselId)}
                onChange={vesselSelectionChanged(v)}
                value={v.name}
              />
            }
            label={v.name}
          />
        ))}
      </FormGroup>
    </FormControl>
  )
}

export default VesselSelectionPanel
