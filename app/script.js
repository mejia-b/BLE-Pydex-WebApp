//---------- HTML elements ----------
const deviceNameInput = document.getElementById('deviceNameInput');
const stringToSend = document.getElementById('stringToSend');
const connectButton = document.getElementById('connectButton');
const sendButton = document.getElementById('sendButton');
const sendPacket = document.getElementById('sendPacket');
const choseFileButton = document.getElementById('choseFileButton');
const connectionStatus = document.getElementById('connectionStatus');
const logArea = document.getElementById('logArea');
crc32bytes = new Uint8Array(4);
fileSize = 0;
fileBuffer = [];
//---------- File chooser ----------
const input = document.createElement('input');
input.type = 'file';
input.addEventListener('change', function() {
  reader.readAsArrayBuffer(this.files[0]);
  // get file size
  fileSize = this.files[0].size;
  logger('File loaded: ' + this.files[0].name + fileSize + ' bytes');
});
const reader = new FileReader();

//---------- BLE objects ----------
connectedDevice = null;
device = null;

//---------- OTAS stuff ----------
// clang-format off
OTAS_DISCONNECTED_STATE = 0;
OTAS_IDLE_STATE = 1;
OTAS_CONNECTED_STATE = 2;
OTAS_FILE_DISCOVER_STATE = 3;
OTAS_SEND_HEADER_STATE = 4;
OTAS_SEND_PUT_REQ_STATE = 5;
OTAS_ERASING_STATE = 6;
OTAS_SEND_FILE_STATE = 7;
OTAS_UPDATE_IN_PROGRESS_STATE = 8;
OTAS_SEND_VERIFY_REQ_STATE = 9;
OTAS_SEND_RESET_STATE = 10;
EVENT_COUNTER = 0;

OTAS_CURRENT_STATE = OTAS_DISCONNECTED_STATE;
var armPropDataCharacteristic = null;
var armPropDataService = null;
var wdxsService = null;
wdxsDeviceConfigCharacteristic = null;
wdxsFileTransferControlCharacteristic = null;
wdxsFileTransferDataCharacteristic = null;
wdsxFileAuthenticationCharacteristic = null;
//clang-format-off
//WDXS File List Configuration
WDX_FLIST_HANDLE = 0   //brief File List handle */
WDX_FLIST_FORMAT_VER = 1   //brief File List version */
WDX_FLIST_HDR_SIZE = 7   //brief File List header length */
WDX_FLIST_RECORD_SIZE = 40  //brief File List record length */

// Size of WDXC file discovery dataset 
DATC_WDXC_MAX_FILES = 4
// File Transfer Control Characteristic Operations
WDX_FTC_OP_NONE = new Uint8Array(1);
WDX_FTC_OP_GET_REQ = new Uint8Array(1);
WDX_FTC_OP_PUT_REQ = new Uint8Array(1);
WDX_FTC_OP_GET_RSP = new Uint8Array(1);
WDX_FTC_OP_PUT_RSP = new Uint8Array(1);
WDX_FTC_OP_ERASE_REQ = new Uint8Array(1);
WDX_FTC_OP_ERASE_RSP = new Uint8Array(1);
WDX_FTC_OP_VERIFY_REQ = new Uint8Array(1);
WDX_FTC_OP_VERIFY_RSP = new Uint8Array(1);
WDX_FTC_OP_ABORT = new Uint8Array(1);
WDX_FTC_OP_EOF = new Uint8Array(1);
WDX_DC_OP_SET = new Uint8Array(1);
WDX_DC_ID_DISCONNECT_AND_RESET = new Uint8Array(1);
WDX_FTC_OP_NONE[0] = 0
WDX_FTC_OP_GET_REQ[0] = 1
WDX_FTC_OP_PUT_REQ[0] = 3
WDX_FTC_OP_GET_RSP[0] = 2
WDX_FTC_OP_PUT_RSP[0] = 4
WDX_FTC_OP_ERASE_REQ[0] = 5
WDX_FTC_OP_ERASE_RSP[0] = 6
WDX_FTC_OP_VERIFY_REQ[0] = 7
WDX_FTC_OP_VERIFY_RSP[0] = 8
WDX_FTC_OP_ABORT[0] = 9
WDX_FTC_OP_EOF[0] = 10
WDX_DC_OP_SET[0] = 2
WDX_DC_ID_DISCONNECT_AND_RESET[0] = 37

