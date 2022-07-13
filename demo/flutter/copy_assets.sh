if [ ! -d "./assets/contexts/android" ]
then 
    echo "Creating Android demo asset directory..."
    mkdir -p ./assets/contexts/android
fi

echo "Copying Android demo context..."
cp ../../resources/contexts/android/smart_lighting_android.rhn ./assets/contexts/android/smart_lighting_android.rhn

if [ ! -d "./assets/contexts/ios" ]
then 
    echo "Creating iOS demo asset directory..."
    mkdir -p ./assets/contexts/ios
fi

echo "Copying iOS demo context..."
cp ../../resources/contexts/ios/smart_lighting_ios.rhn ./assets/contexts/ios/smart_lighting_ios.rhn