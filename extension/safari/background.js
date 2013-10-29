safari.application.addEventListener("message", function(event) {
    if (event.name === 'getJSON') {
        $.getJSON(event.message.url, event.message.data, function(result) {
            event.target.page.dispatchMessage("gotJSON", result);
        });
    } else {
        console.log('Unknow message');
    }
}, false);