WDX_FILE_HANDLE = new Uint8Array(2);
WDX_FILE_HANDLE[0] = 0;
WDX_FILE_HANDLE[1] = 0;

WDX_FILE_OFFSET = new Uint8Array(4);
WDX_FILE_OFFSET[0] = 0;
WDX_FILE_OFFSET[1] = 0;
WDX_FILE_OFFSET[2] = 0;
WDX_FILE_OFFSET[3] = 0;

WDX_FILE_TYPE = new Uint8Array(1);
WDX_FILE_TYPE[0] = 0;

maxFileRecordLength = new Uint8Array(4);
//set maxFileRecordLength to the value ((WDX_FLIST_RECORD_SIZE * DATC_WDXC_MAX_FILES) + WDX_FLIST_HDR_SIZE) in little endian
maxFileRecordLength[0] = 167;
maxFileRecordLength[1] = 0;
maxFileRecordLength[2] = 0;
maxFileRecordLength[3] = 0;




//maxFileRecordLength = ((WDX_FLIST_RECORD_SIZE * DATC_WDXC_MAX_FILES) \
//                   + WDX_FLIST_HDR_SIZE).to_bytes(4,byteorder='little',signed=False)

// clang-format on
//---------- Buttons ----------
connectButton.addEventListener('click', BLEManager);
sendButton.addEventListener('click', sendBLEData);
choseFileButton.addEventListener('click', chooseFile);
sendPacket.addEventListener('click', sendPacketFunction);

//---------- Functions ----------

// Calculate CRC32 on file when file is selected or changed
reader.onload = function() {
  const buff = reader.result;
  const crc32 = CRC32.buf(new Uint8Array(buff));
  let bytes = new Uint8Array(buff);
  fileBuffer = Array.from(bytes);
  // 32-bit unsigned integer from crc32
  const crc32Unsigned = crc32 >>> 0;
  // store crc32 as 4 bytes
  crc32bytes[0] = (crc32Unsigned & 0xff000000) >> 24;
  crc32bytes[1] = (crc32Unsigned & 0x00ff0000) >> 16;
  crc32bytes[2] = (crc32Unsigned & 0x0000ff00) >> 8;
  crc32bytes[3] = (crc32Unsigned & 0x000000ff);
  logger('CRC32: 0x' + crc32Unsigned.toString(16).toUpperCase());
};


// Async function to connect to BLE device, discover services and
// characteristics
async function BLEManager() {
  connectionStatus.textContent = 'SEARCHING';
  try {
    device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      //   filters: [{
      //     name: deviceNameInput.value,
      //   }],
      optionalServices: [
        'e0262760-08c2-11e1-9073-0e8ac72e1001',
        '0000fef6-0000-1000-8000-00805f9b34fb'
      ]
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
          if (count == (characteristics.length - 1)) {
            logger(
                '  └── Characteristic: ' + characteristic.uuid + ' ' +
                getSupportedProperties(characteristic));
          } else {
            logger(
                '  ├── Characteristic: ' + characteristic.uuid + ' ' +
                getSupportedProperties(characteristic));
          }
          count++;
        });
      }
    } catch (error) {
      loggerError(error);
    }

    await checkIfConnectedToOTAS();


  } catch (error) {
    loggerError(error);
    if (typeof device !== 'undefined') {
      connectionStatus.textContent = 'Connection Status: FAILED';
    } else {
      connectionStatus.textContent = 'Connection Status: CANCELLED';
    }
  }
}

async function sendBLEData() {
  // logger('Sending: ');
  // loggerData(stringToSend.value);
  // try {
  //   var uint8array = new TextEncoder().encode(stringToSend.value);
  //   armPropDataCharacteristic.writeValueWithoutResponse(uint8array);
  //   logger('Value has been written');
  // } catch (error) {
  //   loggerError(error);
  // }
  // TODO revert the above code
  OTAS_CURRENT_STATE = OTAS_FILE_DISCOVER_STATE;
  handleNotifications_wdxs_otas();
}

