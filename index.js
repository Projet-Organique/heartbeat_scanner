require("dotenv").config();
const { createBluetooth } = require("./src");
var { Timer } = require("easytimer.js");
var timerInstance = new Timer();
const { POLAR_MAC_ADRESSE } = process.env;

let _USERBPM;
let _HEARTRATE = null;
let BPMNOTZERO = false;

async function connectDevice() {
 
  //console.log('process.env.USER ', process.env.TT );
  //process.env.TT = true;
  console.log('process.env.TT', process.env.TT);
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
 // console.log('gattServer', gattServer._services);
  var services = await gattServer.services();


//  const service1 = await gattServer.getPrimaryService('0000180d-0000-1000-8000-00805f9b34fb')
// const characteristic1 = await service1.getCharacteristic('00002a37-0000-1000-8000-00805f9b34fb')
// await characteristic1.writeValue(Buffer.from("Hello world"))
// const buffer = await characteristic1.readValue()
// console.log(buffer)

  console.log('services', services.toString());

  const service = await gattServer.getPrimaryService(
    "0000180d-0000-1000-8000-00805f9b34fb"
  );


  const heartrate = await service.getCharacteristic(
    "00002a37-0000-1000-8000-00805f9b34fb"
  );

  _HEARTRATE = heartrate;

  await heartrate.startNotifications();
  console.log('LOADING...');
  //setTimeout(async () => {
    let checkBPM = await checkBpm();
    console.log('READY')
    if(checkBPM){
      _USERBPM = await getBpm();
      console.log('bpm is:', _USERBPM);
      process.exit(1);
    }
  //}, 15000);
    //process.exit(1);
  //await heartrate.stopNotifications();
  //return BPM
}

async function checkBpm(){
  return new Promise((resolve, reject) => {
    _HEARTRATE.on("valuechanged", (buffer) => {
      let json = JSON.stringify(buffer);
      let bpm = Math.max.apply(null, JSON.parse(json).data);
      console.log('bpm', bpm);
      //console.log('bpm', bpm);
      if(bpm == 0){
        resolve(true)
      }
    })

  })
}

async function getBpm() {
  return new Promise((resolve, reject) => {
    let _USERBPM
    timerInstance.addEventListener("secondsUpdated", function (e) {
      console.log(timerInstance.getTimeValues().toString());
    });

    timerInstance.addEventListener("targetAchieved", async function (e) {
      resolve(_USERBPM);
    });

    _HEARTRATE.on("valuechanged", (buffer) => {
      let json = JSON.stringify(buffer);
      let bpm = Math.max.apply(null, JSON.parse(json).data);
      if(bpm != 0){
        _USERBPM = bpm;
        timerInstance.start({ countdown: true, startValues: { seconds: 10 } });
      } 
    });
  });
}

connectDevice().then(console.log).catch(console.error);