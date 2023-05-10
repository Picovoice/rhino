#!/bin/sh

mkdir -p "${SRCROOT}/contexts/"
mkdir -p "${SRCROOT}/models/"

rm "${SRCROOT}/contexts/"*
rm "${SRCROOT}/models/"*

if [ $1 == 'en' ];
then
    cp "${SRCROOT}/../../resources/contexts/ios/"* "${SRCROOT}/contexts/"
    cp "${SRCROOT}/../../lib/common/rhino_params.pv" "${SRCROOT}/models/"
else
    cp "${SRCROOT}/../../resources/contexts_$1/ios/"* "${SRCROOT}/contexts/"
    cp "${SRCROOT}/../../lib/common/rhino_params_$1.pv" "${SRCROOT}/models/"
fi