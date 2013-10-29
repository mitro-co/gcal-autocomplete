var Helper = function(){};

Helper.prototype.getJSON = function(url, data, callback) {
    self.port.emit('getJSON', {url: url, data: data});
    self.port.once('getJSON', function(response) {
        callback(JSON.parse(response));
    });
};