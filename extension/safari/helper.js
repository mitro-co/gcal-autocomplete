var Helper = function(){};

Helper.prototype.getJSON = function(url, data, callback) {
    safari.self.tab.dispatchMessage("getJSON", {url: url, data: data});
    safari.self.addEventListener("message", function handler(event) {
        if (event.name === 'gotJSON') {
            callback(event.message);
        }
        safari.self.removeEventListener("message", handler);
    });
};