# Changelog — Vulpes OS

[Français](CHANGELOG.md)

One Gaia base, three platforms: **desktop**, **Android (APK)** and **Tundra / Sargo**.
This journal covers visible changes and major technical milestones.

**Status:** “In development” refers to local sources, “APK built” to a test package,
and “Published” to a public repository release. Shared source changes reach installed
APKs and phone images only after those packages are updated.

<a id="2026-10-08-source-publication"></a>

## 8 October 2026 — Public source update

### Shared · Desktop / Android / Tundra

- Bring recent camera, Contacts, SMS and Marketplace fixes, plus Sargo build and recovery tools, into the public sources. Update both READMEs with verified capabilities and limitations.
- Make the Android parity check create its report directory in a fresh checkout. Verify that native Wi-Fi configuration ships an empty connections directory.
- Keep tickets, roadmaps, internal documents, personal data and keys outside the repository.

### Packages and qualification

- The public APK remains Preview17; the 8 October fixes require a future build. No new native image or flash in this step.
- At the latest Sargo check, cellular registration is still searching; two-way call audio, Bluetooth pairing and profiles remain to be qualified.

<a id="development-2026-10-08-camera-lifecycle"></a>

## 8 October 2026 — Camera and Contacts workflows · in development

### Shared · Gaia / Desktop / Android / Tundra

- Serialize camera opening, await the previous sensor shutdown and release tracks and video resources after failures. Keep stable front/rear identities on desktop and Android.
- Preserve binary images across desktop/Tundra transport; explicitly encode contact photos and dates for Android's JSON bridge.
- Refresh contact details after editing. Restore Contacts → SMS, number picking and prefilled dialer activities, preserving nested requests and Gaia entry points.
- Reopen Gallery in picker mode when adding a contact photo, even when Gallery is already open for browsing. Selection, cropping and photo persistence verified on desktop.
- Add camera lifecycle, contact persistence, permissions, binary transport and activity routing tests.

### Desktop

- Verify the original Camera → JPEG capture → Gallery → photo opening → camera workflow.
- Verify Gaia contact creation, editing, detail refresh, accent-insensitive search and empty results, favourites, SMS recipient, number picker, prefilled keypad, cancelled deletion and confirmed deletion. The test sends no message and makes no call; its temporary contact is removed.

### Tundra · Sargo

- Verify on a RAM-booted Pixel 3a: autofocus, zoom, four front/rear switches with fresh frames, shutter capture, JPEG persistence, Gallery opening and sensor shutdown on Home.
- Check stored conversations, keyboard and notifications. Wi-Fi scan finds four networks. New SMS transmission/reception and call audio are still being qualified.
- Add SHA256-pinned BlueZ packages and required libraries. The controller starts, powers on and discovers; pairing through Gaia and Bluetooth profiles are not yet validated.
- Add native trusted certificates and verify HTTPS without disabling TLS. Test corrupted archives, file collisions and repeatable staging.

- Include the corrected Contacts files in the boot build: contact creation, editing, SMS handoff, picking and dialer prefilling also pass using touch gestures on Sargo.

### Android · APK

- Publish the existing Preview17 APK and verify its download and SHA256. It predates the 8 October fixes.
- Fix recipient and body handoff from Gaia to the Android SMS app, including replies and a typed recipient that was not yet committed. Bridge tests pass; real Android validation is still required.
- Repackage corrected shared resources for the next build; no APK containing these new fixes has been published.

**Status:** native qualification builds booted in RAM. No flashing, source push or private documentation publication in this step. Full phone qualification remains open.

<a id="development-2026-10-06-marketplace-theme"></a>

## 6 October 2026 — Embedded Marketplace theme · in development

### Shared · Gaia / Desktop / Android / Tundra

- Open the catalogue with `mode=app`, retained in navigation, search, filters, app details and language switches.
- Prepare a dedicated Vulpes web theme with local Fira fonts, compact navigation, touch-friendly controls, readable cards, collapsible filters and scrolling screenshots. Omit website headers in embedded mode while preserving the standard website layout.
- Keep confirmations and system messages in Gaia. The theme grants catalogue pages no additional privileges.
- Check 16 French/English pages, 2 standard pages and theme assets. Inspect mobile renders at 320 and 360 pixels. Desktop and Sargo launchers updated; shared sources will be included in the next Android packaging run.

Website files prepared locally, not deployed to the public server. No push or new APK/ROM publication.

<a id="development-2026-10-06-system-banner"></a>

## 6 October 2026 — Gaia banners · in development

### Shared · Gaia / Desktop / Android / Tundra

- Dismiss the “Application installed” banner after its normal timeout even if the animation-end event does not reach the Gaia component host. Keep its appearance and tap-to-dismiss behavior.
- Cancel old timers when a new message replaces the previous one, preventing premature dismissal.
- Check display, expiry, replacement and click dismissal on desktop; verify actual removal after five seconds on the Pixel. Fix deployed to the Sargo RAM trial and available in shared sources for the next APK.

No flash or publication in this step.

<a id="development-2026-10-06-wifi"></a>

## 6 October 2026 — Wi-Fi and Settings panels · in development

### Shared · Gaia / Desktop / Android / Tundra

- Complete Settings panel navigation even when Gecko does not emit an animation-end event. Preserve Gaia transitions and prevent duplicate initialization.
- Updated shared sources and the desktop server; included in the next Android packaging run. No new APK published in this step.

### Tundra · Sargo

- Fix Wi-Fi signal events: include the associated network and do not emit connection information while disconnected. The incomplete event prevented Gaia from displaying scan results.
- Check the driver, native service, Gecko bridge and corrected panel on the Pixel: four access points detected, grouped into two networks, with no scan error.
- Wi-Fi connection confirmed by the user; a real HTTPS request from Gecko to example.org passed (HTTP 200, certificate verification enabled). Fixes applied to the RAM trial; no flash or Git push.

