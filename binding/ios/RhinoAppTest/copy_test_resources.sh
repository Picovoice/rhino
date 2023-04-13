LIB_DIR="../../../lib"
RESOURCE_DIR="../../../resources"
ASSETS_DIR="./RhinoAppTestUITests/test_resources"

echo "Creating test resources asset directory"
mkdir -p ${ASSETS_DIR}

echo "Copying test audio samples..."
mkdir -p ${ASSETS_DIR}/audio_samples
cp ${RESOURCE_DIR}/audio_samples/*.wav ${ASSETS_DIR}/audio_samples

echo "Copying test keyword files..."
mkdir -p ${ASSETS_DIR}/context_files

mkdir -p ${ASSETS_DIR}/context_files/en
cp ${RESOURCE_DIR}/contexts/linux/coffee_maker_linux.rhn ${ASSETS_DIR}/context_files/en/
cp ${RESOURCE_DIR}/contexts/ios/*.rhn ${ASSETS_DIR}/context_files/en/

for d in ${RESOURCE_DIR}/contexts_*; do
    LANGUAGE=$(echo "${d}" | cut -d'_' -f2)

    mkdir -p ${ASSETS_DIR}/context_files/${LANGUAGE}
    cp ${RESOURCE_DIR}/contexts_${LANGUAGE}/ios/*.rhn ${ASSETS_DIR}/context_files/${LANGUAGE}
done

echo "Copying test model files..."
mkdir -p ${ASSETS_DIR}/model_files
cp ${LIB_DIR}/common/*.pv ${ASSETS_DIR}/model_files

echo "Copying test data file..."
cp ${RESOURCE_DIR}/.test/test_data.json ${ASSETS_DIR}

echo "Fixing filename encodings for Appcenter compatibility"
convmv --notest -f utf8 -t utf8 --nfd -r ${ASSETS_DIR}
