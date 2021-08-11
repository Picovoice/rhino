echo "Preparing dir ..."
mkdir -p ./data/lib/

echo "Copying Library Files ..."
cp -r ../../lib/beaglebone ./data/lib/
cp -r ../../lib/common ./data/lib/
cp -r ../../lib/jetson ./data/lib/
cp -r ../../lib/linux ./data/lib/
cp -r ../../lib/mac ./data/lib/
cp -r ../../lib/raspberry-pi ./data/lib/
cp -r ../../lib/windows ./data/lib/

echo "Copy complete!"
