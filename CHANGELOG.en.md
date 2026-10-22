# Changelog — Vulpes OS

[Français](CHANGELOG.md)

Updates by date and platform. Within each group: Add, Change, Fix, Note, Test. Entries describe the state at their date; a fix in development requires an updated installed version.

<a id="2.7-preview.22"></a>

## 22/10/2026 : 2.7-preview.22

![Published](https://img.shields.io/badge/Published-334155?style=flat-square)

### ![All Platforms](https://img.shields.io/badge/All%20platforms-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Sharing](https://img.shields.io/badge/Sharing-475569?style=flat-square) : Browser Share offers Messages and Email; the keyboard hides so the chooser remains accessible.

### ![Desktop](https://img.shields.io/badge/Desktop-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Web input](https://img.shields.io/badge/Web%20input-475569?style=flat-square) : Focus is restored for fields and dropdowns in the desktop browser.
- ![Test](https://img.shields.io/badge/Test-6B7280?style=flat-square) ![Browser](https://img.shields.io/badge/Browser-475569?style=flat-square) : First-click input, typing, selectors and sharing to a Messages draft checked on desktop.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Update](https://img.shields.io/badge/Update-475569?style=flat-square) : Preview 22 APK built with shared Gaia fixes and an incremented Android version.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Startup](https://img.shields.io/badge/Startup-475569?style=flat-square) : GeckoView logs a session-restore message on the emulator first launch; Gaia still reaches Home without crashing.
- ![Test](https://img.shields.io/badge/Test-6B7280?style=flat-square) ![Installation](https://img.shields.io/badge/Installation-475569?style=flat-square) : Preview 21 installation and upgrade to Preview 22 succeeded in Android 11 emulation; Gaia reached Home. Reported phones still need qualification, including Pixel 4.

### ![Tundra / Nokia 2720 Flip](https://img.shields.io/badge/Tundra%20%2F%20Nokia%202720%20Flip-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Keyboard](https://img.shields.io/badge/Keyboard-475569?style=flat-square) : Initial offline T9 input using Gaia dictionaries. Physical keyboard qualification is still needed.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Network](https://img.shields.io/badge/Network-475569?style=flat-square) : Wi-Fi, reconnection and airplane-mode cycle checked in a RAM session; Gaia controls follow hardware state.


### ![Pixel 3a / Sargo](https://img.shields.io/badge/Pixel%203a%20%2F%20Sargo-2563EB?style=flat-square)

- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Native image](https://img.shields.io/badge/Native%20image-475569?style=flat-square) : This release does not include a new Pixel image. Preview 21 remains the latest published image; this Preview's changes are not installed on the phone.

<a id="development-2026-10-20-web-nokia"></a>

## 20/10/2026 : Fixes being prepared for Preview 22

### ![All Platforms](https://img.shields.io/badge/All%20platforms-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Browser](https://img.shields.io/badge/Browser-475569?style=flat-square) : Share opens the Messages or Email chooser. The keyboard no longer covers this menu.

### ![Desktop / Tundra](https://img.shields.io/badge/Desktop%20%2F%20Tundra-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Browser](https://img.shields.io/badge/Browser-475569?style=flat-square) : Web dropdowns regain the focus needed to open.
- ![Test](https://img.shields.io/badge/Test-6B7280?style=flat-square) ![Input](https://img.shields.io/badge/Input-475569?style=flat-square) : First-click input, web fields, selectors and sharing to a Messages draft checked on desktop. Pixel retesting remains pending.

### ![Android / APK](https://img.shields.io/badge/APK-2563EB?style=flat-square)

- ![Test](https://img.shields.io/badge/Test-6B7280?style=flat-square) ![Installation](https://img.shields.io/badge/Installation-475569?style=flat-square) : Preview 20 to Preview 21 upgrade succeeded in Android 11 emulation. The reported Pixel 4 installation failure still needs diagnosis.

### ![Tundra / Nokia 2720 Flip](https://img.shields.io/badge/Tundra%20%2F%20Nokia%202720%20Flip-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-13A37D?style=flat-square) ![T9 keyboard](https://img.shields.io/badge/T9%20keyboard-475569?style=flat-square) : Initial offline Nokia implementation using all 42 Gaia dictionaries. Physical qualification remains pending with the flip open.
- ![Change](https://img.shields.io/badge/Change-52748B?style=flat-square) ![Development](https://img.shields.io/badge/Development-475569?style=flat-square) : The launcher now synchronizes the complete shared Gaia payload while keeping phone data.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Airplane mode](https://img.shields.io/badge/Airplane%20mode-475569?style=flat-square) : Gaia now turns the Nokia modem off and back on. Stale network states no longer cancel airplane mode.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Wi-Fi](https://img.shields.io/badge/Wi--Fi-475569?style=flat-square) : Nokia phone-mode startup now exposes the Wi-Fi broker to Gaia. Network scanning, radio toggle, saved-network reconnection and HTTPS access passed in a RAM session.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) : Web dropdown selection with the OK key still needs correction and qualification.
- ![Test](https://img.shields.io/badge/Test-6B7280?style=flat-square) ![Hardware](https://img.shields.io/badge/Hardware-475569?style=flat-square) : Wi-Fi and reconnection, volume with Gaia indicator, brightness and vibration stop checked on Nokia. SIM recognized and LTE registration observed.
- ![Test](https://img.shields.io/badge/Test-6B7280?style=flat-square) ![Network](https://img.shields.io/badge/Network-475569?style=flat-square) : Nokia airplane-mode cycle verified: radios and Wi-Fi off, then back on with LTE registration restored.
- ![Test](https://img.shields.io/badge/Test-6B7280?style=flat-square) ![Media](https://img.shields.io/badge/Media-475569?style=flat-square) : Each RAM launch copies a test Ogg track and WebM video into Music and Video; both files are readable by the Gaia apps.

<a id="development-2026-10-18-nokia-radio-timeout"></a>

## 18/10/2026 : Nokia network timeouts

### ![Tundra / Nokia 2720 Flip](https://img.shields.io/badge/Tundra%20%2F%20Nokia%202720%20Flip-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Phone](https://img.shields.io/badge/Phone-475569?style=flat-square) : Shorter call-status wait when the modem stops responding; identical unanswered requests no longer accumulate. Clearer error message.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Network](https://img.shields.io/badge/Network-475569?style=flat-square) : The cause of modem stalls and a new real call still need verification.

<a id="development-2026-10-18-forgejo-fixes"></a>

## 18/10/2026 : Forgejo fixes — in development

### ![All Platforms](https://img.shields.io/badge/All%20platforms-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Gallery](https://img.shields.io/badge/Gallery-475569?style=flat-square) : Corrected photo orientation, sharing to Messages or Email, and the empty gallery background.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Languages](https://img.shields.io/badge/Languages-475569?style=flat-square) : Language changes no longer revert to an earlier selection. Added missing characters in language names.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Marketplace](https://img.shields.io/badge/Marketplace-475569?style=flat-square) : Connected the FFAA Install button for packaged apps, with confirmation before installation.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Customization](https://img.shields.io/badge/Customization-475569?style=flat-square) : Gaia wallpapers now use their higher-resolution originals.

### ![Desktop / Tundra](https://img.shields.io/badge/Desktop%20%2F%20Tundra-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Keyboard](https://img.shields.io/badge/Keyboard-475569?style=flat-square) : Gaia keyboard input in Marketplace search, including after web navigation.

### ![Tundra / Pixel 3a](https://img.shields.io/badge/Tundra%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Battery](https://img.shields.io/badge/Battery-475569?style=flat-square) : Reduced hardware communication overhead while idle; day-long battery testing is still needed.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Camera](https://img.shields.io/badge/Camera-475569?style=flat-square) : Video recording is accessible and playable; flash controls follow the sensor’s actual capabilities.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Date and time](https://img.shields.io/badge/Date%20and%20time-475569?style=flat-square) : Time survives a reboot even when the hardware clock is incorrect.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Vibration](https://img.shields.io/badge/Vibration-475569?style=flat-square) : Corrected vibration start and stop.
- ![Test](https://img.shields.io/badge/Test-8B5CF6?style=flat-square) ![Camera](https://img.shields.io/badge/Camera-475569?style=flat-square) : Verified a 12 MP photo, front/rear switching and playback of a short video on Pixel.

### ![All Platforms — Tests](https://img.shields.io/badge/Test%20status-2563EB?style=flat-square)

- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Validation](https://img.shields.io/badge/Validation-475569?style=flat-square) : Unreleased fixes. Motorola-specific issues, long-term battery use, video audio and wake behavior still need qualification. Full OTA updates and hosted FFAA apps remain unfinished.

<a id="development-2026-10-18-nokia-settings-keypad"></a>

## 18/10/2026 : Nokia Settings navigation

### ![Tundra / Nokia 2720 Flip](https://img.shields.io/badge/Tundra%20%2F%20Nokia%202720%20Flip-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Settings](https://img.shields.io/badge/Settings-475569?style=flat-square) : Airplane mode and Geolocation are reachable with Up/Down. OK activates Gaia switches and checkboxes; disabled controls remain skipped.

<a id="development-2026-10-18-nokia-fluidity"></a>

## 18/10/2026 : Nokia 2720 Flip responsiveness

### ![Tundra / Nokia 2720 Flip](https://img.shields.io/badge/Tundra%20%2F%20Nokia%202720%20Flip-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Performance](https://img.shields.io/badge/Performance-475569?style=flat-square) : Lighter hardware communication reduces CPU load, leaving more room for the interface.

<a id="development-2026-10-18-nokia-wifi"></a>

## 18/10/2026 : Nokia 2720 Flip Wi-Fi

### ![Tundra / Nokia 2720 Flip](https://img.shields.io/badge/Tundra%20%2F%20Nokia%202720%20Flip-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-238636?style=flat-square) ![Wi-Fi](https://img.shields.io/badge/Wi--Fi-475569?style=flat-square) : Find networks, switch Wi-Fi on or off and connect from Gaia Settings. Saved networks can be reused without entering their password again.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Wi-Fi](https://img.shields.io/badge/Wi--Fi-475569?style=flat-square) : Browser Internet access and reconnection after switching Wi-Fi off. The displayed status follows reconnections.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Wi-Fi](https://img.shields.io/badge/Wi--Fi-475569?style=flat-square) : Open and WPA/WPA2 Personal networks are supported. Enterprise networks, WPS and hotspot sharing still need integration on the Nokia.

### ![Shared fixes](https://img.shields.io/badge/PC%20%2F%20APK%20%2F%20Tundra-475569?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Wi-Fi](https://img.shields.io/badge/Wi--Fi-475569?style=flat-square) : Wi-Fi results remain visible when a signal update arrives before the list. Saved networks that are not detected are marked out of range.

<a id="development-2026-10-18-nokia-browser-keypad"></a>

## 18/10/2026 : Nokia 2720 Flip keypad browsing

### ![Tundra / Nokia 2720 Flip](https://img.shields.io/badge/Tundra%20%2F%20Nokia%202720%20Flip-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Browser](https://img.shields.io/badge/Browser-475569?style=flat-square) : Press Up then OK to access the address bar, type with the keypad and submit. Back closes address entry; Down returns to page content. The bar remains reachable on web pages and network error pages.

<a id="development-2026-10-18-nokia-appearance-privacy"></a>

## 18/10/2026 : Nokia customization and privacy

### ![All Platforms](https://img.shields.io/badge/All%20platforms-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Browser](https://img.shields.io/badge/Browser-475569?style=flat-square) : Tracking protection enabled by default; introductory popup no longer shown on launch.

### ![Tundra / Nokia 2720 Flip](https://img.shields.io/badge/Tundra%20%2F%20Nokia%202720%20Flip-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-2F855A?style=flat-square) ![Cover screen](https://img.shields.io/badge/Cover%20screen-475569?style=flat-square) : Added red, orange, purple, cyan, turquoise and grey.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Interface](https://img.shields.io/badge/Interface-475569?style=flat-square) : Decorative transitions are nearly instant on Nokia; loading animations remain active.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Cover screen](https://img.shields.io/badge/Cover%20screen-475569?style=flat-square) : Custom text saves after typing without leaving the field.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Home](https://img.shields.io/badge/Home-475569?style=flat-square) : The status bar uses the same dimming as the home background.

<a id="development-2026-10-18-nokia-closed-start"></a>

## 18/10/2026 : Nokia 2720 Flip lid and keys

### ![Tundra / Nokia 2720 Flip](https://img.shields.io/badge/Tundra%20%2F%20Nokia%202720%20Flip-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-2F855A?style=flat-square) ![Notifications](https://img.shields.io/badge/Notifications-475569?style=flat-square) : The dedicated key opens and closes the Gaia notification tray.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Display](https://img.shields.io/badge/Display-475569?style=flat-square) : The cover display is activated when starting with the phone closed, without opening the lid first.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Volume](https://img.shields.io/badge/Volume-475569?style=flat-square) : Volume keys remain usable with the lid closed.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Keypad](https://img.shields.io/badge/Keypad-475569?style=flat-square) : The assistance and headset keys, and the long-press power menu, still need integration.

<a id="development-2026-10-18-nokia-hardware"></a>

## 18/10/2026 : Nokia 2720 Flip hardware controls

### ![Tundra / Nokia 2720 Flip](https://img.shields.io/badge/Tundra%20%2F%20Nokia%202720%20Flip-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-2F855A?style=flat-square) ![Volume](https://img.shields.io/badge/Volume-475569?style=flat-square) : Side keys connected to the Gaia volume panel and native phone volume.
- ![Add](https://img.shields.io/badge/Add-2F855A?style=flat-square) ![Display](https://img.shields.io/badge/Display-475569?style=flat-square) : Brightness control now adjusts the screen backlight.
- ![Add](https://img.shields.io/badge/Add-2F855A?style=flat-square) ![Vibration](https://img.shields.io/badge/Vibration-475569?style=flat-square) : Short vibration patterns with automatic stop and cancellation.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Volume](https://img.shields.io/badge/Volume-475569?style=flat-square) : Gaia starts with the phone’s actual volume level.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Camera](https://img.shields.io/badge/Camera-475569?style=flat-square) : A fixed-focus 2 MP rear camera has been identified. Connecting it to Vulpes remains in progress.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Hardware](https://img.shields.io/badge/Hardware-475569?style=flat-square) : Volume, Gaia panel, brightness and vibration stop checked on the Nokia. No new flash or APK published.

<a id="development-2026-10-18-nokia-build"></a>

## 18/10/2026 : Experimental Nokia 2720 Flip build

### ![Tundra / Nokia 2720 Flip](https://img.shields.io/badge/Tundra%20%2F%20Nokia%202720%20Flip-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-2F855A?style=flat-square) ![Build](https://img.shields.io/badge/Build-475569?style=flat-square) : First private boot package built with Gecko 156.0.1 and shared Gaia.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Installation](https://img.shields.io/badge/Installation-475569?style=flat-square) : Prototype files now survive a Nokia reboot.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Validation](https://img.shields.io/badge/Validation-475569?style=flat-square) : Unsigned image, not yet boot-tested or qualified for flashing. The phone still relies on its installed hardware services; no standalone ROM published.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Build](https://img.shields.io/badge/Build-475569?style=flat-square) : Image format, archives and fallback logic checked locally. Gaia and network verified from the new persistent location.

<a id="development-2026-10-18-nokia-phone"></a>

## 18/10/2026 : In development — Nokia 2720 Flip

### ![Tundra / Nokia 2720 Flip](https://img.shields.io/badge/Tundra%20%2F%20Nokia%202720%20Flip-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-2F855A?style=flat-square) ![Cover screen](https://img.shields.io/badge/Cover%20screen-475569?style=flat-square) : Custom text and title/battery colours in Display settings, with a preview.
- ![Add](https://img.shields.io/badge/Add-2F855A?style=flat-square) ![Phone](https://img.shields.io/badge/Phone-475569?style=flat-square) : Calls and simple SMS connected to the Gaia applications.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Flip](https://img.shields.io/badge/Flip-475569?style=flat-square) : Displays and keypad backlight corrected when opening and closing; operation confirmed on the phone.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Network](https://img.shields.io/badge/Network-475569?style=flat-square) : Radio reconnections are spaced out after errors to avoid a retry loop.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Keys](https://img.shields.io/badge/Keys-475569?style=flat-square) : Red key connected to Gaia’s Hang up button and return to Home.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Prototype](https://img.shields.io/badge/Prototype-475569?style=flat-square) : Temporary session on the existing KaiOS hardware stack; no standalone image or new release. Long-term reliability still needs testing.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Communications](https://img.shields.io/badge/Communications-475569?style=flat-square) : Call, two-way voice audio and SMS confirmed by the Nokia owner.

### ![All Platforms](https://img.shields.io/badge/All%20Platforms-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Calls](https://img.shields.io/badge/Calls-475569?style=flat-square) : Repeated presses of Call no longer send multiple requests while connecting. An audio error no longer blocks the call screen.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Compact mode](https://img.shields.io/badge/Compact%20mode-475569?style=flat-square) : Phone keypad, Call button and tabs fit small screens without overlap.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Installation](https://img.shields.io/badge/Installation-475569?style=flat-square) : Shared resources synchronized; no new APK compiled.

<a id="development-2026-10-17-nokia-cover"></a>

## 17/10/2026 : In development — Nokia 2720 Flip

### ![Tundra / Nokia 2720 Flip](https://img.shields.io/badge/Tundra%20%2F%20Nokia%202720%20Flip-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-2F855A?style=flat-square) ![Flip](https://img.shields.io/badge/Flip-475569?style=flat-square) : Inner display power management when closing and reopening the phone, under hardware validation.
- ![Add](https://img.shields.io/badge/Add-2F855A?style=flat-square) ![Cover display](https://img.shields.io/badge/Cover%20display-475569?style=flat-square) : Clock, date, operator and battery; turns off after 15 seconds.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Prototype](https://img.shields.io/badge/Prototype-475569?style=flat-square) : Temporary trial only. Physical flip behavior and battery life still need validation; no new image published.

<a id="2.7-preview.21-sargo.1"></a>

## 15/10/2026 : 2.7-preview.21-sargo.1

![Experimental image published](https://img.shields.io/badge/Experimental%20image%20published-75658A?style=flat-square)

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-2F855A?style=flat-square) ![Installation](https://img.shields.io/badge/Installation-475569?style=flat-square) : Full Pixel 3a package available with installer, FR/EN instructions and checksums. Unlocked bootloader required; installation erases data.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Browser](https://img.shields.io/badge/Browser-475569?style=flat-square) : Includes fixes for DuckDuckGo search, keyboard submission and web page rendering.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Experimental](https://img.shields.io/badge/Experimental-475569?style=flat-square) : The exact public binary still needs a hardware boot test. Calls, audio, suspend and battery life need validation; provenance limitations are detailed in the release.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Sources](https://img.shields.io/badge/Sources-475569?style=flat-square) : Vulpes sources and collected upstream sources attached. Complete correspondence for some components remains to be established.

[Download and instructions](https://nnsprod.com/git/oversu/VulpesOS/releases/tag/v2.7-preview.21-sargo.1)

<a id="development-2026-10-14-browser"></a>

## 14/10/2026 : Browser and video

![In development](https://img.shields.io/badge/In%20development-334155?style=flat-square)

### ![All Platforms](https://img.shields.io/badge/All%20Platforms-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Search](https://img.shields.io/badge/Search-475569?style=flat-square) : DuckDuckGo becomes the default search engine. Explicit engine choices are preserved.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Keyboard](https://img.shields.io/badge/Keyboard-475569?style=flat-square) : The address bar reopens the keyboard on the first tap, even after dismissal.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Keyboard](https://img.shields.io/badge/Keyboard-475569?style=flat-square) : Submitting from the keyboard now closes it before displaying the page, without freezing the interface.

### ![Desktop](https://img.shields.io/badge/Desktop-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Camera](https://img.shields.io/badge/Camera-475569?style=flat-square) : Microphone permission uses the Gaia panel instead of a separate Firefox window.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Browser](https://img.shields.io/badge/Browser-475569?style=flat-square) : DuckDuckGo navigation and return to Home checked in the test profile.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Installation](https://img.shields.io/badge/Installation-475569?style=flat-square) : Shared resources updated; no new APK distributed for these fixes.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Browser](https://img.shields.io/badge/Browser-475569?style=flat-square) : Gaia edge gesture zones no longer hide web pages on the Pixel’s narrow screen.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Camera](https://img.shields.io/badge/Camera-475569?style=flat-square) : Microphone permission appears inside Gaia to start video recording.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Validation](https://img.shields.io/badge/Validation-475569?style=flat-square) : Flicker cleared after a cold restart; search results and a direct address visually checked on the Pixel. Video audio quality still needs listening tests; no new release published.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Navigation and video](https://img.shields.io/badge/Navigation%20and%20video-475569?style=flat-square) : Search, keyboard, return to Home and a short playable video with thumbnail checked on the Pixel in RAM without the debugger. Permission buttons remain accessible above Home.

### ![Web](https://img.shields.io/badge/Web-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Pixel 3a](https://img.shields.io/badge/Pixel%203a-475569?style=flat-square) : FR/EN compatibility page updated: standalone installation, Bluetooth, video, browser and remaining feature limitations. Public image still in preparation.

<a id="2.7-preview.21"></a>

## 14/10/2026 : 2.7-preview.21

![APK published](https://img.shields.io/badge/APK%20published-2F855A?style=flat-square)

### ![All Platforms](https://img.shields.io/badge/All%20Platforms-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Appearance](https://img.shields.io/badge/Appearance-475569?style=flat-square) : Unavailable-feature messages are easier to read in light and dark themes.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Call history](https://img.shields.io/badge/Call%20history-475569?style=flat-square) : Contact names now appear when the call history first loads.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Keyboard](https://img.shields.io/badge/Keyboard-475569?style=flat-square) : Additional dictionaries available offline; improved Gaia keyboard activation and recovery. Verification on affected devices is still needed.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Settings](https://img.shields.io/badge/Settings-475569?style=flat-square) : Storage panels restored. A loading error no longer locks the other menus.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-2F855A?style=flat-square) ![Android data](https://img.shields.io/badge/Android%20data-475569?style=flat-square) : Read Android contacts, SMS and call history in Gaia after granting access. Existing local Vulpes data is preserved.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Marketplace](https://img.shields.io/badge/Marketplace-475569?style=flat-square) : Return to Vulpes without a persistent white overlay; a closed catalogue can be reopened.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Keyboard](https://img.shields.io/badge/Keyboard-475569?style=flat-square) : The reported blank keyboard still needs reproduction on the affected devices.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Android data](https://img.shields.io/badge/Android%20data-475569?style=flat-square) : First, read-only integration, excluding MMS. Sending and editing Android records use Android apps; new Gaia contacts stay local. SMS and call log access depend on ROM and installer permissions. Tested on Android 9; other versions need verification.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Boot](https://img.shields.io/badge/Boot-475569?style=flat-square) : Smaller boot image; fixed the black screen at startup on Pixel 3a.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Installation](https://img.shields.io/badge/Installation-475569?style=flat-square) : Shared Gaia fixes are included in full installation images and boot updates.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Testing](https://img.shields.io/badge/Testing-475569?style=flat-square) : Calls, audio, SMS/MMS, camera, automatic time and battery life still need testing on this installation.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Installation](https://img.shields.io/badge/Installation-475569?style=flat-square) : Full installation and reboots verified on Pixel 3a; personal data restored. Image not yet published.

<a id="2.7-preview.20"></a>

## 13/10/2026 : 2.7-preview.20

![Published](https://img.shields.io/badge/Published-334155?style=flat-square)

### ![All Platforms](https://img.shields.io/badge/All%20Platforms-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Camera](https://img.shields.io/badge/Camera-475569?style=flat-square) : Video mode, with thumbnails and playback in Gallery and Video.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Interface](https://img.shields.io/badge/Interface-475569?style=flat-square) : Improvements to settings, appearance, pickers, keyboard, contacts and media.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Camera](https://img.shields.io/badge/Camera-475569?style=flat-square) : More reliable camera switching, shutdown and resume.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Services](https://img.shields.io/badge/Services-475569?style=flat-square) : Mozilla Account, Sync, remote location, extensions and USB transfer remain incomplete.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Release](https://img.shields.io/badge/Release-475569?style=flat-square) : Preview 20 APK available.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Compatibility](https://img.shields.io/badge/Compatibility-475569?style=flat-square) : Calls and SMS use Android. This Preview has not yet been validated in use on Android.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Camera](https://img.shields.io/badge/Camera-475569?style=flat-square) : Preview runs at around 16 frames per second.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Network](https://img.shields.io/badge/Network-475569?style=flat-square) : Updates to Wi-Fi, Bluetooth, calls, SMS/MMS and network settings.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Audio](https://img.shields.io/badge/Audio-475569?style=flat-square) : Video sound and two-way call audio still need separate testing.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Installation](https://img.shields.io/badge/Installation-475569?style=flat-square) : Preview 20 installed on Pixel 3a with data preserved. Wi-Fi connected and 4G registration observed.

### ![Web](https://img.shields.io/badge/Web-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Changelog](https://img.shields.io/badge/Changelog-475569?style=flat-square) : Simpler French and English history, with badges and platform filters. Shared content for the website and releases.

[Release](https://nnsprod.com/git/oversu/VulpesOS/releases/tag/v2.7-preview.20)

<a id="development-2026-10-12-video-clock"></a>

## 12/10/2026 : Video and time

![In development](https://img.shields.io/badge/In%20development-334155?style=flat-square)

### ![All Platforms](https://img.shields.io/badge/All%20Platforms-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Camera](https://img.shields.io/badge/Camera-475569?style=flat-square) : Video recording with sound, thumbnails and playback in Gallery and Video.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Help](https://img.shields.io/badge/Help-475569?style=flat-square) : “Improve Vulpes” opens the project’s issues.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Settings](https://img.shields.io/badge/Settings-475569?style=flat-square) : Date and time pickers restored; Keyboard back navigation and list text fixed.

### ![Desktop](https://img.shields.io/badge/Desktop-2563EB?style=flat-square)

- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Camera](https://img.shields.io/badge/Camera-475569?style=flat-square) : Recording checked with a simulated camera.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Availability](https://img.shields.io/badge/Availability-475569?style=flat-square) : Changes prepared for a future APK; video not yet tested on Android.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Camera](https://img.shields.io/badge/Camera-475569?style=flat-square) : Improved preview, at around 16 frames per second.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Clock](https://img.shields.io/badge/Clock-475569?style=flat-square) : Automatic time depends on network information; time zone remains manual.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Camera](https://img.shields.io/badge/Camera-475569?style=flat-square) : Video recording and camera switching checked. Video sound still needs listening tests.

<a id="development-2026-10-12-settings-calls-hotspot"></a>

## 12/10/2026 : Calls and hotspot

![In development](https://img.shields.io/badge/In%20development-334155?style=flat-square)

### ![All Platforms](https://img.shields.io/badge/All%20Platforms-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Settings](https://img.shields.io/badge/Settings-475569?style=flat-square) : Dialog closing and retry after an error fixed.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Calls](https://img.shields.io/badge/Calls-475569?style=flat-square) : Settings for call waiting, caller ID and call forwarding.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Wi-Fi](https://img.shields.io/badge/Wi--Fi-475569?style=flat-square) : Hotspot with or without a password.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Network](https://img.shields.io/badge/Network-475569?style=flat-square) : Slow settings no longer block calls and SMS.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Wi-Fi](https://img.shields.io/badge/Wi--Fi-475569?style=flat-square) : Hotspot activation checked; Internet access from another device still needs testing.

<a id="development-2026-10-12-settings-network"></a>

## 12/10/2026 : Network settings

![In development](https://img.shields.io/badge/In%20development-334155?style=flat-square)

### ![All Platforms](https://img.shields.io/badge/All%20Platforms-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Wi-Fi](https://img.shields.io/badge/Wi--Fi-475569?style=flat-square) : IP address and connection speed displayed correctly.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Network](https://img.shields.io/badge/Network-475569?style=flat-square) : Network type selection and mobile access point editing.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Settings](https://img.shields.io/badge/Settings-475569?style=flat-square) : More reliable network settings when the modem responds slowly.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Network](https://img.shields.io/badge/Network-475569?style=flat-square) : Adding, deleting and resetting access points remain incomplete.

<a id="development-2026-10-12-settings-audit"></a>

## 12/10/2026 : Settings review

![In development](https://img.shields.io/badge/In%20development-334155?style=flat-square)

### ![All Platforms](https://img.shields.io/badge/All%20Platforms-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Settings](https://img.shields.io/badge/Settings-475569?style=flat-square) : Navigation, accessibility and help fixed. Incomplete panels remain visible.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Testing](https://img.shields.io/badge/Testing-475569?style=flat-square) : Menus reviewed; some actions still depend on hardware or the carrier.

### ![Desktop](https://img.shields.io/badge/Desktop-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Storage](https://img.shields.io/badge/Storage-475569?style=flat-square) : Storage information and downloads connected.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Storage](https://img.shields.io/badge/Storage-475569?style=flat-square) : Display of storage used by Vulpes.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Settings](https://img.shields.io/badge/Settings-475569?style=flat-square) : Mobile data, roaming, time, hidden Wi-Fi networks and Sound panel fixed.

<a id="development-2026-10-12-settings-navigation"></a>

## 12/10/2026 : Settings navigation

![In development](https://img.shields.io/badge/In%20development-334155?style=flat-square)

### ![All Platforms](https://img.shields.io/badge/All%20Platforms-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Appearance](https://img.shields.io/badge/Appearance-475569?style=flat-square) : Light/Dark selection and picker confirmation or cancellation restored.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![SIM](https://img.shields.io/badge/SIM-475569?style=flat-square) : Manager adapted to single-SIM phones.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![SMS](https://img.shields.io/badge/SMS-475569?style=flat-square) : SIM information, message centre and delivery reports.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Wi-Fi](https://img.shields.io/badge/Wi--Fi-475569?style=flat-square) : Faster loading of saved networks.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Settings](https://img.shields.io/badge/Settings-475569?style=flat-square) : Wi-Fi certificates, SIM security and USB storage remain incomplete.

<a id="development-2026-10-12-sargo-appearance"></a>

## 12/10/2026 : Appearance on Pixel 3a

![In development](https://img.shields.io/badge/In%20development-334155?style=flat-square)

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Appearance](https://img.shields.io/badge/Appearance-475569?style=flat-square) : Shared light and dark modes available on Pixel 3a.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Interface](https://img.shields.io/badge/Interface-475569?style=flat-square) : Settings fixes and Firefox OS fonts included.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Testing](https://img.shields.io/badge/Testing-475569?style=flat-square) : No new call, SMS or Bluetooth test at this stage.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Appearance](https://img.shields.io/badge/Appearance-475569?style=flat-square) : Themes and display checked on the phone.

<a id="development-2026-10-11-appearance-input"></a>

## 11/10/2026 : Appearance and keyboard

![In development](https://img.shields.io/badge/In%20development-334155?style=flat-square)

### ![All Platforms](https://img.shields.io/badge/All%20Platforms-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Appearance](https://img.shields.io/badge/Appearance-475569?style=flat-square) : Light, Dark and System modes, preserved after restart.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Keyboard](https://img.shields.io/badge/Keyboard-475569?style=flat-square) : Text selection and deletion fixed.

### ![Desktop](https://img.shields.io/badge/Desktop-2563EB?style=flat-square)

- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Interface](https://img.shields.io/badge/Interface-475569?style=flat-square) : Themes and SMS typing checked.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Keyboard](https://img.shields.io/badge/Keyboard-475569?style=flat-square) : Experimental Gaia keyboard; Android keyboard remains the default.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Camera](https://img.shields.io/badge/Camera-475569?style=flat-square) : Retry available when the camera is busy.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Testing](https://img.shields.io/badge/Testing-475569?style=flat-square) : Preview 19 built; themes, keyboard and front camera still need testing on Android.

<a id="development-2026-10-11-settings"></a>

## 11/10/2026 : Settings and home screen

![In development](https://img.shields.io/badge/In%20development-334155?style=flat-square)

### ![All Platforms](https://img.shields.io/badge/All%20Platforms-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Home](https://img.shields.io/badge/Home-475569?style=flat-square) : Second home screen, wallpaper previews and installation banner fixed.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Camera](https://img.shields.io/badge/Camera-475569?style=flat-square) : Error message dismissal restored.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Settings](https://img.shields.io/badge/Settings-475569?style=flat-square) : Ringtones, lock code, permissions and French/English labels fixed.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Notifications](https://img.shields.io/badge/Notifications-475569?style=flat-square) : Open the notification tray by tapping the status bar.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Availability](https://img.shields.io/badge/Availability-475569?style=flat-square) : Preview 18 built locally.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Stability](https://img.shields.io/badge/Stability-475569?style=flat-square) : Returned to the previous version after an unstable interface restart.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Bluetooth](https://img.shields.io/badge/Bluetooth-475569?style=flat-square) : Operation confirmed by the user.

<a id="development-2026-10-09-mms-bluetooth"></a>

## 09/10/2026 : MMS and Bluetooth

![In development](https://img.shields.io/badge/In%20development-334155?style=flat-square)

### ![All Platforms](https://img.shields.io/badge/All%20Platforms-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Bluetooth](https://img.shields.io/badge/Bluetooth-475569?style=flat-square) : Gaia panels connected to each platform’s capabilities.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Bluetooth](https://img.shields.io/badge/Bluetooth-475569?style=flat-square) : Discovery, pairing, connection, forgetting devices and audio output.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![MMS](https://img.shields.io/badge/MMS-475569?style=flat-square) : Sending preserved and resumed after interruption.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Testing](https://img.shields.io/badge/Testing-475569?style=flat-square) : MMS accepted by the carrier, delivery not confirmed. Headset call audio still needs testing.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Bluetooth](https://img.shields.io/badge/Bluetooth-475569?style=flat-square) : Bluetooth audio playback to a PC checked.

<a id="development-2026-10-08-camera-mms"></a>

## 08/10/2026 : Camera and MMS

![In development](https://img.shields.io/badge/In%20development-334155?style=flat-square)

### ![All Platforms](https://img.shields.io/badge/All%20Platforms-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Camera](https://img.shields.io/badge/Camera-475569?style=flat-square) : Camera switching, shutdown and display after rotation fixed.

### ![Desktop + Sargo](https://img.shields.io/badge/Desktop%20%2B%20Sargo-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![MMS](https://img.shields.io/badge/MMS-475569?style=flat-square) : Attachments preserved and sending shown as pending until confirmation.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Camera](https://img.shields.io/badge/Camera-475569?style=flat-square) : Preview measured at around 16 fps on the rear camera and 25–27 on the front.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![MMS](https://img.shields.io/badge/MMS-475569?style=flat-square) : Real sending still blocked by the mobile data connection.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Camera](https://img.shields.io/badge/Camera-475569?style=flat-square) : Focus, zoom and photo capture checked.

<a id="development-2026-10-08-call-log-dialogs"></a>

## 08/10/2026 : Call history and dialogs

### ![All Platforms](https://img.shields.io/badge/All%20Platforms-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Interface](https://img.shields.io/badge/Interface-475569?style=flat-square) : Readable error messages with usable buttons.

### ![Desktop + Sargo](https://img.shields.io/badge/Desktop%20%2B%20Sargo-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![MMS](https://img.shields.io/badge/MMS-475569?style=flat-square) : Clear message when sending is unavailable, without losing the draft.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Phone](https://img.shields.io/badge/Phone-475569?style=flat-square) : Calling back from call history restored.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Calls](https://img.shields.io/badge/Calls-475569?style=flat-square) : Flow checked with simulated calls; real audio not tested.

<a id="development-2026-10-08-sms-audio"></a>

## 08/10/2026 : SMS and audio

![In development](https://img.shields.io/badge/In%20development-334155?style=flat-square)

### ![All Platforms](https://img.shields.io/badge/All%20Platforms-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Interface](https://img.shields.io/badge/Interface-475569?style=flat-square) : Volume display, lock screen and notification swiping fixed.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![SMS](https://img.shields.io/badge/SMS-475569?style=flat-square) : Send with one tap without first closing the keyboard. Attachment menu restored.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Audio](https://img.shields.io/badge/Audio-475569?style=flat-square) : Call audio routing fixes.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Calls](https://img.shields.io/badge/Calls-475569?style=flat-square) : Network issues prevented testing a real conversation; two-way audio not confirmed.

<a id="development-2026-10-08-radio-reliability"></a>

## 08/10/2026 : Network reliability

![In development](https://img.shields.io/badge/In%20development-334155?style=flat-square)

### ![All Platforms](https://img.shields.io/badge/All%20Platforms-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![SMS](https://img.shields.io/badge/SMS-475569?style=flat-square) : Messages linked to the correct conversation.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Network](https://img.shields.io/badge/Network-475569?style=flat-square) : Improved modem recovery; retries avoid duplicate calls and SMS.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Calls](https://img.shields.io/badge/Calls-475569?style=flat-square) : Network stability and two-way audio still need confirmation.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Network](https://img.shields.io/badge/Network-475569?style=flat-square) : Return to the 4G network after modem restart checked.

<a id="2026-10-08-source-publication"></a>

## 08/10/2026 : Public source code

### ![All Platforms](https://img.shields.io/badge/All%20Platforms-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Source code](https://img.shields.io/badge/Source%20code-475569?style=flat-square) : Camera, contacts, SMS and Marketplace fixes published, with updated French/English project overviews.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Build](https://img.shields.io/badge/Build-475569?style=flat-square) : Building from a fresh repository copy fixed.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Availability](https://img.shields.io/badge/Availability-475569?style=flat-square) : The public APK remains Preview 17; these fixes are in the source code.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Network](https://img.shields.io/badge/Network-475569?style=flat-square) : Network search still unstable at this stage; no new image published.

<a id="development-2026-10-08-camera-lifecycle"></a>

## 08/10/2026 : Camera and contacts

![In development](https://img.shields.io/badge/In%20development-334155?style=flat-square)

### ![All Platforms](https://img.shields.io/badge/All%20Platforms-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Camera](https://img.shields.io/badge/Camera-475569?style=flat-square) : More reliable opening and camera switching.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Contacts](https://img.shields.io/badge/Contacts-475569?style=flat-square) : Photos, dates, edits and number selection from Messages or Phone fixed.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Gallery](https://img.shields.io/badge/Gallery-475569?style=flat-square) : Media selection fixed.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Availability](https://img.shields.io/badge/Availability-475569?style=flat-square) : Fixes in source code; public APK unchanged at this stage.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![SMS](https://img.shields.io/badge/SMS-475569?style=flat-square) : Number and text passed correctly to the Android app.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Bluetooth](https://img.shields.io/badge/Bluetooth-475569?style=flat-square) : Discovery available; pairing and audio use still need testing.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Camera](https://img.shields.io/badge/Camera-475569?style=flat-square) : Photo capture, focus, zoom and camera switching checked.

<a id="development-2026-10-06-marketplace-theme"></a>

## 06/10/2026 : Marketplace theme

![In development](https://img.shields.io/badge/In%20development-334155?style=flat-square)

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Availability](https://img.shields.io/badge/Availability-475569?style=flat-square) : Integration planned for a future APK.

### ![Web](https://img.shields.io/badge/Web-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Marketplace](https://img.shields.io/badge/Marketplace-475569?style=flat-square) : Embedded theme: Fira font, compact navigation, touch buttons and scrollable screenshots.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Marketplace](https://img.shields.io/badge/Marketplace-475569?style=flat-square) : Embedded display preserved during search, filtering and language changes.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Availability](https://img.shields.io/badge/Availability-475569?style=flat-square) : Theme prepared locally, not yet deployed to the website.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Display](https://img.shields.io/badge/Display-475569?style=flat-square) : French and English pages checked on small screens.

<a id="development-2026-10-06-system-banner"></a>

## 06/10/2026 : Notification banners

![In development](https://img.shields.io/badge/In%20development-334155?style=flat-square)

### ![All Platforms](https://img.shields.io/badge/All%20Platforms-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Notifications](https://img.shields.io/badge/Notifications-475569?style=flat-square) : The “Application installed” banner disappears automatically and is replaced correctly.

### ![Desktop](https://img.shields.io/badge/Desktop-2563EB?style=flat-square)

- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Notifications](https://img.shields.io/badge/Notifications-475569?style=flat-square) : Banner display and dismissal checked.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Availability](https://img.shields.io/badge/Availability-475569?style=flat-square) : Fix prepared for the next APK.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Notifications](https://img.shields.io/badge/Notifications-475569?style=flat-square) : Banner disappearance after five seconds checked.

<a id="development-2026-10-06-wifi"></a>

## 06/10/2026 : Wi-Fi and settings

![In development](https://img.shields.io/badge/In%20development-334155?style=flat-square)

### ![All Platforms](https://img.shields.io/badge/All%20Platforms-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Settings](https://img.shields.io/badge/Settings-475569?style=flat-square) : Panels open even when an animation does not finish normally.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Availability](https://img.shields.io/badge/Availability-475569?style=flat-square) : Fixes not yet included in the public APK.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Wi-Fi](https://img.shields.io/badge/Wi--Fi-475569?style=flat-square) : Detected networks and disconnections displayed correctly.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Wi-Fi](https://img.shields.io/badge/Wi--Fi-475569?style=flat-square) : Search, connection and Internet access checked.

<a id="development-2026-10-06-marketplace-views"></a>

## 06/10/2026 : Marketplace navigation

![In development](https://img.shields.io/badge/In%20development-334155?style=flat-square)

### ![Desktop + Sargo](https://img.shields.io/badge/Desktop%20%2B%20Sargo-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Marketplace](https://img.shields.io/badge/Marketplace-475569?style=flat-square) : Local message with a Retry button when the catalogue is unavailable.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Marketplace](https://img.shields.io/badge/Marketplace-475569?style=flat-square) : The catalogue stays below the status bar and hides when returning home or closing it.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Navigation](https://img.shields.io/badge/Navigation-475569?style=flat-square) : An earlier error no longer hides a new attempt.

### ![Desktop](https://img.shields.io/badge/Desktop-2563EB?style=flat-square)

- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Marketplace](https://img.shields.io/badge/Marketplace-475569?style=flat-square) : Navigation, errors, returning home and closing checked.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Availability](https://img.shields.io/badge/Availability-475569?style=flat-square) : Preview 17 rebuilt locally, without a new Android test.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Marketplace](https://img.shields.io/badge/Marketplace-475569?style=flat-square) : Interface tested with a local page; remote catalogue not checked without Internet.

<a id="2.7-preview.17"></a>

## 05/10/2026 : 2.7-preview.17

![APK built · not published](https://img.shields.io/badge/APK%20built%20%C2%B7%20not%20published-334155?style=flat-square)

### ![All Platforms](https://img.shields.io/badge/All%20Platforms-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Apps](https://img.shields.io/badge/Apps-475569?style=flat-square) : Install, launch and uninstall packaged web apps.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Marketplace](https://img.shields.io/badge/Marketplace-475569?style=flat-square) : Vulpes catalogue on the home screen, in French and English, with its original icon.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Security](https://img.shields.io/badge/Security-475569?style=flat-square) : Installed apps kept separate from system apps.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Compatibility](https://img.shields.io/badge/Compatibility-475569?style=flat-square) : Some old Firefox OS apps and APIs are not yet supported.

### ![Desktop](https://img.shields.io/badge/Desktop-2563EB?style=flat-square)

- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Marketplace](https://img.shields.io/badge/Marketplace-475569?style=flat-square) : Installation and use of 2048 checked.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Marketplace](https://img.shields.io/badge/Marketplace-475569?style=flat-square) : 2048 installed, preserved after restart and uninstalled on an Android emulator.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Marketplace](https://img.shields.io/badge/Marketplace-475569?style=flat-square) : Home screen checked; app installation still needs validation on Pixel.

<a id="2.7-preview.16"></a>

## 05/10/2026 : 2.7-preview.16

![APK built · not published](https://img.shields.io/badge/APK%20built%20%C2%B7%20not%20published-334155?style=flat-square)

### ![All Platforms](https://img.shields.io/badge/All%20Platforms-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Startup](https://img.shields.io/badge/Startup-475569?style=flat-square) : Vulpes startup logo.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Home](https://img.shields.io/badge/Home-475569?style=flat-square) : Unwanted horizontal scrolling removed; test apps hidden.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Customization](https://img.shields.io/badge/Customization-475569?style=flat-square) : Wallpaper and sound selection restored. Home screen language applied and preserved after restart.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Availability](https://img.shields.io/badge/Availability-475569?style=flat-square) : APK built, not published; Pixel image tried without permanent installation.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Interface](https://img.shields.io/badge/Interface-475569?style=flat-square) : Android bars hidden and accessible by swiping; launcher mode checked.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Lock screen](https://img.shields.io/badge/Lock%20screen-475569?style=flat-square) : Return from sleep and the lock screen camera fixed.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Startup](https://img.shields.io/badge/Startup-475569?style=flat-square) : Old files no longer overwrite updates at startup.

<a id="2026-10-04-sargo-standalone"></a>

## 04/10/2026 : Standalone installation

![In development](https://img.shields.io/badge/In%20development-334155?style=flat-square)

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Installation](https://img.shields.io/badge/Installation-475569?style=flat-square) : Installer with device and file checks before writing.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Installation](https://img.shields.io/badge/Installation-475569?style=flat-square) : Standalone Vulpes installation without going through Droidian.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Availability](https://img.shields.io/badge/Availability-475569?style=flat-square) : Package not published; tested on one Pixel only. Installation replaces phone data.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Recovery](https://img.shields.io/badge/Recovery-475569?style=flat-square) : Backups checked; full restoration still needs testing.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Startup](https://img.shields.io/badge/Startup-475569?style=flat-square) : Installed boots, saved settings, camera, keyboard and notifications checked.

<a id="2026-10-03-sargo-per-device-installation"></a>

## 03/10/2026 : Per-device installation

![In development](https://img.shields.io/badge/In%20development-334155?style=flat-square)

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Installation](https://img.shields.io/badge/Installation-475569?style=flat-square) : Preparation adapted to each Pixel, with device-specific backups.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Camera](https://img.shields.io/badge/Camera-475569?style=flat-square) : Focus sometimes times out; issue still open.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Installation](https://img.shields.io/badge/Installation-475569?style=flat-square) : Direct installation from stock Android not yet available.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Startup](https://img.shields.io/badge/Startup-475569?style=flat-square) : Temporary boots, saved settings and return to the previous installation checked.

<a id="2026-10-03-sargo-installation-tools"></a>

## 03/10/2026 : Installation and recovery

![In development](https://img.shields.io/badge/In%20development-334155?style=flat-square)

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Installation](https://img.shields.io/badge/Installation-475569?style=flat-square) : Package preparation and recovery kit with a boot backup.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Recovery](https://img.shields.io/badge/Recovery-475569?style=flat-square) : Restoration possible without booting the diagnostic tool.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Availability](https://img.shields.io/badge/Availability-475569?style=flat-square) : Preparation checked locally; installation on another Pixel still needs completion.

### ![Web](https://img.shields.io/badge/Web-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Changelog](https://img.shields.io/badge/Changelog-475569?style=flat-square) : Shared history included in upcoming source releases.

<a id="2026-10-03-sargo-modem-persistence"></a>

## 03/10/2026 : Modem and first startup

![In development](https://img.shields.io/badge/In%20development-334155?style=flat-square)

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Network](https://img.shields.io/badge/Network-475569?style=flat-square) : Recover the modem without restarting the whole phone.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Startup](https://img.shields.io/badge/Startup-475569?style=flat-square) : Fonts and modem initialization fixed on a fresh installation.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Stability](https://img.shields.io/badge/Stability-475569?style=flat-square) : Intermittent modem restarts still need fixing; public package incomplete.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Hardware](https://img.shields.io/badge/Hardware-475569?style=flat-square) : Cameras, focus, zoom, keyboard, notifications and Wi-Fi search checked.

<a id="2026-10-01-sargo-distribution-preparation"></a>

## 01/10/2026 : Preparing distribution

![In development](https://img.shields.io/badge/In%20development-334155?style=flat-square)

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Installation](https://img.shields.io/badge/Installation-475569?style=flat-square) : Preparation of an image with clean user data.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Fonts](https://img.shields.io/badge/Fonts-475569?style=flat-square) : Font display on first boot fixed.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Availability](https://img.shields.io/badge/Availability-475569?style=flat-square) : Image not published. Calls, SMS and mobile data still need end-to-end testing.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Stability](https://img.shields.io/badge/Stability-475569?style=flat-square) : Intermittent modem restart identified.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Hardware](https://img.shields.io/badge/Hardware-475569?style=flat-square) : SIM, 4G, Wi-Fi search, cameras, keyboard and notifications checked in a temporary boot.

<a id="2.7-preview.15"></a>

## 30/09/2026 : 2.7-preview.15

![Published](https://img.shields.io/badge/Published-334155?style=flat-square)

### ![All Platforms](https://img.shields.io/badge/All%20Platforms-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Source code](https://img.shields.io/badge/Source%20code-475569?style=flat-square) : First publication of Desktop, Android and Tundra source code, with French/English project overviews.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Camera](https://img.shields.io/badge/Camera-475569?style=flat-square) : More reliable camera stream shutdown and replacement.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![SMS](https://img.shields.io/badge/SMS-475569?style=flat-square) : Dates and sending statuses fixed in conversations.

### ![Desktop](https://img.shields.io/badge/Desktop-2563EB?style=flat-square)

- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Apps](https://img.shields.io/badge/Apps-475569?style=flat-square) : Navigation, settings, gestures and saved data checked.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Stability](https://img.shields.io/badge/Stability-475569?style=flat-square) : Update, Camera, Gallery and returns from the background checked on an Android emulator.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Availability](https://img.shields.io/badge/Availability-475569?style=flat-square) : Source code included; universal installation still unavailable at this stage.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Hardware](https://img.shields.io/badge/Hardware-475569?style=flat-square) : Flash, video, rotation, sleep and call audio still incomplete or awaiting tests.

[Release](https://nnsprod.com/git/oversu/VulpesOS/releases/tag/v2.7-preview.15)

<a id="development-2026-09-30-sms-camera-followup"></a>

## 30/09/2026 : SMS and camera follow-up

![In development](https://img.shields.io/badge/In%20development-334155?style=flat-square)

### ![All Platforms](https://img.shields.io/badge/All%20Platforms-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Camera](https://img.shields.io/badge/Camera-475569?style=flat-square) : Camera release and switching fixed.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![SMS](https://img.shields.io/badge/SMS-475569?style=flat-square) : Empty conversations fixed.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Availability](https://img.shields.io/badge/Availability-475569?style=flat-square) : Shared sources updated, without a new APK.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Notifications](https://img.shields.io/badge/Notifications-475569?style=flat-square) : Vibration now stops correctly.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Remaining work](https://img.shields.io/badge/Remaining%20work-475569?style=flat-square) : Dialog after sending SMS and camera smoothness still need fixing.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Camera](https://img.shields.io/badge/Camera-475569?style=flat-square) : Focus and zoom confirmed by the user.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![SMS](https://img.shields.io/badge/SMS-475569?style=flat-square) : Sending and receiving confirmed by the user; conversations displayed.

<a id="development-2026-09-30-sms-camera"></a>

## 30/09/2026 : SMS and photos

![In development](https://img.shields.io/badge/In%20development-334155?style=flat-square)

### ![Desktop + Sargo](https://img.shields.io/badge/Desktop%20%2B%20Sargo-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![SMS](https://img.shields.io/badge/SMS-475569?style=flat-square) : Failed messages preserved and sending statuses updated.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Availability](https://img.shields.io/badge/Availability-475569?style=flat-square) : Preview 14 APK unchanged at this stage.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Camera](https://img.shields.io/badge/Camera-475569?style=flat-square) : Tap to focus and digital zoom. Photos up to 12 MP at the rear and 8 MP at the front.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Camera](https://img.shields.io/badge/Camera-475569?style=flat-square) : Preview return after taking a photo fixed.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![SMS](https://img.shields.io/badge/SMS-475569?style=flat-square) : Delivery to the recipient not yet confirmed.

<a id="2.7-preview.14"></a>

## 30/09/2026 : 2.7-preview.14

![Published](https://img.shields.io/badge/Published-334155?style=flat-square)

### ![All Platforms](https://img.shields.io/badge/All%20Platforms-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Interface](https://img.shields.io/badge/Interface-475569?style=flat-square) : Fonts, version information, lock screen and notifications aligned.

### ![Desktop + Sargo](https://img.shields.io/badge/Desktop%20%2B%20Sargo-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Keyboard](https://img.shields.io/badge/Keyboard-475569?style=flat-square) : Larger keyboard, improved text editing and recipient number entry.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Startup](https://img.shields.io/badge/Startup-475569?style=flat-square) : Startup and fonts checked on an Android emulator.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Notifications](https://img.shields.io/badge/Notifications-475569?style=flat-square) : Vibration stopping fixed.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![SMS](https://img.shields.io/badge/SMS-475569?style=flat-square) : Notifications preserved, conversation opening and duplicate messages fixed.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Wi-Fi](https://img.shields.io/badge/Wi--Fi-475569?style=flat-square) : Saved networks, reconnection and forgetting a network fixed.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Audio](https://img.shields.io/badge/Audio-475569?style=flat-square) : Audio controls tested outside calls; conversation audio and notification sounds still need testing.

[Release](https://nnsprod.com/git/oversu/VulpesOS/releases/tag/android-2.7-preview.14)

<a id="2.7-preview.13"></a>

## 27/09/2026 : 2.7-preview.13

![APK built · not published](https://img.shields.io/badge/APK%20built%20%C2%B7%20not%20published-334155?style=flat-square)

### ![All Platforms](https://img.shields.io/badge/All%20Platforms-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Calendar](https://img.shields.io/badge/Calendar-475569?style=flat-square) : Event reminders fixed, including after deletion.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Gallery](https://img.shields.io/badge/Gallery-475569?style=flat-square) : Initial display and closing the editor fixed.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![SMS](https://img.shields.io/badge/SMS-475569?style=flat-square) : Conversation filters fixed.

### ![Desktop](https://img.shields.io/badge/Desktop-2563EB?style=flat-square)

- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Apps](https://img.shields.io/badge/Apps-475569?style=flat-square) : Photo, video, calendar and conversations checked.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Apps](https://img.shields.io/badge/Apps-475569?style=flat-square) : Camera, Gallery, Calendar and background resume checked.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Hardware](https://img.shields.io/badge/Hardware-475569?style=flat-square) : Camera, Wi-Fi and brightness checked on the installed version.

<a id="2.7-preview.12"></a>

## 27/09/2026 : 2.7-preview.12

![APK built · not published](https://img.shields.io/badge/APK%20built%20%C2%B7%20not%20published-334155?style=flat-square)

### ![All Platforms](https://img.shields.io/badge/All%20Platforms-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Browser](https://img.shields.io/badge/Browser-475569?style=flat-square) : Local start page, in French or English according to language.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Apps](https://img.shields.io/badge/Apps-475569?style=flat-square) : SMS conversations and Calendar translations fixed.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Camera](https://img.shields.io/badge/Camera-475569?style=flat-square) : Camera switching and interface zoom fixed; flash disabled when unavailable.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Interface](https://img.shields.io/badge/Interface-475569?style=flat-square) : Sharper icons, long press on Home and gestures fixed.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Camera](https://img.shields.io/badge/Camera-475569?style=flat-square) : Smoother preview, at around 23 frames per second in testing.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Hardware](https://img.shields.io/badge/Hardware-475569?style=flat-square) : More responsive brightness and Wi-Fi connection fixed.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Hardware](https://img.shields.io/badge/Hardware-475569?style=flat-square) : Video, flash, Bluetooth and advanced call settings remain incomplete.

<a id="development-2026-09-27-4"></a>

## 27/09/2026 : Interface and hardware

![In development](https://img.shields.io/badge/In%20development-334155?style=flat-square)

### ![All Platforms](https://img.shields.io/badge/All%20Platforms-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Browser](https://img.shields.io/badge/Browser-475569?style=flat-square) : First local start page.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Shutdown](https://img.shields.io/badge/Shutdown-475569?style=flat-square) : Original shutdown animation retained, with blue circles.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Interface](https://img.shields.io/badge/Interface-475569?style=flat-square) : List and Video text fixed; transparent Home bar adapted to landscape.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Phone](https://img.shields.io/badge/Phone-475569?style=flat-square) : Call history headers and icons fixed.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Brightness](https://img.shields.io/badge/Brightness-475569?style=flat-square) : Brightness adjustment connected.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Hardware](https://img.shields.io/badge/Hardware-475569?style=flat-square) : Call audio, video, full-resolution photos and rotation still need testing.

<a id="development-2026-09-27-3"></a>

## 27/09/2026 : Wi-Fi stability

![In development](https://img.shields.io/badge/In%20development-334155?style=flat-square)

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Availability](https://img.shields.io/badge/Availability-475569?style=flat-square) : Preview 9 built with shared fixes; Wi-Fi handled by Android.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Wi-Fi](https://img.shields.io/badge/Wi--Fi-475569?style=flat-square) : Network discovery stabilized to avoid phone freezes.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Hardware](https://img.shields.io/badge/Hardware-475569?style=flat-square) : Camera and calls remain incomplete.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Interface](https://img.shields.io/badge/Interface-475569?style=flat-square) : Lock screen, fonts, date, battery and Wi-Fi checked.

<a id="development-2026-09-27-2"></a>

## 27/09/2026 : Restoring Gaia components

![In development](https://img.shields.io/badge/In%20development-334155?style=flat-square)

### ![All Platforms](https://img.shields.io/badge/All%20Platforms-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![About](https://img.shields.io/badge/About-475569?style=flat-square) : Credits, startup screen and browser name updated.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Interface](https://img.shields.io/badge/Interface-475569?style=flat-square) : Original Gaia panels and styles restored in Settings, Data Usage, FM Radio and imports.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Interface](https://img.shields.io/badge/Interface-475569?style=flat-square) : Home button no longer overlaps controls; date, battery and lock screen restored.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Integration](https://img.shields.io/badge/Integration-475569?style=flat-square) : Launcher mode, access to Android settings and background resume.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Wi-Fi](https://img.shields.io/badge/Wi--Fi-475569?style=flat-square) : Initial integration unstable; returned to the previous version.

<a id="development-2026-09-27-1"></a>

## 27/09/2026 : Calls and hardware buttons

![In development](https://img.shields.io/badge/In%20development-334155?style=flat-square)

### ![Desktop + Sargo](https://img.shields.io/badge/Desktop%20%2B%20Sargo-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Phone](https://img.shields.io/badge/Phone-475569?style=flat-square) : Gaia incoming and outgoing call interfaces, with call history.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Interface](https://img.shields.io/badge/Interface-475569?style=flat-square) : Fira fonts, contacts and battery display fixed.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Buttons](https://img.shields.io/badge/Buttons-475569?style=flat-square) : Support for Power and Volume keys, shutdown menu and waking the screen.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Camera](https://img.shields.io/badge/Camera-475569?style=flat-square) : Native camera still unavailable.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Calls](https://img.shields.io/badge/Calls-475569?style=flat-square) : Ringing and hanging up checked; conversation audio still needs testing.

<a id="development-2026-09-26-1"></a>

## 26/09/2026 : Startup and fonts

![In development](https://img.shields.io/badge/In%20development-334155?style=flat-square)

### ![All Platforms](https://img.shields.io/badge/All%20Platforms-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Interface](https://img.shields.io/badge/Interface-475569?style=flat-square) : Fira fonts and battery information fixed; test buttons removed from settings.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Installation](https://img.shields.io/badge/Installation-475569?style=flat-square) : Data preserved in the installed boot.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Startup](https://img.shields.io/badge/Startup-475569?style=flat-square) : Stable fullscreen, without automatic gestures or app launches.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Hardware](https://img.shields.io/badge/Hardware-475569?style=flat-square) : Sound and microphone tested separately; call audio, camera and sleep not validated.

<a id="development-2026-09-25-1"></a>

## 25/09/2026 : Home screen and first native trials

![In development](https://img.shields.io/badge/In%20development-334155?style=flat-square)

### ![All Platforms](https://img.shields.io/badge/All%20Platforms-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Home](https://img.shields.io/badge/Home-475569?style=flat-square) : Round button, transparent background on Home and blue background in apps.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Interface](https://img.shields.io/badge/Interface-475569?style=flat-square) : Pressed button state, gradient, fonts and system information fixed.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Stability](https://img.shields.io/badge/Stability-475569?style=flat-square) : App resume changed in source code, not yet tested on Android.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Startup](https://img.shields.io/badge/Startup-475569?style=flat-square) : First native image trials with accelerated display and battery support.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Availability](https://img.shields.io/badge/Availability-475569?style=flat-square) : Temporary trials; many hardware features still need connecting.

<a id="2.7-preview.7"></a>

## 2.7-preview.7

![APK built · not published](https://img.shields.io/badge/APK%20built%20%C2%B7%20not%20published-334155?style=flat-square)

### ![Desktop + Android](https://img.shields.io/badge/Desktop%20%2B%20Android-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![About](https://img.shields.io/badge/About-475569?style=flat-square) : Vulpes, Gaia and Gecko versions shown separately.

### ![Desktop](https://img.shields.io/badge/Desktop-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Camera](https://img.shields.io/badge/Camera-475569?style=flat-square) : Improved permission handling and clearer error messages.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Camera](https://img.shields.io/badge/Camera-475569?style=flat-square) : Resume after the first permission request fixed.

<a id="2.7-preview.6"></a>

## 2.7-preview.6

![APK built · not published](https://img.shields.io/badge/APK%20built%20%C2%B7%20not%20published-334155?style=flat-square)

### ![Desktop](https://img.shields.io/badge/Desktop-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Camera](https://img.shields.io/badge/Camera-475569?style=flat-square) : Gaia Camera app connected to the webcam.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Gallery](https://img.shields.io/badge/Gallery-475569?style=flat-square) : File import and photos available in Gallery.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Camera](https://img.shields.io/badge/Camera-475569?style=flat-square) : Camera switching depends on hardware; flash and video unavailable.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Camera](https://img.shields.io/badge/Camera-475569?style=flat-square) : Gaia Camera app connected to Android cameras.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Gallery](https://img.shields.io/badge/Gallery-475569?style=flat-square) : File import and photos available in Gallery.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Camera](https://img.shields.io/badge/Camera-475569?style=flat-square) : Camera switching depends on hardware; flash and video unavailable.

<a id="2.7-preview.5"></a>

## 2.7-preview.5

![APK built · not published](https://img.shields.io/badge/APK%20built%20%C2%B7%20not%20published-334155?style=flat-square)

### ![Desktop](https://img.shields.io/badge/Desktop-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Integration](https://img.shields.io/badge/Integration-475569?style=flat-square) : System settings, media and contact imports, notifications and webcam test.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Interface](https://img.shields.io/badge/Interface-475569?style=flat-square) : Interface and version numbering aligned with Android.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Interface](https://img.shields.io/badge/Interface-475569?style=flat-square) : Interface and version numbering aligned with Desktop.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Stability](https://img.shields.io/badge/Stability-475569?style=flat-square) : Improved background resume and display recovery.

<a id="2.7-156.0.2"></a>

## 2.7-156.0.2

![APK built · not published](https://img.shields.io/badge/APK%20built%20%C2%B7%20not%20published-334155?style=flat-square)

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Integration](https://img.shields.io/badge/Integration-475569?style=flat-square) : Android settings, sound, brightness, imports and notifications.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Apps](https://img.shields.io/badge/Apps-475569?style=flat-square) : Calls, SMS, clock and camera handled by Android apps.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Stability](https://img.shields.io/badge/Stability-475569?style=flat-square) : White screens and background resume fixed.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Version](https://img.shields.io/badge/Version-475569?style=flat-square) : Historical numbering: this number does not represent a Gecko update.

<a id="2.7-156.0.1"></a>

## 2.7-156.0.1

![Published](https://img.shields.io/badge/Published-334155?style=flat-square)

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Branding](https://img.shields.io/badge/Branding-475569?style=flat-square) : “Vulpes OS – Preview” name and project icon.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Home](https://img.shields.io/badge/Home-475569?style=flat-square) : Wallpaper flickering fixed.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Version](https://img.shields.io/badge/Version-475569?style=flat-square) : Historical numbering retained to identify this release.

[Release](https://nnsprod.com/git/oversu/VulpesOS/releases/tag/android-2.7-156.0.1)

<a id="2.7-preview.2"></a>

## 2.7-preview.2

![Published](https://img.shields.io/badge/Published-334155?style=flat-square)

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Home](https://img.shields.io/badge/Home-475569?style=flat-square) : Wallpaper flickering fixed.

[Release](https://nnsprod.com/git/oversu/VulpesOS/releases/tag/android-2.7-preview.2)

<a id="2.7-preview.1"></a>

## 2.7-preview.1

![Published](https://img.shields.io/badge/Published-334155?style=flat-square)

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Preview](https://img.shields.io/badge/Preview-475569?style=flat-square) : First Android Preview to try Vulpes without flashing the phone.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Home](https://img.shields.io/badge/Home-475569?style=flat-square) : Known wallpaper flickering in this first version.

[Release](https://nnsprod.com/git/oversu/VulpesOS/releases/tag/android-2.7-preview.1)

<a id="history"></a>

## Early milestones

### ![Desktop + Sargo](https://img.shields.io/badge/Desktop%20%2B%20Sargo-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Apps](https://img.shields.io/badge/Apps-475569?style=flat-square) : Adaptation of contacts, messages, settings, alarms and storage.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Branding](https://img.shields.io/badge/Branding-475569?style=flat-square) : Creation of Vulpes: visual identity, translations and system information.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Engine](https://img.shields.io/badge/Engine-475569?style=flat-square) : Move from old Firefox OS engines to a modern Gecko.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Startup](https://img.shields.io/badge/Startup-475569?style=flat-square) : First native boots and hardware trials on Pixel 3a.
