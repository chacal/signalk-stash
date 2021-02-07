import _ from 'lodash'
import * as React from 'react'

import Map from './Map'
import { MapPanelState } from './mappanel-state'
import TimeSelectionPanel from './TimeSelectionPanel'
import { VesselSelectionState } from './vesselselection-state'
import VesselSelectionPanel from './VesselSelectionPanel'

interface MapPanelProps {
  vesselSelection: VesselSelectionState
}

const MapPanel = ({ vesselSelection }: MapPanelProps) => {
  const panelState = new MapPanelState(vesselSelection)

  return (
    <React.Fragment>
      <Map
        center={panelState.initialMapCenter}
        viewport={panelState.viewport}
        tracks={panelState.tracksToRender}
      />
      <VesselSelectionPanel selectionState={panelState.vesselSelectionState} />
      <TimeSelectionPanel timeselection={panelState.timeSelectionState} />
    </React.Fragment>
  )
}

export default MapPanel
