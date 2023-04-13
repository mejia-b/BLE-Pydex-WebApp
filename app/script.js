
//---------- HTML elements ----------
const deviceNameInput = document.getElementById('deviceNameInput');
const stringToSend = document.getElementById('stringToSendInput');
const connectButton = document.getElementById('connectButton');
const sendButton = document.getElementById('sendButton');
const startUpdateButton = document.getElementById('startUpdateButton');
const logArea = document.getElementById('logArea');
const OTAUpdateCard = document.getElementById('OTAUpdateCard');
//---------- Buttons ----------
connectButton.addEventListener('click', BLEManager);
sendButton.addEventListener('click', sendBLEData);
startUpdateButton.addEventListener('click', startUpdate);



crc32bytes = new Uint8Array(4);
fileSize = 0;
fileBuffer = [];
adrdressNum = 0;
charCallBackCount = 0;
charCallBacks = [10];
//---------- File chooser ----------
const choseFileButton = document.getElementById('choseFileButton');
choseFileButton.addEventListener('change', function() {
  reader.readAsArrayBuffer(this.files[0]);
  // get file size
  fileSize = this.files[0].size;
  logger('File loaded: ' + this.files[0].name + fileSize + ' bytes');
});
const reader = new FileReader();

//---------- BLE objects ----------
class bleCharacteristic {
  constructor(uuid, index, properties) {
    this.uuid = uuid;
    this.index = index;
    this.properties = properties;
  }
}

class bleService {
  constructor(uuid, index) {
    this.uuid = uuid;
    this.index = index;
    this.characteristics = [];
  }
}

let services = {};
let enabledNotifications = new Set();
let connectedDevice = null;
let device = null;

// Here you can add more UUIDs per your application needs
const uuids = {
  '00001800-0000-1000-8000-00805f9b34fb': 'Generic Access Profile',
  '00001801-0000-1000-8000-00805f9b34fb': 'Generic Attribute Profile',
  '00001802-0000-1000-8000-00805f9b34fb': 'Immediate Alert',
  '00001803-0000-1000-8000-00805f9b34fb': 'Link Loss',
  '0000fef6-0000-1000-8000-00805f9b34fb': 'WDXS Service',
  '005f0002-2ff2-4ed5-b045-4c7463617865':
      'WDX Device Configuration Characteristic',
  '005f0003-2ff2-4ed5-b045-4c7463617865':
      'WDX File Transfer Control Characteristic',
  '005f0004-2ff2-4ed5-b045-4c7463617865':
      'WDX File Transfer Data Characteristic',
  '005f0005-2ff2-4ed5-b045-4c7463617865': 'WDX Authentication Characteristic',
 // 'e0262760-08c2-11e1-9073-0e8ac72e1001': 'ARM Prop. Data Service',
 // 'e0262760-08c2-11e1-9073-0e8ac72e0001': 'ARM Prop. Data Characteristic',

  // Add more UUIDs here
};

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
  logger('Length of file: ' + fileBuffer.length + ' bytes');
};


// Async function to connect to BLE device, discover services and
// characteristics
async function BLEManager() {
  try {
    if (deviceNameInput.value == '') {
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
    } else {
      device = await navigator.bluetooth.requestDevice({
        filters: [{
          name: deviceNameInput.value,
        }]
        // optionalServices: [
        //   'e0262760-08c2-11e1-9073-0e8ac72e1001',
        //   '0000fef6-0000-1000-8000-00805f9b34fb'
      });
    }

    connectedDevice = await device.gatt.connect();
    device.addEventListener('gattserverdisconnected', onDisconnected);
    // TODO: Update connection status
    logger('Connected to ' + device.name);

    try {
      logger('Getting Services...');
      const primaryServices = await connectedDevice.getPrimaryServices();

      logger('Getting Characteristics...');
      for (const service of primaryServices) {
        const characteristics = await service.getCharacteristics();
        let serviceUuid = service.uuid;
        services[serviceUuid] = {
          uuid: serviceUuid,
          characteristics: [],
          object: service
        };
        for (const characteristic of characteristics) {
          const properties = getSupportedProperties(characteristic);
          services[serviceUuid].characteristics.push(
              {uuid: characteristic.uuid, properties, object: characteristic});
        }
      }
      console.log(services);
      createAccordion(services);
    } catch (error) {
      loggerError(error);
    }

    await checkIfConnectedToOTAS();


  } catch (error) {
    loggerError(error);
  }
}
function onDisconnected(event) {
  // TODO : lots of variable cleanup
  logger('> Bluetooth Device disconnected');
  clearAccordion('accordionExample');
}