<a id="development-2026-10-06-marketplace-views"></a>

## 6 October 2026 — Marketplace · in development

### Desktop / Tundra · Sargo

- Keep the catalogue below the status bar and inside its owning application. Hide its web view on Home and in the task switcher; remove it when the app closes.
- Prevent a cancelled navigation or a previous error page from hiding a retry.
- Show a local error message with a retry action when the catalogue is unavailable, instead of leaving its error page over Gaia.
- Desktop navigation, network failure, retry, Home and closing from the task switcher checked. Seven direct checks pass on Sargo in RAM without a debugger window, using a local page and a forced-unlock precondition; the remote catalogue requires an Internet connection on the phone.

### Android · APK

- Rebuild the local Preview17 APK with the shared Marketplace error message. Signature, alignment and asset parity checked; no new Android device regression run in this step.

Nothing published in this step.

<a id="2.7-preview.17"></a>

## 2.7-preview.17 — APK built · 5 October 2026

### Shared · Gaia / Desktop

- Restore Marketplace on Home with its original icon and the Vulpes catalogue. Select French for fr languages and English otherwise.
- Turn catalogue downloads into confirmed installations: validate ZIP archives, add the application to Home and support launch and removal.
- Store installed applications separately from Gaia sources, on distinct origins and without system privileges inherited from archived manifests.
- Validate the real desktop workflow with 2048: catalogue, confirmation, installation, launch, persistence and removal. Check damaged archives, invalid paths, limits, cancellation and single-use confirmations.

### Android · APK

- Build and sign Preview17 with the same Marketplace and installation service. Use the existing GeckoView browser for the catalogue and private Android storage for packages.
- Verify the Install click, confirmation, Home icon and 2048 launch without access to the Vulpes system bridge on an Android 16/API36 emulator. Also verify persistence after force-stop/relaunch and removal.

### Tundra · Sargo

- Prepare a local boot image containing Marketplace, the installer and the added-application server. RAM boot performed on the Pixel on 6 October: Home and Marketplace resources verified, without flashing. Nine of ten system checks pass; the overall Gaia check records a viewport change during unlocking. Package installation on Sargo still needs qualification.

**Limitations:** initial support for packaged web applications. Old privileged APIs, hosted apps and discontinued services are not restored automatically. Nothing published to Forgejo or the website.

<a id="2.7-preview.16"></a>

## 2.7-preview.16 — APK built · 5 October 2026

### Shared · Gaia / Desktop

- Restore Gaia wallpaper and sound pickers, return navigation to Settings and cancellation through Home. Share persisted image and sound transport between desktop and Android.
- Propagate language changes to Home without granting general settings read access. Check French/English labels and persistence.
- Restore horizontal page snapping and hide development apps from Home without deleting their sources.
- Use the supplied Vulpes logo in the splash and adapt the original sound-list components to the current engine.
- Verify two consecutive wallpaper changes, sound selection and restored Gaia panels on desktop.

### Android · APK

- Build and sign local Preview16; verify shared payload and version. Nothing published in this step.
- Validate Vulpes as the HOME launcher, restore Gaia locking after sleep and Android Back navigation from the lockscreen camera.
- Hide Android system bars in immersive mode while retaining temporary swipe access.
- Android 16/API36 emulator checks: locking, camera/Back, French/English, Home without test apps, wallpaper and sound. Wallpaper retained after force-stop/relaunch with no repeated changes over 15 seconds. Other Android devices not qualified in this step.

### Tundra · Sargo

- Include shared fixes and app policy in a new test boot image. The previous boot reapplied an old file snapshot, undoing hot updates.
- RAM boot on Pixel passed: six language/Home/picker checks and ten system checks. Image/sound picker results verified without replacing personal selections. Installed boot remains Preview15; no partition flashed in this step.

**Limitations:** third-party FFAA installation remains open. The site depends on old mozApps APIs and a nomodule script; an installer with application and permission isolation still needs implementation. Selecting a Gaia sound does not change the global Android ringtone; actual call audio was not qualified here.

<a id="2026-10-04-sargo-standalone"></a>

## In development — 4 October 2026 — Standalone Sargo installation

### Tundra · Sargo

- Build a fresh ext4 volume directly for userdata, including the system, writable data and vendor/modem hardware images. Startup no longer looks for files in a Droidian installation; installation requires neither an Android session nor ADB.
- Python Fastboot installer checks the Sargo model, unlock state, partition sizes and checksums, then replaces userdata, dtbo_a, vbmeta_a and boot_a. The bootloader stays unlocked and device-specific calibration is retained.
- Full offline userdata backup, complete comparison against the phone and recovery archive verification before flashing. Backups remain private; an actual restoration was not performed in this step.
- Two successful boots from internal storage: eleven Gaia and ten native checks per boot, verified boot-image readback and retained settings. Slot A is marked successful only after validating Gaia startup in the current boot.
- Generic variant without an SSH server or maintenance keys: actual boot_a flash and boot passed. The development variant was then restored on the Pixel for further work. Generic package images retain their original fresh state.
- Final checks on the standalone development boot passed for Camera (including lens switches), the Gaia keyboard and notifications.
- Local Fastboot package assembled with checksums and a qualification report. 44 targeted tests pass. It is not published yet: provenance and redistribution of some hardware components still need final review.
- Limits: qualified on one Pixel 3a, not every firmware combination; an 8 GiB volume including 1 GiB of writable data, without automatic expansion. Hardware functionality remains experimental.

### Desktop / Android · APK

- No interface changes or new binary in this step. Gaia remains shared by all three platforms.

<a id="2026-10-03-sargo-per-device-installation"></a>