async function sendWdxsData(characteristic, data, response) {
  try {
    var uint8array = new TextEncoder().encode(stringToSend.value);
    if (response) {
      await characteristic.writeValueWithResponse(data);
    } else {
      await characteristic.writeValueWithoutResponse(data);
    }

  } catch (error) {
    loggerError(error);
  }
}


async function chooseFile() {
  logger('Opening file selector');
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
    // Discover ARMPropService
    armPropDataService = await connectedDevice.getPrimaryService(
        'e0262760-08c2-11e1-9073-0e8ac72e1001');
    // Discover ARMPropDataCharacteristic
    armPropDataCharacteristic = await armPropDataService.getCharacteristic(
        'e0262760-08c2-11e1-9073-0e8ac72e0001');


    // Discover wdxs service and characteristics
    wdxsService = await connectedDevice.getPrimaryService(
        '0000fef6-0000-1000-8000-00805f9b34fb');
    if (wdxsService) {
      logger('WDXS service found');
      // subscribe to all wdxs characteristics
      wdxsDeviceConfigCharacteristic = await wdxsService.getCharacteristic(
          '005f0002-2ff2-4ed5-b045-4c7463617865');
      wdxsFileTransferControlCharacteristic =
          await wdxsService.getCharacteristic(
              '005f0003-2ff2-4ed5-b045-4c7463617865');
      wdxsFileTransferDataCharacteristic = await wdxsService.getCharacteristic(
          '005f0004-2ff2-4ed5-b045-4c7463617865');
      wdsxFileAuthenticationCharacteristic =
          await wdxsService.getCharacteristic(
              '005f0005-2ff2-4ed5-b045-4c7463617865');

      // Enable notifications on ARMPropDataCharacteristic
      armPropDataCharacteristic.addEventListener(
          'characteristicvaluechanged', handleNotifications_wdxs_otas);

      // Enable notifications on WDXS characteristics
      wdxsDeviceConfigCharacteristic.addEventListener(
          'characteristicvaluechanged', handleNotifications_wdxs_otas);
      wdxsFileTransferControlCharacteristic.addEventListener(
          'characteristicvaluechanged', handleNotifications_wdxs_otas);
      wdxsFileTransferDataCharacteristic.addEventListener(
          'characteristicvaluechanged', handleNotifications_wdxs_otas);
      wdsxFileAuthenticationCharacteristic.addEventListener(
          'characteristicvaluechanged', handleNotifications_wdxs_otas);

      await armPropDataCharacteristic.startNotifications();
      await wdxsDeviceConfigCharacteristic.startNotifications();
      await wdxsFileTransferControlCharacteristic.startNotifications();
      await wdxsFileTransferDataCharacteristic.startNotifications();
      await wdsxFileAuthenticationCharacteristic.startNotifications();
      OTAS_CURRENT_STATE = OTAS_CONNECTED_STATE;
      logger('OTAS_CONNECTED_STATE is set to ' + OTAS_CONNECTED_STATE);
    } else {
      logger('WDXS service not found');
    }
  }
}

// this could be written better by giving an argument of type 'error' or
// 'data' etc.
function logger(text) {
  logArea.textContent += '> ' + text + '\n';
  logArea.scrollTop = logArea.scrollHeight;
}
function loggerError(text) {
  logArea.textContent += '!!! ' + text + ' !!!' +
      '\n';
  logArea.scrollTop = logArea.scrollHeight;
}
function loggerData(text) {
  logArea.textContent += '    ' +
      '[ ' + text + ' ]' +
      '\n';
  logArea.scrollTop = logArea.scrollHeight;
}

