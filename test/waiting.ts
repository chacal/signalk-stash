import BPromise from 'bluebird'

export function waitFor<T>(
  action: () => Promise<T>,
  predicate: (t: T) => boolean
): Promise<T> {
  return action()
    .then(res => {
      if (predicate(res)) {
        return BPromise.resolve(res)
      } else {
        return retryAfterDelay()
      }
    })
    .catch(retryAfterDelay)

  function retryAfterDelay() {
    return BPromise.delay(100).then(() => waitFor(action, predicate))
  }
}
