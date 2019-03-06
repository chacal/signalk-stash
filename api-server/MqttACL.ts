export default class MqttACL {
  constructor(readonly username: string, readonly topic: string, readonly level: MqttACLLevel) {
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
