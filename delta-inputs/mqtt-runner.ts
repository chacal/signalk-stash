import MqttRunner from './MqttRunner'

process.on('unhandledRejection', error => {
  console.error('Unhandled promise exception:', error)
  process.exit(1)
})

// tslint:disable-next-line: no-unused-expression-chai
new MqttRunner()
