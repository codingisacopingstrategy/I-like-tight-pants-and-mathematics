#!/usr/bin/env
# -*- coding: utf-8 -*-

"""
Create screenshots for the archive page
"""

import os
import subprocess
from sys import argv
from glob import iglob
from random import randint

posts = {}

if len(argv) > 1:
    # Take post slugs from command line
    for i in argv[1:]:
        posts[i] = 'http://i.liketightpants.net/and/' + i
else:
    # Otherwise, all posts
    for i in iglob('*.html'):
        if i not in ['index.html','archives.html']: 
            i = i.replace('.html','')
            posts[i] = 'http://i.liketightpants.net/and/' + i

for post, url in posts.iteritems():
    print "taking a screenshot of post", post, url
    # append a random query string to the uri so webkit doesn’t use a cached result
    url = "%s?id=%s" % (url, randint(222222,777777))
    fullfile = "assets/as/screenshots/of/%s-full.png" % post
    pipe = subprocess.Popen(['phantomjs', 'rasterise.js', url, fullfile])
    pipe.wait()
    # convert post-full.png to 150 by 110 assets/as/screenshots/of/post.png
    pipe = subprocess.Popen("convert %s -resize 210x154^ -gravity North -extent 150x110 assets/as/screenshots/of/%s.png" % (fullfile, post), shell=True)
    pipe.wait()
    # remove post-full.png
    os.remove(fullfile)

