const deviceNameInput = document.getElementById('deviceNameInput');
const connectButton = document.getElementById('connectButton');
const connectionStatus = document.getElementById('connectionStatus');
const connectedDevice ;
const device ;
connectButton.addEventListener('click',BLEManager);
sendButton.addEventListener('click',sendBLEData);

async function BLEManager(){
    connectionStatus.textContent = "SEARCHING";
    try{
        device = await navigator.bluetooth.requestDevice({
        // acceptAllDevices:true
        filters: [{name: deviceNameInput.value,}],
        optionalServices: ["e0262760-08c2-11e1-9073-0e8ac72e1001"]
        }); 

        connectedDevice = await device.gatt.connect();
        connectionStatus.textContent = "CONNECTED";
        // const armPropDataService = await connectedDevice.getPrimaryService("e0262760-08c2-11e1-9073-0e8ac72e1001");
        // console.log("Services obtained");
        // const armPropDataCharacteristic = await armPropDataService.getCharacteristic("e0262760-08c2-11e1-9073-0e8ac72e0001");
        // console.log(armPropDataCharacteristic);
        // console.log("Characteristics discovered");
        // var uint8array = new TextEncoder().encode("edwin amaya");
        // setTimeout(function () {
        //       armPropDataCharacteristic.writeValueWithoutResponse(uint8array);
        //       console.log("Value has been written");
        // },5000);
      
    }
    catch {
        if (typeof device !== 'undefined'){
            connectionStatus.textContent = "CONNECTION FAILED";
        }
        else {
            connectionStatus.textContent = "CANCELLED";
        }
        
    }

}

async function sendBLEData(){

    const armPropDataService = await connectedDevice.getPrimaryService("e0262760-08c2-11e1-9073-0e8ac72e1001");
    console.log("Services obtained");
    const armPropDataCharacteristic = await armPropDataService.getCharacteristic("e0262760-08c2-11e1-9073-0e8ac72e0001");
    console.log(armPropDataCharacteristic);
    console.log("Characteristics discovered");
    var uint8array = new TextEncoder().encode("edwin amaya");
    
    armPropDataCharacteristic.writeValueWithoutResponse(uint8array);
    console.log("Value has been written");

    
    
}