async function sendBLEData() {
  // TODO this needs to be generic
  logger('Sending: ');
  loggerData(stringToSend.value);
  try {
    var uint8array = new TextEncoder().encode(stringToSend.value);
    armPropDataCharacteristic.writeValueWithoutResponse(uint8array);
    logger('Value has been written');
  } catch (error) {
    loggerError(error);
  }
}

async function startUpdate() {
  // kicko ff bootload
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
      OTAUpdateCard.removeAttribute('hidden');
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
  logger('Event counter: ' + EVENT_COUNTER);
  if (EVENT_COUNTER == 2) {
    logger('Chanigng state to OTAS_SEND_FILE_STATE ');
    OTAS_CURRENT_STATE = OTAS_SEND_FILE_STATE;
    EVENT_COUNTER = 0;
  }
  setTimeout(function() {
    logger('Delaying 10ms');
  }, 10);
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
      sendFile();
      break;
    case OTAS_UPDATE_IN_PROGRESS_STATE:
      logger('OTAS_UPDATE_IN_PROGRESS_STATE');
      break;
    case OTAS_SEND_VERIFY_REQ_STATE:
      logger('OTAS_SEND_VERIFY_REQ_STATE');
      OTAS_CURRENT_STATE++;
      sendVerifyRequest();
      //TODO : only sent reset request if verify state is success == 0
      break;

    case OTAS_SEND_RESET_STATE:
      logger('OTAS_SEND_RESET_STATE');
      OTAS_CURRENT_STATE++;
      sendResetState();
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
  var packetToSend = new Uint8Array(8);

  var fileSizeBytes = new Uint8Array(4);



  packetToSend[3] = (fileSize >> 24) & 0xff;
  packetToSend[2] = (fileSize >> 16) & 0xff;
  packetToSend[1] = (fileSize >> 8) & 0xff;
  packetToSend[0] = fileSize & 0xff;

  packetToSend[4] = crc32bytes[3];
  packetToSend[5] = crc32bytes[2];
  packetToSend[6] = crc32bytes[1];
  packetToSend[7] = crc32bytes[0];

  logger('Sending OTAS header: ' + packetToSend);
  await sendWdxsData(armPropDataCharacteristic, packetToSend, false);
}

async function sendDiscoverFilerequest() {
  let packetToSend = new Uint8Array(12);
  packetToSend.set(WDX_FTC_OP_GET_REQ, 0);
  packetToSend.set(WDX_FILE_HANDLE, 1);
  packetToSend.set(WDX_FILE_OFFSET, 3);
  packetToSend.set(maxFileRecordLength, 7);
  packetToSend.set(WDX_FILE_TYPE, 11);
  logger('Sending OTAS discover file request: ' + packetToSend);
  await sendWdxsData(wdxsFileTransferControlCharacteristic, packetToSend, true);
}

