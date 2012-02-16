#!/usr/bin/env python
# print the urls of all the images in a category of Wikimedia Commons
# example:
# $ python get_commons.py "Category:ScottForesman-raw"

# pipe to wget for download:
# $ python get_commons.py [category] | wget -i - --wait 1

import sys
import json
import urllib2
from urllib import quote

def make_api_query(category, q_continue=""):
    if q_continue:
        q_continue = '&gcmcontinue=' + q_continue
    url = 'http://commons.wikimedia.org/w/api.php?action=query&generator=categorymembers&gcmtitle=' + category + q_continue + '&gcmlimit=500&prop=imageinfo&iiprop=url&format=json'
    request = json.loads(urllib2.urlopen(url).read())
    if 'error' in request:
        sys.exit(request['error']['info'])
    for page in request['query']['pages'].values():
        try:
            print page['imageinfo'][0]['url']
        except KeyError: pass
    # there is a maximum of 500 results in one request, for paging
    # we use the query-continue value:
    if 'query-continue' in request:
        q_continue = quote(request['query-continue']['categorymembers']['gcmcontinue'])
        make_api_query(category, q_continue)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: python get_commons.py [category]")
    make_api_query(sys.argv[1])