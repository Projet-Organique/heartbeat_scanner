const arrayBufferToHex = require('array-buffer-to-hex')
const noble = require('noble')

const DEVICE_INFORMATION_SERVICE_UUID = '0000180d-0000-1000-8000-00805f9b34fb'

noble.on('stateChange', state => {
  console.log(`State changed: ${state}`)
  if (state === 'poweredOn') {
    noble.startScanning()
  }
})

noble.on('discover', peripheral => {
  console.log(`Found device, name: ${peripheral.advertisement.localName}, uuid: ${peripheral.uuid}`)

  if (peripheral.advertisement.localName === 'Polar Sense 9F0EB423') {
    console.log('peripheral', peripheral);
    noble.stopScanning();

    peripheral.on('connect', () => console.log('Device connected'))
    peripheral.on('disconnect', () => console.log('Device disconnected'))

    peripheral.connect(error => {

      peripheral.discoverServices([DEVICE_INFORMATION_SERVICE_UUID], (error, services) => {
        console.log('services', services);
        console.log(`Found service, name: ${services[0].name}, uuid: ${services[0].uuid}, type: ${services[0].type}`)

        const service = services[0]

        service.discoverCharacteristics(null, (error, characteristics) => {
          characteristics.forEach(characteristic => {
            console.log(`Found characteristic, name: ${characteristic.name}, uuid: ${characteristic.uuid}, type: ${characteristic.type}, properties: ${characteristic.properties.join(',')}`)
          })

          characteristics.forEach(characteristic => {
            if (characteristic.name === 'System ID' || characteristic.name === 'PnP ID') {
              characteristic.read((error, data) => console.log(`${characteristic.name}: 0x${arrayBufferToHex(data)}`))
            } else {
              characteristic.read((error, data) => console.log(`${characteristic.name}: ${data.toString('ascii')}`))
            }
          })
        })
      })
    })
  }
})