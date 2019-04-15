declare module 'karet'
declare module 'partial.lenses'

declare module 'karet.util' {
  import { Observable } from 'kefir'
  import { Atom } from 'kefir.atom'

  type Class<T> = new (...args: any[]) => T

  // TODO: Figure out how to type lifted props on Karet component
  export function toKaret(component: any): Class<any>

  export function atom<T>(v: T): Atom<T>
  export function view<T>(lens: any, value: any): T
  export function holding(mutation: () => void): void
  export function mapElemsWithIds<T, S>(
    indexLens: any,
    mapper: (elem: Atom<T>, id: any) => S,
    array: Atom<T[]>
  ): Observable<S[], any>
  export function mapElems<T, S>(
    mapper: (elem: Atom<T>, index?: number) => S,
    array: Atom<T[]>
  ): Observable<S[], any>
  export function set<T>(target: Atom<T>, source: T | Observable<T, any>): void
  export function consume<T>(
    action: (value: T) => void,
    obs: Observable<T, any>
  ): void
  export function getProps(template: {
    [key: string]: any
  }): (e: { target: any }) => void

  interface CheckboxProps {
    type: string
    checked: Atom<boolean>
  }
  export function Input(props: CheckboxProps): JSX.Element
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
