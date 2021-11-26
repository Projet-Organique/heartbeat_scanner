require("dotenv").config();
//const io = require('@pm2/io')
const { createBluetooth } = require("./src");
var { Timer } = require("easytimer.js");
var timerInstance = new Timer();
const axios = require('axios');
const { POLAR_MAC_ADRESSE, USERS_ENDPOINT, PULSESENSORS_ENDPOINT, ID } = process.env;

/*const state = io.metric({
  name: 'Scanning state',
})
const polarBPM = io.metric({
  name: 'Polar BPM',
})
const doneBPM = io.metric({
  name: 'User BPM after scan',
})

const lanternSelected = io.metric({
  name: 'The current selected lantern',
})

const timer = io.metric({
  name: 'The timer when the BPM is stable',
})*/

let _USERBPM;
let _USER;
let _HEARTRATE = null;

async function init() {

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

  _USER = await axios.get('http://192.168.1.15:8080/api/users/randomUser').catch(async function (error) {
    console.log(error.response.data.message)
    await axios.put('http://192.168.1.15:8080/api/pulsesensors/s001', { 'state': 4 })
    state.set('No lantern!');
    process.exit(1);
  });

 // console.log(_USER.data._id);
  //lanternSelected.set(_USER);
  await _HEARTRATE.startNotifications();

  _HEARTRATE.on("valuechanged", async (buffer) => {
    let json = JSON.stringify(buffer);
    let bpm = Math.max.apply(null, JSON.parse(json).data);
    polarBPM.set(bpm);
  })

  await axios.put(PULSESENSORS_ENDPOINT + ID, { 'state': 0 })
  //state.set('Loading');

  //const currentBPM = await getCurrentBPM();
  //console.log(currentBpm);
  //polarBPM.set(currentBPM); 

  const readyToScan = await getScanState();

  if (readyToScan) {
    //clearInterval(twirlTimer)
    process.stdout.write("\r\x1b[K")
    process.stdout.write('Ready!')
    await axios.put(PULSESENSORS_ENDPOINT + ID, { 'state': 1 })
  //  state.set('Ready');
    //set a presence detection to start notification

    _USERBPM = await scan();
  //  userBPM.set(_USERBPM);
    //console.log('_USERBPM', _USERBPM);
    await axios.put(USERS_ENDPOINT + _USER.data._id, { 'pulse': _USERBPM })
    await axios.put(PULSESENSORS_ENDPOINT + ID, { 'state': 3 })
  //  state.set('done');
  }
}

/**
 * Check the BPM at his current state
 * @return {Promise<number>} return the current bpm value
 */
async function getCurrentBPM() {
  return new Promise(async (resolve, reject) => {
    _HEARTRATE.on("valuechanged", async (buffer) => {
      let json = JSON.stringify(buffer);
      let bpm = Math.max.apply(null, JSON.parse(json).data);
      resolve(bpm);
    })
  })
}

/**
 * Check the BPM and return true if it's 0
 * @return {Promise<boolean>} true if bpm 0
 */
async function getScanState() {
  return new Promise(async (resolve, reject) => {
    _HEARTRATE.on("valuechanged", async (buffer) => {
      let json = JSON.stringify(buffer);
      let bpm = Math.max.apply(null, JSON.parse(json).data);
      if (bpm == 0) {
        resolve(true)
      }
    })
  })
}

/**
 * Start the BPM scan. When value is stable we launch the counter and return the last value
 * @return {Promise<number>} Last BPM after a certain time
 */
async function scan() {
  return new Promise(async (resolve, reject) => {
    let scanBPM;
    timerInstance.addEventListener("secondsUpdated", function (e) {
     // timer.set(timerInstance.getTimeValues().toString())
      //console.log(timerInstance.getTimeValues().toString());
    });
    timerInstance.addEventListener("targetAchieved", async function (e) {
      resolve(scanBPM);
    });

    _HEARTRATE.on("valuechanged", async (buffer) => {
      let json = JSON.stringify(buffer);
      let bpm = Math.max.apply(null, JSON.parse(json).data);
      if (bpm != 0) {
        scanBPM = bpm;
        await axios.put('http://192.168.1.15:8080/api/pulsesensors/s001', { 'state': 2 })
        state.set('Scanning');

        timerInstance.start({ countdown: true, startValues: { seconds: 15 } });
      }
    })
  });
}

init().then(console.log).catch(console.error);
