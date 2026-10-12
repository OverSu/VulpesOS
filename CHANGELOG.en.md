# Changelog — Vulpes OS

[Français](CHANGELOG.md)

Desktop, Android (APK) and Tundra/Sargo. Status indicates development sources, a built APK or a published release. Source changes require an update to the installed package.

<a id="2.7-preview.20"></a>

## 2.7-preview.20 — APK published · 13 October 2026

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Preview 20 brings together shared fixes since APK Preview 17: Gaia settings, appearance, selectors, keyboard, contacts, Marketplace and media.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Camera: WebM recording with posters and Gallery/Video playback. Microphone permission requested; controls follow hardware capabilities.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Camera: more reliable sensor switching, stopping and resuming. Desktop and Android use their camera APIs; Sargo retains its HAL adapter.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Sargo: Wi-Fi, Bluetooth, calls, SMS/MMS and network settings updates included in the sources. Unimplemented functions remain identified in their panels.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Changelog: simplified French/English text and badges retained; desktop/APK/Sargo filters independent of headings. Markdown, website and release notes generated from one JSON.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) APK signed with the previous Preview key; alignment and consistency of 53 shared files verified. Android execution of this Preview is not qualified in this pass: unstable Android emulator without KVM acceleration.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Desktop/Sargo Gecko 156.0.1; Android GeckoView 156.0. Gaia 2.7.0. The APK delegates calls/SMS to Android; it does not replace Android telephony.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Experimental Preview: Mozilla account/Sync, remote location, Firefox OS add-ons and USB file transfer remain incomplete. Sargo: preview around 16 fps; recorded sound and call audio require separate qualification.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Pixel 3a: Preview 20 r62 RAM-booted, then flashed to boot_a. Matching readback hash; installed startup, eleven Gaia checks and ten native checks passed. Data retained, Wi-Fi connected and LTE registration observed. No new two-way audio call tested.

[Release](https://nnsprod.com/git/oversu/VulpesOS/releases/tag/v2.7-preview.20)

<a id="development-2026-10-12-video-clock"></a>

## In development — 12 October 2026 — Video and clock settings

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Camera: WebM VP8/Opus recording with microphone permission, poster and storage. Buffer limited to 32 MiB; recording stops before releasing the sensor.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Camera, Gallery and Video: handle WebM files and their posters.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Settings: original Gaia date/time pickers, Back from built-in keyboard settings and unclipped select labels.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Improve Vulpes: link to project issues. Unavailable services explained in their panels.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Desktop: simulated 1920 × 1080 video decoded; photo, gallery, camera resume and navigation checked.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo r61 in RAM: 480 × 640 video decoded, eight front/rear switches passed. Test media deleted; recorded audio not listened to.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Sargo: preview measured around 16 fps versus 12 in the previous test. 30 fps is not reached yet.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo: automatic NITZ time, persistent setting and guarded manual writes. Sync depends on carrier time; no NTP fallback, timezone selected manually.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Android: assets staged and Java compiled, without a new APK or Android video test at this stage. Mozilla account/Sync, remote location, Firefox OS add-ons and USB file transfer remain unimplemented. No flashing or publication.

<a id="development-2026-10-12-settings-calls-hotspot"></a>

## In development — 12 October 2026 — Calls and Wi-Fi sharing

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Gaia dialogs: close after opening, complete interrupted transitions and allow retry after rejected validation.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Sargo: longer carrier-service timeout; slow settings separated from voice/SMS commands.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo: call waiting, caller ID and four forwarding rules connected to oFono, with validation and readback.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo: WPA2 or open Wi-Fi hotspot, NetworkManager configuration and compatible firewall. Private password, accessible only to Settings.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) r59 in RAM: 69 panels, dialogs and APNs checked on desktop/Pixel. Hotspot saved, started and stopped through Gaia; previous Wi-Fi restored. 44 Python tests and dialog regressions passed.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Internet forwarding to another device untested. Voicemail, call barring, PIN/PUK, Wi-Fi certificates and USB tethering remain open. Android assets synchronized; no new APK, flashing or publication.

<a id="development-2026-10-12-settings-network"></a>

## In development — 12 October 2026 — Network settings

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Wi-Fi: actual IPv4 address and link speed; no “undefined” label when a measurement is missing.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo: GSM/UMTS/LTE selection and editing of existing Internet/MMS APNs, with validation and readback.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) APNs: reject changes to active profiles, protect IMS and passwords, attempt rollback after failure and report its result.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Sargo: bounded queue for slow settings. Call status read in 20 ms during a five-second settings wait.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) 38 Python tests, 69 desktop panels and APN/network workflows on RAM-booted Pixel checked. Android assets synchronized.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) APN creation, deletion and reset unavailable. Manual carrier selection and certificates still open. No new APK, flashing or publication.

