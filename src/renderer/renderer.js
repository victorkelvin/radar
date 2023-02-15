const { ipcRenderer } = require('electron');

document.addEventListener("DOMContentLoaded", async function (event) {
    loadLocalInfo();
});




document.getElementById('confirm-button').addEventListener('click', () => {
    let campaigns = [];
    let campaignName = document.getElementsByName('name-input');
    let campaignUrl = document.getElementsByName('url-input');

    for (i = 0; i < campaignUrl.length; i++) {
        campaigns.push({ name: campaignName[i].value, url: campaignUrl[i].value })
    }
    ipcRenderer.send('startMonitor', campaigns);
    saveLocalInfo(campaigns);
})


function saveLocalInfo(formValues) {
    window.localStorage.setItem("campaignForm", JSON.stringify(formValues));
}

function loadLocalInfo() {
    let campaignForm = window.localStorage.getItem('campaignForm');
    let campaignName = document.getElementsByName('name-input');
    let campaignUrl = document.getElementsByName('url-input');

    let formValues = JSON.parse(campaignForm);

    for (i = 0; i < formValues.length; i++) {
        campaignName[i].value = formValues[i].name;
        campaignUrl[i].value = formValues[i].url;

    }
}



// https://joinzap.app/coc07