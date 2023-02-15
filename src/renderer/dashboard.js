const { ipcRenderer } = require('electron');

//___________DASHBOARD________________//

let dashboardForm = document.querySelector('.dashboard-form');

ipcRenderer.on('clearDashboard',()=>{
    dashboardForm.innerHTML = ""
})

async function newDivHtml(data) {
    let statusTxt;
    if(data.status) statusTxt = "ATIVO";
    if(!data.status) statusTxt = "FALHA";
    let htmlNewElement = `
    <div class="dashboard-div">
        <span class="dashboard-info" name="dashboard-name">
            ${data.name} 
        </span>
        <span class="dashboard-info" name="dashboard-url">
            ${data.url}
        </span>
        <span class="dashboard-status" name="dashboard-status">
            ${statusTxt}
        </span>
    </div>`;

    dashboardForm.innerHTML += htmlNewElement;




    return htmlNewElement;
}


ipcRenderer.on('createDashboard', async (ev, arg) => {

    console.log('----------IPC: ', arg)
    await newDivHtml(arg);
    console.log(newDiv)
})

//document.querySelector('[name="dashboard-name"]').innerText


