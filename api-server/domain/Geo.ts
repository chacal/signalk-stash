export interface Coords {
  readonly longitude: number
  readonly latitude: number
}

export interface BBox {
  readonly nw: Coords
  readonly se: Coords
}
