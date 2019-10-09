import _ from 'lodash'
import * as React from 'react'
import { useEffect } from 'react'

import { VesselData } from '../domain/Vessel'
import Map from './Map'
import { MapPanelState } from './mappanel-state'
import VesselSelectionPanel from './VesselSelectionPanel'

interface MapPanelProps {
  loadVessels: () => Promise<VesselData[]>
}

const MapPanel = ({ loadVessels }: MapPanelProps) => {
  const panelState = new MapPanelState()
  useEffect(() => {
    panelState.initVessels()
  })

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
