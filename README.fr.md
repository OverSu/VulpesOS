<p align="center"><a href="https://nnsprod.com/git/oversu/VulpesOS/src/branch/main/README.md">English</a> · <strong>Français</strong></p>
<p align="center"><img src="docs/media/vulpes-logo.png" width="120" alt="Vulpes OS"></p>
<h1 align="center">Vulpes OS</h1>
<p align="center">Firefox OS fork · Open source</p>

<p align="center">
<a href="https://nnsprod.com/git/oversu/VulpesOS/releases"><img src="https://img.shields.io/badge/Vulpes-2.7%20Preview%2017-0755be?style=flat-square" alt="Vulpes: 2.7 Preview 17"></a>
<img src="https://img.shields.io/badge/Gaia-2.7-0755be?style=flat-square" alt="Gaia: 2.7">
<img src="https://img.shields.io/badge/Gecko-156.0.1-0099cc?style=flat-square" alt="Gecko: 156.0.1">
<img src="https://img.shields.io/badge/Tundra-0.1.0-0099cc?style=flat-square" alt="Tundra: 0.1.0">
</p>
<p align="center">
<a href="https://nnsprod.com/git/oversu/VulpesOS/releases"><img src="https://img.shields.io/badge/Android%20APK-Available-26764a?style=flat-square" alt="Android APK: Available"></a>
<a href="#linux"><img src="https://img.shields.io/badge/Desktop-Available-26764a?style=flat-square" alt="Desktop: Available"></a>
<a href="https://vulpes-os.org/devices/pixel-3a.php?lang=fr"><img src="https://img.shields.io/badge/Native%20image-In%20development-996516?style=flat-square" alt="Native image: In development"></a>
<a href="https://vulpes-os.org/devices/pixel-3a.php?lang=fr"><img src="https://img.shields.io/badge/Pixel%203a-Bootable%20and%20usable-26764a?style=flat-square" alt="Pixel 3a: Bootable and usable"></a>
</p>

[Site](https://vulpes-os.org/?lang=fr) · [Téléchargements](https://nnsprod.com/git/oversu/VulpesOS/releases) · [Changelog](CHANGELOG.md) · [Signaler un bug](https://nnsprod.com/git/oversu/VulpesOS/issues)

Vulpes OS reprend Firefox OS pour faire fonctionner **Gaia**, son interface et ses applications HTML/CSS/JavaScript, avec un moteur **Gecko** récent.

Je développe Vulpes principalement seul, sous le nom d’OverSu, avec l’aide des personnes qui testent et contribuent au projet. **Vulpes est libre et gratuit, et le restera.** Aucun abonnement ni fonctionnalité payante n’est prévu.

<p align="center"><img src="docs/media/vulpes-desktop.png" width="280" alt="L’accueil Gaia de Vulpes OS sur ordinateur"></p>
<p align="center"><em>L’accueil de Gaia dans la version pour ordinateur.</em></p>

## Essayer Vulpes

| Plateforme | Comment l’utiliser |
| --- | --- |
| **Linux** | Lancer Gaia depuis les sources pour découvrir l’interface ou développer les applications. |
| **Android** | Installer l’[APK disponible dans les releases](https://nnsprod.com/git/oversu/VulpesOS/releases). Il fonctionne dans Android et ne remplace pas le système du téléphone. |
| **Google Pixel 3a · Sargo** | Faire fonctionner Vulpes comme système natif avec Tundra. L’image à télécharger est encore en préparation ; les fonctions testées et les limites sont décrites dans la [fiche de l’appareil](https://vulpes-os.org/devices/pixel-3a.php?lang=fr). |

Sur Pixel 3a, **Tundra démarre directement Gecko et Gaia** et assure leur accès au matériel. Droidian a servi d’environnement de test au début du projet : il n’est pas inclus dans Vulpes OS et Tundra ne repose pas dessus.

### Linux

Prérequis : Linux x86_64, Git, Python 3 et les bibliothèques système nécessaires à Firefox.

```sh
git clone https://nnsprod.com/git/oversu/VulpesOS.git
cd VulpesOS
./setup.sh
./run.sh
```

`setup.sh` télécharge le moteur Gecko prévu pour cette version et vérifie son empreinte.

### Compiler l’APK

Depuis la racine du dépôt :

```sh
cd android
./build-apk.sh
```

L’APK de développement est créé dans `android/dist/`. Une compilation personnelle utilise sa propre clé de signature : elle ne peut pas mettre à jour un APK signé avec la clé du projet.

## Participer

Vous pouvez tester Vulpes, [signaler un problème](https://nnsprod.com/git/oversu/VulpesOS/issues), améliorer les traductions ou proposer du code. Pour un bug, indiquez la plateforme, la version utilisée et les étapes pour le reproduire.

Les avancées et les comptes rendus d’essais sont dans le [changelog](CHANGELOG.md). Si vous souhaitez contribuer aux frais du projet, la page [Me soutenir](https://vulpes-os.org/support.php?lang=fr) explique à quoi sert ce soutien.

## Crédits et licences

Merci à Mozilla, aux contributeurs de Gaia, à Capyloon, Droidian, UBports, libhybris, Debian et AOSP pour le code, les outils et les travaux qui ont aidé le projet.

Les nouveaux fichiers Vulpes sont sous **MPL 2.0**. Gaia conserve sa licence **Apache 2.0** ; les autres composants conservent leurs licences et mentions. Voir [LICENSE](LICENSE), [NOTICE](NOTICE) et [la licence de Gaia](gaia/LICENSE).

Vulpes OS est un projet indépendant d’**OverSu / NNS Production**, sans affiliation avec Mozilla.
