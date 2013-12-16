#!/bin/bash

SCRIPT=`pwd`/$0
ROOT=`dirname $SCRIPT`
BUILD_DIR=$ROOT/build
DB_DIR="$BUILD_DIR"/db
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$ROOT/erizo/build/erizo:$ROOT/erizo
export ERIZO_HOME=$ROOT/erizo/

ulimit -n 1024
ulimit -c unlimited

(
cd ./erizo_controller/erizoController
#node erizoController.js >erizo.log 2>&1 &
forever start -a -l forever.log -o erizo.log -e erizo-err.log erizoController.js
)

