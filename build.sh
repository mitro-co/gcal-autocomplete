#!/bin/bash

CHROME_BUILD_DIR=$(pwd)/build
TARGET_BASENAME=gcal-autocomplete
SOURCE_DIR=extension
mkdir -p $CHROME_BUILD_DIR 
zip -r9 $CHROME_BUILD_DIR/$TARGET_BASENAME.zip $SOURCE_DIR/*

