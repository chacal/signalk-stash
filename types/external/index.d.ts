declare module 'partial.lenses'

declare module 'binaryquadkey' {
  import { QuadKey } from 'quadkeytools'

  export default class BinaryQuadkey {
    static fromQuadkey(quadkey: QuadKey): BinaryQuadkey

    toString(radix?: number): string
  }
}

declare module 'quadkeytools' {
  export type QuadKey = string

  interface Location {
    readonly lng: number
    readonly lat: number
  }

  export function locationToQuadkey(location: Location, detail: number): QuadKey
}

declare module 'google-palette' {
  type RGBString = string

  export default function palette(name: string, size: number): RGBString[]
}

declare module 'simplify-js' {
  export interface Point {
    x: number
    y: number
  }
  export default function simplify(
    points: Point[],
    tolerance?: number,
    highQuality?: boolean
  ): Point[]
}
