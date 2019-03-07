export default class Account {
  constructor(
    readonly username: string,
    readonly passwordHash: string,
    readonly isMqttSuperUser: boolean = false
  ) {}
}
