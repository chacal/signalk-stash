export default class CountDownLatch {
  private err: Error | undefined = undefined
  constructor(
    private capacity: number,
    readonly onCompletion: (err?: Error) => void
  ) {}
  signal(err?: Error): void {
    if (err) {
      this.err = err
      this.onCompletion(err)
    }
    if (--this.capacity < 1 && !this.err) {
      this.onCompletion()
    }
  }
}
