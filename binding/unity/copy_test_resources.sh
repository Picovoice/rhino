LIB_DIR="../../lib"
RESOURCE_DIR="../../resources"
ASSETS_DIR="./Assets/StreamingAssets/test"

echo "Creating test resources asset directory"
mkdir -p ${ASSETS_DIR}

echo "Copying test audio samples..."
mkdir -p ${ASSETS_DIR}/audio_samples
cp ${RESOURCE_DIR}/audio_samples/*.wav ${ASSETS_DIR}/audio_samples

echo "Copying test keyword files..."
mkdir -p ${ASSETS_DIR}/context_files
cp -r ${RESOURCE_DIR}/contexts/android ${ASSETS_DIR}/context_files/
cp -r ${RESOURCE_DIR}/contexts/ios ${ASSETS_DIR}/context_files/
cp -r ${RESOURCE_DIR}/contexts/linux ${ASSETS_DIR}/context_files/
cp -r ${RESOURCE_DIR}/contexts/mac ${ASSETS_DIR}/context_files/
cp -r ${RESOURCE_DIR}/contexts/windows ${ASSETS_DIR}/context_files/

for d in ${RESOURCE_DIR}/contexts_*; do
    LANGUAGE=$(echo "${d}" | cut -d'_' -f2)

    mkdir -p ${ASSETS_DIR}/context_files_${LANGUAGE}
    cp -r ${RESOURCE_DIR}/contexts_${LANGUAGE}/android ${ASSETS_DIR}/context_files_${LANGUAGE}/
    cp -r ${RESOURCE_DIR}/contexts_${LANGUAGE}/ios ${ASSETS_DIR}/context_files_${LANGUAGE}/
    cp -r ${RESOURCE_DIR}/contexts_${LANGUAGE}/linux ${ASSETS_DIR}/context_files_${LANGUAGE}/
    cp -r ${RESOURCE_DIR}/contexts_${LANGUAGE}/mac ${ASSETS_DIR}/context_files_${LANGUAGE}/
    cp -r ${RESOURCE_DIR}/contexts_${LANGUAGE}/windows ${ASSETS_DIR}/context_files_${LANGUAGE}/
done

echo "Copying test model files..."
mkdir -p ${ASSETS_DIR}/model_files
cp ${LIB_DIR}/common/*.pv ${ASSETS_DIR}/model_files

echo "Copying test data file..."
cp ${RESOURCE_DIR}/test/test_data.json ${ASSETS_DIR}
