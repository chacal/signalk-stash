import * as React from 'react'

import { map } from 'rxjs/operators'
import { useAuthToken } from './auth'
import Map from './Map'
import { MapPanelState } from './mappanel-state'
import MapVisibilityAdjustmentPanel from './MapVisibilityAdjustmentPanel'
import TimeSelectionState from './timeselection-state'
import TimeSelectionPanel from './TimeSelectionPanel'
import { VesselSelectionState } from './vesselselection-state'
import VesselSelectionPanel from './VesselSelectionPanel'

interface MapPanelProps {
  vesselSelection: VesselSelectionState
  timeSelection: TimeSelectionState
}

const MapPanel = ({ vesselSelection, timeSelection }: MapPanelProps) => {
  const getAuthToken = useAuthToken()
  const panelState = new MapPanelState(
    vesselSelection,
    timeSelection,
    getAuthToken()
  )

  return (
    <React.Fragment>
      <Map
        center={panelState.initialMapCenter}
        viewport={panelState.viewport}
        tracks={panelState.tracksToRender}
      />
      <VesselSelectionPanel selectionState={panelState.vesselSelectionState} />
      <TimeSelectionPanel timeselection={panelState.timeSelectionState} />
      <MapVisibilityAdjustmentPanel
        zoom={panelState.viewport.pipe(map(v => v.zoom))}
      />
    </React.Fragment>
  )
}

export default MapPanel
