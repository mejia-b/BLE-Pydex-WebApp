// HTML elements
const deviceNameInput = document.getElementById('deviceNameInput');
const stringToSend = document.getElementById('stringToSend');
const connectButton = document.getElementById('connectButton');
const sendButton = document.getElementById('sendButton');
const connectionStatus = document.getElementById('connectionStatus');

//  GLOBAL objects
var connectedDevice = null;
var device = null;
var armPropDataCharacteristic = null;
var armPropDataService = null;

// Buttons
connectButton.addEventListener('click', BLEManager);
sendButton.addEventListener('click', sendBLEData);

async function BLEManager() {
  connectionStatus.textContent = 'SEARCHING';
  try {
    device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      //   filters: [{
      //     name: deviceNameInput.value,
      //   }],
      //  optionalServices: ['e0262760-08c2-11e1-9073-0e8ac72e1001']
    });

    connectedDevice = await device.gatt.connect();
    connectionStatus.textContent = 'CONNECTED';

    // setTimeout(function () {
    //       armPropDataCharacteristic.writeValueWithoutResponse(uint8array);
    //       console.log("Value has been written");
    // },5000);

    try {
      console.log('Getting Services...');
      const services = await connectedDevice.getPrimaryServices();

      console.log('Getting Characteristics...');
      for (const service of services) {
        console.log('> Service: ' + service.uuid);
        const characteristics = await service.getCharacteristics();

        characteristics.forEach(characteristic => {
          console.log(
              '>> Characteristic: ' + characteristic.uuid + ' ' +
              getSupportedProperties(characteristic));
        });
      }
    } catch (error) {
      console.log('Argh! ' + error);
    }

    // Discover ArmPropDataCharacteristic
    armPropDataService = await connectedDevice.getPrimaryService(
        'e0262760-08c2-11e1-9073-0e8ac72e1001');
    console.log('Services obtained');
    armPropDataCharacteristic = await armPropDataService.getCharacteristic(
        'e0262760-08c2-11e1-9073-0e8ac72e0001');
    console.log(armPropDataCharacteristic);
    console.log('Characteristics discovered');
    // Enable notifications on ARMPropDataCharacteristic
    // console.log('> Notifications started');
    // armPropDataCharacteristic.addEventListener('characteristicvaluechanged',
    //     handleNotifications);
    if (armPropDataCharacteristic.properties.notify) {
        console.log("Notifications supported");
        armPropDataCharacteristic.addEventListener("characteristicvaluechanged",handleNotifications);
        }
        await armPropDataCharacteristic.startNotifications();
    

  } catch {
    if (typeof device !== 'undefined') {
      connectionStatus.textContent = 'CONNECTION FAILED';
    } else {
      connectionStatus.textContent = 'CANCELLED';
    }
  }
}

async function sendBLEData() {

  var uint8array = new TextEncoder().encode(stringToSend.value);

  armPropDataCharacteristic.writeValueWithoutResponse(uint8array);
  console.log('Value has been written');
}

function getSupportedProperties(characteristic) {
  let supportedProperties = [];
  for (const p in characteristic.properties) {
    if (characteristic.properties[p] === true) {
      supportedProperties.push(p.toUpperCase());
    }
  }
  return '[' + supportedProperties.join(', ') + ']';
}

function handleNotifications(event) {
    console.log("Notification received");
    let value = event.target.value;
    let a = [];
    // Convert raw data bytes to hex values just for the sake of showing something.
    // In the "real" world, you'd use data.getUint8, data.getUint16 or even
    // TextDecoder to process raw data bytes.
    for (let i = 0; i < value.byteLength; i++) {
      a.push('0x' + ('00' + value.getUint8(i).toString(16)).slice(-2));
    }
    var dataReceived = new TextDecoder().decode(value);
    console.log(value);
  }