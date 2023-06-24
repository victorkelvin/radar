const got = require('got');

const waURL = 'https://chat.whatsapp.com/';

async function getGroupCode(args) {

    for (i = 0; i < args.length; i++) {
        args[i].url.startsWith(waURL) ? args[i].groupCode = args[i].url.replaceAll(waURL, '') : args[i].groupCode = await getWALink(args[i].url).then(link => { return link.replaceAll(waURL, '') })
    }
    return args;
};


async function getWALink(url) {
    var gCode = "";
    let retries = 3;
    while (!gCode.startsWith(waURL) && retries != 0) {
        if (url.startsWith('https://go-whats.com/')) {
            let redirect = url.replaceAll('https://go-whats.com/', 'https://go-whats.com/redirect/');
            let resp = await got(redirect, { timeout: { request: 5000 } });
            let jsonResp = JSON.parse(resp.body);
            gCode = jsonResp.link
        } else {
            try {
                let resp = await got(url, { timeout: { request: 5000 } });
                resp.statusCode = 200 && resp.redirectUrls[0] ? gCode = resp.redirectUrls[0].split('/').slice(-1)[0] : gCode = "null", retries = 1;
            } catch (error) {
                gCode = "null";
                fs.appendFileSync(`${dataPath}\\radar.log`, JSON.stringify(error), { flag: 'a' });
            };
        }
        retries--;
    }
    return gCode;
}

module.exports = {getGroupCode}