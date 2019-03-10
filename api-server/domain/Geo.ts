import { SKPosition } from '@chartedsails/strongly-signalk'
import BinaryQuadkey from 'binaryquadkey'
import { isUndefined } from 'lodash'
import QK from 'quadkeytools'

export interface LatLng {
  readonly lat: number
  readonly lng: number
}

export class Coords implements LatLng {
  static fromSKPosition(position: SKPosition): Coords {
    return new Coords({ lat: position.latitude, lng: position.longitude })
  }

  readonly longitude: number
  readonly latitude: number
  readonly lng: number
  readonly lat: number

  constructor(latLng: LatLng) {
    this.longitude = latLng.lng
    this.latitude = latLng.lat
    this.lng = this.longitude
    this.lat = this.latitude
  }
}

export class BBox {
  static fromProps(o: any): BBox | undefined {
    if (
      !isUndefined(o.nwLat) &&
      !isUndefined(o.nwLng) &&
      !isUndefined(o.seLat) &&
      !isUndefined(o.seLng)
    ) {
      return new BBox({
        nw: new Coords({ lat: o.nwLat, lng: o.nwLng }),
        se: new Coords({ lat: o.seLat, lng: o.seLng })
      })
    }
    return undefined
  }
  readonly nw: Coords
  readonly se: Coords

  constructor(corners: { nw: Coords; se: Coords }) {
    this.nw = corners.nw
    this.se = corners.se
  }

  toQuadKeys(): { nwKey: BinaryQuadkey; seKey: BinaryQuadkey } {
    return {
      nwKey: BinaryQuadkey.fromQuadkey(QK.locationToQuadkey(this.nw, 22)),
      seKey: BinaryQuadkey.fromQuadkey(QK.locationToQuadkey(this.se, 22))
    }
  }
}
