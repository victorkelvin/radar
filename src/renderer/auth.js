const {ipcRenderer} = require('electron')
const QRCode = require("qrcode");


ipcRenderer.on('newQR', async (event, arg) => {
    let canvasElement = document.querySelector('#auth-canvas');
    let authDiv = document.querySelector('.auth-div');
    let loader = document.querySelector('.auth-loader');
    if(loader) authDiv?.removeChild(loader);
    console.log(arg);
    // QRCode.create(arg,{ errorCorrectionLevel: 'H' });
    await QRCode.toCanvas(canvasElement, arg,{scale: 1, width: 198} ,{ errorCorrectionLevel: 'H' });
})