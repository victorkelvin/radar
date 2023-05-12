function syncDelay(seconds) {
    var milliseconds = seconds * 1000;
    var start = new Date().getTime();
    var end = 0;
    while ((end - start) < milliseconds) {
        end = new Date().getTime();
    }
};


module.exports = { syncDelay };
