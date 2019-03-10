import { SKPosition } from '@chacal/signalk-ts'
import BinaryQuadkey from 'binaryquadkey'
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
