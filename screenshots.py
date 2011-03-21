import os
import subprocess
from glob import iglob
from random import randint

"""posts = dict((i.replace('.html',''), ('http://i.liketightpants.net/and/' + i.replace('.html',''))) for i in iglob('*.html') if i not in ['index.html','archives.html'])"""

posts = {}

for i in iglob('*.html'):
    # talking-of-content.html contains flash and crashes webkit2png
    if i not in ['index.html','archives.html','talking-of-content.html']: 
        i = i.replace('.html','')
        posts[i] = 'http://i.liketightpants.net/and/' + i

for post, url in posts.iteritems():
    print post, url
    # append a random query string to the uri so webkit doesn’t use a cached result
    url = "%s?id=%s" % (url, randint(222222,777777))
    outfile = "assets/as/screenshots/of/%s" % post
    # webkit2png automatically appends '-full' to the output (bad idea, imho)
    outfile_def = outfile + '-full.png' 
    pipe = subprocess.Popen(['webkit2png', '-o', outfile, '-W', '1040', '-H' '1300', '-F', url])
    pipe.wait()
    # convert post-full.png to 440 by 500 assets/as/screenshots/of/post.png
    # use imagemagick, because webkit2png’s built in resize looks fuzzy
    pipe = subprocess.Popen("convert %s -resize 440x550^ -gravity North -extent 440x550 assets/as/screenshots/of/%s.png" % (outfile_def, post), shell=True)
    pipe.wait()
    # remove post-full.png
    os.remove(outfile_def)


