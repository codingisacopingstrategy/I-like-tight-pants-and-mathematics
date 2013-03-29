#!/bin/bash
sudo apt-get install build-essential cmake
mkdir -p ~/src
cd ~/src
curl https://github.com/downloads/libgit2/libgit2/libgit2-0.17.0.tar.gz | tar xvz
cd libgit2-0.17.0
mkdir build && cd build
cmake ..
cmake --build .
sudo cmake --build . --target install
sudo ldconfig

