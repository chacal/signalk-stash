import crypto from 'crypto'

export class MqttAccount {
  readonly username: string
  readonly passwordHash: string
  readonly isMqttSuperUser: boolean = false
  constructor(
    username: string,
    password: string,
    isMqttSuperUser: boolean = false
  ) {
    this.username = username
    this.passwordHash = passwordHash(password)
    this.isMqttSuperUser = isMqttSuperUser
  }
}

export class MqttACL {
  constructor(
    readonly username: string,
    readonly topic: string,
    readonly level: MqttACLLevel
  ) {}
}

// See: https://github.com/eclipse/mosquitto/blob/master/src/mosquitto_plugin.h#L22
export enum MqttACLLevel {
  NONE = 0,
  READ = 1,
  WRITE = 2,
  SUBSCRIBE = 4,
  ALL = 7
}

export function passwordHash(plainTextPassword: string): string {
  const iterations = 901
  const keylen = 24
  const hashAlgorithm = 'sha256'
  const salt = crypto.randomBytes(12).toString('base64')
  const hashedPassword = crypto
    .pbkdf2Sync(plainTextPassword, salt, iterations, keylen, hashAlgorithm)
    .toString('base64')
  return `PBKDF2$${hashAlgorithm}$${iterations}$${salt}$${hashedPassword}`
}
