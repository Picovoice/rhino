LIB_DIR=../../../lib
RESOURCE_DIR=../../../resources
ASSET_DIR=./rhino-activity-demo-app/src/androidTest/assets/test_resources

if [ ! -d "${ASSET_DIR}/audio_samples" ]
then
    echo "Creating test audio samples directory..."
    mkdir -p ${ASSET_DIR}/audio_samples
fi

echo "Copying test audio samples..."
cp ${RESOURCE_DIR}/audio_samples/*.wav ${ASSET_DIR}/audio_samples

if [ ! -d "${ASSET_DIR}/model_files" ]
then
    echo "Creating test model files directory..."
    mkdir -p ${ASSET_DIR}/model_files
fi

echo "Copying test model files..."
cp ${LIB_DIR}/common/*.pv ${ASSET_DIR}/model_files

if [ ! -d "${ASSET_DIR}/context_files" ]
then
    echo "Creating test context files directory..."
    mkdir -p ${ASSET_DIR}/context_files
fi

echo "Copying test context files..."
mkdir -p ${ASSET_DIR}/context_files/en/
cp ${RESOURCE_DIR}/contexts/linux/coffee_maker_linux.rhn ${ASSET_DIR}/context_files/en/
cp ${RESOURCE_DIR}/contexts/android/*_android.rhn ${ASSET_DIR}/context_files/en/

for d in ${RESOURCE_DIR}/contexts_*; do
    LANGUAGE=$(echo "${d}" | cut -d'_' -f2)

    mkdir -p ${ASSET_DIR}/context_files/${LANGUAGE}
    cp ${RESOURCE_DIR}/contexts_${LANGUAGE}/android/*_android.rhn ${ASSET_DIR}/context_files/${LANGUAGE}/
done

echo "Copying test data file..."
cp ${RESOURCE_DIR}/test/test_data.json ${ASSET_DIR}/
