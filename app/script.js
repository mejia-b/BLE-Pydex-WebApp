//---------- HTML elements ----------
const deviceNameInput = document.getElementById('deviceNameInput');
const stringToSend = document.getElementById('stringToSend');
const connectButton = document.getElementById('connectButton');
const sendButton = document.getElementById('sendButton');
const choseFileButton = document.getElementById('choseFileButton');
const connectionStatus = document.getElementById('connectionStatus');
const logArea = document.getElementById('logArea');
crc32bytes = new Uint8Array(4);

//---------- File chooser ----------
const input = document.createElement('input');
input.type = 'file';
input.addEventListener('change', function() {
    reader.readAsArrayBuffer(this.files[0]);
    logger("File loaded: " + this.files[0].name)
  });
const reader = new FileReader();

//---------- BLE objects ----------
var connectedDevice = null;
var device = null;
var armPropDataCharacteristic = null;
var armPropDataService = null;
var wdxsService = null;
//---------- Buttons ----------
connectButton.addEventListener('click', BLEManager);
sendButton.addEventListener('click', sendBLEData);
choseFileButton.addEventListener('click', sendBin);


//---------- Functions ----------

// Calculate CRC32 on file when file is selected or changed
reader.onload = function() {
    const arrayBuffer = reader.result;
    const crc32 = CRC32.buf(new Uint8Array(arrayBuffer));
    // 32-bit unsigned integer from crc32
    const crc32Unsigned = crc32 >>> 0;
    //store crc32 as 4 bytes
    crc32bytes[0] = (crc32Unsigned & 0xff000000) >> 24;
    crc32bytes[1] = (crc32Unsigned & 0x00ff0000) >> 16;
    crc32bytes[2] = (crc32Unsigned & 0x0000ff00) >> 8;
    crc32bytes[3] = (crc32Unsigned & 0x000000ff);
    logger("CRC32: 0x" +  crc32Unsigned.toString(16).toUpperCase() );
  };
  
  
// Async function to connect to BLE device, discover services and characteristics
async function BLEManager() {
    connectionStatus.textContent = 'SEARCHING';
    try {
        device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            //   filters: [{
            //     name: deviceNameInput.value,
            //   }],
            //optionalServices: ['e0262760-08c2-11e1-9073-0e8ac72e1001', '0000fef6-0000-1000-8000-00805f9b34fb']
        });

        connectedDevice = await device.gatt.connect();
        connectionStatus.textContent = 'Connection Status: CONNECTED';
        logger('Connected to ' + device.name);
        
        try {
            logger('Getting Services...');
            const services = await connectedDevice.getPrimaryServices();

            logger('Getting Characteristics...');
            for (const service of services) {
                logger('Service: ' + service.uuid);
                const characteristics = await service.getCharacteristics();
                count = 0;
                characteristics.forEach(characteristic => {
                    if(count == (characteristics.length - 1) ){
                        logger('  └── Characteristic: ' + characteristic.uuid + ' ' +
                        getSupportedProperties(characteristic));
                    }
                    else{
                    logger('  ├── Characteristic: ' + characteristic.uuid + ' ' +
                        getSupportedProperties(characteristic));
                    }
                    count++;

                });
            }
        } catch (error) {
            loggerError(error);
        }

        // // Discover ArmPropDataCharacteristic
        // armPropDataService = await connectedDevice.getPrimaryService(
        //     'e0262760-08c2-11e1-9073-0e8ac72e1001');
        // logger('Services obtained');
        // armPropDataCharacteristic = await armPropDataService.getCharacteristic(
        //     'e0262760-08c2-11e1-9073-0e8ac72e0001');
        // logger(armPropDataCharacteristic);
        // logger('Characteristics discovered');
        // // Enable notifications on ARMPropDataCharacteristic
        // if (armPropDataCharacteristic.properties.notify) {
        //     logger('Notifications supported');
        //     armPropDataCharacteristic.addEventListener(
        //         'characteristicvaluechanged', handleNotifications_arm_prop_data);
        // }
        // await armPropDataCharacteristic.startNotifications();
        await checkIfConnectedToOTAS();


    } catch(error) {
        loggerError(error);
        if (typeof device !== 'undefined') {
            connectionStatus.textContent = 'Connection Status: FAILED';
        } else {
            connectionStatus.textContent = 'Connection Status: CANCELLED';
        }
    }
}

async function sendBLEData() {
    logger('Sending: ');
    loggerData(stringToSend.value);
    try{
        var uint8array = new TextEncoder().encode(stringToSend.value);
        armPropDataCharacteristic.writeValueWithoutResponse(uint8array);
        logger('Value has been written');
    } catch(error){
        loggerError(error);
    }
}

async function sendBin() {
    logger('Sending: ');
    
    input.click();
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

function handleNotifications_arm_prop_data(event) {
    let value = event.target.value;
    let a = [];
    logger('ARM Prop Data Notification: ');
    for (let i = 0; i < value.byteLength; i++) {
        a.push(String.fromCharCode(value.getUint8(i)));
    }
    // joing using "" inplace of ","
    loggerData(a.join(''));
}

async function checkIfConnectedToOTAS() {
    if (device.name === 'OTAS') {
        // check that WDXS services exists
        // Discover ArmPropDataCharacteristic
        wdxsService = await connectedDevice.getPrimaryService(
            '0000fef6-0000-1000-8000-00805f9b34fb');
        if(wdxsService){
            logger('WDXS service found');
        }
        else{
            logger('WDXS service not found');
        }

    } 
}

// this could be written better by giving an argument of type 'error' or 'data' etc.
function logger(text) {
    logArea.textContent += '> ' + text + '\n';
    logArea.scrollTop = logArea.scrollHeight;
}
function loggerError(text) {
    logArea.textContent += '!!! ' + text + ' !!!' +  '\n';
    logArea.scrollTop = logArea.scrollHeight;
}
function loggerData(text) {
    logArea.textContent += '    ' + '[ ' + text + ' ]' + '\n';
    logArea.scrollTop = logArea.scrollHeight;
}

