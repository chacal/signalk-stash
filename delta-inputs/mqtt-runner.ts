import MqttRunner from './MqttRunner'

process.on('unhandledRejection', error => {
  console.error('Unhandled promise exception:', error)
  process.exit(1)
})

new MqttRunner()
  .start()
  .then(() => console.log('MqttRunner started'))
  .catch(err => {
    throw err
  })
