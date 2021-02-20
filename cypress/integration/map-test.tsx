import Color = require('color')
import { configure, mount } from 'enzyme'
import Adapter from 'enzyme-adapter-react-16'
import * as React from 'react'
import { GeoJSON, Map as LeafletMap } from 'react-leaflet'

import { BehaviorSubject } from 'rxjs'
import { Coords } from '../../api-server/domain/Geo'
import { asVesselId } from '../../api-server/domain/Vessel'
import Map from '../../api-server/ui/Map'
import { RenderedTrack, Viewport } from '../../api-server/ui/mappanel-domain'
import { initialViewport } from '../../api-server/ui/mappanel-state'
import { waitFor } from '../../test/waiting'

configure({ adapter: new Adapter() })

const defaultProps = () => ({
  center: new Coords({ lat: 60, lng: 22 }),
  viewport: new BehaviorSubject<Viewport>(initialViewport),
  tracks: new BehaviorSubject<RenderedTrack[]>([])
})

describe('Stash Map', () => {
  it('initializes Leaflet map properly', () => {
    const map = mount(<Map {...defaultProps()} />)

    expect(map.find(LeafletMap).prop('zoom')).to.equal(initialViewport.zoom)

    const center = map.find(LeafletMap).prop('center')
    expect(center.lat).to.equal(60)
    expect(center.lng).to.equal(22)
  })

  it('updates bounds in app state', done => {
    const p = defaultProps()
    expect(p.viewport.value.bounds.toBBoxString()).to.equal('0,0,0,0')

    mount(<Map {...p} />)
    p.viewport.subscribe(vp => {
      expect(vp.bounds.toBBoxString()).to.not.equal('0,0,0,0')
      done()
    })
  })

  it('zoom is recalled from localstorage', () => {
    cy.viewport(1440, 900)
    cy.visit('/')
    cy.get('.leaflet-control-zoom-in').click()
    waitForZoomLevel('9')
    cy.get('.leaflet-control-zoom-in').click()
    waitForZoomLevel('10')
    cy.visit('/')
    waitForZoomLevel('10')
  })

  function waitForZoomLevel(zoom: string) {
    const matchZoomLevel = new RegExp(`\\/${zoom}\\/\\d*\\/\\d*\.`)
    cy.get('.leaflet-tile-container.leaflet-zoom-animated > img').should(
      imgSrcs => {
        // first tile image src has specified zoom level
        expect(matchZoomLevel.test(imgSrcs[0].getAttribute('src') || '')).to.be
          .true
      }
    )
  }

  it('renders tracks as colored GeoJSON', async () => {
    const p = defaultProps()
    const map = mount(<Map {...p} />)
    const geoJson = () => map.find(GeoJSON)

    expect(geoJson()).to.have.lengthOf(0)
    p.tracks.next([
      {
        vesselId: asVesselId('urn:mrn:imo:mmsi:200000000'),
        loadTime: new Date(),
        color: Color('#0000FF'),
        track: {
          type: 'MultiLineString' as 'MultiLineString',
          coordinates: [[[22, 60], [22.5, 60.5]], [[20, 59], [21, 59.5]]]
        }
      }
    ])

    // Setting the value of p.tracksO is asynchronous -> render and assert also asynchronously
    await waitFor(
      () => {
        map.update()
        return Promise.resolve(geoJson())
      },
      locator => {
        console.log(locator.length)
        return locator.length === 1
      }
    )

    expect(geoJson()).to.have.lengthOf(1)
    const coords = geoJson().prop('data').coordinates
    expect(coords).to.have.lengthOf(2)
    expect(coords[0][0]).to.eql([22, 60])
    expect(geoJson().prop('color')).to.equal('#0000FF')
  })
})
