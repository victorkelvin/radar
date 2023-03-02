const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const makeWASocket = require('@adiwajshing/baileys').default;
const { boomify } = require("@hapi/boom");
const { DisconnectReason, fetchLatestBaileysVersion, useMultiFileAuthState } = require("@adiwajshing/baileys");
const fs = require("fs");
const P = require("pino");
const axios = require('axios');
const axiosRetry = require('axios-retry');
const { checkLogin, checkSession, preload } = require("./src/Login");
const {syncDelay} = require('./src/Utils');


let sock;
let mainWindow;
let authPage = "./auth.html";
let indexPage = "./index.html";
let browserIndex = authPage;
let dataPath = `${app.getPath('userData')}\\storage`;
let onTop = 0;
let login;
let campaignForm, interval, intervalMnts, campaigns, contacts;

const nativeMenus = [{
  label: 'Ferramentas',
  submenu: [{
    label: 'Always on top',
    type: 'checkbox',
    click: () => {
      onTop ? onTop = 0 : onTop = 1;
      mainWindow.setAlwaysOnTop(onTop);
    },
  },
  {
    label: 'Apagar Cache',
    click() { clearCache() }
  },
  {
    label: 'Desconectar WhatsApp',
    click() { waLogout() }
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

let menu = Menu.buildFromTemplate(nativeMenus);


app.whenReady().then(async () => {

  let prealoadResponse = await preload(dataPath);
  browserIndex = prealoadResponse.browserIndex;
  login = prealoadResponse.login;




  mainWindow = createBrowserWindow(browserIndex);

  if (login) main();

  ipcMain.on('startMonitor', async (ev, response) => {
    if (interval) clearInterval(interval);
    if (response) {
      intervalMnts = response.interval * 60000;
      campaigns = response.campaigns;
      contacts = response.contacts;
    }

    console.log("startmonitor IPC:\n Campanhas: ", campaigns, "\n Interval: ", intervalMnts, "\n Contatos: ", contacts);
    campaignForm = await getGroupCode(campaigns);
    await startMonitor(campaignForm);
    interval = setInterval(async () => await startMonitor(campaignForm), intervalMnts)

  })

  // ipcMain.on('startMonitor', async (ev, response) => {
  //   checkGroup(response);
  // })

  ipcMain.on('returnPage', () => {
    mainWindow.loadFile('./index.html');
    if (interval) clearInterval(interval);

  });

  ipcMain.on('checkValidation', async (ev, response) => {
    let { login } = await checkLogin(response, dataPath);
    if (login) {
      mainWindow.loadFile(authPage)
      main();
    } else {
      mainWindow.webContents.send('validation-error');
    }
  });

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
      // mainWindow.webContents.openDevTools();

    }
    if (connection == 'open') {
      mainWindow.loadFile(indexPage);
      //mainWindow.webContents.openDevTools();
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
    maxWidth: 800,
    useContentSize: true,
    height: 700,
    width: 500,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      // devTools: true
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
    let retries = 3;
    if (args[i].url.startsWith(remove)) {
      args[i].groupCode = args[i].url.replaceAll(remove, '');
    } else {
      let groupCode="";
      while(!groupCode.startsWith(remove) && retries!=0){
        const resp = await axios.get(args[i].url);
        groupCode = resp.request.res.responseUrl;
        retries--;
        syncDelay(5);
      }
      groupCode = groupCode.replaceAll(remove, '');
      args[i].groupCode = groupCode;
    }
  }
  return args;
};


async function startMonitor(campaignForm) {
  console.log('starting Monitor!');
  mainWindow.webContents.send('clearDashboard');
  mainWindow.loadFile('./dashboard.html');
  for (i = 0; i < campaignForm.length; i++) {
    let status;
    try {
      let groupInfo = await sock.groupGetInviteInfo(campaignForm[i].groupCode);
      if (groupInfo.size > 1800) {
        status = 2;
        await sendAlertMessage(campaignForm[i], status);
      } else {
        status = 1;
      }
    } catch (error) {
      mainWindow.show();
      status = 0;
      await sendAlertMessage(campaignForm[i], status);
    }
    mainWindow.webContents.send('createDashboard', { ...campaignForm[i], status });
  }
};


async function sendAlertMessage(campaign, status) {
  let textMessageError = `🔴 *ATENÇÃO* 🔴
  Problema encontrado no link da campanha:
  *${campaign.name}*

  Link: ${campaign.url}
  
  _Alerta gerado pelo *RADAR APP*_`;

  let textMessageAlert = `⚠️ *ALERTA* ⚠️
  Campanha com mais de 1800 participantes:
  *${campaign.name}*

  Link: ${campaign.url}
  
  _Alerta gerado pelo *RADAR APP*_`;

  if (!status) textMessage = textMessageError;
  if (status == 2) textMessage = textMessageAlert;


  let wid = await getWAjid(contacts);
  console.log('CONTATOS: ', wid);

  for (let x in wid) {
    await sock.sendMessage(wid[x], { text: textMessage })
  }

}


async function getWAjid(contactList) {
  let contacts = contactList.replace(/\s/g, '');
  contacts = contacts.split(',');
  let contactsJID = [];
  let empty = contacts.indexOf('');
  while (empty >= 0) {
    contacts.splice(empty, 1);
    empty = contacts.indexOf('');
  };
  for (var i = 0; i < contacts.length; i++) {
    var [response] = await sock.onWhatsApp("55" + contacts[i]);
    if (response != undefined && response?.exists) {
      contactsJID.push(response.jid);
    }
  }
  return contactsJID;
}



//https://joinzap.app/coc07
//https://joinzap.app/atv16