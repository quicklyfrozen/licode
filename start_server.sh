#!/bin/bash

SCRIPT=`pwd`/$0
ROOT=`dirname $SCRIPT`
BUILD_DIR=$ROOT/build
DB_DIR="$BUILD_DIR"/db
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$ROOT/erizo/build/erizo:$ROOT/erizo
export ERIZO_HOME=$ROOT/erizo/

mongod --dbpath $DB_DIR > $BUILD_DIR/mongo.log &
sleep 5

(
cd ./nuve/nuveAPI
node nuve.js >nuve.log 2>&1 &
)

sleep 1

(
cd ./erizo_controller/erizoController
node erizoController.js >erizo.log 2>&1 &
)

sleep 1

(
cd ./extras/basic_example
node basicServer.js >basic.log 2>&1 &
)

