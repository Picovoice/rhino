echo "Creating Android lib directory..."
if [ ! -d "./android/src/main/jniLibs" ]
then 
    mkdir -p ./android/src/main/jniLibs
fi

echo "Copying Android libs..."
cp -rp ../../lib/android/* ./android/src/main/jniLibs

echo "Copying iOS libs..."
cp ../../lib/ios/libpv_rhino.a ./ios/pv_rhino/libpv_rhino.a
cp ../../include/picovoice.h ./ios/pv_rhino/picovoice.h
cp ../../include/pv_rhino.h ./ios/pv_rhino/pv_rhino.h

echo "Creating model resources directory..."
if [ ! -d "./assets/lib/common" ]
then 
    mkdir -p ./assets/lib/common
fi

echo "Copying default model file..."
cp ../../lib/common/rhino_params.pv ./assets/lib/common/rhino_params.pv

echo "Copying license file..."
cp ../../LICENSE ./LICENSE