function handleNotifications_wdxs_otas() {
  if (EVENT_COUNTER == 2) {
    logger('Chanigng state to OTAS_SEND_FILE_STATE ');
    OTAS_CURRENT_STATE = OTAS_SEND_FILE_STATE;
  }
  switch (OTAS_CURRENT_STATE) {
    case OTAS_IDLE_STATE:
      logger('OTAS_IDLE_STATE');
      break;
    case OTAS_DISCONNECTED_STATE:
      logger('OTAS_DISCONNECTED_STATE');
      break;

    case OTAS_CONNECTED_STATE:
      logger('OTAS_CONNECTED_STATE');
      OTAS_CURRENT_STATE++;
      break;

    case OTAS_FILE_DISCOVER_STATE:
      logger('OTAS_FILE_DISCOVER_STATE');
      sendDiscoverFilerequest();
      logger('Send OTAS file discovery request');
      OTAS_CURRENT_STATE++;
      break;

    case OTAS_SEND_HEADER_STATE:
      logger('OTAS_SEND_HEADER_STATE');
      sendOtasHeader();
      logger('Sent OTAS header');
      OTAS_CURRENT_STATE++;
      break;

    case OTAS_SEND_PUT_REQ_STATE:
      logger('OTAS_SEND_PUT_REQ_STATE');
      sendPutRequest();
      OTAS_CURRENT_STATE++;
      break;
    case OTAS_ERASING_STATE:
      logger('OTAS_ERASING_STATE');
      EVENT_COUNTER++;
      break;

    case OTAS_SEND_FILE_STATE:
      logger('OTAS_SEND_FILE_STATE');
      OTAS_CURRENT_STATE++;
      // sendFile();
      break;
    case OTAS_UPDATE_IN_PROGRESS_STATE:
      logger('OTAS_UPDATE_IN_PROGRESS_STATE');
      break;
    case OTAS_SEND_VERIFY_REQ_STATE:
      logger('OTAS_SEND_VERIFY_REQ_STATE');
      OTAS_CURRENT_STATE++;
      break;

    case OTAS_SEND_RESET_STATE:
      logger('OTAS_SEND_RESET_STATE');
      OTAS_CURRENT_STATE++;
      break;

    default:
      logger('OTAS_UNKNOWN_STATE');
  }

  // logger('Sent OTAS header');
  // setTimeout(() => {
  //   sendDiscoverFilerequest();
  //   logger('Sent OTAS discover file request');
  // }, 3000);  // sleep for 3 seconds
}

async function sendOtasHeader() {
  logger('Sending header');
  var headerPackedArray = new Uint8Array(8);

  headerPackedArray[0] = fileSize & 0xff;
  headerPackedArray[1] = (fileSize >> 8) & 0xff;
  headerPackedArray[2] = (fileSize >> 16) & 0xff;
  headerPackedArray[3] = (fileSize >> 24) & 0xff;

  headerPackedArray[4] = crc32bytes[3];
  headerPackedArray[5] = crc32bytes[2];
  headerPackedArray[6] = crc32bytes[1];
  headerPackedArray[7] = crc32bytes[0];

  await sendWdxsData(armPropDataCharacteristic, headerPackedArray, false);
}

async function sendDiscoverFilerequest() {
  let packetToSend = new Uint8Array(12);
  packetToSend.set(WDX_FTC_OP_GET_REQ, 0);
  packetToSend.set(WDX_FILE_HANDLE, 1);
  packetToSend.set(WDX_FILE_OFFSET, 3);
  packetToSend.set(maxFileRecordLength, 7);
  packetToSend.set(WDX_FILE_TYPE, 11);
  await sendWdxsData(wdxsFileTransferControlCharacteristic, packetToSend, true);
}

async function sendPutRequest() {
  // WDX_FTC_OP_PUT_REQ + (1).to_bytes(2,byteorder='little',signed=False) +
  // WDX_FILE_OFFSET + file_len_bytes + file_len_bytes + WDX_FILE_TYPE
  let val = new Uint8Array(2);
  val[0] = 1;
  val[1] = 0;
  let packetToSend = new Uint8Array(16);
  packetToSend.set(WDX_FTC_OP_PUT_REQ, 0);  // 1 byte
  packetToSend.set(val, 1);                 // 2 bytes
  packetToSend.set(WDX_FILE_OFFSET, 3);     // 4 bytes
  packetToSend.set(fileSize, 7);            // 4 bytes
  packetToSend.set(fileSize, 11);           // 4 bytes
  packetToSend.set(WDX_FILE_TYPE, 15);      // 1 byte
  await sendWdxsData(wdxsFileTransferControlCharacteristic, packetToSend, true);
}

