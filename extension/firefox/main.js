var pageMod = require("sdk/page-mod");
var data = require("sdk/self").data;
var MatchPattern = require("match-pattern").MatchPattern;
var Request = require("sdk/request").Request;

var content_scripts = [data.url("jquery-1.9.1.min.js"),
                       data.url("jquery-ui-1.10.0.custom.min.js"),
                       data.url("helper.js"),
                       data.url("calendar_autocomplete.js")];

pageMod.PageMod({
    include: [/.*:\/\/www.google.com\/calendar.*render.*/],
    contentScriptWhen: 'ready',
    contentScriptFile: content_scripts,
    contentStyleFile: data.url('jquery-ui-1.10.0.custom.min.css'),
    onAttach: function(worker) {
        worker.port.on('getJSON', function(params) {
            var _params = {
                url: params.url,
                content: params.data,
                onComplete: function(response){
                    worker.port.emit('getJSON', response.text);
                }
            };
            Request(_params).get();
        });
    }
});

