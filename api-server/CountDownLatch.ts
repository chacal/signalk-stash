export default class CountDownLatch {
  capacity: number
  err: Error | void
  constructor(
    capacity: number,
    readonly onCompletion: (err: Error | void) => any
  ) {
    this.capacity = capacity
    this.err = undefined
  }
  signal(err: Error | void) {
    if (err) {
      this.err = err
      this.onCompletion(err)
    }
    if (--this.capacity < 1 && !this.err) {
      this.onCompletion()
    }
  }
}
