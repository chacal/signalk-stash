import Account from '../api-server/Account'

export default class TestAccount extends Account {
  readonly password: string

  constructor(
    username: string,
    password: string,
    passwordHash: string,
    isMqttSuperUser: boolean = false
  ) {
    super(username, passwordHash, isMqttSuperUser)
    this.password = password
  }
}
