#!/usr/bin/env bash

set -e
set -x
cd ..

sh copy_assets.sh

git clone -b stable https://github.com/flutter/flutter.git
export PATH=`pwd`/flutter/bin:$PATH

flutter channel stable
flutter doctor

echo "Installed flutter to `pwd`/flutter"

flutter build ios --debug --no-codesign