#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""  Turns an image into a two-colored grid of vectorpixels: squares,
circles, or squares with rounded corners.

Creating a vector image from a raster image usually consists of
imagining some kind of curve, responsible for the pixels. But this
is guess work at best. Why don’t we work with what’s actually
there—points?

This script turns an image into a grid of vector squares, circles,
or squares with rounded corners.

usage (command line):

python vectorpixel.py inputimage.png > outputimage.svg

 TODO: allow multi-colour pictures, implement vertical and horiontal scanlines """

import Image
import sys

class Vectorpixel:
    def __init__(self, image):
        self.i = Image.open(image).convert("1")
        self.px = self.i.load()
        self.constructed = False

    def construct(self, grid=24, line=1, rounded=4, test=(lambda x: x == 0)):
        self.grid = grid
        self.line = line
        self.rounded = rounded
        self.width = self.height = self.grid - 2 * self.line
        self.test = test
        self.fill = '#000000'
        self.constructed = True

    def _yieldlocations(self):
        for x in range(self.i.size[0]):
            for y in range(self.i.size[1]):
                if self.test(self.px[x,y]):
                    yield (x,y)

    def _mkelements(self):
        for l in self._yieldlocations():
            yield "<rect x='%s' y='%s' width='%s' height='%s' rx='%s' fill='%s'/>" % (
    self.grid * l[0] + self.line, self.grid * l[1] + self.line, self.width, self.height, self.rounded, self.fill)

    def _format(self):
        output = '<svg xmlns="http://www.w3.org/2000/svg" width="%s" height="%s">\n' % (self.i.size[0] * self.grid, self.i.size[1] * self.grid)
        for e in self._mkelements():
            output += e
            output += '\n'
        output += '</svg>'
        return output

    def generate(self):
        if not self.constructed:
            self.construct()
        return self._format()

    
if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage (command line):\npython vectorpixel.py inputimage.png > outputimage.svg")
    v = Vectorpixel(sys.argv[1])
    v.construct()
    print v.generate()

"""
Copyright (c) 2011-2012 Eric Schrijver

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
"""