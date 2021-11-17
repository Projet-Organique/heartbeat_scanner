require("dotenv").config();
const { createBluetooth } = require("./src");
var { Timer } = require("easytimer.js");
var timerInstance = new Timer();
const { POLAR_MAC_ADRESSE } = process.env;

let _HEARTRATE = null;
let _USERBPM = 0;

async function connectDevice() {

  const { bluetooth, destroy } = createBluetooth();
  const adapter = await bluetooth.defaultAdapter();

  if (!(await adapter.isDiscovering())) 
    await adapter.startDiscovery();
  console.log("Discovering device...");

  const device = await adapter.waitDevice("A0:9E:1A:9F:0E:B4");
  console.log("got device", await device.getAddress(), await device.getName());
  await device.connect();
  console.log("Connected!");

  const gattServer = await device.gatt();
  //var services = await gattServer.services();

  const service = await gattServer.getPrimaryService(
    "0000180d-0000-1000-8000-00805f9b34fb"
  );
  //const char_list = await service.characteristics();
  //console.log(char_list);
  const heartrate = await service.getCharacteristic(
    "00002a37-0000-1000-8000-00805f9b34fb"
  );

  _HEARTRATE = heartrate;

  await heartrate.startNotifications();

  getBpm().then(console.log).catch(console.error);

  //await heartrate.stopNotifications();
  //return BPM
}



async function getBpm() {
  return new Promise((resolve, reject) => {

    timerInstance.addEventListener("secondsUpdated", function (e) {
      console.log(timerInstance.getTimeValues().toString());
    });

    timerInstance.addEventListener("targetAchieved", async function (e) {
      resolve(_USERBPM);
    });

    _HEARTRATE.on("valuechanged", (buffer) => {
      let json = JSON.stringify(buffer);
      var bpm = Math.max.apply(null, JSON.parse(json).data);
      _USERBPM = bpm;
      if (bpm != 0) {
        timerInstance.start({ countdown: true, startValues: { seconds: 3 } });
      } else {
        console.log("BPM is " + bpm + ", waiting value before timer...");
      }
    });
  });
}

connectDevice().then(console.log).catch(console.error);