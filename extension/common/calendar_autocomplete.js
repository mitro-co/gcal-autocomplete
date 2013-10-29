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
var helper = new Helper();


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
var UNIQUE_STRING = 'gcal-autocomplete-ivu2qp948t7ujslfvkmq9p284otilerut';
var inject = function() {
    var $whereBox = $('.ep-tp input[type=text]').filter('.textinput');
    $whereBox.addClass(UNIQUE_STRING);
    var sendKeyEvents = function() {
        // TODO: figure out how to enable this without horrible performance problems
        console.log('dispatching event');
        var event = new KeyboardEvent('keydown');
        event.keyCode=32;
        document.querySelector('.' + UNIQUE_STRING).dispatchEvent(event);
        event = new KeyboardEvent('keypress');
        event.keyCode=32;
        document.querySelector('.' + UNIQUE_STRING).dispatchEvent(event);
        event = new KeyboardEvent('keyup');
        event.keyCode=32;
        document.querySelector('.' + UNIQUE_STRING).dispatchEvent(event);
    };

    var FOURSQUARE_SUGGESTION_LOCATION = "Suggestions: <a style=\"display:inline\" href=\"https://labs.mitro.co/\">Mitro Labs</a> using <a style=\"display:inline\" href=\"https://developer.foursquare.com/overview/venues.html\">Foursquare venue API.</a>";

    if ($whereBox && $whereBox.length === 1) {
        $warningNote = $('<div style="color:red">').text("Editing an existing event? Add a space to venue to save changes.")
                .hide();
        $whereBox.after($warningNote);
        if (!($whereBox.attr('id') in added)) {
            console.log('injecting for ' + $whereBox.attr('id'));
            //$whereBox.hide();
            added[$whereBox.attr('id')] = true;
            var wbid = $whereBox.attr('id');
            $newWhereBox = $('#whereBoxPointer');
            $newWhereBox.attr('value','');

            $whereBox.change(function(){
                console.log('copying', $whereBox.val());
                $('#whereBoxPointer').attr('value', $whereBox.val());
            });

            var addIfPresent = function(a, b) {
                return a?(a.replace(/[()]/g, ' ') + (b?b:'')):''
            };


            //attach autocomplete
            $whereBox.autocomplete({
                //define callback to format results
                source: function(req, add){
                    //pass request to server
                    helper.getJSON("http://venues.labs.mitro.co/api/v1/venues", {term : req.term}, function(data) {
                        //cdata.response.venues.push(null);
                        console.log(data);
                        //create array for response objects
                        var suggestions = [];
                        //process response
                        $.each(data.response.venues, function(i, venue){
                            var vl = venue.location;
                            var addr = addIfPresent(vl.address, ' ') + addIfPresent(vl.city, ', ') +  addIfPresent(vl.state, ' ') + addIfPresent(vl.postalCode);
                            if (!vl.address || !vl.city) {
                                venue.value = vl.lat + ',' + vl.lng + ' (' + addr + ' ' + addIfPresent(venue.name) + ')';
                            } else {
                                venue.value = addr + " (" + addIfPresent(venue.name) + ")";
                            }
                            suggestions.push(venue);
                        });
                        if (suggestions.length)
                            suggestions.push({'value':''});
                        // pass array to callback
                        add(suggestions);
                    });
                },
                
 
                //define select handler
                select: function(e, ui) {
                    var venue = ui.item;
                    console.log(venue);
                    if (!venue.value) {
                        return false;
                    }
                    var location = ui.item.value;

                    setTimeout(function() {
                        $newWhereBox.attr('value', location);
                        $warningNote.show();
                        sendKeyEvents();
                    },50);
                }   
            }).data('ui-autocomplete')._renderItem = function(ul, venue) {
                    if (venue.value) {
                        // default is an empty image.
                        var $img = $('<img style="vertical-algin:middle">').attr('src', 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
                        try {
                            var imgUrl = venue.categories[0].icon.prefix  + 'bg_32' + venue.categories[0].icon.suffix;
                            $img = $('<img style="vertical-algin:middle">').attr('src', imgUrl);
                        } catch (e) {}
                        $img.attr('height', 16).attr('width', 16);

                        var vl = venue.location;
                        return $('<li>')
                        .append($img)
                        //.data( "item.autocomplete", venue )
                        .append($('<a style="display:inline">').text(venue.value))
                        .appendTo(ul);
                    } else {
                        return $('<li>')
                        .data( "item.autocomplete", null )
                        .append('<br><img width="18" height="18" style="vertical-align:middle" src="https://playfoursquare.s3.amazonaws.com/press/logo/poweredByFoursquare_36x36.png">' 
                                + FOURSQUARE_SUGGESTION_LOCATION)
                        .appendTo(ul);
                    }
                };
            $('.ui-autocomplete').css('overflow-y', 'scroll');
            // ensure that the autocomplete box doesn't go off the screen, and also that it takes up as much of the screen as possible
            // so that no scrolling is required on big monitors.
            var minAutocompleteHeight = 200;
            var windowHeight = $(window).height();
            var boundingBox = $whereBox[0].getBoundingClientRect();
            var autocompleteHeight = 0.93 * (windowHeight - boundingBox.bottom);
            if (autocompleteHeight < minAutocompleteHeight) autocompleteHeight = minAutocompleteHeight;
            $('.ui-autocomplete').css('max-height', parseInt(autocompleteHeight, 10)+'px');

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
        var INPUT_RE = /^input$/i;  // fastest method: http://jsperf.com/case-insensitive-string-equals
        if (INPUT_RE.test(event.target.tagName) || (event.target.querySelector && event.target.querySelector('input') !== null)) {
            inject();
        }
    });

});
