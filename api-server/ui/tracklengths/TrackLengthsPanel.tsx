import _ from 'lodash'
import * as React from 'react'
import { VesselSelectionState } from '../vesselselection-state'
import TrackLengthList from './TrackLengthsList'
import { TrackLengthsPanelState } from './tracklengthspanel-state'
import VesselSelectionPanel from './VesselSelectionPanel'

interface TLPProps {
  vesselSelection: VesselSelectionState
}

const TrackLengthsPanel = ({ vesselSelection }: TLPProps) => {
  const panelState = new TrackLengthsPanelState(vesselSelection)

  return (
    <React.Fragment>
      <VesselSelectionPanel selectionState={panelState.vesselSelectionState} />
      <TrackLengthList trackLengthsPanelState={panelState} />
    </React.Fragment>
  )
}

export default TrackLengthsPanel
