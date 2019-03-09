import { SKPosition } from '@chartedsails/strongly-signalk'

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

export interface BBox {
  readonly nw: Coords
  readonly se: Coords
}
