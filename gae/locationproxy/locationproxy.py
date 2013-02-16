import webapp2
import logging
import urllib
from google.appengine.api.urlfetch import fetch
from google.appengine.api import memcache
import json
import zlib
import time

from secrets import FOURSQUARE_CLIENT_ID, FOURSQUARE_CLIENT_SECRET
FOURSQUARE_SEARCH_URL_TEMPL = "https://api.foursquare.com/v2/venues/search?%s"
class VenueSearch(webapp2.RequestHandler):
    def get(self):
        term = self.request.get('term')

        data = memcache.get(term)
        if data:
            try: 
                content = zlib.decompress(data['content'])
            except zlib.error:
                data = None
                content = None
                memcache.delete(term)
                logging.info('bad cached data for %s', term)

        if data is None:
            logging.info('cache miss for term [%s]', term)
            params = {'client_id' : FOURSQUARE_CLIENT_ID,
            'client_secret' : FOURSQUARE_CLIENT_SECRET,
            #near:'nyc',
            'intent' : 'global',
            'v' : '20130101',
            'query' : term
            }
            url = FOURSQUARE_SEARCH_URL_TEMPL % urllib.urlencode(params)
            result = fetch(url, validate_certificate=True)
            data = {'status' : result.status_code,
                    'time' : time.time(),
                    'content_type' : result.headers['Content-Type'],
                    'content' : result.content}

            parsed_data = json.loads(data['content'])
            # default is 5 minutes
            cache_time = 60 * 5
            if data['status'] == 200:
                # 6 hours for empty results
                cache_time = 60 * 60 * 6
                if parsed_data['response']['venues']:
                    cache_time = 60 * 60 * 24 * 15  # 15 days
            parsed_data['cache'] = {'time': cache_time,
                                     'hit': True}
            data['content'] = zlib.compress(json.dumps(parsed_data))
            memcache.add(term, data, cache_time)
            parsed_data['cache']['hit'] = False
            content = json.dumps(parsed_data)
        else:
            logging.info('cache hit for term [%s]', term)

        self.response.status = data['status']
        self.response.content_type = data['content_type']
        self.response.write(content)


app = webapp2.WSGIApplication([('/api/v1/venues', VenueSearch)],
                               debug=True)