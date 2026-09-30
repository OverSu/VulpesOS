<p align="center"><a href="https://nnsprod.com/git/oversu/VulpesOS">🇬🇧 English</a> · <strong>🇫🇷 Français</strong></p>
<p align="center"><img src="docs/media/vulpes-logo.png" width="160" alt="Logo renard de Vulpes OS"></p>
<h1 align="center">Vulpes OS</h1>
<p align="center"><strong>L'esprit de Firefox OS. Un Gecko moderne. Une base Gaia commune.</strong><br>Un projet communautaire pour retrouver une expérience mobile fondée sur le Web, sur PC, Android et téléphone natif.</p>
<p align="center">
<img src="https://img.shields.io/badge/Vulpes-2.7_preview.15-0755be?style=flat-square" alt="Vulpes Preview 15">
<img src="https://img.shields.io/badge/Gecko_bureau-156.0.1-0099cc?style=flat-square" alt="Gecko bureau 156.0.1">
<img src="https://img.shields.io/badge/Statut-Expérimental-f3a712?style=flat-square" alt="Expérimental">
</p>
<p align="center"><a href="https://vulpes-os.org">🌐 Le projet</a> · <a href="https://nnsprod.com/git/oversu/VulpesOS/releases">📦 Téléchargements</a> · <a href="https://vulpes-os.org/changelog.php">📝 Changelog</a> · <a href="https://nnsprod.com/git/oversu/VulpesOS/issues">🐞 Signaler un bug</a></p>

## 🦊 Le Web comme interface

Accueil, paramètres, appareil photo, galerie, messages : **Gaia reste l'interface**, composée de HTML, CSS et JavaScript. Vulpes adapte les API attendues par ces applications Firefox OS à un moteur Gecko moderne et à des services propres à chaque plateforme.

Ce dépôt contient désormais l'interface commune, l'hôte PC, l'application Android, le runtime Tundra et les outils de développement. C'est une **première préversion pour développeurs**, pas un système mobile terminé.

<p align="center"><img src="docs/media/vulpes-desktop.png" width="290" alt="Capture réelle du bureau Gaia en anglais"> &nbsp; <img src="docs/media/vulpes-gecko.png" width="290" alt="Capture réelle des informations système et du moteur Gecko"></p>
<p align="center"><em>Captures de l'environnement de développement PC. Les fonctionnalités dépendent de la plateforme et du matériel disponible.</em></p>

## 📥 Choisissez votre plateforme

| Plateforme | Disponible aujourd'hui | Moteur |
| --- | --- | --- |
| **PC Linux** | Sources, fenêtre Gaia au format téléphone, développement et tests d'applications | Gecko **156.0.1** |
| **APK Android** | Preview installable ; Android et ses permissions restent en dessous | GeckoView **156.0** |
| **Pixel 3a · Sargo** | Sources Tundra ; build natif de développement testé sur notre appareil | Gecko **156.0.1** ARM64 |

### Android — Preview 15

Téléchargez l'APK et `SHA256SUMS.txt` depuis [la release Preview 15](https://nnsprod.com/git/oversu/VulpesOS/releases/tag/v2.7-preview.15). Une installation par-dessus une ancienne Preview Vulpes signée conserve ses données.

- Minimum déclaré : **Android 8 / API 26**. Cible : **API 37**.
- APK universel : **ARM64, ARMv7 et x86_64** ; environ **600 Mio**, moteur GeckoView inclus.
- Photo et Galerie utilisent Gaia, avec les permissions et l'import de fichiers Android.
- Les appels et SMS sont transmis aux applications Android ; Vulpes n'est pas l'application Téléphone/SMS par défaut.
- Des parcours sur émulateur Android 16 sont testés. Le minimum SDK déclaré ne signifie pas que tous les appareils Android ont été validés.
- Il s'agit d'un **build de développement signé**, avec débogage Gecko accessible via ADB autorisé, pas d'une application durcie pour la production.

### Linux — lancer depuis les sources

Prérequis : Linux x86_64, Python 3, Git et les bibliothèques système nécessaires à Firefox. Sur Debian/Ubuntu : `git python3 libgtk-3-0 libdbus-glib-1-2 libasound2` (les noms de paquets peuvent varier selon la distribution).

```sh
git clone https://nnsprod.com/git/oversu/VulpesOS.git
cd VulpesOS
./setup.sh
./run.sh
```

