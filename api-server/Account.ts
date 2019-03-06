export default class Account {
  readonly username: string
  readonly passwordHash: string
  readonly isMqttSuperUser: boolean

  constructor(username: string, passwordHash: string, isMqttSuperUser: boolean = false) {
    this.username = username
    this.passwordHash = passwordHash
    this.isMqttSuperUser = isMqttSuperUser
  }
}
