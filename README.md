<p align="center"><strong>🇬🇧 English</strong> · <a href="https://nnsprod.com/git/oversu/VulpesOS/src/branch/main/README.fr.md">🇫🇷 Français</a></p>
<p align="center"><img src="docs/media/vulpes-logo.png" width="160" alt="Vulpes OS fox logo"></p>
<h1 align="center">Vulpes OS</h1>
<p align="center"><strong>The spirit of Firefox OS. A modern Gecko. One shared Gaia.</strong><br>A community project bringing a web-based phone experience to desktop, Android and native hardware.</p>
<p align="center">
<img src="https://img.shields.io/badge/Vulpes-2.7_preview.15-0755be?style=flat-square" alt="Vulpes Preview 15">
<img src="https://img.shields.io/badge/Desktop_Gecko-156.0.1-0099cc?style=flat-square" alt="Desktop Gecko 156.0.1">
<img src="https://img.shields.io/badge/Status-Experimental-f3a712?style=flat-square" alt="Experimental">
</p>
<p align="center"><a href="https://vulpes-os.org">🌐 Website</a> · <a href="https://nnsprod.com/git/oversu/VulpesOS/releases">📦 Downloads</a> · <a href="https://vulpes-os.org/changelog.php">📝 Changelog</a> · <a href="https://nnsprod.com/git/oversu/VulpesOS/issues">🐞 Report a bug</a></p>

## 🦊 The Web as your interface

Home screen, settings, camera, gallery, messages: **Gaia remains the interface**, built from HTML, CSS and JavaScript. Vulpes adapts the APIs that these Firefox OS applications expect to a modern Gecko engine and platform-specific services.

This repository now contains the shared interface, desktop host, Android application, Tundra runtime and development tools. This is an **early developer preview**, not a finished phone operating system.

<p align="center"><img src="docs/media/vulpes-desktop.png" width="290" alt="Actual desktop screenshot of the Gaia home screen in English"> &nbsp; <img src="docs/media/vulpes-gecko.png" width="290" alt="Actual desktop screenshot of device information showing the Gecko engine"></p>
<p align="center"><em>Desktop development screenshots. Capabilities depend on the platform and available hardware.</em></p>

## 📥 Choose your platform

| Platform | Available today | Engine |
| --- | --- | --- |
| **Linux desktop** | Source checkout, phone-sized Gaia window, development and app tests | Gecko **156.0.1** |
| **Android APK** | Installable Preview; keeps Android and its permissions underneath | GeckoView **156.0** |
| **Pixel 3a · Sargo** | Tundra sources; native development build tested on our device | Gecko **156.0.1** ARM64 |

### Android — Preview 15

Download the APK and `SHA256SUMS.txt` from [the Preview 15 release](https://nnsprod.com/git/oversu/VulpesOS/releases/tag/v2.7-preview.15). Installing over an earlier signed Vulpes Preview preserves its data.

- Minimum declared: **Android 8 / API 26**. Target: **API 37**.
- Universal APK: **ARM64, ARMv7 and x86_64**; approximately **600 MiB** including GeckoView.
- Camera and Gallery use Gaia, with Android permissions and file import.
- Calls and SMS hand off to Android's applications; Vulpes is not the default SMS or phone app.
- Android 16 emulator workflows are tested. Minimum SDK support is not a claim that every Android device is validated.
- This is a signed **development build** with Gecko debugging available through authorized ADB, not a production-hardened app.

### Linux — run from source

Linux x86_64, Python 3, Git and the system libraries needed by Firefox are required. On Debian/Ubuntu, install `git python3 libgtk-3-0 libdbus-glib-1-2 libasound2` (package names may differ by distribution).

```sh
git clone https://nnsprod.com/git/oversu/VulpesOS.git
cd VulpesOS
./setup.sh
./run.sh
```

`setup.sh` downloads the pinned Mozilla engine and verifies its checksum. Normal startup opens the Gaia interface without a debugger. Profiles and downloaded engines stay outside Git.

### Pixel 3a — native Tundra development

**The native build boots directly into Vulpes**, with selected Android hardware services, Linux userspace, Gecko and Gaia; Phosh and the Android application framework are not started.

Our installed Sargo development image has passed startup and persistence checks. Real calls and two-way SMS have been observed; the latest checks cover conversation rendering, camera sensor switching, full-resolution JPEG capture, touch focus, digital zoom and bounded vibration.

**A generic flashable image is not included in this release.** The current private boot depends on the inventoried phone's storage layout, staged system/data images and maintenance credentials. Publishing that file would not give another Pixel a working installation. Tundra's source recipes are included for contributors; they require device inventory, verified backups and locally supplied hardware components. Do not use another device's backup or treat a boot image as a complete ROM.

## ✨ What is shared

- **One Gaia base:** interface and common services serve desktop, Android and Tundra.
- **Original applications:** Camera, Gallery, Settings and Messages keep their Gaia UI, backed by platform adapters.
- **Editable web code:** change served assets in `assets/webapps/`, shared compatibility code in `host/`, and replacements in `overrides/`. Restart/reload to test; no Gecko rebuild is needed for these changes. Some historical `gaia/` sources still need their bundled counterparts updated.
- **A replaceable engine:** pinned downloads, checksum verification, isolated compatibility checks and rollback tools. An engine update is tested and explicitly selected; compatibility is not guaranteed automatically.
- **Separate version numbers:** Vulpes release, Gaia, Gecko and hardware adaptation are reported independently. GeckoView 156.0 is not presented as desktop Gecko 156.0.1.

## 🧪 Current limits

This preview contains incomplete hardware adapters and legacy application behavior. On Sargo, camera preview is around 16 fps; flash/video, automatic sensor rotation and full suspend remain incomplete. Network registration can be unstable and two-way call audio still needs end-to-end qualification. A reported large dialog after SMS sending remains under investigation.

On Android, platform integration follows Android permissions and lifecycle restrictions. Gaia alarms are not guaranteed after Android stops Vulpes. Unsupported controls may remain visible but disabled. Development/test applications are included.

Keep a backup before testing. Include the platform, Vulpes/Gecko versions and reproduction steps when reporting a problem; remove phone numbers, contacts and other personal information from logs.

## 🛠️ Build the Android APK

```sh
cd android
./build-apk.sh
```

The script installs the pinned toolchain, packages the shared Gaia resources and builds a signed development APK in `android/dist/`. Android SDK licenses may need acceptance. A fresh checkout generates its own signing key; it cannot update an APK signed by the project's private release key.

## 📜 Credits and licenses

Vulpes OS is a community project by **oversu / NNS Production**, inspired by Firefox OS. Thanks to **Mozilla, Gaia contributors, Capyloon, Droidian, UBports, libhybris, Debian, AOSP** and the communities keeping open mobile systems alive.

New Vulpes code uses **MPL 2.0**. Gaia retains **Apache 2.0** and inherited components retain their own licenses and notices. See [LICENSE](LICENSE), [NOTICE](NOTICE) and [Gaia's license](gaia/LICENSE). Preserve the applicable attribution and license notices in forks.

Vulpes OS is independent of Mozilla and is not an official Firefox OS release.
