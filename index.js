require('dotenv').config()

const {
  createBluetooth
} = require('./src')
const {
  TEST_DEVICE
} = process.env

async function main() {
  const {
    bluetooth,
    destroy
  } = createBluetooth()

  // get bluetooth adapter
  const adapter = await bluetooth.defaultAdapter()
  if (!await adapter.isDiscovering())
    await adapter.startDiscovery()

  console.log('discovering')

  // get device and connect
  const device = await adapter.waitDevice("A0:9E:1A:9F:0E:B4")
  console.log('got device', await device.getAddress(), await device.getName())
  await device.connect()
  console.log('connected')

  const gattServer = await device.gatt()
  var services = await gattServer.services();

  console.log(services)

  // subscribe characteristic
  const service = await gattServer.getPrimaryService("0000180d-0000-1000-8000-00805f9b34fb")
  const char_list = await service.characteristics();
  console.log(char_list);

  const heartrate = await service.getCharacteristic("00002a37-0000-1000-8000-00805f9b34fb")
  await heartrate.startNotifications();

  heartrate.on('valuechanged', buffer => {
    let json = JSON.stringify(buffer);
    console.log(JSON.parse(json).data);
    //done()
  })

  //await characteristic2.stopNotifications()
  //destroy()
}

main()
  .then(console.log)
  .catch(console.error)
