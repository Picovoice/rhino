if [ ! -d "./rhino-activity-demo-app/src/androidTest/assets/test_resources/audio_samples" ]
then 
    echo "Creating test audio samples directory..."
    mkdir -p ./rhino-activity-demo-app/src/androidTest/assets/test_resources/audio_samples
fi

echo "Copying test audio samples..."
cp ../../../resources/audio_samples/*.wav ./rhino-activity-demo-app/src/androidTest/assets/test_resources/audio_samples

if [ ! -d "./rhino-activity-demo-app/src/androidTest/assets/test_resources/model_files" ]
then 
    echo "Creating test model files directory..."
    mkdir -p ./rhino-activity-demo-app/src/androidTest/assets/test_resources/model_files
fi

echo "Copying test model files..."
cp ../../../lib/common/*.pv ./rhino-activity-demo-app/src/androidTest/assets/test_resources/model_files

if [ ! -d "./rhino-activity-demo-app/src/androidTest/assets/test_resources/context_files" ]
then
    echo "Creating test context files directory..."
    mkdir -p ./rhino-activity-demo-app/src/androidTest/assets/test_resources/context_files
fi

echo "Copying test context files..."
cp ../../../resources/contexts/android/coffee_maker_android.rhn ./rhino-activity-demo-app/src/androidTest/assets/test_resources/context_files/coffee_maker_android.rhn
cp ../../../resources/contexts/linux/coffee_maker_linux.rhn ./rhino-activity-demo-app/src/androidTest/assets/test_resources/context_files/coffee_maker_linux.rhn
cp ../../../resources/contexts_de/android/beleuchtung_android.rhn ./rhino-activity-demo-app/src/androidTest/assets/test_resources/context_files/beleuchtung_android.rhn
cp ../../../resources/contexts_es/android/iluminación_inteligente_android.rhn ./rhino-activity-demo-app/src/androidTest/assets/test_resources/context_files/iluminación_inteligente_android.rhn
cp ../../../resources/contexts_fr/android/éclairage_intelligent_android.rhn ./rhino-activity-demo-app/src/androidTest/assets/test_resources/context_files/éclairage_intelligent_android.rhn
cp ../../../resources/contexts_it/android/illuminazione_android.rhn ./rhino-activity-demo-app/src/androidTest/assets/test_resources/context_files/illuminazione_android.rhn
cp ../../../resources/contexts_ja/android/sumāto_shōmei_android.rhn ./rhino-activity-demo-app/src/androidTest/assets/test_resources/context_files/sumāto_shōmei_android.rhn
cp ../../../resources/contexts_ko/android/seumateu_jomyeong_android.rhn ./rhino-activity-demo-app/src/androidTest/assets/test_resources/context_files/seumateu_jomyeong_android.rhn
cp ../../../resources/contexts_pt/android/luz_inteligente_android.rhn ./rhino-activity-demo-app/src/androidTest/assets/test_resources/context_files/luz_inteligente_android.rhn
