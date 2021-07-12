if [ ! -d "./rhino-activity-demo-app/src/androidTest/assets/test_resources/audio_samples" ]
then 
    echo "Creating test audio samples directory..."
    mkdir -p ./rhino-activity-demo-app/src/androidTest/assets/test_resources/audio_samples
fi

echo "Copying test audio samples..."
cp ../../../resources/audio_samples/test_within_context.wav ./rhino-activity-demo-app/src/androidTest/assets/test_resources/audio_samples/test_within_context.wav
cp ../../../resources/audio_samples/test_out_of_context.wav ./rhino-activity-demo-app/src/androidTest/assets/test_resources/audio_samples/test_out_of_context.wav

if [ ! -d "./rhino-activity-demo-app/src/androidTest/assets/test_resources/model_files" ]
then 
    echo "Creating test model files directory..."
    mkdir -p ./rhino-activity-demo-app/src/androidTest/assets/test_resources/model_files
fi

echo "Copying test model files..."
cp ../../../lib/common/rhino_params.pv ./rhino-activity-demo-app/src/androidTest/assets/test_resources/model_files/rhino_params.pv
cp ../../../lib/common/rhino_params_de.pv ./rhino-activity-demo-app/src/androidTest/assets/test_resources/model_files/rhino_params_de.pv
cp ../../../lib/common/rhino_params_es.pv ./rhino-activity-demo-app/src/androidTest/assets/test_resources/model_files/rhino_params_es.pv
cp ../../../lib/common/rhino_params_fr.pv ./rhino-activity-demo-app/src/androidTest/assets/test_resources/model_files/rhino_params_fr.pv

echo "Copying test context files..."
cp ../../../resources/contexts/android/coffee_maker_android.rhn ./rhino-activity-demo-app/src/androidTest/assets/test_resources/context_files/coffee_maker_android.rhn
cp ../../../resources/contexts/linux/coffee_maker_linux.rhn ./rhino-activity-demo-app/src/androidTest/assets/test_resources/context_files/coffee_maker_linux.rhn