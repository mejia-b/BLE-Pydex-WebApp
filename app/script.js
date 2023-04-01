// HTML elements
const deviceNameInput = document.getElementById('deviceNameInput');
const stringToSend = document.getElementById('stringToSend');
const connectButton = document.getElementById('connectButton');
const sendButton = document.getElementById('sendButton');
const connectionStatus = document.getElementById('connectionStatus');
const logArea = document.getElementById('logArea');

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
        connectionStatus.textContent = 'Connection Status: CONNECTED';

        // setTimeout(function () {
        //       armPropDataCharacteristic.writeValueWithoutResponse(uint8array);
        //       logger("Value has been written");
        // },5000);

        try {
            logger('Getting Services...');
            const services = await connectedDevice.getPrimaryServices();

            logger('Getting Characteristics...');
            for (const service of services) {
                logger('> Service: ' + service.uuid);
                const characteristics = await service.getCharacteristics();

                characteristics.forEach(characteristic => {
                    logger(
                        '>> Characteristic: ' + characteristic.uuid + ' ' +
                        getSupportedProperties(characteristic));
                });
            }
        } catch (error) {
            loggerError(error);
        }

        // Discover ArmPropDataCharacteristic
        armPropDataService = await connectedDevice.getPrimaryService(
            'e0262760-08c2-11e1-9073-0e8ac72e1001');
        logger('Services obtained');
        armPropDataCharacteristic = await armPropDataService.getCharacteristic(
            'e0262760-08c2-11e1-9073-0e8ac72e0001');
        logger(armPropDataCharacteristic);
        logger('Characteristics discovered');
        // Enable notifications on ARMPropDataCharacteristic
        if (armPropDataCharacteristic.properties.notify) {
            logger('Notifications supported');
            armPropDataCharacteristic.addEventListener(
                'characteristicvaluechanged', handleNotifications_arm_prop_data);
        }
        await armPropDataCharacteristic.startNotifications();


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