async function sendPutRequest() {
  // WDX_FTC_OP_PUT_REQ + (1).to_bytes(2,byteorder='little',signed=False) +
  // WDX_FILE_OFFSET + file_len_bytes + file_len_bytes + WDX_FILE_TYPE
  let val = new Uint8Array(2);
  val[0] = 1;
  val[1] = 0;
  var fileSizeBytes = new Uint8Array(4);

  fileSizeBytes[3] = (fileBuffer.length >> 24) & 0xff;
  fileSizeBytes[2] = (fileBuffer.length >> 16) & 0xff;
  fileSizeBytes[1] = (fileBuffer.length >> 8) & 0xff;
  fileSizeBytes[0] = fileBuffer.length & 0xff;
  logger(fileSizeBytes);
  let packetToSend = new Uint8Array(16);
  packetToSend.set(WDX_FTC_OP_PUT_REQ, 0);  // 1 byte
  packetToSend.set(val, 1);                 // 2 bytes
  packetToSend.set(WDX_FILE_OFFSET, 3);     // 4 bytes
  packetToSend.set(fileSizeBytes, 7);       // 4 bytes
  packetToSend.set(fileSizeBytes, 11);      // 4 bytes
  packetToSend.set(WDX_FILE_TYPE, 15);      // 1 byte
  logger(packetToSend);
  await sendWdxsData(wdxsFileTransferControlCharacteristic, packetToSend, true);
}

async function sendFile() {
 
  var chunkSize = 220;
  var adrdressNum = 0;
  var addressBytes = new Uint8Array(4);
  // /const fileBuffer = reader.result;
  var chunkCount = Math.ceil(fileBuffer.length / chunkSize);
 
  addressBytes[0] = 0;
  addressBytes[1] = 0;
  addressBytes[2] = 0;
  addressBytes[3] = 0;
  exit = false;

 
  var intervalId = setInterval(function() {
    if ((adrdressNum + chunkSize) > fileSize) {  // last chunk
      // send remaining bytes
      var packetToSend =
          new Uint8Array(fileSize - adrdressNum + addressBytes.length);
      packetToSend.set(addressBytes, 0);
      packetToSend.set(
          fileBuffer.slice(adrdressNum, fileSize), addressBytes.length);
      sendWdxsData(wdxsFileTransferDataCharacteristic, packetToSend, false);
      logger('Sent last chunk of file to address' + adrdressNum);
      OTAS_CURRENT_STATE = OTAS_SEND_VERIFY_REQ_STATE;
      exit = true;

    } else {
      // send chunk of file starting at sendAddress
      var packetToSend = new Uint8Array(chunkSize + addressBytes.length);
      packetToSend.set(addressBytes, 0);
      packetToSend.set(
          fileBuffer.slice(adrdressNum, adrdressNum + chunkSize),
          addressBytes.length);
      sendWdxsData(wdxsFileTransferDataCharacteristic, packetToSend, false);
      logger('Sent chunk of file to address' + adrdressNum);
    }
    adrdressNum += chunkSize;
    // set addressNum into addressBytes in little endian format
    addressBytes[0] = adrdressNum & 0xff;
    addressBytes[1] = (adrdressNum >> 8) & 0xff;
    addressBytes[2] = (adrdressNum >> 16) & 0xff;
    addressBytes[3] = (adrdressNum >> 24) & 0xff;

    // Update progress bar and blockquote element
    var progress = (adrdressNum / fileSize) * 100;
    document.querySelector('.progress-bar').setAttribute('aria-valuenow', progress);
    document.querySelector('.progress-bar').style.width = progress + '%';
    document.querySelector('.blockquote p').textContent = progress.toFixed(0) + '% Uploaded';

    if (exit) {
      clearInterval(intervalId);
    }
  }, 10);
}

