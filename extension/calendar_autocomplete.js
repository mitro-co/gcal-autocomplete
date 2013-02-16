/*
This content script is inserted into every page at document_start:
"after any files from css, but before any other DOM is constructed or any other script is run"
This lets us register handlers that the page can use.
*/
//alert('hello');

// Google calendar js does some weird thing where it caches the state of the form
// This means that when we change the form, it doesn't know, and uses the old location
// 
// As a hack, I'm currently overriding xmlhttprequest until I can figure out how to trigger
// google calendar's js to notice the change. I tried sending various events, but that doesn't 
// work for various reasons (including a webkit bug:  https://bugs.webkit.org/show_bug.cgi?id=16735)
// 


var added = {};



// this script is injected into the page and overrides xmlhttprequest
var scriptToInject = function() {
    var updateQueryStringParameter = function(qs, key, value) {
      var re = new RegExp(key + "(=.*?|)(&|$)", "i");
      var separator = "&";
      if (qs.match(re)) {
        return qs.replace(re, key + "=" + value + '$2');
      } else {
        return qs + separator + key + "=" + value;
      }
    };

    var oldOpen = XMLHttpRequest.prototype.open;
    var lastUrl = '';
    XMLHttpRequest.prototype.open = function(method, url, async, user, pass) {
        lastUrl = url;
        // finally call the original open method
        oldOpen.call(this, method, url, async, user, pass);
    };
    var oldSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(data) {
        if (lastUrl == 'event') {
            // if we're sending an update to the event handler, 
            // we use the hidden box to get the current location, and stick that
            // location into the XHR.

            // We cannot read directly from the whereBox because that is removed
            // from the DOM before (during?) the XHR
            var wb_ptr = document.getElementById("whereBoxPointer");
            if (!!wb_ptr && !!(wb_ptr.value)) {
                var currentLocation = wb_ptr.value;
                wb_ptr.value = "";
                var escLoc = encodeURIComponent(currentLocation);
                var newdata = updateQueryStringParameter(data, 'location', escLoc);
                console.log('data', data, 'new data', newdata);
                data = newdata;
            }
        }
        oldSend.call(this, data);
    };
};

function injectScript(f) {
    var wrappedFcn = '(' + f + ')();';
    var script = document.createElement('script');
    script.textContent = wrappedFcn;
    (document.head||document.documentElement).appendChild(script);
    script.parentNode.removeChild(script);
}

injectScript(scriptToInject);
$newWhereBox = $('<input type="text" id="whereBoxPointer">');
$('body').append($newWhereBox);


// try to figure out where the wherebox is and associate an autocomplete handler with it

var inject = function() {
    var $whereBox = $('.ep-tp input[type=text]').filter('.textinput');

    if ($whereBox && $whereBox.length === 1) {
        if (!($whereBox.attr('id') in added)) {
            console.log('injecting for ' + $whereBox.attr('id'));
            //$whereBox.hide();
            added[$whereBox.attr('id')] = true;
            var wbid = $whereBox.attr('id');
            $newWhereBox = $('#whereBoxPointer');
            $newWhereBox.attr('value','');

            $whereBox.change(function(){
                console.log('copying', $(this).attr('value'));
                $('#whereBoxPointer').attr('value', $(this).attr('value'));
            });
            //attach autocomplete
            $whereBox.autocomplete({
                //define callback to format results
                source: function(req, add){
                    //pass request to server
                    $.getJSON("http://venues.labs.mitro.co/api/v1/venues", {term : req.term}, function(data) {
                        //create array for response objects
                        var suggestions = [];
                        //process response
                        console.log(data);
                        $.each(data.response.venues, function(i, venue){
                        var vl = venue.location;
                        suggestions.push(venue.name +
                            " " + vl.address + " "+ vl.city + ", " + vl.state + " " + vl.postalCode);
                    });
                    // pass array to callback
                    add(suggestions);
                });
            },
            
            //define select handler
            select: function(e, ui) {
                //create formatted friend
                var location = ui.item.value;
                $whereBox.attr('value', location);
                $newWhereBox.attr('value', location);


                // The following are various failed attempts to send events
                // to GCal JS to refresh its cached state
/*
                setTimeout(function() {
                  var evt = document.createEvent("KeyboardEvent");
                  evt.initKeyboardEvent("keydown", true, true,window,
                    0, 0, 0, 0, 'e'.charCodeAt(0), 'e'.charCodeAt(0));
                  //evt.keyCode = 'e'.charCodeAt(0);

                  console.log($whereBox.attr('id'));
                  var cb = document.getElementById($whereBox.attr('id'));
                  var cancelled = !cb.dispatchEvent(evt);


                    $whereBox.trigger({type: 'keydown', which:'e'.charCodeAt(0)});
                    $whereBox.trigger({type: 'keypress', which:'e'.charCodeAt(0)});
                    $whereBox.trigger({type: 'keyup', which:'e'.charCodeAt(0)});
                    $whereBox.trigger({type: 'change'});
            }, 500);*/
                
                }

                /*
                //define select handler
                change: function() {
                    //prevent 'to' field being updated and correct position
                    $("#to").val("").css("top", 2);
                }  */


            });
        } else {
            // wherebox has already been added
            ;
        }
    } else if (added !== {}) {
        // there is no wherebox
        added = {};
    }
};

$(function() {
    inject();
    // whenever a new node is insterted, see if we have found a location box
    $(document).bind('DOMNodeInserted', function(e) {
       inject();
    });

});