<a id="development-2026-10-12-settings-audit"></a>

## In development — 12 October 2026 — Settings audit

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Settings: recover navigation after a controller or dialog fails; consistent module generation.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Accessibility filters and Vulpes support. Original panels retained with explanations for unavailable features.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Desktop: profile statistics and Gecko downloads. Android: private storage statistics.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo: mobile data, roaming, clock and hidden Wi-Fi connected. Legacy network errors in Sound settings fixed.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) 97 views inventoried; 69 desktop/Pixel panels opened and seven native dialogs checked. Storage, data and timezone read back after writes on r51 in RAM.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Contextual views and unavailable services are not all qualified. Android Java compiled, without a new APK. No flashing, ticket closure or publication.

<a id="development-2026-10-12-settings-navigation"></a>

## In development — 12 October 2026 — Settings navigation

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Dropdowns: Gaia selector with confirm/cancel; Light/Dark choice accessible. SIM manager adapted to one slot.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Unavailable panels: explanations and disabled controls instead of unresponsive links.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Sargo: saved Wi-Fi networks separated from slow scans; cache preserved during status reads.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo: SIM information, SMS centre and delivery reports connected to the modem.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) r45 in RAM: eight appearance checks, five panels and actual SMS report setting changes passed, then setting restored. Desktop selector checked; APK assets staged.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Enterprise certificates and other carrier options still unavailable. No SMS sent, new APK, flashing or publication.

<a id="development-2026-10-12-sargo-appearance"></a>

## In development — 12 October 2026 — Shared fixes on Pixel 3a

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Sargo: r39 RAM boot with shared fixes and initial dark mode. r35 kernel and hardware configuration preserved.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Boot, viewport size, persistent settings, battery, call UI and Fira checked. Modem, audio, Wi-Fi and Bluetooth services active.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Seven Gaia appearance checks passed: propagated theme, readable headers, aligned labels and return to light mode. Pixel screenshot inspected.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Tool to update Gaia in a private boot image, with hashes, retained sources and checks for unchanged hardware components.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) No new call, SMS or pairing tested. Full theme and Android behavior still need qualification. No new APK, flashing or publication.

<a id="development-2026-10-11-appearance-input"></a>

## In development — 11 October 2026 — Appearance and shared keyboard

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Appearance: Light, Dark or Follow system, shared between apps and retained across restarts. Wallpapers, photos and external websites preserved.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Keyboard: shared editing operations, selection and deletion, protection against late replies.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Desktop: nine appearance checks and Messages input gestures passed, without sending SMS. Visual review of Settings, Messages, Phone and Contacts.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Android: experimental Gaia keyboard option; Android keyboard remains the default, input mode restored on close.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Android: briefly retry the same busy sensor, without retrying after permission denial or closing Camera.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Preview 19 built locally: signature, alignment, parity and bridge/camera tests passed.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Gaia keyboard, Android front camera and full theme still need qualification. Sources ready for Sargo, which remained on r35 at this stage. No upload, flashing or ticket closure.

<a id="development-2026-10-11-settings"></a>

## In development — 11 October 2026 — Settings and homescreens

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Settings: ringtone management, PIN entry/deletion, lock disabling and third-party app permission list.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Home: first initialization of the second launcher and wallpaper previews.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Languages: refresh Vulpes labels after language changes; English fallback outside French. Dismiss camera failure panels and installation banners.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Android: open the Gaia tray by tapping the status bar. Preview 18 built, signed and compared with sources.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Desktop: nine Gaia workflows, five banner checks and twelve activity/camera tests passed. Sargo r35 Bluetooth confirmed by the user.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Compositor hot restart still unstable: files restored and return to r35. Fixes not yet qualified on Sargo at this stage; Android keyboard/theme open. No APK publication or flashing.

<a id="development-2026-10-09-mms-bluetooth"></a>

## In development — 9 October 2026 — MMS and Bluetooth

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Bluetooth: shared Gaia adapter, separate hardware commands and access restricted to authorized apps.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo: power, discovery, explicit pairing, connection and removal from Gaia Bluetooth settings. Bluetooth audio modules included.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Sargo: Qualcomm network services and MMS transport connected. D-Bus disconnect no longer terminates the MMS daemon. Persistent state, retry without duplicates or uncertain automatic resends.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) r35 in RAM: image MMS visible and accepted by Orange MMSC; recipient delivery still unconfirmed. Five Bluetooth devices discovered, A2DP to desktop verified.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) 191 Tundra Python tests and 18 JavaScript tests passed. Smaller ramdisk and synchronized Android assets.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Headset call audio unqualified. No new APK, flashing or push at this stage.

