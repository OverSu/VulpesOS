#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
python3 tools/prepare-toolchain.py
export JAVA_HOME="$PWD/toolchain/jdk-21.0.12.1+1"
export ANDROID_HOME="$PWD/toolchain/sdk"
export GRADLE_USER_HOME="$PWD/toolchain/gradle-cache"
export PATH="$JAVA_HOME/bin:$PATH"
mkdir -p keys
if [[ ! -f keys/preview.keystore ]]; then
  keytool -genkeypair -keystore keys/preview.keystore -storepass android -keypass android -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Vulpes Preview,O=Vulpes,C=FR"
  chmod 600 keys/preview.keystore
fi
python3 tools/pack-assets.py "$@"
printf 'sdk.dir=%s\n' "$ANDROID_HOME" > local.properties
./toolchain/gradle-9.5.0/bin/gradle --no-daemon :app:assembleDebug
mkdir -p dist
vulpes_version=$(python3 -c 'import sys; sys.path.insert(0,"../tools"); from project import release_info; print(release_info()["version"])')
vulpes_apk="dist/vulpes-os-preview-${vulpes_version}.apk"
"$ANDROID_HOME/build-tools/37.0.0/zipalign" -f -P 16 4 app/build/outputs/apk/debug/app-debug.apk "$vulpes_apk"
"$ANDROID_HOME/build-tools/37.0.0/apksigner" sign --ks keys/preview.keystore --ks-pass pass:android --key-pass pass:android --ks-key-alias androiddebugkey "$vulpes_apk"
"$ANDROID_HOME/build-tools/37.0.0/apksigner" verify --verbose --print-certs "$vulpes_apk" | tee "dist/signature-${vulpes_version}.txt"
"$ANDROID_HOME/build-tools/37.0.0/zipalign" -c -P 16 -v 4 "$vulpes_apk" > dist/alignment.txt
(cd dist && sha256sum "vulpes-os-preview-${vulpes_version}.apk" > SHA256SUMS)
python3 ../tools/check-parity.py
printf '\nAPK : %s/%s\n' "$PWD" "$vulpes_apk"