## In development — 3 October 2026 — Per-device Sargo installation

### Tundra · Sargo

- Read-only collection of six boot partitions and existing storage, bound to the phone identity and slot A. Backups remain private.
- Portable device workspace: RAM builds, boot checks, installation and recovery export can use it without the development Pixel’s shared inventory. Workspace-bound builds reject implicit fallback to that inventory.
- Checked SSH transfers verify identity, storage and checksums and create files without replacing existing data. The transfer tool never formats, flashes or reboots.
- Build and transfer tested on the Pixel. First RAM boot passed eleven Gaia and ten native checks; keyboard and notifications passed. Camera testing encountered an autofocus timeout, retained in the report.
- Second boot of the same image retained the Gaia setting and passed eleven Gaia and ten native checks; camera, keyboard and notifications passed. The first autofocus timeout remains documented, not declared fixed.
- Verify return to the installed build: Gaia starts and the boot partition is unchanged. A repeated transfer correctly refuses to replace existing data.
- Refine HAL provenance: identify the installed package and download recipe and retrieve historical UBports build recipes. Exact correspondence with the old Android artifact and resolved source manifest remains unverified.
- Still limited to the qualified kernel and compatible ext4/LVM storage. This does not yet provide direct installation from stock Android.

### Desktop / Android · APK

- No interface changes or new build in this step.

<a id="2026-10-03-sargo-installation-tools"></a>

## In development — 3 October 2026 — Sargo preparation and recovery tools

### Tundra · Sargo

- Add local package preparation: verify manifest and archive checksums, bound decompression, check ext4 and create a fresh data image for each installation. Existing directories are never overwritten.
- Add a private recovery kit that can be exported outside the checkout. It retains the original boot_a backup and a standalone tool that checks model, serial number, slot and checksums before explicit restoration. It is not a user-data backup.
- Existing restoration no longer requires the diagnostic image to remain available. Backup validation is retained.
- System builds now require an explicit ARM64 hardware reference and reject display-only references or missing required services.
- Prepare the real system archive and verify the recovery kit locally. No new flash or public ROM release; automated installation on another Sargo still needs completion.

### Shared · Desktop / Android / Tundra

- Retain the shared JSON changelog in future source publications; internal Markdown working documents remain excluded.

### Desktop / Android · APK

- No functional changes or new build in this step.

<a id="2026-10-03-sargo-modem-persistence"></a>

## In development — 3 October 2026 — Sargo modem recovery and fresh installation

### Tundra · Sargo

- Rebuild the system image with the font-cache fix and creation of oFono’s private state directory on first boot.
- Limit recovery to the modem subsystem: a controlled restart went offline, recovered and registered on the network in about 22 seconds without rebooting the phone. This does not fix the firmware’s IMS watchdog root cause.
- Check Gaia startup, hardware rendering, Fira fonts, both camera sensors, focus/zoom, keyboard and visual notifications with a fresh profile. Wi-Fi scanning still works after the modem restart.
- Two successful boots retained the same Gaia setting in a separate data image. Camera, keyboard and notifications rechecked after the second boot. Installed boot partition and existing data retained.
- No new native image published: the public installation/recovery package remains unfinished.

### Desktop / Android · APK

- No shared interface changes or new APK build in this step.

<a id="2026-10-01-sargo-distribution-preparation"></a>

## October 1, 2026 — Sargo distribution preparation — in development

### Tundra · Sargo

- Rebuild Preview 15 system image with empty profiles, internal working documents excluded, license notices retained and an inventory of 493 runtime packages.
- Filesystem and content checks completed; these checks do not qualify hardware boot.
- Read-only storage inventory and mount-table generation from that inventory instead of hardcoded development-phone dimensions. Limited to a single ext4 extent on Sargo userdata; no formatting added.
- Clean image transferred and verified on the charged Pixel. Temporary RAM boot tests left boot_a unchanged; automatic return to installed v59 and Gaia startup checked.
- SIM detection, LTE registration and Wi-Fi scanning checked on this image; these checks do not establish end-to-end calling, SMS or mobile data.
- Fix first-boot font cache ownership by running fc-cache as the session user. Gaia startup, hardware rendering, Fira, both camera sensors, keyboard and visual notifications checked in RAM. Qualification of the rebuilt image remains incomplete.
- Intermittent reboot traced to modem IMS firmware; targeted recovery policy applied and another boot with LTE, camera, keyboard and notifications passed. Recovery after a new IMS crash has not been exercised. The public image remains non-flashable and unpublished.

### Desktop / APK

- No functional changes or new APK build in this step.

<a id="2.7-preview.15"></a>

## 2.7-preview.15 — 30 September 2026 — published

