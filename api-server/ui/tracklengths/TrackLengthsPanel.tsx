import { Box } from '@material-ui/core'
import * as React from 'react'
import TimeSelectionState from '../timeselection-state'
import { VesselSelectionState } from '../vesselselection-state'
import TimeSelectionPanel from './TimeSelectionPanel'
import TrackLengthList from './TrackLengthsList'
import { TrackLengthsPanelState } from './tracklengthspanel-state'
import VesselSelectionPanel from './VesselSelectionPanel'

interface TLPProps {
  vesselSelection: VesselSelectionState
  timeSelection: TimeSelectionState
}

const TrackLengthsPanel = ({ vesselSelection, timeSelection }: TLPProps) => {
  const panelState = new TrackLengthsPanelState(vesselSelection, timeSelection)

  return (
    <Box margin={2}>
      <VesselSelectionPanel selectionState={panelState.vesselSelectionState} />
      <TimeSelectionPanel selectionState={panelState.timeSelectionState} />
      <TrackLengthList trackLengthsPanelState={panelState} />
    </Box>
  )
}

export default TrackLengthsPanel
