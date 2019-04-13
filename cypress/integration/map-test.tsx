import { configure, mount } from 'enzyme'
import Adapter from 'enzyme-adapter-react-16'
import * as React from 'karet'
import * as U from 'karet.util'
import { GeoJSON, Map as LeafletMap } from 'react-leaflet'
import { Coords } from '../../api-server/domain/Geo'
import Map from '../../api-server/ui/Map'
import { emptyBounds, LoadState, Vessel } from '../../api-server/ui/ui-domain'

configure({ adapter: new Adapter() })

const defaultProps = () => ({
  center: U.atom(new Coords({ lat: 60, lng: 22 })),
  zoom: U.atom(10),
  bounds: U.atom(emptyBounds),
  vessels: U.atom([] as Vessel[])
})

describe('Stash Map', () => {
  it('initializes Leaflet map properly', () => {
    const map = mount(<Map {...defaultProps()} />)

    expect(map.find(LeafletMap).prop('zoom')).to.equal(10)

    const center = map.find(LeafletMap).prop('center')
    expect(center.lat).to.equal(60)
    expect(center.lng).to.equal(22)
  })

  it('updates bounds in app state', done => {
    const p = defaultProps()
    expect(p.bounds.get().toBBoxString()).to.equal('0,0,0,0')

    mount(<Map {...p} />)
    p.bounds.onValue(b => {
      expect(p.bounds.get().toBBoxString()).to.not.equal('0,0,0,0')
      done()
    })
  })

  it('renders tracks as GeoJSON', () => {
    const p = defaultProps()
    const map = mount(<Map {...p} />)
    const geoJson = () => map.find(GeoJSON)

    expect(geoJson()).to.have.lengthOf(0)

    p.vessels.set([
      {
        context: 'self',
        selected: false,
        trackLoadState: LoadState.LOADED,
        track: {
          type: 'MultiLineString',
          coordinates: [[[22, 60], [22.5, 60.5]], [[20, 59], [21, 59.5]]]
        }
      }
    ])
    map.update()

    expect(geoJson()).to.have.lengthOf(1)
    const coords = geoJson().prop('data').coordinates
    expect(coords).to.have.lengthOf(2)
    expect(coords[0][0]).to.eql([22, 60])
  })
})
