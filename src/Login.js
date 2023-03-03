const fs = require('fs');
const axios = require('axios').default;
const api = axios.create({
  baseURL: 'https://us-central1-launchzapp-gcloud.cloudfunctions.net'
});

let localData;

async function preload(dataPath) {
  localData = readValidationFile(dataPath);

  let browserIndex, login;
  if (!localData.email) {
    browserIndex = './validation.html';
    login = false
    return { browserIndex, login };
  } else {
    let validation = await checkLogin(localData, dataPath);
    return validation;
  }
}

async function checkLogin(loginData, dataPath) {
  let { data } = await api.post('radarLogin', { email: loginData.email });
  fs.mkdirSync(dataPath, {recursive: true,  });
  let login = false;
  let browserIndex;
  if (data.token != loginData.token) {
    browserIndex = './validation.html';
  } else {
    browserIndex = './auth.html';
    login = true;
    loginData = { email: data.email, token: data.token };
    fs.writeFileSync(`${dataPath}\\fbsa.json`, JSON.stringify(loginData), {flag: 'w'});
  };
  return { browserIndex, login };
}


function readValidationFile(dataPath) {
  const _fbsa = `${dataPath}\\fbsa.json`;
  try {
    var userData = fs.readFileSync(_fbsa, {encoding: 'utf-8', flag: 'a+'});
    return JSON.parse(userData);
  } catch (error) {
    return { email: false, token: false };

  }
}


module.exports = { checkLogin, preload };