<a id="development-2026-10-08-camera-mms"></a>

## In development — 8 October 2026 — Camera and MMS transport

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Camera: stop the stream before detaching video; await sensor closure, reset the viewfinder and recalculate size after rotation.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) MMS: preserve Blob attachments and keep messages pending until transport confirmation.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Sargo: reused WebGL viewfinder without intermediate video capture; screen stays awake during preview.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Desktop and Sargo: Camera/Gallery workflows and eight native switches checked. JPEG, focus and zoom working; rear ~16 fps, front ~25–27 fps in this test.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo: persistent MMS queue, Nuntium codec and oFono transport. Text/photo UI tested with simulated transport.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Mobile data blocked carrier MMS at this stage. Android assets synchronized; no new APK, flashing or push.

<a id="development-2026-10-08-call-log-dialogs"></a>

## 8 October 2026 — Call-log redial and error dialogs

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Gaia dialogs: visible text instead of a grey screen with a lone button.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Call log: redial through the same service as the keypad, without legacy Gecko APIs. Shared desktop/Android/Sargo file.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) MMS: clearly report unavailable sending, retain text and attachments, no false airplane-mode message.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Desktop: FR/EN dialogs and preserved composer. RAM-booted Sargo: 11 Gaia checks passed, redial tested with a simulated modem.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) No real call or audio validation at this stage. Android assets synchronized, no new APK published.

<a id="development-2026-10-08-sms-audio"></a>

## In development — 8 October 2026 — SMS and audio

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) SMS: send in one tap while keeping the keyboard. Paperclip connected to the Gaia image, audio, video or contact menu.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) UI: visible volume indicator, lockscreen gestures and notification swiping fixed.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Desktop: keyboard, attachments, Gallery, call UI and volume checked; notification swiped without moving the page. No new APK published.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Sargo: PulseAudio access, Qualcomm relay, D-Bus protocol and calibration devices restored. Conflicting Android audio service removed.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo: 11 Gaia checks, calibration and rear/front/rear previews passed.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Calls failed before ringing with a network error in this test. Two-way audio, Pixel gesture and MMS still unverified. No flashing or publication.

<a id="development-2026-10-08-radio-reliability"></a>

## In development — 8 October 2026 — Telephony reliability

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Sargo: radio service survives client closure. No automatic new call or SMS after a lost response. Errors exclude phone numbers and message text.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Network/audio diagnostics without personal identifiers, and pinned carrier settings in the native image.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) SMS: wait for the actual Gaia manager and accept uppercase oFono IDs. Conversation checks restored without resending.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo: LTE restored after reboot, SMS confirmed sent by the modem, non-silent microphone and audio playback accepted.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Recipient delivery, two-way call audio and modem stability remain unqualified. Compositor hot restart unstable. No new APK, flashing or push.

<a id="2026-10-08-source-publication"></a>

## 8 October 2026 — Public source update

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Published Camera, Contacts, SMS and Marketplace fixes, plus Sargo build and recovery tools.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Updated French and English READMEs with verified features and limitations.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Create the report directory when checking Android asset parity in a fresh checkout.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Checked native Wi-Fi configuration: no bundled connection profiles.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Internal documents, personal data and keys excluded from the repository.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Public APK unchanged (Preview17); October 8 fixes not included. No new native image published.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Sargo: modem still searching for a network; call audio, Bluetooth pairing and profiles await validation.

<a id="development-2026-10-08-camera-lifecycle"></a>

## 8 October 2026 — Camera and Contacts workflows · in development

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Camera: corrected sequential opening, sensor cleanup and front/rear identification.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Contacts: corrected photo and date transport on desktop, Android and Tundra.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Contacts: restored refresh after editing, SMS handoff, number picking and dialer prefilling.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Gallery: open the contact photo picker even when the app is already running.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Sargo: include corrected Contacts files in the boot image.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Android: pass recipients and text to the SMS app, including replies and unconfirmed typed numbers.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Tests for camera lifecycle, contact storage, permissions, binary transport and activities.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Desktop: verified JPEG capture, Gallery, contact photos, creation, editing, search, favourites and deletion. No calls or SMS sent.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo in RAM: verified autofocus, zoom, four camera switches, capture and Gallery; tested Contacts with touch input.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo: checked stored conversations, keyboard and notifications; detected four Wi-Fi networks. New SMS and call audio await validation.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo: BlueZ and dependencies pinned by SHA256. Power-on and discovery tested; pairing and profiles await validation.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo: native certificate store. Tested HTTPS, corrupted archives, file collisions and repeated builds.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Published Preview17 with download and SHA256 checks. These fixes remain in source; Android SMS needs a real-device test. No Sargo flash.

<a id="development-2026-10-06-marketplace-theme"></a>

