import _ from 'lodash'
import * as React from 'react'

import Map from './Map'
import { MapPanelState } from './mappanel-state'
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
        viewportA={panelState.viewport}
        tracksO={panelState.tracksToRender}
      />
      <VesselSelectionPanel
        vesselsP={panelState.vesselSelectionState.vessels}
        selectedVesselsA={panelState.vesselSelectionState.selectedVessels}
      />
    </React.Fragment>
  )
}

export default MapPanel
