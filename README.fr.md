<p align="center">
  <a href="https://nnsprod.com/git/oversu/VulpesOS" lang="en" hreflang="en">🇬🇧 English</a> · <a href="https://nnsprod.com/git/oversu/VulpesOS/src/branch/main/README.fr.md" lang="fr" hreflang="fr"><strong>🇫🇷 Français</strong></a>
</p>

<p align="center">
  <img src="docs/media/vulpes-logo.png" width="160" alt="Logo Vulpes OS — un renard blanc et bleu">
</p>

<h1 align="center">Vulpes OS</h1>

<p align="center">
  <strong>L’esprit Firefox OS. Un moteur Gecko d’aujourd’hui.</strong><br>
  A community continuation of Firefox OS.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Vulpes-2.7-0755be?style=flat-square" alt="Vulpes 2.7">
  <img src="https://img.shields.io/badge/Gecko_desktop-156.0.1-0099cc?style=flat-square" alt="Gecko desktop 156.0.1">
  <img src="https://img.shields.io/badge/Statut-Preview-f3a712?style=flat-square" alt="Statut : Preview">
  <img src="https://img.shields.io/badge/Plateformes-Linux_%C2%B7_Android-334155?style=flat-square" alt="Linux et Android">
</p>

<p align="center">
  <a href="https://vulpes-os.org"><strong>🌐 Découvrir le projet</strong></a>
  &nbsp; · &nbsp;
  <a href="#telechargements"><strong>📥 APK Android</strong></a>
  &nbsp; · &nbsp;
  <a href="#points-forts">Les points forts</a>
  &nbsp; · &nbsp;
  <a href="#architecture">L’architecture</a>
  &nbsp; · &nbsp;
  <a href="#suite">La suite</a>
</p>

---

## 🦊 Le Web comme plateforme d’applications

Et si l’interface de votre téléphone était faite avec les mêmes technologies que vos sites web ?

**Vulpes redonne vie à cette idée de Firefox OS.** L’accueil, les paramètres et les applications Gaia retrouvent un environnement d’exécution sur un Gecko récent. HTML, CSS et JavaScript restent au cœur de l’expérience : une interface que l’on peut lire, comprendre et modifier.

Le projet relie deux générations : **les applications et l’interface historiques de Firefox OS**, et **le moteur web maintenu par Mozilla**. Son ambition est de faire évoluer l’un sans devoir réécrire l’autre à chaque version.

**Un seul projet, deux façons de l’utiliser : l’émulateur desktop Linux et l’application Android Vulpes OS - Preview (APK).** Ils partagent Gaia et les services Vulpes, avec une intégration Gecko adaptée à chaque plateforme.

> **Publication en cours :** les trois Preview Android sont préparées pour les Releases ; leur mise en ligne attend le relèvement de la limite de taille des fichiers sur le serveur. Les sources complètes, la distribution desktop et leurs instructions d’installation sont en préparation. Les captures ci-dessous montrent le prototype desktop.

<p align="center">
  <a href="https://nnsprod.com/git/oversu/VulpesOS/media/branch/main/docs/media/vulpes-desktop.png"><img src="docs/media/vulpes-desktop.png" width="300" alt="Capture réelle de Vulpes : accueil Gaia en anglais"></a>
  &nbsp;
  <a href="https://nnsprod.com/git/oversu/VulpesOS/media/branch/main/docs/media/vulpes-gecko.png"><img src="docs/media/vulpes-gecko.png" width="300" alt="Paramètres Vulpes en anglais, affichant la version réelle du moteur Gecko"></a>
</p>

<p align="center"><em>Accueil et informations système — captures réelles du prototype desktop en anglais. Le champ « Platform Version » affiche la version Gecko renvoyée par le moteur exécuté. Cliquer sur une image pour l’agrandir.</em></p>

<a name="telechargements"></a>

## 📥 Les versions Android

