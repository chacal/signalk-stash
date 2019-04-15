import { SKContext } from '@chacal/signalk-ts'
import * as React from 'karet'
import * as U from 'karet.util'
import { Atom } from 'kefir.atom'
import { loadVessels } from './backend-requests'
import { Vessel } from './ui-domain'


interface Props {
  vessels: Atom<Vessel[]>
}

const VesselSelection = ({ vessel }: { vessel: Atom<Vessel> }) => {
  const selected = U.view<Atom<boolean>>('selected', vessel)
  return (
    <li>
      {U.view('context', vessel)}
      <U.Input type={'checkbox'} checked={selected} />
    </li>
  )
}

const VesselSelectionPanel = ({ vessels }: Props) => {
  return (
    <div className={'vessel-selection-panel'}>
      {U.set(vessels, loadVessels())}
      Available vessels:
      <ul>
        {U.mapElemsWithIds(
          'context',
          (vessel, context) => (
            <VesselSelection key={context} vessel={vessel} />
          ),
          vessels
        )}
      </ul>
    </div>
  )

export default VesselSelectionPanel
