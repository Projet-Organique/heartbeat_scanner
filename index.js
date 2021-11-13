require('dotenv').config()

const { createBluetooth } = require('./src')
const { TEST_DEVICE, TEST_SERVICE, TEST_CHARACTERISTIC, TEST_NOTIFY_SERVICE, TEST_NOTIFY_CHARACTERISTIC } = process.env

async function main () {
  const { bluetooth, destroy } = createBluetooth()

  // get bluetooth adapter
  const adapter = await bluetooth.defaultAdapter()
  if (! await adapter.isDiscovering())
  	await adapter.startDiscovery()

  console.log('discovering')

  // get device and connect
  const device = await adapter.waitDevice("A0:9E:1A:9F:0E:B4")
  console.log('got device', await device.getAddress(), await device.getName())
  await device.connect()
  console.log('connected')

  const gattServer = await device.gatt()
	var services = await gattServer.services();

  console.log(services) // give me nothing here
  // read write characteristic
 /* const service1 = await gattServer.getPrimaryService("003d")
 	console.log(service1);
  const characteristic1 = await service1.getCharacteristic("003d")
  await characteristic1.writeValue(Buffer.from('Hello world'))
  const buffer = await characteristic1.readValue()
  console.log('read', buffer, buffer.toString())*/

  // subscribe characteristic
  const service2 = await gattServer.getPrimaryService("0000180d-0000-1000-8000-00805f9b34fb")
const dd= await service2.toString();	
const char_list = await service2.characteristics();

console.log(char_list);   
const characteristic2 = await service2.getCharacteristic("00002a37-0000-1000-8000-00805f9b34fb")
//console.log(characteristic2);
await characteristic2.startNotifications();
  //var o = await characteristic2.readValue();
  //console.log(o);
  /*characteristic2.on('valuechanged', buffer => {
    console.log(buffer)
  })*/

    characteristic2.on('valuechanged', buffer => {
     // console.log('subscription', buffer)
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