async function sendFile() {
  // send fileBuffer to WDX in chunks of 224 bytes
  var chunkSize = 224;
  var adrdressNum = 0;
  var addressBytes = new Uint8Array(4);
  // /const fileBuffer = reader.result;
  var chunkCount = Math.ceil(fileBuffer.length / chunkSize);
  // TODO : calculate how many bytes are left to send after chunkCount is done
  // and send the remaining bytes.
  // set addressNum into addressBytes in little endian format
  addressBytes[0] = adrdressNum & 0xff;
  addressBytes[1] = (adrdressNum >> 8) & 0xff;
  addressBytes[2] = (adrdressNum >> 16) & 0xff;
  addressBytes[3] = (adrdressNum >> 24) & 0xff;


  logger('Sending file in ' + chunkCount + ' chunks');
  // send chunk of file starting at sendAddress
  let packetToSend = new Uint8Array(chunkSize + addressBytes.length);
  packetToSend.set(addressBytes, 0);
  packetToSend.set(
      fileBuffer.slice(adrdressNum, adrdressNum + chunkSize),
      addressBytes.length);
  sendWdxsData(wdxsFileTransferDataCharacteristic, packetToSend, true);
  logger('Sent chunk of file to address' + adrdressNum);

  // while (adrdressNum < fileBuffer.length) {
  //   if (adrdressNum + chunkSize > fileSize) {
  //     // send remaining bytes
  //     let packetToSend = new Uint8Array(fileSize - adrdressNum +
  //     addressBytes.length); packetToSend.set(addressBytes, 0);
  //     packetToSend.set(fileBuffer.slice(adrdressNum, fileSize),
  //     addressBytes.length); sendWdxsData(wdxsFileTransferDataCharacteristic,
  //     packetToSend, true); logger('Sent last chunk of file to address' +
  //     adrdressNum); OTAS_CURRENT_STATE = OTAS_SEND_VERIFY_REQ_STATE;
  //     handleNotifications_wdxs_otas();

  //   } else {
  //     // send chunk of file starting at sendAddress
  //     let packetToSend = new Uint8Array(chunkSize + addressBytes.length);
  //     packetToSend.set(addressBytes, 0);
  //     packetToSend.set(fileBuffer.slice(adrdressNum, adrdressNum +
  //     chunkSize), addressBytes.length);
  //     sendWdxsData(wdxsFileTransferDataCharacteristic, packetToSend, true);
  //     logger('Sent chunk of file to address' + adrdressNum);

  //   }
  adrdressNum += chunkSize;
  // set addressNum into addressBytes in little endian format
  addressBytes[0] = adrdressNum & 0xff;
  addressBytes[1] = (adrdressNum >> 8) & 0xff;
  addressBytes[2] = (adrdressNum >> 16) & 0xff;
  addressBytes[3] = (adrdressNum >> 24) & 0xff;
}

async function sendPacketFunction() {
  logger('Sending packet');
  // send fileBuffer to WDX in chunks of 224 bytes
  var chunkSize = 224;
  var adrdressNum = 0;
  var addressBytes = new Uint8Array(4);
  // /const fileBuffer = reader.result;
  var chunkCount = Math.ceil(fileBuffer.length / chunkSize);
  // TODO : calculate how many bytes are left to send after chunkCount is done
  // and send the remaining bytes.
  // set addressNum into addressBytes in little endian format
  addressBytes[0] = adrdressNum & 0xff;
  addressBytes[1] = (adrdressNum >> 8) & 0xff;
  addressBytes[2] = (adrdressNum >> 16) & 0xff;
  addressBytes[3] = (adrdressNum >> 24) & 0xff;


  logger('Sending file in ' + chunkCount + ' chunks');
  // send chunk of file starting at sendAddress
  let packetToSend = new Uint8Array(chunkSize + addressBytes.length);
  packetToSend.set(addressBytes, 0);
  packetToSend.set(
      fileBuffer.slice(adrdressNum, adrdressNum + chunkSize),
      addressBytes.length);
  await sendWdxsData(wdxsFileTransferDataCharacteristic, packetToSend, false);
  logger('Sent chunk of file to address' + adrdressNum);

  adrdressNum += chunkSize;
  // set addressNum into addressBytes in little endian format
  addressBytes[0] = adrdressNum & 0xff;
  addressBytes[1] = (adrdressNum >> 8) & 0xff;
  addressBytes[2] = (adrdressNum >> 16) & 0xff;
  addressBytes[3] = (adrdressNum >> 24) & 0xff;
}