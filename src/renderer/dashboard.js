const { ipcRenderer } = require('electron');

//___________DASHBOARD________________//

let dashboardForm = document.querySelector('.dashboard-form');
ipcRenderer.on('clearDashboard', () => {
    dashboardForm.innerHTML = ""
})

async function newDivHtml(data) {
    let statusTxt;
    if (data.status == 2) statusTxt = "ATENÇÃO";
    if (data.status == 1) statusTxt = "ATIVO";
    if (!data.status) statusTxt = "FALHA";
    let htmlNewElement = `
    <div class="dashboard-div">
        <span class="dashboard-info" name="dashboard-name">
            ${data.name} 
        </span>
        <p name="dashboard-url"> 
            ${data.url}
        </p>
        <span class="dashboard-info status${data.status}" id="dashboard-status">
            ${statusTxt}
        </span>
    </div>`;

    dashboardForm.innerHTML += htmlNewElement;




    return htmlNewElement;
}


ipcRenderer.on('createDashboard', async (ev, campaignForms) => {
    var dateTime = new Date();
    document.getElementById('last-verification').innerText = `Ultima verificação: ${dateTime.toLocaleString()}`;
    console.log('----------IPC: ', campaignForms)

    for (i = 0; i < campaignForms.length; i++) {
        await newDivHtml(campaignForms[i]);
    }
    document.getElementById('confirm-button').classList.remove('hidden');
});

document.getElementById('confirm-button').addEventListener('click', () => {
    document.getElementById('confirm-button').classList.add('hidden');

    ipcRenderer.send('startMonitor');
});

document.getElementById('return-button').addEventListener('click', () => {
    ipcRenderer.send('returnPage');
});

//document.querySelector('[name="dashboard-name"]').innerText


