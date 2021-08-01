import { Year } from '@js-joda/core'
import { Box } from '@material-ui/core'
import * as React from 'react'
import { VesselId } from '../../domain/Vessel'
import { useAuthToken } from '../auth'
import { fetchTrackLengths } from '../backend-requests'
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
  const getAuthToken = useAuthToken()
  const trackLengthFetcher = (vesselId: VesselId, year: Year) =>
    getAuthToken().then(token => fetchTrackLengths(vesselId, year, token))

  const panelState = new TrackLengthsPanelState(
    vesselSelection,
    timeSelection,
    trackLengthFetcher
  )

  return (
    <Box margin={2}>
      <VesselSelectionPanel selectionState={panelState.vesselSelectionState} />
      <TimeSelectionPanel selectionState={panelState.timeSelectionState} />
      <TrackLengthList trackLengthsPanelState={panelState} />
    </Box>
  )
}

export default TrackLengthsPanel
