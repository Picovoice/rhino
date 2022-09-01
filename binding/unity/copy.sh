echo "Copying Android resources..."
cp ../../lib/android/arm64-v8a/libpv_rhino.so ./Assets/Rhino/Plugins/android/arm64-v8a/libpv_rhino.so
cp ../../lib/android/armeabi-v7a/libpv_rhino.so ./Assets/Rhino/Plugins/android/armeabi-v7a/libpv_rhino.so

echo "Copying iOS lib..."
cp -R ../../lib/ios/PvRhino.xcframework/ios-arm64_armv7/PvRhino.framework ./Assets/Rhino/Plugins/ios/PvRhino.framework

echo "Copying Linux lib..."
cp ../../lib/linux/x86_64/libpv_rhino.so ./Assets/Rhino/Plugins/linux/x86_64/libpv_rhino.so

echo "Copying macOS lib..."
cp ../../lib/mac/x86_64/libpv_rhino.dylib ./Assets/Rhino/Plugins/mac/x86_64/libpv_rhino.dylib

echo "Copying macOS (Apple silicon) lib..."
cp ../../lib/mac/arm64/libpv_rhino.dylib ./Assets/Rhino/Plugins/mac/arm64/libpv_rhino.dylib

echo "Copying Windows lib..."
cp ../../lib/windows/amd64/libpv_rhino.dll ./Assets/Rhino/Plugins/windows/amd64/pv_rhino.dll

echo "Copying Rhino common lib..."
cp ../../lib/common/rhino_params.pv ./Assets/StreamingAssets/rhino_params.pv

echo "Copying demo files..."
if [ ! -d "./Assets/Rhino/Demo" ]
then 
    mkdir -p ./Assets/Rhino/Demo
fi
cp -rp ../../demo/unity/* ./Assets/Rhino/Demo

cp ../../resources/contexts/android/smart_lighting_android.rhn ./Assets/StreamingAssets/contexts/android/smart_lighting_android.rhn
cp ../../resources/contexts/ios/smart_lighting_ios.rhn ./Assets/StreamingAssets/contexts/ios/smart_lighting_ios.rhn
cp ../../resources/contexts/linux/smart_lighting_linux.rhn ./Assets/StreamingAssets/contexts/linux/smart_lighting_linux.rhn
cp ../../resources/contexts/mac/smart_lighting_mac.rhn ./Assets/StreamingAssets/contexts/mac/smart_lighting_mac.rhn
cp ../../resources/contexts/windows/smart_lighting_windows.rhn ./Assets/StreamingAssets/contexts/windows/smart_lighting_windows.rhn

echo "Copy complete!"