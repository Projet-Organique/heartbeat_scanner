require('dotenv').config()
const {
  createBluetooth
} = require('./src')
var { Timer } = require("easytimer.js");
var timerInstance = new Timer();
const {
  POLAR_MAC_ADRESSE
} = process.env


function errror(message) {
  this.message = message;
}
async function connectDevice() {

  const { bluetooth, destroy } = createBluetooth()
  const adapter = await bluetooth.defaultAdapter()

  if (!await adapter.isDiscovering())
    await adapter.startDiscovery()
  console.log('Discovering device...');

  const device = await adapter.waitDevice("A0:9E:1A:9F:0E:B4")
  console.log('got device', await device.getAddress(), await device.getName())
  await device.connect()
  console.log('Connected!')

  const gattServer = await device.gatt()
  var services = await gattServer.services();

  console.log(services)

  const service = await gattServer.getPrimaryService("0000180d-0000-1000-8000-00805f9b34fb")
  //const char_list = await service.characteristics();
  //console.log(char_list);
  const heartrate = await service.getCharacteristic("00002a37-0000-1000-8000-00805f9b34fb")
  await heartrate.startNotifications();
  console.log("Ready to scan...");

  getBeatPerMinute(device);
}

async function getBeatPerMinute(device) {
  // Before getting the BPM we need to get a user await getUser();

  timerInstance.start({ countdown: true, startValues: { seconds: 3 } });
  timerInstance.addEventListener('secondsUpdated', function (e) {
    console.log(timerInstance.getTimeValues().toString());
  });
  timerInstance.addEventListener('targetAchieved', function (e) {
    console.log("Done scanning")
  });

  //------- part where we get the GATT data.
  // When value successfull we wait for a stable value between 40 and 120
  // then we start the timer for at least 5sec
  // and we return the value BPM

  heartrate.on('valuechanged', buffer => {
    let json = JSON.stringify(buffer);
    console.log(JSON.parse(json).data);
    return JSON.parse(json).data
    //done()
  })

  //await characteristic2.stopNotifications()
  // destroy()

}

//main().then(console.log).catch(console.log);
connectDevice().then(console.log).catch(console.error)