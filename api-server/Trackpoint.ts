export default class Trackpoint {
  constructor(readonly context: string,
              readonly timestamp: Date,
              readonly longitude: number,
              readonly latitude: number) {
  }
}
