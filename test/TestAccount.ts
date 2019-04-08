import { Account, passwordHash } from '../api-server/domain/Auth'

export default class TestAccount extends Account {
  constructor(
    username: string,
    readonly password: string,
    isMqttSuperUser: boolean = false
  ) {
    super(username, passwordHash(password), isMqttSuperUser)
  }
}