## 6 October 2026 — Embedded Marketplace theme · in development

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Marketplace: embedded theme with local Fira fonts, compact navigation, touch controls, collapsible filters and scrolling screenshots.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Preserve `mode=app` across navigation, search, filters and language changes.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Hide website headers in embedded mode. Gaia handles confirmations; the catalogue receives no extra privileges.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Checked 16 French/English pages, 2 standard pages and mobile layouts at 320 and 360 pixels.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Theme ready locally, not deployed. Desktop and Sargo launchers updated; Android integration pending the next APK.

<a id="development-2026-10-06-system-banner"></a>

## 6 October 2026 — Gaia banners · in development

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Automatically dismiss the “Application installed” banner even without an animation-end event.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Cancel old timers when a new banner replaces the previous one.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Desktop: checked display, expiry, replacement and click dismissal. Sargo: verified dismissal after five seconds in RAM.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Fix available in shared sources for the next APK. No flash or release.

<a id="development-2026-10-06-wifi"></a>

## 6 October 2026 — Wi-Fi and Settings panels · in development

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Settings: open panels even without an animation-end event, without duplicate initialization.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Sargo: corrected Wi-Fi events to restore network results and report disconnection properly.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo: detected four access points grouped into two networks. Connection confirmed and HTTPS request passed with certificate verification.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Shared sources, desktop server and Sargo RAM trial updated. Fixes not included in the public APK.

<a id="development-2026-10-06-marketplace-views"></a>

## 6 October 2026 — Marketplace · in development

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Desktop/Sargo: keep Marketplace below the status bar, hide it on Home and remove it when closed.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Cancelled navigation or an old error page no longer hides a retry.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Local error message with a Retry button when the catalogue is unavailable.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Desktop: verified navigation, network errors, retry, Home and closing.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo in RAM: seven checks passed with a local page and forced unlock. Remote catalogue not validated without Internet access.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Rebuilt local Preview17 APK; checked signature, alignment and assets. No new Android device test or release.

<a id="2.7-preview.17"></a>

## 2.7-preview.17 — APK built · 5 October 2026

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Marketplace on Home with its original icon and the Vulpes catalogue in French or English.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Confirmed ZIP app installation, launch from Home and removal.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Installed apps isolated from Gaia sources and system privileges.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Desktop: full 2048 workflow plus archive, path, limit, cancellation and single-use confirmation checks.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Preview17 APK built and signed with Marketplace, GeckoView and private package storage.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Android 16/API 36 emulator: 2048 installation, launch, isolation, persistence after app restart and removal.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo in RAM on October 6: Home and Marketplace assets verified, 9 of 10 system checks passed. Viewport changes on unlock; package installation awaits validation.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Initial support for packaged web apps. Legacy privileged APIs and hosted apps not restored. No release at this stage.

<a id="2.7-preview.16"></a>

## 2.7-preview.16 — APK built · 5 October 2026

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Restored Gaia wallpaper and sound pickers, return to Settings and cancellation through Home.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Apply language changes to Home and preserve them after restart.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Restore horizontal page snapping; hide development apps on Home.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Vulpes startup logo and sound list adapted to the current engine. Media transport shared by desktop and Android.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Android: Gaia locking after sleep and Back from the lockscreen camera. HOME launcher mode validated.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Android: hide system bars in immersive mode, with swipe access. Preview16 APK built and signed.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Desktop and Android 16/API 36 emulator: checked wallpapers, sounds and panels; tested language, locking and wallpaper persistence on Android.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Sargo: updated the boot image to stop restoring outdated files.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo in RAM: 6 UI and 10 system checks passed. Installed build remains Preview15, without flashing.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) APK not published. FFAA installation and call audio await validation; Gaia sound selection does not change the Android ringtone.

<a id="2026-10-04-sargo-standalone"></a>

## In development — 4 October 2026 — Standalone Sargo installation

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo: standalone ext4 userdata volume with system, data and vendor/modem components. Installation independent of Droidian and ADB.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Fastboot installer with model, unlock, size and checksum checks. Replaces userdata, dtbo_a, vbmeta_a and boot_a; retains calibration.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Full userdata backup and recovery archive verified before flashing. Actual restoration not tested.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Two installed boots passed: 11 Gaia and 10 native checks per boot, retained settings and matching boot readback.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Variant without SSH or maintenance keys booted after flashing. Development variant reinstalled; camera, keyboard and notifications checked.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Local Fastboot package assembled; 44 targeted tests passed.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Package unpublished: hardware component provenance and redistribution pending. Tested on one Pixel 3a; 8 GiB volume with 1 GiB writable, without automatic expansion.

<a id="2026-10-03-sargo-per-device-installation"></a>

