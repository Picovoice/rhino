LIB_DIR="../../../../lib"
RESOURCE_DIR="../../../../resources"
ANDROID_ASSETS_DIR="./android/app/src/main/assets"
IOS_ASSETS_DIR="./ios/RhinoTestApp/Assets.bundle"

echo "Creating test resources asset directory"
mkdir -p ${ANDROID_ASSETS_DIR}
mkdir -p ${IOS_ASSETS_DIR}

echo "Copying test audio samples..."
mkdir -p ${ANDROID_ASSETS_DIR}/audio_samples
mkdir -p ${IOS_ASSETS_DIR}/audio_samples
cp ${RESOURCE_DIR}/audio_samples/*.wav ${ANDROID_ASSETS_DIR}/audio_samples
cp ${RESOURCE_DIR}/audio_samples/*.wav ${IOS_ASSETS_DIR}/audio_samples

echo "Copying test keyword files..."
mkdir -p ${ANDROID_ASSETS_DIR}/context_files
mkdir -p ${IOS_ASSETS_DIR}/context_files

mkdir -p ${ANDROID_ASSETS_DIR}/context_files/en
mkdir -p ${IOS_ASSETS_DIR}/context_files/en
cp ${RESOURCE_DIR}/contexts/android/*.rhn ${ANDROID_ASSETS_DIR}/context_files/en/
cp ${RESOURCE_DIR}/contexts/ios/*.rhn ${IOS_ASSETS_DIR}/context_files/en/

for d in ${RESOURCE_DIR}/contexts_*; do
    LANGUAGE=$(echo "${d}" | cut -d'_' -f2)

    mkdir -p ${ANDROID_ASSETS_DIR}/context_files/${LANGUAGE}
    mkdir -p ${IOS_ASSETS_DIR}/context_files/${LANGUAGE}
    cp ${RESOURCE_DIR}/contexts_${LANGUAGE}/android/*.rhn ${ANDROID_ASSETS_DIR}/context_files/${LANGUAGE}
    cp ${RESOURCE_DIR}/contexts_${LANGUAGE}/ios/*.rhn ${IOS_ASSETS_DIR}/context_files/${LANGUAGE}
done

echo "Copying test model files..."
mkdir -p ${ANDROID_ASSETS_DIR}/model_files
mkdir -p ${IOS_ASSETS_DIR}/model_files
cp ${LIB_DIR}/common/*.pv ${ANDROID_ASSETS_DIR}/model_files
cp ${LIB_DIR}/common/*.pv ${IOS_ASSETS_DIR}/model_files

echo "Copying test data file..."
cp ${RESOURCE_DIR}/test/test_data.json .
