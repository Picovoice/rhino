echo "Copying Rhino model..."
cp ../../lib/common/rhino_params.pv ./embedded/lib/common/rhino_params.pv

echo "Copying Linux lib..."
cp ../../lib/linux/x86_64/libpv_rhino.so ./embedded/lib/linux/x86_64/libpv_rhino.so

echo "Copying macOS lib..."
cp ../../lib/mac/x86_64/libpv_rhino.dylib ./embedded/lib/mac/x86_64/libpv_rhino.dylib

echo "Copying Windows lib..."
cp ../../lib/windows/amd64/libpv_rhino.dll ./embedded/lib/windows/amd64/libpv_rhino.dll

echo "Copy complete!"