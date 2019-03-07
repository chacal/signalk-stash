declare module 'quadkeytools' {
  export type QuadKey = string

  interface Location {
    readonly lng: number
    readonly lat: number
  }

  export function locationToQuadkey(location: Location, detail: number): QuadKey
}