## In development — 3 October 2026 — Per-device Sargo installation

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo: portable device workspace for builds, installation and recovery, independent of the development Pixel inventory.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Read-only collection of six boot partitions and storage, bound to the phone identity. Private backups.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) SSH transfer with identity, storage and checksum checks, without overwriting, formatting or flashing.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Two RAM boots: 11 Gaia and 10 native checks passed each; setting retained. Autofocus timed out on the first trial; camera worked on the second.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Return to the installed build verified; boot unchanged and data overwrite rejected.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Autofocus timeout not considered fixed. Exact HAL provenance still pending; qualified kernel and compatible ext4/LVM storage required, without direct installation from stock Android.

<a id="2026-10-03-sargo-installation-tools"></a>

## In development — 3 October 2026 — Sargo preparation and recovery tools

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo: local package preparation with checksum checks, bounded extraction, ext4 validation and fresh data creation without overwriting.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Private recovery kit with boot_a backup and model, serial, slot and checksum checks. User data not included.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Restoration works without the diagnostic image.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) System builds require a complete ARM64 hardware reference.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) System archive prepared and recovery kit checked locally. Installation on another Sargo pending; no flash or ROM release.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) JSON changelog included in future source releases; working documents excluded.

<a id="2026-10-03-sargo-modem-persistence"></a>

## In development — 3 October 2026 — Sargo modem recovery and fresh installation

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Sargo: corrected font cache and first-boot creation of oFono’s private directory in the system image.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Modem recovery without rebooting the phone. Network registration took about 22 seconds in a controlled trial.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Fresh profile: checked Gaia, hardware rendering, Fira, both cameras, focus, zoom, keyboard and notifications. Wi-Fi scan worked after modem restart.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Two boots retained settings in a separate data image. Existing installation preserved.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) IMS watchdog root cause unresolved. Public installation and recovery package still incomplete; no image released.

<a id="2026-10-01-sargo-distribution-preparation"></a>

## October 1, 2026 — Sargo distribution preparation — in development

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Sargo: rebuilt Preview15 image with empty profiles, licenses and an inventory of 493 packages. Working documents excluded.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Mount table generated from the storage inventory. Support limited to a single ext4 extent on userdata.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) First-boot font cache permissions: run fc-cache as the session user.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Filesystem, content and transfer checks passed. RAM trials left boot_a unchanged; return to v59 verified.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) SIM, LTE, Wi-Fi scan, Gaia, hardware rendering, Fira, cameras, keyboard and notifications checked in RAM.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Targeted recovery after tracing intermittent reboots to IMS firmware. Second boot passed; recovery from another IMS crash not tested.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Image qualification incomplete; end-to-end calls, SMS and mobile data unvalidated. Image unpublished and non-flashable.

<a id="2.7-preview.15"></a>

## 2.7-preview.15 — 30 September 2026 — published

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) First publication of desktop, Android and Tundra sources, with French/English READMEs, licenses and setup scripts. Private files excluded.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) SMS: corrected bubble dates and sent/failed states. Improved camera stream cleanup and replacement.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Desktop: stabilized navigation checks, adjusted cold-start timeout and clean shutdown after Gaia times out.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Desktop with Gecko 156.0.1: 42 service tests, startup, navigation, settings, gestures, history, isolation and persistence checked.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Preview15 APK signed with the previous key and GeckoView 156.0; asset parity verified.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Android 16 emulator: validated update, Camera/Gallery, camera resume, ten background returns and renderer recovery.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Sargo: sources included, private v59 retained. No generic ROM; boot depends on storage layout and preinstalled images.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Sargo: preview around 16 fps; flash, video, rotation and deep suspend incomplete. Call audio and the dialog after SMS sending need investigation.

[Release](https://nnsprod.com/git/oversu/VulpesOS/releases/tag/v2.7-preview.15)

<a id="development-2026-09-30-sms-camera-followup"></a>

## In development — SMS and camera feedback · 30 September 2026

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) SMS: convert dates to fix empty conversations.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Camera: corrected stream and sensor cleanup; an old session can no longer close its replacement.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Sargo: physical vibration shutdown through DRV2624, with a safeguard at service startup and exit.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Desktop: SMS composition and display checked with a simulated modem. Sargo: camera switching and shutdown tested over two RAM boots.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo v54: user confirmed focus, zoom and two-way SMS. Five conversations displayed; vibration shutdown confirmed.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Sargo v59 installed on boot_a after two RAM boots; startup, readback and slot A verified.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Post-SMS dialog and camera smoothness still pending. Shared sources updated, without a new APK.

<a id="development-2026-09-30-sms-camera"></a>

