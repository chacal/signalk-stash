import { SKContext } from '@chacal/signalk-ts'
import Debug from 'debug'
import * as React from 'karet'
import * as U from 'karet.util'
import Kefir, { Observable } from 'kefir'
import { Atom } from 'kefir.atom'
import { LoadState, Vessel } from './ui-domain'

const debug = Debug('stash:trackprovider')

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
}

function loadVessels(): Observable<Vessel[], any> {
  debug('Loading vessels..')
  return Kefir.fromPromise(fetch(`/contexts`).then(res => res.json())).map(
    (contexts: SKContext[]) => {
      debug(`${contexts.length} vessels loaded`)
      return contexts.map(ctx => ({
        context: ctx,
        selected: false,
        trackLoadState: LoadState.NOT_LOADED,
        trackLoadTime: new Date()
      }))
    }
  )
}

export default VesselSelectionPanel