`setup.sh` télécharge le moteur Mozilla verrouillé et vérifie son empreinte. Le lancement normal ouvre Gaia sans débogueur. Les profils et moteurs téléchargés restent hors Git.

### Pixel 3a — développement natif Tundra

**Tundra démarre directement Gecko et Gaia**, avec un espace utilisateur Linux et les services matériels Android sélectionnés pour l’appareil.

Notre image de développement Sargo installée a passé les contrôles de démarrage et de persistance. Des appels réels et des SMS dans les deux sens ont été observés ; les derniers essais couvrent les conversations, les bascules de capteur photo, la capture JPEG pleine résolution, le focus tactile, le zoom numérique et l'arrêt du vibreur.

**Cette release ne contient pas d'image générique à flasher.** Le boot privé dépend encore de la disposition du stockage du téléphone inventorié, d'images système/données déjà déployées et d'accès de maintenance. Publier ce fichier ne fournirait pas une installation fonctionnelle à un autre Pixel. Les recettes Tundra sont incluses pour les contributeurs ; elles nécessitent un inventaire, des sauvegardes vérifiées et des composants matériels fournis localement. Ne réutilisez pas la sauvegarde d'un autre appareil et ne considérez pas un boot isolé comme une ROM complète.

## ✨ Ce que nous partageons

- **Une base Gaia :** interface et services communs pour PC, Android et Tundra.
- **Les applications d'origine :** Photo, Galerie, Paramètres et Messages conservent leur interface Gaia, reliée aux adaptateurs de chaque plateforme.
- **Du code Web éditable :** les ressources servies sont dans `assets/webapps/`, la compatibilité commune dans `host/`, les remplacements dans `overrides/`. Rechargez ou redémarrez pour tester, sans recompiler Gecko. Certaines sources historiques de `gaia/` nécessitent encore la mise à jour de leur version regroupée.
- **Un moteur remplaçable :** téléchargements verrouillés, contrôle d'empreinte, tests isolés et outils de retour arrière. Une mise à jour du moteur se teste et se sélectionne explicitement ; la compatibilité n'est pas garantie automatiquement.
- **Des versions distinctes :** Vulpes, Gaia, Gecko et adaptation matérielle sont identifiés séparément. GeckoView 156.0 n'est pas présenté comme Gecko bureau 156.0.1.

## 🧪 Limites actuelles

Cette Preview contient des adaptateurs matériels incomplets et des comportements hérités à corriger. Sur Sargo, l'aperçu photo tourne autour de 16 images/s ; flash/vidéo, rotation automatique par capteur et suspension complète restent incomplets. L'enregistrement réseau peut être instable et l'audio d'une conversation dans les deux sens reste à qualifier. Un grand dialogue signalé après envoi de SMS est encore en cours d'analyse.

Sur Android, les intégrations suivent les permissions et les restrictions de cycle de vie du système. Les alarmes Gaia ne sont pas garanties après l'arrêt de Vulpes par Android. Certaines commandes non prises en charge restent visibles mais désactivées. Des applications de développement/test sont incluses.

Conservez une sauvegarde avant vos essais. Pour signaler un problème, indiquez la plateforme, les versions Vulpes/Gecko et les étapes de reproduction ; retirez des logs les numéros, contacts et autres informations personnelles.

## 🛠️ Construire l'APK Android

```sh
cd android
./build-apk.sh
```

Le script installe les outils verrouillés, prépare les ressources Gaia communes et construit un APK de développement signé dans `android/dist/`. L'acceptation des licences SDK Android peut être nécessaire. Un clone neuf génère sa propre clé de signature : il ne pourra pas mettre à jour un APK signé avec la clé privée du projet.

## 📜 Remerciements et licences

Vulpes OS est un projet communautaire d'**OverSu / NNS Production**, inspiré de Firefox OS. Merci à **Mozilla, aux contributeurs Gaia, à Capyloon, Droidian, UBports, libhybris, Debian, AOSP** et aux communautés qui font vivre les systèmes mobiles ouverts.

Les nouveaux fichiers Vulpes utilisent **MPL 2.0**. Gaia conserve **Apache 2.0** ; les composants hérités conservent leurs licences et mentions. Voir [LICENSE](LICENSE), [NOTICE](NOTICE) et [la licence Gaia](gaia/LICENSE). Les forks doivent conserver les mentions d'attribution et de licence applicables.

Vulpes OS est indépendant de Mozilla et n'est pas une version officielle de Firefox OS.
