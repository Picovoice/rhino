#!/bin/sh

mkdir -p "${SRCROOT}/contexts/"
mkdir -p "${SRCROOT}/models/"

rm "${SRCROOT}/contexts/"*
rm "${SRCROOT}/models/"*

echo "${SRCROOT}/../../resources/contexts/ios/$2_ios.rhn"

if [ $1 == 'en' ];
then
    cp "${SRCROOT}/../../resources/contexts/ios/$2_ios.rhn" "${SRCROOT}/contexts/"
else
    cp "${SRCROOT}/../../resources/contexts_$1/ios/$2_ios.rhn" "${SRCROOT}/contexts/"
    cp "${SRCROOT}/../../lib/common/rhino_params_$1.pv" "${SRCROOT}/models/"
fi