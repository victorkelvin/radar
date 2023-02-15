function formatID (contactList){
    let contacts = contactList.replace(/\s/g, '');
    contacts = contacts.split(',');
    let empty = contacts.indexOf('');
    while (empty >= 0) {
        contacts.splice(empty, 1);
        empty = contacts.indexOf('');
    };
    return contacts;
}

function syncDelay(seconds){
    var milliseconds = seconds * 1000;
    var start = new Date().getTime();
    var end = 0;
    while ((end - start) < milliseconds) {
        end = new Date().getTime();
    }
};


module.exports = {formatID, syncDelay};
