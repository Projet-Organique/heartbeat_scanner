require("dotenv").config();
const { createBluetooth } = require("./src");
var { Timer } = require("easytimer.js");
var timerInstance = new Timer();
const axios = require('axios');
const { POLAR_MAC_ADRESSE, USERS_ENDPOINT, PULSESENSORS_ENDPOINT, ID } = process.env;

let _USERBPM;
let _USER;
let _HEARTRATE = null;
let BPMNOTZERO = false;



async function connectDevice() {
  console.clear();
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
  var services = await gattServer.services();

 const service = await gattServer.getPrimaryService(
    "0000180d-0000-1000-8000-00805f9b34fb"
  );
 const heartrate = await service.getCharacteristic(
    "00002a37-0000-1000-8000-00805f9b34fb"
  );

  _HEARTRATE = heartrate;

  var twirlTimer = (function() {
    var P = ["\\", "|", "/", "-"];
    var x = 0;
    return setInterval(function() {
      process.stdout.write("\r" + P[x++] + ' LOADING...');
      x &= 3;
    }, 250);
  })();

  _USER = await axios.get(USERS_ENDPOINT + 'randomUser').catch(function (error) {
    if (error.response) {
      console.log(error.response.data.message);
      process.exit(1);
    }
  });

  console.log('_USER', _USER.data._id );
  await heartrate.startNotifications();
  await axios.put(PULSESENSORS_ENDPOINT + ID, {'state': 'loading'})
  const checkBPM = await checkBpm();
  _HEARTRATE.stopNotifications();

  if(checkBPM){
    clearInterval(twirlTimer)
    process.stdout.write("\r\x1b[K")
    process.stdout.write('Ready!')
    await axios.put(PULSESENSORS_ENDPOINT + ID, {'state': 'ready'})
    //set a presence detection to start notification
    _USERBPM = await getBpm();
    console.log('_USERBPM', _USERBPM);
    await axios.put(USERS_ENDPOINT + _USER.data._id, {'pulse': _USERBPM})
    await axios.put(PULSESENSORS_ENDPOINT + ID, {'state': 'idle'})
    process.exit(1);
  }
}

async function checkBpm(){
  return new Promise(async (resolve, reject) => {
    _HEARTRATE.on("valuechanged", async (buffer) => {
      let json = JSON.stringify(buffer);
      let bpm = Math.max.apply(null, JSON.parse(json).data);
      if(bpm == 0){
        resolve(true)
      }
    })
  })
}

async function getBpm() {
  return new Promise(async (resolve, reject) => {
    let _USERBPM
    timerInstance.addEventListener("secondsUpdated", function (e) {
      console.log(timerInstance.getTimeValues().toString());
    });

    timerInstance.addEventListener("targetAchieved", async function (e) {
      resolve(_USERBPM);
    });

    _HEARTRATE.startNotifications();
      _HEARTRATE.on("valuechanged", async (buffer) => {
        let json = JSON.stringify(buffer);
        let bpm = Math.max.apply(null, JSON.parse(json).data);
        if(bpm != 0){
          _USERBPM = bpm;
          await axios.put(PULSESENSORS_ENDPOINT + ID, {'state': 'scanning'})
          timerInstance.start({ countdown: true, startValues: { seconds: 10 } });
        } 
      })
  });
}

connectDevice().then(console.log).catch(console.error);
