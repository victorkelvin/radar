const { ipcRenderer } = require('electron');


const sendValidation = document.getElementById('send-validation');

sendValidation.addEventListener('click', () => {
    let email = document.getElementById('email-input').value;
    let token = document.getElementById('token-input').value;
    email = email.replace(/\s/g, '');
    token = token.replace(/\s/g, '');
    let data = { email, token };
    ipcRenderer.send('checkValidation', data);
})

ipcRenderer.on('validation-error', () => {
    document.getElementById('validation-error').innerHTML = `<br><strong style='color:red'>EMAIL OU TOKEN INVÁLIDO</strong>`;
})