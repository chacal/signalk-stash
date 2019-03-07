export default class Trackpoint {
  constructor(
    readonly context: string,
    readonly timestamp: Date,
    readonly source: string,
    readonly longitude: number,
    readonly latitude: number
  ) {}
}

// TODO: Move to a separate file?
export type Track = Trackpoint[]
