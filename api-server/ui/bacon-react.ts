import { Property } from 'baconjs'
import { useEffect, useState } from 'react'
import { Atom, isAtom } from '../domain/Atom'

const valueMissing: any = {}

export function useObservable<V>(prop: Property<V> | Atom<V>): V {
  if (!(prop instanceof Property)) {
    throw new Error(`Trying to render something else than Property! ` + prop)
  }

  // Get current value of the Property for synchronous rendering
  const currentValue = getCurrentValue(prop)
  // Hack: use write-only state for triggering updates
  const [, setV] = useState(currentValue)
  // Listen to changes in the Property
  useEffect(
    // The returned unsub function is used by react to clean up. Nice!
    () => prop.changes().forEach(value => setTimeout(() => setV(value), 0)),
    // Below line causes resubscription to occur only if the given property changes
    [prop]
  )
  // Sanity check: we need the current value to be able to render
  if (currentValue === valueMissing) {
    throw new Error('Current value missing. Cannot render.')
  }
  return currentValue
}

function getCurrentValue<V>(observable: Property<V> | Atom<V>): V {
  let currentV = valueMissing
  if (isAtom(observable)) {
    currentV = observable.get()
  } else {
    const unsub = observable.onValue(v => (currentV = v))
    unsub()
  }
  return currentV
}
