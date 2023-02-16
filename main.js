const { app, BrowserWindow, dialog, ipcMain, Menu } = require("electron");
const makeWASocket = require('@adiwajshing/baileys').default;
const { boomify } = require("@hapi/boom");
const { DisconnectReason, fetchLatestBaileysVersion, useMultiFileAuthState } = require("@adiwajshing/baileys");
const fs = require("fs");
const { syncDelay } = require("./src/Utils");
const P = require("pino");
const https = require('https');
const axios = require('axios');

let sock;
let mainWindow;
let authPage = "./auth.html";
let indexPage = "./index.html";
let browserIndex = authPage;
let dataPath = `${app.getPath('userData')}\\storage`;
let campaignForm;
let interval;

const nativeMenus = [{
  label: 'Ferramentas',
  submenu: [{
    label: 'Desconectar WhatsApp',
    click() { waLogout() }
  },
  {
    label: 'Apagar Cache',
    click() { clearCache() }
  }
  ]
}, {
  label: "Editar",
  submenu: [
    { label: "Desfazer", accelerator: "CmdOrCtrl+Z", role: "undo:" },
    { label: "Refazer", accelerator: "Shift+CmdOrCtrl+Z", role: "redo:" },
    { type: "separator" },
    { label: "Recortar", accelerator: "CmdOrCtrl+X", role: "cut:" },
    { label: "Copiar", accelerator: "CmdOrCtrl+C", role: "copy:" },
    { label: "Colar", accelerator: "CmdOrCtrl+V", role: "paste:" },
    { label: "Selecionar tudo", accelerator: "CmdOrCtrl+A", role: "selectAll:" }
  ]
}];

const menu = Menu.buildFromTemplate(nativeMenus);


app.whenReady().then(async () => {
  mainWindow = createBrowserWindow(browserIndex);

  main();

  ipcMain.on('startMonitor', async (ev, response) => {

    if(interval)clearInterval(interval);

    console.log("startmonitor IPC:", response);
    campaignForm = await getGroupCode(response);
    await startMonitor(campaignForm);
    interval = setInterval(async () => await startMonitor(campaignForm),300000 )
    
  })
  
  ipcMain.on('returnPage', () =>{
    mainWindow.loadFile('./index.html')
  })

});

async function main() {
  const sessionPATH = `${dataPath}\\sessionDir`;
  if (!fs.existsSync(sessionPATH)) {
    fs.mkdirSync(sessionPATH, { recursive: true });
  };

  let fileAuth = await useMultiFileAuthState(sessionPATH);

  sock = await startSock(fileAuth.state);


  sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {

    if (connection === "close") {
      // reconnect if not logged out
      var boomError = boomify(lastDisconnect.error);
      console.log(boomError);
      if (boomError.output?.statusCode !== DisconnectReason.loggedOut) {
        main();
      } else if (boomError.output.statusCode == DisconnectReason.badSession) {
        fs.rmSync(sessionPATH, { force: true, recursive: true });
        main();
      } else if (boomError.output.statusCode == DisconnectReason.loggedOut) {
        mainWindow.loadFile(authPage);
        fs.rmSync(sessionPATH, { force: true, recursive: true });
        main();
      }
    }

    if (qr) {
      console.log('NEW QR GENERATED', qr)
      mainWindow.webContents.send("newQR", qr);
      mainWindow.webContents.openDevTools();

    }
    if (connection == 'open') {
      mainWindow.loadFile(indexPage);
      mainWindow.webContents.openDevTools();
    }
  });
  sock.ev.on("creds.update", fileAuth.saveCreds);
}



const startSock = async (state) => {
  // let { saveState } = useSingleFileAuthState(`${dataPath}\\SESSION.json`, P({ level: "warn" }));

  // fetch latest version of WA Web
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`using WA v${version.join(".")}, isLatest: ${isLatest}`);
  const sock = makeWASocket({
    version,
    logger: P({ level: 'silent', stream: 'store' }),
    auth: state,
    msgRetryCounterMap: 2,
    // browser: ['LaunchZAPP', 'Chrome', '4.0.0'],
    browser: ['Windows', 'Chrome', '10.15.7'],
    defaultQueryTimeoutMs: 9999,
    getMessage: async key => {
      return {
        conversation: key
      }
    }
  });

  return sock;
};


const createBrowserWindow = (browserIndex) => {
  const browserOptions = {
    minWidth: 500,
    minHeight: 500,
    // maxWidth: 800,
    useContentSize: true,
    height: 700,
    width: 500,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: true
    },
  };
  const browser = new BrowserWindow(browserOptions);
  browser.setMenu(menu);
  browser.loadFile(browserIndex);
  return browser;
};

process.on('uncaughtException', (e, origin) => {
  fs.writeFileSync(`${dataPath}\\radar.log`, e.stack, { flag: 'w+' });
  // throw e;
});


async function getGroupCode(args) {
  const remove = 'https://chat.whatsapp.com/';
  for (i = 0; i < args.length; i++) {
    try {
      const resp = await axios.get(args[i].url);
      var groupCode = resp.request.res.responseUrl;
      groupCode = groupCode.replaceAll(remove, '');
      args[i].groupCode = groupCode;
    } catch (error) {
      console.log(error);
    }
  }
  args[1].groupCode = "Iuy7sI3XNXwBuJ9xAb7weA";
  return args;
};

async function startMonitor(campaignForm) {
  console.log('starting Monitor!');
  console.log(campaignForm); 
  mainWindow.webContents.send('clearDashboard');
  mainWindow.loadFile('./dashboard.html');
  for (i = 0; i < campaignForm.length; i++) {
    let status;
    try {
      await sock.groupGetInviteInfo(campaignForm[i].groupCode);
      status = 1;
    } catch (error) {
      status = 0;
    }
    mainWindow.webContents.send('createDashboard', {...campaignForm[i], status} );
  }
};

