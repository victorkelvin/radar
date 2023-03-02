const { ipcRenderer } = require('electron');

document.addEventListener("DOMContentLoaded", async function (event) {
    loadLocalInfo();
});




document.getElementById('confirm-button').addEventListener('click', () => {
    let campaigns = [];
    let campaignName = document.getElementsByName('name-input');
    let campaignUrl = document.getElementsByName('url-input');
    let contacts = document.getElementById('contacts-input');
    let interval = document.getElementById('interval-input');

    for (i = 0; i < campaignUrl.length; i++) {
        if (campaignUrl[i].value) {
            campaigns.push({ name: campaignName[i].value, url: campaignUrl[i].value })
        }
    }

    let data = {campaigns, "contacts" : contacts.value, "interval": interval.value}
    console.log(data)
    ipcRenderer.send('startMonitor', data);
    saveLocalInfo(data);
})


function saveLocalInfo(formValues) {
    window.localStorage.setItem("campaignForm", JSON.stringify(formValues));
}

function loadLocalInfo() {
    let campaignName = document.getElementsByName('name-input');
    let campaignUrl = document.getElementsByName('url-input');
    let contacts = document.getElementById('contacts-input');
    let interval = document.getElementById('interval-input');
    
    let campaignForm = window.localStorage.getItem('campaignForm');
    let formValues = JSON.parse(campaignForm);
    let campaigns  = formValues.campaigns;
    
    console.log("Load Info: ", campaigns);

    for (i = 0; i < campaigns.length; i++) {
        campaignName[i].value = campaigns[i].name;
        campaignUrl[i].value = campaigns[i].url;
    }

    contacts.value = formValues.contacts;
    interval.value = formValues.interval;
}