async function sendVerifyRequest() {
  let newFileHandle = new Uint8Array(2);
  newFileHandle[0] = 1;
  newFileHandle[1] = 0;
  let packetToSend = new Uint8Array(3);
  packetToSend.set(WDX_FTC_OP_VERIFY_REQ, 0);
  packetToSend.set(newFileHandle, 1);
  sendWdxsData(wdxsFileTransferControlCharacteristic, packetToSend, true);
  logger('Sent packet to verify file' + packetToSend);
}
async function sendResetState() {
  let packetToSend = new Uint8Array(2);

  packetToSend.set(WDX_DC_OP_SET, 0);
  packetToSend.set(WDX_DC_ID_DISCONNECT_AND_RESET, 1);
  sendWdxsData(wdxsDeviceConfigCharacteristic, packetToSend, true);
  logger('Sent packet to reset state' + packetToSend);
}
async function sendPacketFunction() {
  let newFileHandle = new Uint8Array(2);
  newFileHandle[0] = 1;
  newFileHandle[1] = 0;
  let packetToSend = new Uint8Array(3);
  packetToSend.set(WDX_FTC_OP_VERIFY_REQ, 0);
  packetToSend.set(newFileHandle, 1);
  sendWdxsData(wdxsFileTransferControlCharacteristic, packetToSend, true);
  logger('Sent packet to verify file' + packetToSend);
}
function clearAccordion(accordionId) {
  var accordion = document.querySelector('#' + accordionId);
  var items = accordion.querySelectorAll('.accordion-item');
  items.forEach(function(item) {
    item.remove();
  });
}
function createAccordionItem(headerId, bodyId, headerText, bodyText) {
  var newItem = `
  <div class="accordion-item">
    <h2 class="accordion-header" id="${headerId}">
      <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#${
      bodyId}" aria-expanded="false" aria-controls="${bodyId}">${headerText}
      </button>
    </h2>
    <div id="${bodyId}" class="accordion-collapse collapse" aria-labelledby="${
      headerId}" data-bs-parent="#accordionExample">
      <div class="accordion-body">
      ${bodyText}
      </div>
    </div>
  </div>
`;
  return newItem;
}


function createAccordion(services) {
  var accordion = document.getElementById('accordionExample');
  accordion.innerHTML = '';
  for (const serviceUuid in services) {
    let service = services[serviceUuid];
    var headerText = 'Service : ' + (uuids[service.uuid] || service.uuid);
    if (!uuids[service.uuid]) {
      headerText = 'Service : ' + service.uuid;
    }
    var bodyText = createBodyText(service);
    var newAccordionItem = createAccordionItem(
        'heading' + service.uuid, 'collapse' + service.uuid, headerText,
        bodyText);
    accordion.insertAdjacentHTML('beforeend', newAccordionItem);
  }
}

function createBodyText(service) {
  var bodyText = '';
  for (const characteristic of service.characteristics) {
    var characteristicName = uuids[characteristic.uuid] || characteristic.uuid;
    var properties = characteristic.properties.split(',');
    var badges = '';
    var formCheckInput = '';
    var button = '';
    var formControl = '';
    for (const property of properties) {
      if (property.includes('WRITEWITHOUTRESPONSE') ||
          property.includes('WRITE')) {
        if (property.includes('WRITEWITHOUTRESPONSE')) {
          badges += `<span class="badge bg-warning ms-1">${
              property.replace('[', '').replace(']', '').replace(
                  'WRITEWITHOUTRESPONSE', 'WRITENORESP')}</span>`;
        } else {
          badges += `<span class="badge bg-secondary ms-1">${
              property.replace('[', '').replace(']', '')}</span>`;
        }
        let inputId = `input-${service.uuid}-${characteristic.uuid}`;
        let buttonId = `button-${service.uuid}-${characteristic.uuid}`;
        button = `<button type="button" class="btn btn-primary ms-1" id="${
            buttonId}" onclick="writeButtonCallback('${inputId}', '${
            service.uuid}', '${characteristic.uuid}')">write</button>`;
        formControl = `<input class="form-control ms-1" id="${
            inputId}" placeholder="string to send">`;
      } else if (property.includes('NOTIFY')) {
        badges += `<span class="badge bg-info ms-1">${
            property.replace('[', '').replace(']', '')}</span>`;
        formCheckInput = `<div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" id="${
            characteristic.uuid}" onchange="enableNotification(this, '${
            characteristic.uuid}', '${service.uuid}')" >
            <label class="form-check-label" for="${
            characteristic.uuid}">Enable Notification</label>
          </div>`;
      } else {
        badges += `<span class="badge bg-primary ms-1">${
            property.replace('[', '').replace(']', '')}</span>`;
      }
    }
    bodyText += `<div class="card border-info mb-3"><div class="card-header">${
        characteristicName}</div><div class="card-body"><div class="pb-3">${
        formCheckInput}</div><div class="d-flex">${formControl}${
        button}</div></div><div class="card-footer">${badges}</div></div>`;
  }
  return bodyText;
}