**Version à privilégier : Vulpes OS - Preview 2.7-156.0.1**, la plus récente des trois versions. Les APK seront publiés dans les [Releases](https://nnsprod.com/git/oversu/VulpesOS/releases), avec les notes FR/EN et un fichier de contrôle `SHA256SUMS.txt`. **Téléchargements en attente de mise en ligne.**

| Version | Contenu | Usage |
| :--- | :--- | :--- |
| 2.7-156.0.1 | Nom et icône Vulpes OS - Preview ; correctif du fond d’écran inclus | **Preview conseillée** |
| 2.7-preview.2 | Correction du fond d’écran clignotant | Archive |
| 2.7-preview.1 | Première Preview Android | Archive — clignotement du fond d’écran connu |

Une fois publié, l’APK s’installe en ouvrant le fichier sur Android. Les versions successives conservent le même identifiant et la même signature : une mise à jour par-dessus la précédente permet de garder les données.

- **Android 8.0 / API 26 minimum déclaré.** Validation sur un émulateur Android 16 / API 36 ; les autres configurations restent à tester.
- **Environ 592 Mio par APK**, avec les architectures ARM64, ARM 32 bits et x86_64 intégrées.
- **Preview de développement :** elle ne remplace pas Android et ne fournit pas les appels/SMS cellulaires. L’import des médias Android reste à porter.
- **Desktop Linux :** environnement de développement distinct, encore sans distribution publique prête à installer. Ce simulateur affiche Gaia ; il n’émule pas tout le matériel d’un téléphone.

Les APK seront joints aux Releases, sans alourdir l’historique Git. Les tags de ces versions historiques identifieront leurs téléchargements ; ils ne représenteront pas encore leurs sources de compilation complètes.

<a name="points-forts"></a>

## ✨ Ce qui rend Vulpes intéressant

### 🔄 Un moteur qui peut évoluer

Le passage de Gecko 45 à 52 a servi de première étape. Le prototype desktop utilise maintenant **Gecko 156.0.1** avec une architecture qui sépare l’interface, les services et l’intégration au moteur.

Un outil automatise le téléchargement d’une version candidate, le contrôle de son empreinte et les tests de compatibilité. Le basculement reste explicite et un retour arrière est prévu. Les incompatibilités sont détectées et documentées ; elles ne sont pas réparées automatiquement.

### 🧩 Faire vivre les applications Firefox OS

Vulpes adapte les anciennes API dont Gaia a besoin : réglages, registre des applications, contacts locaux, stockage et communications entre applications. Le travail porte sur leur fonctionnement, leurs permissions et leurs données persistantes.

Des essais avec des applications historiques accompagnent le portage. **La compatibilité progresse application par application** : la présence d’une ancienne API ne garantit pas encore le fonctionnement de tout le catalogue Firefox OS.

### 🛠️ Modifier l’interface sans reconstruire Gecko

Une grande partie de l’interface se travaille dans les fichiers HTML, CSS et JavaScript. Les ressources servies et les surcharges peuvent être modifiées puis rechargées, sans recompiler le moteur.

Certaines applications conservent des bundles issus de l’ancien système de construction Gaia. Leur modification demande de vérifier quel fichier est réellement chargé : tous les fichiers des sources historiques ne sont pas encore reliés directement à l’interface exécutée.

### 📱 Deux façons d’explorer le projet

- **Sur Linux :** une fenêtre au format téléphone, avec Gaia, le multitâche et un navigateur utilisant des vues Gecko séparées.
- **Sur Android :** **Vulpes OS – Preview**, une application GeckoView pour découvrir l’expérience sans remplacer le système du téléphone.

La Preview Android est un terrain d’essai. Elle n’est pas une ROM et ne remplace pas les fonctions de téléphonie d’Android.

## 🧪 Où en est le prototype ?

| Fonction | Desktop Linux | Preview Android |
| :--- | :--- | :--- |
| Accueil Gaia, lancement des applications | ✅ Fonctionnel | ✅ Disponible |
| Réglages persistants et interface traduite | ✅ Parcours testés | ✅ Intégrés, validation mobile à poursuivre |
| Navigation web | ✅ Vues Gecko séparées | ✅ Sessions GeckoView séparées |
| Contacts | ✅ Contacts locaux au profil | ✅ Contacts locaux à Vulpes |
| SMS | 🧪 Interface et brouillons locaux | 🧪 Interface locale |
| Galerie et musique | ✅ Import et lecture testés | 🚧 Import des médias Android à porter |
| Alarmes | ✅ Création, déclenchement et persistance testés | 🧪 Liées à la durée de vie du processus Vulpes |
| Appels et SMS sur le réseau mobile | 🚧 Non intégrés | 🚧 Non intégrés |
| Installation comme système de téléphone | 🚧 Futur chantier | 🚧 L’APK ne remplace pas Android |

**Versions de référence — septembre 2026**

| Élément | Version |
| :--- | :--- |
| Produit communautaire | Vulpes OS 2.7 |
| Moteur desktop | Gecko 156.0.1 |
| Application Android | Preview 2.7-156.0.1 |
| Dépendance GeckoView | `156.0.20260921121718` |
| Minimum Android déclaré | Android 8.0 · API 26 |

La version de l’APK, celle du moteur et celle du produit sont distinctes. Le `.1` final de la Preview désigne sa révision ; GeckoView rapporte ici **156.0**. Le minimum Android déclaré ne signifie pas que chaque appareil a été testé.

<a name="architecture"></a>

## ⚙️ Sous le capot

```text
                 Gaia + applications web
                    HTML · CSS · JS
                           │
            Compatibilité des anciennes API moz*
                  Contrats Vulpes versionnés
                           │
       Réglages · Applications · Contacts · Stockage
              Messages locaux · Alarmes
                           │
              ┌────────────┴────────────┐
              │                         │
        Hôte desktop              Hôte Android
      Fenêtre privilégiée       GeckoView + passerelle
      et vues web séparées        WebExtension/native
              │                         │
       Firefox / Gecko                GeckoView
              │                         │
            Linux                     Android
```

### Une frontière claire entre les applications et le système

Les applications passent par des services dont les permissions sont contrôlées par l’hôte. Les pages web externes utilisent des contextes de navigation séparés et n’obtiennent pas les API privilégiées de Vulpes.

Le port desktop actuel s’appuie sur le **binaire officiel de Firefox**, avec un hôte et des adaptateurs Vulpes, sans modification native du moteur. Certaines interfaces utilisées par cet hôte restent internes à Gecko : les tests à chaque changement de version sont donc essentiels.

### Des mises à jour vérifiées avant activation

```text
Télécharger → Vérifier l’empreinte → Tester les interfaces
                                         ↓
Ancien moteur conservé ← Activer ← Tester Gaia et la persistance
```

Les profils de test sont séparés des données utilisateur. L’outil conserve l’ancien moteur et son profil pour permettre un retour arrière. Le pipeline concerne aujourd’hui le desktop ; les mises à jour Android suivent le cycle de construction de l’APK.

### Une base de travail testée

Les contrôles automatisés couvrent notamment :

- le démarrage de la vraie interface Gaia et le chargement des icônes ;
- les langues, les réglages et la persistance après redémarrage ;
- les contacts, le pavé numérique et le compositeur SMS ;
- les médias importés, les alarmes et la navigation ;
- les refus d’accès lorsque l’origine ou les permissions ne conviennent pas.

Un export des fichiers prévus pour publication a également démarré et passé les tests desktop sans les anciens dossiers de développement. Le packaging Android et la compilation de l’APK ont été vérifiés. Cela ne constitue pas une validation exhaustive de Firefox OS ni de tous les téléphones Android.

<a name="suite"></a>

## 🗺️ La suite

- **Publier une base autonome :** sources, licences, documentation et procédure de démarrage.
- **Consolider la compatibilité :** poursuivre les essais d’applications historiques et les corrections des parcours du quotidien.
- **Améliorer la Preview Android :** accès aux médias, intégration à la plateforme et retours d’usage sur appareils réels.
- **Réduire le coût des mises à jour Gecko :** maintenir des contrats stables et limiter les adaptations propres au moteur.
- **Explorer un véritable port mobile :** matériel, modem, pilotes et intégration système, une fois la base consolidée.

## 🤝 Participer

Les retours utiles décrivent **l’appareil ou la distribution Linux, la version utilisée, les étapes pour reproduire le problème et le résultat attendu**. Une capture et un extrait de journal sans données personnelles aident beaucoup.

Le projet a aussi besoin de contributions en JavaScript, CSS, intégration Gecko/GeckoView, tests, traduction et documentation. Les consignes de contribution accompagneront la publication des sources.

## 📜 Origines et licences

Vulpes est construit à partir du travail de Mozilla et des contributeurs de **Boot to Gecko / Firefox OS**, notamment Gaia.

La licence retenue pour les nouveaux fichiers Vulpes est la **Mozilla Public License 2.0 (`MPL-2.0`)**. Gaia et les autres composants hérités conservent leurs licences, notamment **Apache 2.0** pour la base Gaia, ainsi que leurs mentions d’attribution. Les textes de licence et le détail des composants accompagneront la publication des sources.

---

<p align="center">
  <strong>VULPES</strong><br>
  Firefox OS Community Project<br><br>
  <a href="https://vulpes-os.org">vulpes-os.org</a>
</p>

<p align="center">
  <sub>Vulpes est un projet communautaire indépendant, sans affiliation ni approbation de Mozilla.<br>
  Vulpes is an independent community project and is not affiliated with or endorsed by Mozilla.</sub>
</p>
