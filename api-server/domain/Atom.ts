import { Bus, Property } from 'baconjs'
import Observable from 'baconjs/types/observable'
import _ from 'lodash'

export interface Atom<V> extends Property<V> {
  get(): V
  set(v: V): void
}

export function Atom<V>(initialValue: V): Atom<V> {
  let value: V = initialValue
  const bus = new Bus()

  const atom: any = bus
    .scan<V>(initialValue, (prev, next: any) => {
      value = next
      return next
    })
    .skipDuplicates(_.isEqual)
  atom.subscribe(_.identity)

  atom.get = () => value
  atom.set = (v: V) => bus.push(v)

  return atom
}

export function isAtom<V>(
  observable: Observable<V> | Atom<V>
): observable is Atom<V> {
  return (observable as Atom<V>).get !== undefined
}