async function writeButtonCallback(inputId, serviceUuid, characteristicUuid) {
  let inputValue = document.getElementById(inputId).value;
  logger(`Input value: ${inputValue}, Service UUID: ${
      serviceUuid}, Characteristic UUID: ${characteristicUuid}`);
  try {
    let characteristic =
        services[serviceUuid]
            .characteristics.find(c => c.uuid === characteristicUuid)
            .object;
    var uint8array = new TextEncoder().encode(inputValue);
    await characteristic.writeValueWithoutResponse(uint8array);
    logger('Value has been written');
  } catch (error) {
    loggerError(error);
  }
}
function createGenericListener(charUuid) {
  return function(event) {
    // handle the event here
    let value = event.target.value;
    let dataRecevied = new TextDecoder().decode(value);
    logger(`Notification : ${(uuids[charUuid] || charUuid)} : ${dataRecevied} `);
    // logger(`Notification : ${uuids[charUuid]} : ${event.target.value} `);
  }
}
async function enableNotification(checkbox, charUuid, serviceUuid) {
  if (checkbox.checked) {
    if (!enabledNotifications.has(charUuid)) {
      let service = services[serviceUuid].object;
      let char = services[serviceUuid]
                     .characteristics.find(c => c.uuid === charUuid)
                     .object;
      var genericListener = createGenericListener(charUuid);
      services[serviceUuid].listener = genericListener;
      char.addEventListener('characteristicvaluechanged', genericListener);
      await char.startNotifications();
      logger('Notification enabled for ' + (uuids[charUuid] || charUuid));
      enabledNotifications.add(charUuid);
    } else {
      logger('Notification already enabled for ' + (uuids[charUuid] || charUuid));
    }
  } else {
    // remove eventlistener
    if (enabledNotifications.has(charUuid)) {
      let char = services[serviceUuid]
                    .characteristics.find(c => c.uuid === charUuid)
                    .object;
      let genericListener = services[serviceUuid].listener;
      char.removeEventListener('characteristicvaluechanged', genericListener);
      await char.stopNotifications();
      logger('Notification disabled for ' + (uuids[charUuid] || charUuid));
      enabledNotifications.delete(charUuid);
    } else {
      logger('Notification already disabled for ' + (uuids[charUuid] || charUuid));
    }    
    
  }
}
function addNewAccordionItems(myStructArray) {
  const accordion = document.querySelector('#accordionExample');

  myStructArray.forEach((item, index) => {
    const headerId = `heading${index}`;
    const bodyId = `collapse${index}`;
    const headerText = `Item ${index + 1}`;
    const bodyText = item.index;
    const newItem = createAccordionItem(headerId, bodyId, headerText, bodyText);
    accordion.insertAdjacentHTML('beforeend', newItem);

  });
}
function removeEventListeners(charCallBacks) {
  charCallBacks.forEach(function(callback) {
    callback.characteristic.removeEventListener('characteristicvaluechanged', callback.callback);
  });
}
function buttonCB(id) {
  logger('the button pressed is ' + id);
}
function updateAccordionElement(headerId, bodyId, headerText, bodyText) {
  document.getElementById(headerId).innerHTML =
      '<button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#' +
      bodyId + '" aria-expanded="false" aria-controls="' + bodyId + '">' +
      headerText + '</button>';

  // Update parent text
  document.getElementById(bodyId).innerHTML =
      '<div class="accordion-body">' + bodyText + '</div>';
}