## In development — Messages and Camera · 30 September 2026

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Desktop/Tundra: retain SMS after modem rejection and pass sending, failed and sent states to Gaia.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Sargo: persist SMS states after the oFono object disappears; reject sending when the modem is unregistered.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo: touch focus, digital zoom and sensor JPEG capture in Gaia Camera.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Measured photos: 4032 × 3024 rear, 3264 × 2448 front. Preview 640 × 480; fixed front focus.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Native camera: separate binary data from HAL logs, bound responses and resume preview after capture or focus errors.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Desktop: checked visible send failures and Camera/Gallery workflows. Sargo v54: validated two RAM boots, installation, persistence and camera.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Unstable network; no end-to-end SMS delivery confirmed in this pass. Modem confirmation is not a delivery receipt. Public APK unchanged (Preview14).

<a id="2.7-preview.14"></a>

## 2.7-preview.14 — APK published · 30 September 2026

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) System information: version alignment and Fira fonts in Shadow DOM components.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Desktop/Tundra: portrait key sizing, cursor placement in the active field and stale input replies.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Desktop/Tundra: Gaia keyboard bridge and numeric keypad for SMS recipients. Android keeps its system keyboard.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Lockscreen: resize without a keyboard window. Honour silent notifications, including after restoration.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo: persistent tray and lockscreen notifications, opening the owning application.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo: cancellable vibrations capped at ten seconds; private persistent Wi-Fi profiles, automatic reconnection and network removal.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Sargo: store incoming SMS before acknowledgement, remove duplicates and create the state directory.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo: earpiece/speaker, microphone mute and call-volume controls. Routing, mute and volume tested outside a call.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Installer: reject flashing diagnostic images with a debugger. Sargo v48 installed after two RAM boots; persistence, readback and slot A verified.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Desktop: Calendar and keyboard checked. Sargo: keyboard, notifications and Wi-Fi reconnection checked; notification sound and real telephony await validation.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Preview14 APK signed and published. Startup, versions and fonts checked on an Android 16 emulator. No Sargo image released.

[Release](https://nnsprod.com/git/oversu/VulpesOS/releases/tag/android-2.7-preview.14)

<a id="2.7-preview.13"></a>

## 2.7-preview.13 — application workflows · 27 September 2026

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Calendar: save events with alarms, report scheduling errors and skip reminders for deleted events.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Notifications: accept empty text; do not mark rejected notifications as delivered. Native Tundra support still incomplete.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Gallery: thumbnail sizing at hidden startup and cancellation of updates after closing the editor.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) SMS: apply correspondent, read-state, date and delivery filters.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Desktop: checked WebM playback, photo editing and copying, calendar, conversation reading and deletion.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Isolated checkout: startup, desktop tests, persistence and Android packaging passed.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Preview13 APK built and signed. Camera/Gallery, Calendar, ten background returns and renderer recovery validated on emulated Android 16.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo v40 installed after two RAM boots; Gaia, camera, Wi-Fi, brightness, controls and boot_a readback verified.

<a id="2.7-preview.12"></a>

## 2.7-preview.12 — application review · 27 September 2026

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Gaia icons: restored 1× to 2.25× variants across 1,047 CSS references.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Camera: enable switching after sensor detection and prevent pinch zoom on the UI. Unavailable flash disabled.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Home: restore long press and gesture forwarding without additional privileges for websites.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Browser: local bilingual welcome page following Gaia’s language without restarting.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) SMS: corrected identifiers, migration, dates, sending events, multi-recipient requests and concurrent writes.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Calendar: restored the current-day accessibility label in 37 languages.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Reviewed 14 apps; 26 Gallery/Music/Clock/UI checks, Contacts/SMS tests and web isolation checks.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Preview12 APK rebuilt with shared assets; parity verified. Hardware features handled separately on Android and Tundra.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Sargo: shader-based NV21 preview and binary transport, about 23 fps measured versus 8 in the intermediate trial.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Sargo: wait for camera worker shutdown before switching sensors; manual brightness reaches its target in about 200 ms.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo: Wi-Fi power control from Gaia and WPA-PSK connections to mixed WPA2/WPA3 networks.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo: scan, connection and HTTPS validated in RAM. v38 installed after two RAM boots, with readback and slot A checks.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Sargo: temporary Wi-Fi profiles; flash, video, sensors, Bluetooth, data counters and advanced call controls incomplete.

<a id="development-2026-09-27-4"></a>