[Release](https://nnsprod.com/git/oversu/VulpesOS/releases/tag/v2.7-preview.15)

### Shared · Gaia / Desktop / Android / Tundra

- First shared source publication, including English/French READMEs, licenses and setup scripts. Internal documents, roadmap, profiles, keys and private images excluded from the public repository.
- Include the latest SMS fixes (bubble dates, sent/failed states) and camera lifecycle fixes. The two 30 September entries detail the hardware changes.

### Desktop PC

- Published checkout tested with Gecko 156.0.1 and a fresh profile: Gaia startup, navigation, settings, gestures, history and page isolation. 42 service tests pass; service persistence after restart checked.
- Stabilize navigation checks during normal document replacement and allow more time for cold startup. Close the host cleanly even if Gaia exceeds its preparation timeout.

### Android · APK

- Preview 15 signed with the previous Preview key, GeckoView 156.0; shared resource parity checked. Installed as an update on an Android 16 emulator.
- Photo/Gallery capture, image display and sensor resume validated. Ten background/resume cycles and recovery after renderer termination validated. This does not qualify every Android phone.

### Tundra · Sargo

- Runtime sources included; private v59 remains the build qualified on the development phone. No generic flashable ROM published: boot still depends on inventoried storage, preinstalled images and private maintenance access.
- Limits remain: approximately 16 fps camera preview, incomplete flash/video, rotation and deep suspend; call audio awaiting qualification and a large dialog after SMS sending still under investigation.

<a id="development-2026-09-30-sms-camera-followup"></a>

## In development — SMS and camera feedback · 30 September 2026

### Shared · Gaia / Desktop / Tundra

- Messages: serialize bubble dates as numbers. Fix empty conversations caused by date formatting errors. Composer flow and sent/received bubbles verified on desktop with a simulated modem.
- Camera: make release idempotent; detach videos, await sensor release and dispose of the WebGL context before switching cameras. Identify each session so an old stream cannot stop its replacement. Repeated rear/front switches produce fresh frames; Home return and sensor shutdown passed on two RAM boots.

### Tundra / Sargo

- Vibration: use the DRV2624 brightness control; the legacy activate command did not physically stop the motor. The user confirmed stopping; single-pulse, 200/200/200 ms pattern and service-stop checks all returned to zero. Add a stop command when the service starts or exits.
- The user confirms focus, zoom and SMS transport both ways on v54. Five existing conversations render on the Pixel, with message bubbles and no date errors.
- v59 installed in boot_a after two successful RAM boots; installed startup and readback verified, slot A marked successful. Desktop sources and runtime synchronized. The large dialog after a real send still needs identification; camera smoothness remains separate work.

### Android · APK

- Shared Gaia sources updated; no APK rebuilt or published.

<a id="development-2026-09-30-sms-camera"></a>

## In development — Messages and Camera · 30 September 2026

### Desktop / Tundra

- Messages now retain the message and conversation after a modem rejection and dispatch Gaia sending, failed and sent events.
- Distinguish the oFono queue from confirmed transmission; persist terminal states. Modem confirmation is not a recipient delivery receipt.
- Desktop checks cover failed messages visible in conversations, touch capture, Gallery opening and camera release/resume.

### Tundra / Sargo

- Connect touch focus areas, digital zoom and sensor JPEG capture to the original Gaia Camera. Preview stays at 640 × 480; directly measured JPEG sizes are 4032 × 3024 (12.19 MP) rear and 3264 × 2448 (7.99 MP) front. The front camera has fixed focus.
- Keep HAL logs out of the binary protocol, bound replies and resume preview after capture. A focus failure must not close the session.
- Reject SMS submission explicitly when unregistered; retain sent/failed states after the oFono object disappears. Carrier messages triggered Gaia notifications on v49 after LTE registration recovered.
- Qualification: two v54 RAM boots and the installed boot_a startup passed; image installed on the Pixel and slot marked successful after readback. Persistence, Gaia startup and Camera checks passed. Network registration remains unstable: SMS tests stopped before transmission, with no end-to-end delivery confirmed.

### Android · APK

- No APK rebuilt or published in this pass. The available Preview 14 is unchanged.

<a id="2.7-preview.14"></a>

## 2.7-preview.14 — APK published · 30 September 2026

[Release](https://nnsprod.com/git/oversu/VulpesOS/releases/tag/android-2.7-preview.14)

The Preview 14 APK is published. Desktop is up to date and the private Sargo v48 build is installed and tested; this release does not include a public phone image.

### Shared · PC / APK / Gaia

- About: remove the extra indentation in version rows above “Last updated”; alignment checked on desktop and Android.
- Fonts: normalize text font names inside Shadow DOM stylesheets, including styles added later; keep icon fonts intact.
- Calendar: month view opens without JavaScript errors in the desktop check.

### PC / Tundra

- Keyboard: use the screen orientation instead of the short keyboard frame. Keys measure about 60 CSS pixels on Pixel; rotation tested on desktop at DPR 3.
- SMS: restore the caret to the focused field when Gecko retains the recipient selection; preserve valid selections during editing.
- Gaia notifications: respect silent, no-sound and no-vibration flags, including restored notifications.

- Gaia keyboard: native input bridge, numeric SMS recipient layout, corrected selection events and protection against stale field replies. Recipient and message typing tested on desktop and Pixel; carrier delivery still requires qualification.
- Lockscreen: tolerate the absence of a keyboard window during resize.
- Native notifications: persistent application-owned entries and launch through Gaia's declared Phone entry point. Tray and lockscreen display/removal verified on Sargo; audible sound still needs qualification.

### Tundra / Sargo — v48 build installed

- Vibration: Sargo actuator bridge, patterns limited to ten seconds, non-blocking sequencing and cancellation. Driver activation and stop measured.

- Wi-Fi: private persistent profiles, autoconnect and forget operation; storage and failed-update rollback tests. Connection and reconnection after a RAM reboot verified on Sargo; private profile files (0600).
- Incoming SMS: persist before acknowledgement and deduplicate retries. Services now create their state directory at startup, fixing a mount failure reproduced on Sargo.
- Call audio: earpiece/speaker, microphone mute and call volume controls added; earpiece/speaker switching, mute and volume verified without placing a call. Two-way conversation still unverified.
- Local-debugger images cannot be flashed by the installer. v48/preview.14 written to boot_a after two RAM boots and persistence checks; installed boot verified, image readback matches and slot A marked successful. v43–v48 do not enable a debugger.

### Android · APK

- Preview.14 APK built, signed and published on Forgejo. Startup, version information, alignment and component font selection checked on an Android 16 emulator. Android retains its system keyboard.

<a id="2.7-preview.13"></a>

## 2.7-preview.13 — application workflows · 27 September 2026

### Shared · Gaia / Desktop

- Calendar: successfully scheduling a reminder no longer rejects event saving; scheduling failures reach the caller.
- Reminders: ignore deleted events and do not mark denied notifications as delivered. Native Tundra notification support remains incomplete.
- Notifications: accept empty raw text without requesting an “undefined” translation.
- Gallery: positive thumbnail size even when starting hidden; cancel preview updates after leaving the editor.
- SMS: apply correspondent, read state, date range and delivery filters; cover conversation reading and deletion.
- Deeper review: WebM playback, seeking and deletion; black-and-white photo editing and saved copy; event creation and deletion. Retain original Gaia interfaces.

- Isolated checkout qualification passes startup, desktop tests, persistence and Android packaging without rewriting sources.

### Android · APK

- Signed preview.13 APK built; Camera/Gallery, Calendar, ten background/resume cycles and renderer recovery validated on an Android 16 emulator.

### Tundra · Sargo

- Build v40/preview.13 installed after two RAM boots: Gaia, camera, Wi-Fi, brightness and controls checked; matching boot_a readback and successful slot marking. Remaining limits in `docs/APPLICATION-REVIEW.md`.

<a id="2.7-preview.12"></a>

## 2.7-preview.12 — application review · 27 September 2026

### Shared · Gaia / Desktop

- Restore original Gaia 1×–2.25× raster variants for 1,047 CSS image references.
- Camera switch becomes available after device discovery; unavailable flash stays
  visible and disabled; pinching no longer zooms the whole camera application.
- Reserve Home gestures for long press and suppress its context menu; retain Gaia's task manager.
- Relay Gaia touch gestures using unprivileged DOM events, without granting trusted
  user activation to external websites.
- Bundle the supplied bilingual, local browser welcome page and route links and
  searches into the actual browser.
- Welcome page follows the Gaia language live: `fr`/`fr-*` select French;
  all other languages select English.
- SMS: numeric identifiers, migration of older records, Date values, sent events,
  multi-recipient request shape and serialized storage writes.
- Calendar: restore the current day's accessibility label in 37 locales.
- Review 14 apps; 26 media/clock/UI checks, contact and SMS checks, plus real Web
  navigation and isolation. Scope and limitations: `docs/APPLICATION-REVIEW.md`.

### Android · APK

- Rebuild `2.7-preview.12` with the same shared UI and local welcome page; check
  payload parity. Android camera capture continues to use getUserMedia.

- Tundra hardware features are not automatically ported to Android: each platform
  retains its adapter and reports its actual capabilities.

### Tundra · Sargo

- Convert NV21 using a shader and transfer binary frames instead of base64:
  approximately 23 fps measured in RAM, versus 8 fps in the intermediate trial.
- Wait for camera worker exit before opening the other sensor.
- Manual brightness reaches its target in about 200 ms in the hardware test;
  keep screen sleep/wake fades.
- Connect Gaia Wi-Fi power settings to actual radio state; support WPA-PSK on
  mixed WPA2/WPA3 networks.
- Scan, connection and HTTPS over wlan0 validated in RAM; connection profiles are temporary.
- Wi-Fi profiles are still temporary. Flash, video, light/orientation sensors,
  Bluetooth, data counters and advanced call controls remain incomplete.
- v38 installed: two RAM boots, installed startup, `boot_a` readback, other boot
  partitions preserved and slot A marked successful.

<a id="development-2026-09-27-4"></a>

## In development — Sargo feedback and interface · 27 September 2026

### Shared · Gaia / Desktop

- Shutdown animation: three blue shades replace the orange rings; original Gaia
  dimensions, sequence and timing are preserved.

- Phone: prevent document scrolling on tab changes, keeping Recents and Contacts
  headers in place. Use Gaia’s original call-log artwork at multiple densities up to 2.25×.
- Select controls: remove the old engine offset that clipped Fira descenders.
  Video: keep the introductory text within the viewport.
- Brightness: save a number from input/change events; normalize legacy text values
  before Gaia animates the transition. Coalesce stale hardware brightness steps
  while preserving the order of sleep/wake commands.
- Home: extend wallpaper beneath the transparent gradient, reserve navigation space
  inside applications, and place Home on the right in landscape.
- Browser: editable local page at `overrides/search.gaiamobile.org/home/index.html`,
  retaining Gaia integration and private mode.
- Wi-Fi: show a scan failure and retry action instead of endless retries. Network
  discovery and results in the original Gaia panel now verified on Sargo in RAM.
- Consolidated tracking: `docs/CHANTIER.md` includes earlier and new feedback and limitations.

### Android · APK

- Build and sign `2.7-preview.11` with shared Gaia; payload parity checked.
  Place Home on the right in landscape and fix its wallpaper background.
  Check rotation and non-overlapping app/navigation bounds on Android 16 emulator.

### Tundra · Sargo

- Camera: hardware preview in Gaia, JPEG capture and rear/front switching verified
  on Sargo in RAM; sensors close on returning Home. Capture is currently limited
  to 640 × 480 (480 × 640 portrait); video and flash remain unavailable.
  Desktop and APK keep getUserMedia and share the same Gaia interface.

- v33 (`2.7-preview.11`) installed after two successful RAM boots. Installed boot, `boot_a` readback,
  data preservation and slot A success finalization verified.
- Backlight measured from Gaia: 35% → 89/255, 80% → 204/255. Wi-Fi results visible
  in the original panel. Blue shutdown rings included.
- Call audio: support PulseAudio 14 text output and prevent loading audio modules twice.
  Voice-call profile, earpiece selection and media-profile restoration verified on Sargo.
  An actual two-way conversation remains unvalidated.
- Still open: audible two-way calls, full-resolution camera capture/video and sensor-driven rotation.
  See the tracking document.

<a id="development-2026-09-27-3"></a>

## In development — native Wi-Fi stability · 27 September 2026

### Shared · Gaia / Desktop

- Fix the Wi-Fi loop with no delay: scan every 20 seconds as intended by Gaia.
  Coalesce concurrent scans. Add burst, failure and timer regression tests.
- Shared development version: `2.7-preview.9`, Gaia `2.7.0`; actual Gecko versions
  remain unchanged.

### Android · APK

- Build `2.7-preview.9` to retain shared Gaia parity. Android still manages its
  own Wi-Fi; this change does not claim to add a hardware driver to the APK.

### Tundra · Sargo

- Identify the v21/v22 failure: unbounded Python Wi-Fi scan clients exhausted
  memory, causing the lowmemorykiller to terminate Gecko. The phoc SIGSEGV occurs
  afterwards during display teardown.
- Allow one hardware scan at a time, briefly cache results and errors, invalidate
  after connect/disconnect. Application isolation and memory protection remain enabled.
- Qualify v25 through two RAM boots, then install and verify it on the Pixel:
  11 Gaia and 10 system checks pass, with no memory-pressure process kills.
  Check the Gaia lockscreen, Fira, battery, date and Wi-Fi panel; exercise
  sleep/wake and volume through injected input events.
- Verify `boot_a` by readback, preserve the other boot partitions and user data,
  and mark slot A successful. Native camera support and full call validation
  remain unfinished.

<a id="development-2026-09-27-2"></a>

## In development — Gaia restoration · 27 September 2026

### Shared · Gaia / Desktop

- Restore Gaia panels and remove temporary windows/floating controls: Settings,
  Usage, FM and contact/media import. Features without an API remain visible with
  disabled controls, without invented hardware values.
- Fix legacy style scoping: ordinary `div` selectors no longer become component
  roots. Restore lockscreen icons, retain Fira and use scalable Gaia glyphs for
  Phone tabs.
- Reserve 44 CSS pixels for Home so it cannot cover Answer/Hang up. The date uses
  its original component; battery updates reach Settings and its labels no longer
  display `{{ level }}`.
- Re-enable the original Gaia lockscreen; temporary splash uses the supplied logo,
  stable dimensions and a gentle animation. Localized name: Navigateur / Browser.
  Credits appear in Legal Information; original license notices remain.
- All 26 application checks pass (Gallery, Music, Clock, task management). Further
  desktop checks cover panels, imports, battery, date and navigation; simulated
  calls, history, sleep/wake, Power menu and volume. See `docs/GAIA-RESTORATION.md`.

### Android · APK

- Build and install `2.7-preview.8` on the Android 16 emulator with shared Gaia; read battery state from Android,
  add Android Settings at the bottom and optional Android Home mode. The Android
  application catalogue in Gaia still needs integration.
- Android checks: ten background/resume cycles and renderer termination recovery;
  shared payload parity verified. No physical Android device test in this pass.
- Imports use Gaia components; the SMS button opens Android confirmation.
  The internal lockscreen does not replace Android security.

### Tundra · Sargo

- Build v21/v22 candidates with all `overrides/` fixes in the boot payload; connect Wi-Fi
  scan/association to the Gaia panel through NetworkManager.
- RAM trials blocked: the display service exits with code 139 before qualification.
  No new flash. Restore installed v20 and verify 11 Gaia and 9 system checks with
  preserved data; restore the native profile’s previous unlocked state. Candidate
  Wi-Fi, native camera, full SIM/Bluetooth APIs and CPU suspend remain unqualified.

<a id="development-2026-09-27-1"></a>

## In development — 27 September 2026

### Shared · Gaia / Desktop

- Replace the temporary call overlay with Gaia’s original **Callscreen**:
  incoming/outgoing calls, answer, hang up and automatic close. A compatibility
  adapter supplies `mozTelephony` events to the original modules. Unsupported
  audio/conference controls remain disabled.
- Persist completed calls in the host and import them into Gaia’s original call
  log, with acknowledgement and duplicate detection after interruption.
- Connect real battery state to the original status icon; unknown is not empty.
  Handle a missing/malformed Facebook contacts index without blocking local
  number lookup or call history.
- Compare rendered font faces: home already used Fira on both platforms, but
  desktop system text partly used Noto. Main text rules now select Gaia’s
  bundled Fira face while preserving icon fonts.
- Desktop Gecko test with a simulated modem covers incoming/outgoing UI,
  answer/hang up, history, screen sleep/wake, power menu, volume and battery.
  No APK rebuilt in this step.

- Earlier v13 step (superseded above): system-owned call screen with dialing, ringing, connected state and Hang up.
  Controls remain available if the service temporarily loses call status.
- Tested in desktop Gecko with a simulated modem, including hang-up failure and
  retry. Desktop sources synchronized; no APK rebuilt.

### Tundra · Sargo

- Private v20 installed and read back in `boot_a` after two RAM boots and one
  installed boot; settings retained and slot marked successful.
- Read only Sargo’s physical Power/Volume keys and forward
  their edges to Gaia HardwareButtons. Short press sleeps/wakes the screen;
  long press opens Gaia’s menu. The restricted native broker controls backlight,
  volume, shutdown and reboot.
- Serialized brightness and power changes: concurrent requests no longer
  leave the backlight disabled while waking the screen.
- Native volume: expose the session PulseAudio socket read-only to the service;
  otherwise Gaia’s indicator changed while the audio output remained unchanged.
- Screen sleep does not suspend the kernel yet. Real incoming calls, conversation
  audio and advanced call audio controls remain to be qualified.

- Earlier step: private v13 installed in `boot_a` after two RAM boots; installed boot,
  readback and the A/B success flag verified.
- oFono call state reporting and Answer/Hang up commands restricted to modem call paths.
- Successful void D-Bus responses no longer cause a false invalid-response error.
- A short real outgoing call reached ringing and was automatically hung up.
  Conversation audio and incoming calls remain unqualified.
- Camera diagnostics no longer mistake a timeout for successful initialization.
  Libhybris detects two sensors, but the preview probe receives no frames.
  Native Gaia camera access remains unavailable.

<a id="development-2026-09-26-1"></a>

## In development — 26 September 2026

### Shared · Gaia

- Fonts: use the archived simulator’s Fira Sans OpenType files for both Gaia
  pages and Tundra system text. Fix native sans-serif fallback and add Fontconfig
  validation; icon fonts remain separate.
- Settings: remove the “Tundra settings” and “Test a notification” diagnostic
  buttons. Release information and the technical details remain available.
- Hardware panel: pass platform capabilities into the panel. An undefined variable
  used to open a Gecko alert instead of displaying battery information.

### Desktop

- Local adapter synchronized with the shared sources. Gecko remains at 156.0.1.

### Android

- Hardware panel fix is in the shared sources; no new APK has been built.

### Tundra / Sargo

- Explicit A/B boot-success finalization after installation: backed-up and checked
  GPT metadata, verified Qualcomm utility, Fastboot confirmation.
- Modem rejections distinguished from transport failures; errors shown inside Gaia.
  The unavailable native camera no longer suggests an ineffective permission change.
- Rendered-font and radio diagnostics without automatic calls or messages. Fira Sans
  confirmed on the home screen and status bar.
- Installed the v9 font build into `boot_a` on the inventoried Sargo. Written
  image verified by readback; the other five backed-up boot partitions are unchanged.
- Two boots from device storage pass 10 Gaia and 9 system checks each and retain
  settings. A PC is no longer required to boot. Droidian fallback files retained;
  actual restoration has not been tested.
- Private persistent candidate: separate 2 GiB ext4 data image, retained Gaia
  settings/profiles and system identities, no ten-minute reboot watchdog.
- Two consecutive boots of the same v8 image: 9 Gaia and 9 system checks pass on
  each boot. Separate diagnostic: 15 checks using identical shared UI files.
- Boot-a-only installation and original-boot restoration tools prepared and tested
  locally. No actual flash performed; remaining hardware limits are documented.
- Normal startup no longer opens Settings/Clock or scrolls the home screen. These
  actions now belong to the explicit `--diagnostics` mode.
- Enter fullscreen before loading Gaia and hide native window decorations. On the
  tested Pixel: 360 × 740 CSS pixels at scale 3, stable dimensions and an unchanged
  home screen throughout five post-startup samples.
- v13 RAM trial passes eight startup checks and nine system checks. Reports now
  distinguish startup observation from interactive qualification.
- Separate v14 diagnostic: thirteen interactive checks pass, including the hardware
  panel; Wi-Fi panel and scanning verified with the same UI files as normal v13.
- Interactive diagnostic images are rejected as the normal launch target. The
  earlier v13 selection is retained in the launcher history.
- Modem registered on UMTS during the trial; audio playback completed and microphone
  samples were measured without retaining a recording. In-call audio, camera and
  suspend remain unqualified.
- Ramdisk dependency discovery now runs `readelf` in the C locale, preserving the
  ARM64 dynamic loader regardless of the build machine's language.

All six A/B boot/DTBO/vbmeta partitions are unchanged. This remains a private RAM
trial, **not a flashable ROM**. See [Tundra status](tundra/docs/STATUS.md).

<a id="development-2026-09-25-1"></a>

## In development — 25 September 2026

### Shared · Gaia

- **Navigation:** a circular Home button, a black-to-transparent gradient over the wallpaper,
  and a solid blue bar inside apps. Pressing Home now changes the ring instead of leaving
  a blue rectangle over the home screen.
- **Scrolling:** the gradient disappears at the bottom of the home panel and returns when
  scrolling up. Switching between the Apps and Pages panels is supported.
- **Typography:** bundled Fira Sans fonts, with multiple weights and italics, instead of
  relying on the host system’s installed fonts.
- **Device information:** separate product, Gaia, actual engine, platform, model and adapter
  versions. The panel includes support for Tundra and hardware adaptation fields;
  connecting these to the native platform is still pending.
- **Icons:** loading resumes after an initial zero-width measurement, across desktop,
  Android and Tundra. This fix was previously limited to Android.
- **Maintenance:** this changelog brings together the three platforms’ progress.

### Desktop · Locally tested

- Tested an icon initially measured at zero width, then made visible.
- Tested Home / Settings / Home navigation, a transparent bar at the bottom, the gradient
  at the top and permission checks in an isolated profile.
- Tested the information panel in French and English, without duplicate legacy rows.
- The engine remains Gecko **156.0.1**; these UI changes do not rebuild Gecko.

### Android · Sources adapted, Java compiled

- The GeckoView / Android bridge implements the same navigation states: an overlay on Home,
  with space reserved for the bar in apps and the browser.
- Navigation state survives Android activity recreation.
- Java compilation passed. **No new APK delivered for these changes**;
  visual behaviour still needs testing on Android.

### Tundra / Sargo · Private RAM trials

- Network build v6 is the launcher reference after 13 Gaia and 9 system checks;
  automatic return and unchanged hashes of all six boot partitions verified.
- Separate Tundra backend reports Pixel 3a, Sargo adaptation and native version,
  without claiming an unimplemented camera or telephony stack.
- Real battery and charging state with a bilingual Gaia hardware panel.
  The network trial passed 13 Gaia checks, including this panel.
- Real Wi-Fi tested: scan, connection, IPv4, DNS and HTTPS in Gecko. Added
  `pd-mapper`, disabled uninitialized IPA offload and premature camera probing;
  9 system checks pass without kernel Oops. Gaia network selection is still
  pending; trial credentials remain in RAM.
- Service configuration can travel in the small ramdisk, avoiding another 3 GiB
  transfer per boot adjustment. Qualcomm trials use RAM copies of modem NV data.

- A new ext4 system image contains the ARM64 runtime, reference HALs, Phoc, Gecko and Gaia.
  The runtime is no longer loaded from the Droidian working directory, nor the HAL
  from its previous `/var/lib/lxc/android/` location.
- The second Pixel 3a trial passed **7 Gaia checks and 8 system checks**, with Tundra PID 1,
  its HAL services, compositor and Gaia.
- A physical display capture confirms home icons, loaded Fira Sans, the circular button
  and gradient. Gecko **156.0.1 ARM64**, with hardware WebRender.
- Small UI changes travel in the trial ramdisk, avoiding another 3 GiB system transfer
  for each CSS or JavaScript adjustment.
- Build sources are saved alongside new images and verified by hashes, so qualified
  images remain testable after the checkout changes.
- The latest trial (`sargo-system-boot-20260925-v5`) passes **10 Gaia checks and 8 system
  checks**, including icons, fonts, pressed Home, bottom-of-page behaviour and app return.
  Physical capture reviewed; local launcher reference updated. No APK published or phone flashed.

**Limitations:** the installed filesystem still carries the system image; writes are lost
at shutdown; the trial returns to the retained system after ten minutes. No flashing or
Droidian replacement. A warm compositor restart failed during one trial; cold boot works.
Networking, modem, audio, camera and suspend still need integration or qualification.
This is not a public installable ROM or a validated daily-use phone.

<a id="2.7-preview.7"></a>

## 2.7-preview.7 — APK built, local reference

### Shared / Desktop / Android

- Fixed internal camera allocation permission on desktop and recovery after the first
  CAMERA permission prompt on Android.
- Photo distinguishes permission denial, a missing sensor and an opening failure.
- Shared product version **2.7-preview.7**, Gaia **2.7.0**, with separate engine versions.
- Desktop Gecko **156.0.1**, Android GeckoView **156.0**: the real patch difference is
  reported rather than relabelling either engine.

<a id="2.7-preview.6"></a>

## 2.7-preview.6 — APK built

### Shared / Desktop / Android

- Ported the original Gaia Camera app: webcam preview and JPEG capture on desktop,
  or capture through GeckoView on Android.
- Photos saved in Gaia Gallery; media imports use the host system’s file picker.
- Unsupported controls disabled, including flash and video; camera switching depends
  on available sensors.

<a id="2.7-preview.5"></a>

## 2.7-preview.5 — APK built

### Shared

- Centralised versions in `release.json`, separating product, Gaia and engine versions.
- Shared native integration UI between desktop and Android; packaged common files
  checked inside the APK before distribution.

### Desktop

- Integration with available Linux settings panels, media and vCard imports,
  desktop notifications and a test webcam capture.

### Android

- Same Gaia interface and native commands as desktop, adapted to Android capabilities.
- Foreground return and recovery after rendering-process termination tested.

<a id="2.7-156.0.2"></a>

## 2.7-156.0.2 — Historical APK built (revision 4)

This historical name mixed product revision and engine version; it does not mean
that the APK used Gecko 156.0.2. Its Android engine was Gecko 156.0.

### Android

- Activity and session recovery to reduce white screens when returning to Vulpes.
- Access to Android settings, volume and window brightness.
- Media and contact imports, native notifications with permissions.
- Handoff to Android’s dialer, SMS and clock apps; no silent sending or replacement
  of the system Phone and SMS apps.
- Capture initially delegated to Android’s camera app, before the Gaia Camera port.

<a id="2.7-156.0.1"></a>

## 2.7-156.0.1 — APK published (revision 3)

- **Vulpes OS - Preview** name and project icon.
- Wallpaper flickering fix included.
- Historical numbering retained; it does not identify the Android engine’s patch version.

[Release](https://nnsprod.com/git/oversu/VulpesOS/releases/tag/android-2.7-156.0.1)

<a id="2.7-preview.2"></a>

## 2.7-preview.2 — APK published

- Fixed wallpaper flickering in the Android Preview.

[Release](https://nnsprod.com/git/oversu/VulpesOS/releases/tag/android-2.7-preview.2)

<a id="2.7-preview.1"></a>

## 2.7-preview.1 — APK published

- First Android Preview bundling Gaia and GeckoView.
- Archived version; known wallpaper flickering issue.

[Release](https://nnsprod.com/git/oversu/VulpesOS/releases/tag/android-2.7-preview.1)

<a id="history"></a>

## Earlier milestones — technical retrospective

These milestones are not newly dated public releases.

### Gaia / Desktop

- Vulpes assembled from historical Gaia: branding, wallpaper, translations and
  work on system information.
- Experimental Gecko 45 → 52 port, followed by separation of Gaia, services and
  the engine for the current Gecko host.
- Reimplementation of required APIs: settings, application registry, local contacts,
  messages, alarms, storage and inter-app communication.
- Adaptation of old UI components, simulated touch, browser and applications;
  testing of archived Firefox OS apps.
- Gecko update tools with checks, candidate engines and explicit rollback.
  They detect incompatibilities without automatically repairing them.
- Gaia launch and updates without rebuilding the whole engine.

### Tundra / Sargo

- Pixel 3a inventory, boot partition backups and USB diagnostic trials.
- QEMU trials, then ARM64 Gecko inside Droidian and under a dedicated compositor.
- Separate root, selected HAL services and Tundra PID 1; temporary graphical
  Fastboot trials with rescue SSH and automatic return.
- Reference kernel **4.9-124-google-sargo**, **Android 9 / API 28** adaptation.
