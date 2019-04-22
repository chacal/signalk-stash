import { MqttAccount } from './Auth'

export default class Vessel {
  vesselId: VesselId
  mqttAccount: MqttAccount
  constructor(vesselId: string, mqttPassword: string) {
    this.vesselId = asVesselid(vesselId)
    this.mqttAccount = new MqttAccount(vesselId, mqttPassword)
  }
}

interface VesselIdBrand {
  _type: 'Vessel'
}
export type VesselId = VesselIdBrand & string

export function asVesselid(id: string) {
  if (!isValidVesselid(id)) {
    throw new Error('Invalid vessel id:' + id)
  }
  return id as VesselId
}

const uuidPattern = /^urn:mrn:signalk:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ABab][0-9a-f]{3}-[0-9a-f]{12}$/
const mmsiPattern = /^urn:mrn:imo:mmsi:[2-7][0-9]{8}$/
function isValidVesselid(id: string) {
  return uuidPattern.test(id) || mmsiPattern.test(id)
}