## In development — Sargo feedback and interface · 27 September 2026

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Gaia shutdown animation recoloured blue.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Phone: keep headers fixed when changing tabs and use call-log icons up to 2.25× density.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Clipped dropdown text and overflowing Video welcome text.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Brightness: numeric values and coalesced stale commands, preserving sleep/wake order.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Home: wallpaper under the gradient and right-side button in landscape, without covering apps.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Browser: editable local welcome page, retaining private mode.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Wi-Fi: error message and Retry button instead of endless retries.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Preview11 APK built and signed; rotation and Home button placement checked on emulated Android 16.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo: preview, JPEG and camera switching validated in RAM. Capture limited to 640 × 480; flash and video unavailable.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo v33 installed after two RAM boots; startup, data, readback and slot A verified. Brightness and Wi-Fi results checked in Gaia.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Sargo: PulseAudio 14 compatibility and duplicate audio module loading. Call/media profiles and earpiece tested.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Sargo: call audio, full-resolution capture, video and automatic rotation await validation.

<a id="development-2026-09-27-3"></a>

## In development — native Wi-Fi stability · 27 September 2026

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Wi-Fi: restore the 20-second scan interval and coalesce concurrent scans.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Sargo: one hardware scan at a time, with a short cache cleared on connect/disconnect. Fixes memory exhaustion in v21/v22.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Wi-Fi burst, failure and timer tests.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Shared Preview9 version, Gaia 2.7.0; new APK with the same sources. Android still manages its own Wi-Fi.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo v25: two RAM boots then installation, 11 Gaia and 10 system checks passed, without low-memory process kills.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Checked locking, fonts, battery, date and Wi-Fi; tested sleep/wake and volume with injected events. Data, readback and slot A verified.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Native camera and full call validation still pending.

<a id="development-2026-09-27-2"></a>

## In development — Gaia restoration · 27 September 2026

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Restored Gaia Settings, Usage, FM and import panels. Temporary interfaces removed; unavailable features disabled.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Corrected legacy component styles, lockscreen icons and Phone glyphs.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Reserve 44 pixels for Home; restore date and battery without `{{ level }}` placeholders.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Gaia lockscreen re-enabled, splash stabilized, Browser name localized and credits added.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Desktop: 26 app checks passed, plus panels, imports, battery, navigation and simulated calls.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Preview8 APK installed on emulated Android 16: Android battery, settings access and optional HOME mode. Android app catalogue still incomplete.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Emulated Android: ten background returns, renderer recovery and asset parity checked. Gaia locking remains separate from Android security.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo v21/v22: Wi-Fi scan and association connected to Gaia through NetworkManager.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo: RAM trials interrupted by display-service failure (code 139). Return to installed v20 verified, without a new flash.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Candidate Wi-Fi, camera, SIM/Bluetooth APIs and CPU suspend unvalidated.

<a id="development-2026-09-27-1"></a>

## In development — 27 September 2026

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Gaia Callscreen for incoming/outgoing calls, answer and hangup. Replaces the temporary v13 screen.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Persistent call log with acknowledgement and duplicate detection.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Distinguish unknown battery state from empty battery; tolerate missing or malformed Contacts indexes.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Render system text with Fira Sans while preserving icon fonts.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Desktop with simulated modem: calls, failed hangup and retry, history, sleep/wake, Power menu, volume and battery.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo: Power/Volume buttons connected to Gaia, with native screen, volume, shutdown and reboot controls.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Sargo: serialize brightness and power changes to prevent a black screen on wake; fix PulseAudio access for volume.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Sargo: successful hangup with an empty D-Bus reply no longer produces a false error.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo v13 then v20 installed after RAM trials; startup, readback, settings and slot validation checked.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Real outgoing call reached ringing and was hung up. Incoming calls and conversation audio unvalidated.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Camera diagnostics: a timeout no longer counts as successful initialization. Two sensors detected, without received frames.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Native camera unavailable, CPU suspend and advanced audio controls incomplete. No new APK.

<a id="development-2026-09-26-1"></a>

## In development — 26 September 2026

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Use historical Fira Sans fonts in Gaia and Tundra; correct sans-serif fallback and Fontconfig checks.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Removed diagnostic buttons from Settings.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Hardware panel: pass platform capabilities correctly to display the battery.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Sargo: distinguish modem and transport errors; correct the unavailable-camera message.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo: persistent data on a 2 GiB ext4 image and A/B success validation after installation.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo v8: two boots with persistence, 9 Gaia and 9 system checks per boot. Installation and recovery tools tested locally.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo v9 installed on boot_a: two boots with 10 Gaia and 9 system checks each. Matching readback, five other partitions preserved; actual restoration untested.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Normal startup without automatic diagnostic gestures; fullscreen before Gaia, stable 360 × 740 CSS-pixel layout.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Separate `--diagnostics` mode; diagnostic images excluded from normal launch.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo: v13 tested in RAM (8 startup, 9 system checks), v14 diagnostics (13 interactive checks), including Wi-Fi.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) UMTS registration, audio playback and microphone signal checked. Call audio, camera and suspend unvalidated.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Ramdisk builds independent of the desktop language by running readelf in the C locale.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Private trials, without a public ROM. Desktop sources synchronized; shared Android fix available, without a new APK.

