declare module 'binaryquadkey' {
  import { QuadKey } from 'quadkeytools'

  export default class BinaryQuadkey {
    static fromQuadkey(quadkey: QuadKey): BinaryQuadkey

    toString(radix?: number): string
  }
}
