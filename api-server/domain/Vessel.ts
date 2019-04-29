import { MqttAccount } from './Auth'

export interface VesselData {
  vesselId: VesselId
  name: string
}

export default class Vessel implements VesselData {
  vesselId: VesselId
  name: string
  mqttAccount: MqttAccount
  constructor(vesselId: string, name: string, mqttPassword: string) {
    this.vesselId = asVesselId(vesselId)
    this.name = name
    this.mqttAccount = new MqttAccount(vesselId, mqttPassword)
  }
}

interface VesselIdBrand {
  _type: 'Vessel'
}
export type VesselId = VesselIdBrand & string

export function asVesselId(id: string) {
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