<a id="development-2026-09-25-1"></a>

## In development — 25 September 2026

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Round Home button, transparent wallpaper gradient and blue bar inside apps.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Hide the gradient at the bottom and restore it when scrolling; remove the blue rectangle when pressing Home.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Bundled Fira Sans weights and italics; separate product, Gaia, engine and platform versions.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Resume icon loading after an initial zero-size measurement on all three platforms.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Desktop: icons, navigation, permissions and French/English information panel checked with Gecko 156.0.1.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Android: retain navigation state after activity recreation. Java compilation passed; visuals need retesting, no new APK delivered.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Tundra: ext4 image with ARM64 runtime, HAL, Phoc, Gecko and Gaia; small fixes bundled in the ramdisk.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo: dedicated backend, Pixel 3a information and hardware battery readings. Build sources archived with checksums.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo: hardware WebRender, icons and fonts checked on a physical display capture. v5: 10 Gaia and 8 system checks passed.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Sargo: add pd-mapper, disable uninitialized IPA and premature camera probing. Copy modem NV data to RAM for trials.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo v6: Wi-Fi scan, connection, IPv4, DNS and HTTPS verified; 13 Gaia and 9 system checks passed. Gaia network selection still pending.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) RAM trials without flashing, automatic return after ten minutes and changes lost at shutdown. Cold boot passed; warm compositor restart failed.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) No public ROM; modem, audio, camera and suspend still need integration or validation.

<a id="2.7-preview.7"></a>

## 2.7-preview.7 — APK built, local reference

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Desktop camera permission and recovery after the first Android permission prompt.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Separate messages for denied permission, missing sensors and opening failures.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Separate product and engine versions: Vulpes Preview7, Gaia 2.7.0, desktop Gecko 156.0.1 and Android GeckoView 156.0.

<a id="2.7-preview.6"></a>

## 2.7-preview.6 — APK built

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Gaia Camera on desktop and Android: preview and JPEG capture through webcam or GeckoView.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Save photos in Gallery and import through the system picker.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Flash and video disabled; camera switching depends on available sensors.

<a id="2.7-preview.5"></a>

## 2.7-preview.5 — APK built

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Versions centralized in `release.json`; product, Gaia and engine separated.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Shared desktop/Android native interface and APK asset parity checks.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Desktop: Linux settings, media/vCard imports, notifications and test webcam capture.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Android: foreground return and recovery after renderer termination.

<a id="2.7-156.0.2"></a>

## 2.7-156.0.2 — Historical APK built (revision 4)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Android: activity and session recovery to reduce blank screens.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Access to Android settings, volume and window brightness.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Media and contact imports; native notifications with permissions.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Handoff to Android Phone, SMS, Clock and Camera. No silent sending or replacement of default apps.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Historical numbering: Android engine Gecko 156.0, despite the 2.7-156.0.2 name.

<a id="2.7-156.0.1"></a>

## 2.7-156.0.1 — APK published (revision 3)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) “Vulpes OS - Preview” name and project icon.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Wallpaper flickering corrected.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Historical numbering, separate from the Android engine version.

[Release](https://nnsprod.com/git/oversu/VulpesOS/releases/tag/android-2.7-156.0.1)

<a id="2.7-preview.2"></a>

## 2.7-preview.2 — APK published

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Wallpaper flickering in the Android Preview.

[Release](https://nnsprod.com/git/oversu/VulpesOS/releases/tag/android-2.7-preview.2)

<a id="2.7-preview.1"></a>

## 2.7-preview.1 — APK published

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) First Android Preview with Gaia and GeckoView.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Archived version; known wallpaper flickering issue.

[Release](https://nnsprod.com/git/oversu/VulpesOS/releases/tag/android-2.7-preview.1)

<a id="history"></a>

## Earlier milestones — technical retrospective

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Historical Gaia base with Vulpes branding, wallpaper, translations and system information.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Experimental Gecko 45 to 52 port, followed by separation of Gaia, services and engine.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) APIs for settings, apps, contacts, messages, alarms, storage and inter-app communication.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Adapt Gaia components, touch gestures, browser and apps to recent engines.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Gecko updates with checks and rollback; Gaia updates without rebuilding the engine.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Archived Firefox OS apps, QEMU, then ARM64 Gecko inside Droidian and under a dedicated compositor.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo: inventory, boot backups, separate root, HAL services and Tundra PID 1.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Temporary graphical Fastboot trials with SSH recovery and automatic return.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Kernel 4.9-124-google-sargo, Android 9/API 28 adaptation. Historical milestones, without newly dated releases.
