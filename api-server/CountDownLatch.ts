export default class CountDownLatch {
  private triggered: boolean = false

  constructor(
    private capacity: number,
    readonly onCompletion: (err?: Error) => void
  ) {}

  addCapacity(additionalCapacity: number) {
    this.capacity += additionalCapacity
  }

  signal(err?: Error): void {
    if (this.triggered) {
      return
    }

    --this.capacity

    if (err) {
      this.onCompletion(err)
      this.triggered = true
    } else if (this.capacity === 0) {
      this.onCompletion()
      this.triggered = true
    }
  }
}
