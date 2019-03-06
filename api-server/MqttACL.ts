export default class MqttACL {
  readonly username: string
  readonly topic: string
  readonly level: MqttACLLevel

  constructor(username: string, topic: string, level: MqttACLLevel) {
    this.username = username
    this.topic = topic
    this.level = level
  }
}

// See: https://github.com/eclipse/mosquitto/blob/master/src/mosquitto_plugin.h#L22
export enum MqttACLLevel {
  NONE = 0,
  READ = 1,
  WRITE = 2,
  SUBSCRIBE = 4,
  ALL = 7
}
