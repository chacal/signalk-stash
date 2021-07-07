import {
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel
} from '@material-ui/core'
import _ from 'lodash'
import * as React from 'react'
import { useObservable } from 'rxjs-hooks'
import TimeSelectionState, { SELECTABLE_YEARS } from '../timeselection-state'

interface TimeSelectionPanelProps {
  selectionState: TimeSelectionState
}

const TimeSelectionPanel = ({ selectionState }: TimeSelectionPanelProps) => {
  const selectedYears = useObservable(() => selectionState.selectedYears)

  return (
    <FormControl component="fieldset">
      <FormLabel component="legend">Select vessels</FormLabel>
      <FormGroup>
        {SELECTABLE_YEARS.map(y => (
          <FormControlLabel
            key={y.toString()}
            control={
              <Checkbox
                checked={selectedYears ? selectedYears.isSelected(y) : false}
                onChange={() => selectionState.toggleYear(y)}
                value={y.toString()}
              />
            }
            label={y.toString()}
          />
        ))}
      </FormGroup>
    </FormControl>
  )
}

export default TimeSelectionPanel
