declare module 'karet'
declare module 'partial.lenses'

declare module 'karet.util' {
  import { Atom } from 'kefir.atom'
  import { Component } from 'react'

  type Class<T> = new (...args: any[]) => T

  // TODO: Figure out how to type lifted props on Karet component
  export function toKaret<P, S, SS, X extends Component<P, S, SS>>(
    component: Class<X>
  ): Class<any>

  export function atom<T>(v: T): Atom<T>
  export function view<T>(lens: any, value: any): T
}

declare module 'kefir.atom' {
  import { Observable } from 'kefir'

  interface Atom<T> extends Observable<T, any> {
    get(): T
    modify(): (current: T) => T
    set(t: T): void
    remove(): void
    view<V>(lens: any): Atom<V>
  }
}

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
