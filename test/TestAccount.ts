import Account from '../api-server/Account'

export default class TestAccount extends Account {
  constructor(
    username: string,
    readonly password: string,
    passwordHash: string,
    isMqttSuperUser: boolean = false
  ) {
    super(username, passwordHash, isMqttSuperUser)
  }
}
