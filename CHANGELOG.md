# Journal des modifications — Vulpes OS

[English](CHANGELOG.en.md)

Les nouveautés, par date et par plateforme. Dans chaque groupe : Add, Change, Fix, Note, Test. Les entrées décrivent la situation à leur date ; une correction en développement nécessite une nouvelle version installée.

<a id="2.7-preview.22"></a>

## 22/10/2026 : 2.7-preview.22

![Publié](https://img.shields.io/badge/Publi%C3%A9-334155?style=flat-square)

### ![Toutes les plateformes](https://img.shields.io/badge/Toutes%20les%20plateformes-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Partage](https://img.shields.io/badge/Partage-475569?style=flat-square) : Le bouton Partager du navigateur propose Messages et Courrier ; le clavier se masque pour laisser le choix accessible.

### ![PC](https://img.shields.io/badge/PC-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Saisie web](https://img.shields.io/badge/Saisie%20web-475569?style=flat-square) : Le focus des champs et listes web est rétabli dans le navigateur PC.
- ![Test](https://img.shields.io/badge/Test-6B7280?style=flat-square) ![Navigateur](https://img.shields.io/badge/Navigateur-475569?style=flat-square) : Premier appui, saisie, sélecteurs et partage vers un brouillon Messages contrôlés sur PC.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Mise à jour](https://img.shields.io/badge/Mise%20%C3%A0%20jour-475569?style=flat-square) : APK Preview 22 construit avec les corrections Gaia communes et une version Android incrémentée.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Démarrage](https://img.shields.io/badge/D%C3%A9marrage-475569?style=flat-square) : Un message GeckoView de restauration de session apparaît au premier lancement de l’émulateur ; Gaia atteint néanmoins l’accueil sans plantage.
- ![Test](https://img.shields.io/badge/Test-6B7280?style=flat-square) ![Installation](https://img.shields.io/badge/Installation-475569?style=flat-square) : Installation de la Preview 21 puis mise à jour vers la 22 réussies sur Android 11 en émulation ; Gaia démarre sur l’accueil. Les téléphones signalés restent à qualifier, dont le Pixel 4.

### ![Tundra / Nokia 2720 Flip](https://img.shields.io/badge/Tundra%20%2F%20Nokia%202720%20Flip-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Clavier](https://img.shields.io/badge/Clavier-475569?style=flat-square) : Première saisie T9 hors ligne avec les lexiques Gaia. Qualification physique du clavier encore nécessaire.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Réseau](https://img.shields.io/badge/R%C3%A9seau-475569?style=flat-square) : Wi-Fi, reconnexion et cycle du mode avion vérifiés en session RAM ; les contrôles Gaia suivent l’état matériel.


### ![Pixel 3a / Sargo](https://img.shields.io/badge/Pixel%203a%20%2F%20Sargo-2563EB?style=flat-square)

- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Image native](https://img.shields.io/badge/Image%20native-475569?style=flat-square) : Cette release ne contient pas de nouvelle image Pixel. La Preview 21 reste la dernière image publiée ; les changements de cette Preview ne sont pas installés sur le téléphone.

<a id="development-2026-10-20-web-nokia"></a>

## 20/10/2026 : Correctifs en préparation pour Preview 22

### ![Toutes les plateformes](https://img.shields.io/badge/Toutes%20les%20plateformes-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Navigateur](https://img.shields.io/badge/Navigateur-475569?style=flat-square) : Le bouton Partager ouvre le choix Messages ou Courrier. Le clavier ne recouvre plus ce choix.

### ![PC / Tundra](https://img.shields.io/badge/PC%20%2F%20Tundra-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Navigateur](https://img.shields.io/badge/Navigateur-475569?style=flat-square) : Les listes déroulantes web retrouvent le focus nécessaire à leur ouverture.
- ![Test](https://img.shields.io/badge/Test-6B7280?style=flat-square) ![Saisie](https://img.shields.io/badge/Saisie-475569?style=flat-square) : Premier appui, champs web, sélecteurs et partage vers un brouillon Messages vérifiés sur PC. Retest Pixel à faire.

### ![Android / APK](https://img.shields.io/badge/APK-2563EB?style=flat-square)

- ![Test](https://img.shields.io/badge/Test-6B7280?style=flat-square) ![Installation](https://img.shields.io/badge/Installation-475569?style=flat-square) : Mise à jour de Preview 20 vers Preview 21 réussie sur Android 11 en émulation. Le refus signalé sur Pixel 4 reste à diagnostiquer.

### ![Tundra / Nokia 2720 Flip](https://img.shields.io/badge/Tundra%20%2F%20Nokia%202720%20Flip-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-13A37D?style=flat-square) ![Clavier T9](https://img.shields.io/badge/Clavier%20T9-475569?style=flat-square) : Première implémentation Nokia hors ligne, avec les 42 lexiques Gaia. Qualification physique à faire clapet ouvert.
- ![Change](https://img.shields.io/badge/Change-52748B?style=flat-square) ![Développement](https://img.shields.io/badge/D%C3%A9veloppement-475569?style=flat-square) : Le lanceur synchronise désormais l’ensemble des fichiers Gaia communs, en conservant les données du téléphone.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Mode avion](https://img.shields.io/badge/Mode%20avion-475569?style=flat-square) : Gaia commande maintenant la coupure et la réactivation du modem Nokia. Les anciens états réseau ne font plus annuler le mode avion.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Wi-Fi](https://img.shields.io/badge/Wi--Fi-475569?style=flat-square) : Le lancement Nokia en mode téléphone expose bien le broker Wi-Fi à Gaia. Recherche de réseaux, coupure/réactivation, reconnexion au réseau enregistré et accès HTTPS vérifiés en session RAM.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) : La sélection des listes web avec la touche OK reste à corriger et qualifier.
- ![Test](https://img.shields.io/badge/Test-6B7280?style=flat-square) ![Matériel](https://img.shields.io/badge/Mat%C3%A9riel-475569?style=flat-square) : Wi-Fi et reconnexion, volume avec indicateur Gaia, luminosité et arrêt du vibreur vérifiés sur le Nokia. SIM reconnue et LTE observée.
- ![Test](https://img.shields.io/badge/Test-6B7280?style=flat-square) ![Réseau](https://img.shields.io/badge/R%C3%A9seau-475569?style=flat-square) : Cycle mode avion vérifié sur Nokia : radios et Wi-Fi coupés, puis réactivés avec retour sur le réseau LTE.
- ![Test](https://img.shields.io/badge/Test-6B7280?style=flat-square) ![Médias](https://img.shields.io/badge/M%C3%A9dias-475569?style=flat-square) : Le lanceur copie un morceau Ogg et une vidéo WebM de test dans Musique et Vidéo à chaque démarrage RAM ; les deux fichiers sont lisibles par les applications Gaia.

<a id="development-2026-10-18-nokia-radio-timeout"></a>

## 18/10/2026 : Attente réseau sur Nokia

### ![Tundra / Nokia 2720 Flip](https://img.shields.io/badge/Tundra%20%2F%20Nokia%202720%20Flip-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Téléphone](https://img.shields.io/badge/T%C3%A9l%C3%A9phone-475569?style=flat-square) : Attente de l’état des appels raccourcie lorsque le modem ne répond plus ; les requêtes identiques ne s’accumulent plus. Message d’erreur clarifié.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Réseau](https://img.shields.io/badge/R%C3%A9seau-475569?style=flat-square) : La cause des silences du modem et le passage d’un nouvel appel réel restent à vérifier.

<a id="development-2026-10-18-forgejo-fixes"></a>

## 18/10/2026 : Correctifs Forgejo — en développement

### ![Toutes les plateformes](https://img.shields.io/badge/Toutes%20les%20plateformes-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Galerie](https://img.shields.io/badge/Galerie-475569?style=flat-square) : Orientation des photos corrigée ; partage vers Messages ou Courrier et fond du panneau vide rétablis.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Langues](https://img.shields.io/badge/Langues-475569?style=flat-square) : Un changement de langue ne revient plus à une ancienne sélection. Affichage des noms de langues complété.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Marketplace](https://img.shields.io/badge/Marketplace-475569?style=flat-square) : Bouton Installer du catalogue FFAA raccordé pour les applications empaquetées, avec confirmation avant installation.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Personnalisation](https://img.shields.io/badge/Personnalisation-475569?style=flat-square) : Fonds d’écran Gaia remplacés par leurs originaux de meilleure résolution.

### ![PC / Tundra](https://img.shields.io/badge/PC%20%2F%20Tundra-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Clavier](https://img.shields.io/badge/Clavier-475569?style=flat-square) : Saisie avec le clavier Gaia dans la recherche du Marketplace, y compris après une navigation web.

### ![Tundra / Pixel 3a](https://img.shields.io/badge/Tundra%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Autonomie](https://img.shields.io/badge/Autonomie-475569?style=flat-square) : Échanges avec le matériel allégés au repos ; mesure d’autonomie sur une journée encore nécessaire.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Caméra](https://img.shields.io/badge/Cam%C3%A9ra-475569?style=flat-square) : Mode vidéo accessible et lisible ; flash raccordé aux capacités réelles du capteur.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Date et heure](https://img.shields.io/badge/Date%20et%20heure-475569?style=flat-square) : Heure conservée après redémarrage même quand l’horloge matérielle est incorrecte.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Vibration](https://img.shields.io/badge/Vibration-475569?style=flat-square) : Déclenchement et arrêt des impulsions corrigés.
- ![Test](https://img.shields.io/badge/Test-8B5CF6?style=flat-square) ![Caméra](https://img.shields.io/badge/Cam%C3%A9ra-475569?style=flat-square) : Photo de 12 Mpx, changement avant/arrière et lecture d’une courte vidéo vérifiés sur le Pixel.

### ![Toutes les plateformes — Tests](https://img.shields.io/badge/%C3%89tat%20des%20tests-2563EB?style=flat-square)

- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Validation](https://img.shields.io/badge/Validation-475569?style=flat-square) : Correctifs non publiés. Les cas Motorola, l’autonomie prolongée, le son des vidéos et le réveil restent à qualifier. L’OTA complet et les applications FFAA hébergées restent à développer.

<a id="development-2026-10-18-nokia-settings-keypad"></a>

## 18/10/2026 : Navigation dans les Paramètres du Nokia

### ![Tundra / Nokia 2720 Flip](https://img.shields.io/badge/Tundra%20%2F%20Nokia%202720%20Flip-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Paramètres](https://img.shields.io/badge/Param%C3%A8tres-475569?style=flat-square) : Mode avion et Géolocalisation accessibles avec Haut/Bas. La touche OK actionne les interrupteurs et cases à cocher Gaia ; les commandes désactivées restent ignorées.

<a id="development-2026-10-18-nokia-fluidity"></a>

## 18/10/2026 : Fluidité du Nokia 2720 Flip

### ![Tundra / Nokia 2720 Flip](https://img.shields.io/badge/Tundra%20%2F%20Nokia%202720%20Flip-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Fluidité](https://img.shields.io/badge/Fluidit%C3%A9-475569?style=flat-square) : Échanges avec le matériel allégés pour réduire la charge du processeur et laisser plus de place à l’interface.

<a id="development-2026-10-18-nokia-wifi"></a>

## 18/10/2026 : Wi-Fi sur Nokia 2720 Flip

### ![Tundra / Nokia 2720 Flip](https://img.shields.io/badge/Tundra%20%2F%20Nokia%202720%20Flip-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-238636?style=flat-square) ![Wi-Fi](https://img.shields.io/badge/Wi--Fi-475569?style=flat-square) : Recherche des réseaux, activation et connexion depuis les Paramètres Gaia. Les réseaux enregistrés peuvent être réutilisés sans ressaisir le mot de passe.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Wi-Fi](https://img.shields.io/badge/Wi--Fi-475569?style=flat-square) : Accès Internet du navigateur et remise en place de la connexion après une coupure du Wi-Fi. L’état affiché suit les reconnexions.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Wi-Fi](https://img.shields.io/badge/Wi--Fi-475569?style=flat-square) : Réseaux ouverts et WPA/WPA2 personnels pris en charge. Réseaux d’entreprise, WPS et partage de connexion restent à intégrer sur le Nokia.

### ![Toutes les plateformes](https://img.shields.io/badge/PC%20%2F%20APK%20%2F%20Tundra-475569?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Wi-Fi](https://img.shields.io/badge/Wi--Fi-475569?style=flat-square) : Le panneau Wi-Fi affiche les résultats même si le signal arrive avant la liste. Les réseaux enregistrés non détectés sont indiqués hors de portée.

<a id="development-2026-10-18-nokia-browser-keypad"></a>

## 18/10/2026 : Navigation au clavier sur Nokia 2720 Flip

### ![Tundra / Nokia 2720 Flip](https://img.shields.io/badge/Tundra%20%2F%20Nokia%202720%20Flip-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Navigateur](https://img.shields.io/badge/Navigateur-475569?style=flat-square) : Accès à la barre d’adresse avec Haut puis OK, saisie au pavé numérique et validation. Retour ferme la saisie ; Bas revient au contenu. La barre reste accessible sur les pages web et les erreurs réseau.

<a id="development-2026-10-18-nokia-appearance-privacy"></a>

## 18/10/2026 : Personnalisation du Nokia et confidentialité

### ![Toutes les plateformes](https://img.shields.io/badge/Toutes%20les%20plateformes-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Navigateur](https://img.shields.io/badge/Navigateur-475569?style=flat-square) : Protection contre le pistage activée par défaut ; suppression du rappel de présentation au lancement.

### ![Tundra / Nokia 2720 Flip](https://img.shields.io/badge/Tundra%20%2F%20Nokia%202720%20Flip-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-2F855A?style=flat-square) ![Écran extérieur](https://img.shields.io/badge/%C3%89cran%20ext%C3%A9rieur-475569?style=flat-square) : Ajout du rouge, orange, violet, cyan, turquoise et gris.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Interface](https://img.shields.io/badge/Interface-475569?style=flat-square) : Transitions décoratives quasi instantanées sur le Nokia ; animations de chargement conservées.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Accueil](https://img.shields.io/badge/Accueil-475569?style=flat-square) : La barre d’état utilise le même assombrissement que le fond de l’accueil.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Écran extérieur](https://img.shields.io/badge/%C3%89cran%20ext%C3%A9rieur-475569?style=flat-square) : Le texte personnalisé se sauvegarde après la saisie, sans devoir quitter le champ.

<a id="development-2026-10-18-nokia-closed-start"></a>

## 18/10/2026 : Clapet et touches du Nokia 2720 Flip

### ![Tundra / Nokia 2720 Flip](https://img.shields.io/badge/Tundra%20%2F%20Nokia%202720%20Flip-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-2F855A?style=flat-square) ![Notifications](https://img.shields.io/badge/Notifications-475569?style=flat-square) : La touche dédiée ouvre et ferme le volet de notifications Gaia.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Affichage](https://img.shields.io/badge/Affichage-475569?style=flat-square) : L’écran externe est activé au lancement téléphone fermé, sans devoir ouvrir le clapet auparavant.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Volume](https://img.shields.io/badge/Volume-475569?style=flat-square) : Les touches de volume restent utilisables clapet fermé.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Clavier](https://img.shields.io/badge/Clavier-475569?style=flat-square) : Les touches d’assistance et du casque, ainsi que le menu d’arrêt par appui long, restent à raccorder.

<a id="development-2026-10-18-nokia-hardware"></a>

## 18/10/2026 : Commandes matérielles du Nokia 2720 Flip

### ![Tundra / Nokia 2720 Flip](https://img.shields.io/badge/Tundra%20%2F%20Nokia%202720%20Flip-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-2F855A?style=flat-square) ![Volume](https://img.shields.io/badge/Volume-475569?style=flat-square) : Touches latérales raccordées au panneau Gaia et au volume du téléphone.
- ![Add](https://img.shields.io/badge/Add-2F855A?style=flat-square) ![Affichage](https://img.shields.io/badge/Affichage-475569?style=flat-square) : Réglage de la luminosité relié au rétroéclairage de l’écran.
- ![Add](https://img.shields.io/badge/Add-2F855A?style=flat-square) ![Vibration](https://img.shields.io/badge/Vibration-475569?style=flat-square) : Vibrations courtes avec arrêt automatique et annulation.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Volume](https://img.shields.io/badge/Volume-475569?style=flat-square) : Au démarrage, Gaia reprend le volume réel du téléphone.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Caméra](https://img.shields.io/badge/Cam%C3%A9ra-475569?style=flat-square) : Caméra arrière de 2 Mpx identifiée, à mise au point fixe. Son raccordement à Vulpes reste en chantier.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Matériel](https://img.shields.io/badge/Mat%C3%A9riel-475569?style=flat-square) : Volume, panneau Gaia, luminosité et arrêt du vibreur contrôlés sur le Nokia. Aucun nouveau flash ni APK publié.

<a id="development-2026-10-18-nokia-build"></a>

## 18/10/2026 : Build expérimental Nokia 2720 Flip

### ![Tundra / Nokia 2720 Flip](https://img.shields.io/badge/Tundra%20%2F%20Nokia%202720%20Flip-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-2F855A?style=flat-square) ![Build](https://img.shields.io/badge/Build-475569?style=flat-square) : Premier paquet de démarrage privé construit avec Gecko 156.0.1 et Gaia commun.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Installation](https://img.shields.io/badge/Installation-475569?style=flat-square) : Les fichiers du prototype sont conservés après redémarrage du Nokia.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Validation](https://img.shields.io/badge/Validation-475569?style=flat-square) : Image non signée, pas encore démarrée ni qualifiée pour le flash. Le téléphone reste dépendant de ses services matériels installés ; aucune ROM autonome publiée.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Build](https://img.shields.io/badge/Build-475569?style=flat-square) : Format de l’image, archives et retour de secours contrôlés localement. Gaia et réseau vérifiés depuis le nouvel emplacement persistant.

<a id="development-2026-10-18-nokia-phone"></a>

## 18/10/2026 : En développement — Nokia 2720 Flip

### ![Tundra / Nokia 2720 Flip](https://img.shields.io/badge/Tundra%20%2F%20Nokia%202720%20Flip-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-2F855A?style=flat-square) ![Écran extérieur](https://img.shields.io/badge/%C3%89cran%20ext%C3%A9rieur-475569?style=flat-square) : Texte personnalisé et couleurs du titre et de la batterie dans Affichage, avec aperçu.
- ![Add](https://img.shields.io/badge/Add-2F855A?style=flat-square) ![Téléphone](https://img.shields.io/badge/T%C3%A9l%C3%A9phone-475569?style=flat-square) : Appels et SMS simples raccordés aux applications Gaia.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Clapet](https://img.shields.io/badge/Clapet-475569?style=flat-square) : Écrans et éclairage des touches corrigés à l’ouverture et à la fermeture ; fonctionnement confirmé sur le téléphone.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Réseau](https://img.shields.io/badge/R%C3%A9seau-475569?style=flat-square) : Reconnexions espacées après une erreur radio pour éviter une boucle de tentatives.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Touches](https://img.shields.io/badge/Touches-475569?style=flat-square) : Touche rouge raccordée au bouton Raccrocher de Gaia et au retour Accueil.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Prototype](https://img.shields.io/badge/Prototype-475569?style=flat-square) : Session temporaire sur le matériel KaiOS existant ; aucune image autonome ni nouvelle publication. Stabilité prolongée à vérifier.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Communications](https://img.shields.io/badge/Communications-475569?style=flat-square) : Appel, son dans les deux sens et SMS confirmés par le propriétaire du Nokia.

### ![Toutes les plateformes](https://img.shields.io/badge/Toutes%20les%20plateformes-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Appels](https://img.shields.io/badge/Appels-475569?style=flat-square) : Les appuis répétés sur Appeler ne lancent plus plusieurs requêtes pendant la connexion. Une erreur audio ne bloque plus l’écran d’appel.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Mode compact](https://img.shields.io/badge/Mode%20compact-475569?style=flat-square) : Pavé, bouton Appeler et onglets Téléphone ajustés aux petits écrans, sans chevauchement.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Installation](https://img.shields.io/badge/Installation-475569?style=flat-square) : Ressources communes synchronisées ; aucun nouvel APK compilé.

<a id="development-2026-10-17-nokia-cover"></a>

## 17/10/2026 : En développement — Nokia 2720 Flip

### ![Tundra / Nokia 2720 Flip](https://img.shields.io/badge/Tundra%20%2F%20Nokia%202720%20Flip-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-2F855A?style=flat-square) ![Clapet](https://img.shields.io/badge/Clapet-475569?style=flat-square) : Gestion de l'écran intérieur à la fermeture et à la réouverture, en cours de validation sur le téléphone.
- ![Add](https://img.shields.io/badge/Add-2F855A?style=flat-square) ![Écran extérieur](https://img.shields.io/badge/%C3%89cran%20ext%C3%A9rieur-475569?style=flat-square) : Horloge, date, opérateur et batterie ; extinction après 15 secondes.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Prototype](https://img.shields.io/badge/Prototype-475569?style=flat-square) : Essai temporaire uniquement. La fermeture physique du clapet et l'autonomie restent à valider ; aucune nouvelle image publiée.

<a id="2.7-preview.21-sargo.1"></a>

## 15/10/2026 : 2.7-preview.21-sargo.1

![Image expérimentale publiée](https://img.shields.io/badge/Image%20exp%C3%A9rimentale%20publi%C3%A9e-75658A?style=flat-square)

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-2F855A?style=flat-square) ![Installation](https://img.shields.io/badge/Installation-475569?style=flat-square) : Paquet complet Pixel 3a disponible avec installateur, instructions FR/EN et sommes de contrôle. Bootloader déverrouillé requis ; installation avec effacement des données.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Navigateur](https://img.shields.io/badge/Navigateur-475569?style=flat-square) : Correctifs de recherche DuckDuckGo, validation au clavier et affichage des pages inclus.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Expérimental](https://img.shields.io/badge/Exp%C3%A9rimental-475569?style=flat-square) : Le binaire public exact reste à tester sur le téléphone. Appels, audio, veille et autonomie restent à valider ; limites de provenance détaillées dans la release.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Sources](https://img.shields.io/badge/Sources-475569?style=flat-square) : Sources Vulpes et collection des sources amont jointes. La correspondance complète de certains composants reste à établir.

[Téléchargement et instructions](https://nnsprod.com/git/oversu/VulpesOS/releases/tag/v2.7-preview.21-sargo.1)

<a id="development-2026-10-14-browser"></a>

## 14/10/2026 : Navigateur et vidéo

![En développement](https://img.shields.io/badge/En%20d%C3%A9veloppement-334155?style=flat-square)

### ![Toutes les plateformes](https://img.shields.io/badge/Toutes%20les%20plateformes-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Recherche](https://img.shields.io/badge/Recherche-475569?style=flat-square) : DuckDuckGo devient le moteur par défaut. Les choix explicites de moteur restent conservés.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Clavier](https://img.shields.io/badge/Clavier-475569?style=flat-square) : La barre d’adresse rouvre le clavier dès le premier appui, même après sa fermeture.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Clavier](https://img.shields.io/badge/Clavier-475569?style=flat-square) : La validation au clavier ferme correctement celui-ci avant d’afficher la page, sans bloquer l’interface.

### ![Desktop](https://img.shields.io/badge/Desktop-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Photo](https://img.shields.io/badge/Photo-475569?style=flat-square) : L’autorisation du micro utilise le panneau Gaia, au lieu d’une fenêtre Firefox séparée.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Navigateur](https://img.shields.io/badge/Navigateur-475569?style=flat-square) : Recherche DuckDuckGo et retour à l’accueil vérifiés dans le profil de test.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Installation](https://img.shields.io/badge/Installation-475569?style=flat-square) : Ressources communes actualisées ; aucun nouvel APK distribué pour ces corrections.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Navigateur](https://img.shields.io/badge/Navigateur-475569?style=flat-square) : Les zones de geste latérales de Gaia ne masquent plus la page web sur le petit écran du Pixel.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Photo](https://img.shields.io/badge/Photo-475569?style=flat-square) : L’autorisation du micro s’affiche dans Gaia pour démarrer la vidéo.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Validation](https://img.shields.io/badge/Validation-475569?style=flat-square) : Clignotement disparu après redémarrage à froid ; recherche et adresse directe vérifiées visuellement sur le Pixel. Qualité audio des vidéos à écouter ; aucune nouvelle release publiée.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Navigation et vidéo](https://img.shields.io/badge/Navigation%20et%20vid%C3%A9o-475569?style=flat-square) : Recherche, clavier, retour Accueil et courte vidéo lisible avec miniature vérifiés sur le Pixel en RAM, sans débogueur. Boutons d’autorisation accessibles au-dessus de Home.

### ![Web](https://img.shields.io/badge/Web-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Pixel 3a](https://img.shields.io/badge/Pixel%203a-475569?style=flat-square) : Fiche de compatibilité FR/EN actualisée : installation autonome, Bluetooth, vidéo, navigateur et limites des fonctions encore en cours. Image publique toujours en préparation.

<a id="2.7-preview.21"></a>

## 14/10/2026 : 2.7-preview.21

![APK publié](https://img.shields.io/badge/APK%20publi%C3%A9-2F855A?style=flat-square)

### ![Toutes les plateformes](https://img.shields.io/badge/Toutes%20les%20plateformes-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Affichage](https://img.shields.io/badge/Affichage-475569?style=flat-square) : Messages des fonctions indisponibles plus lisibles en thèmes clair et sombre.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Clavier](https://img.shields.io/badge/Clavier-475569?style=flat-square) : Dictionnaires supplémentaires disponibles hors ligne ; activation et reprise du clavier Gaia fiabilisées. La vérification sur les appareils concernés reste nécessaire.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Journal d’appels](https://img.shields.io/badge/Journal%20d%E2%80%99appels-475569?style=flat-square) : Affichage du nom des contacts rétabli au premier chargement du journal.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Paramètres](https://img.shields.io/badge/Param%C3%A8tres-475569?style=flat-square) : Panneaux Stockage rétablis. Une erreur de chargement ne bloque plus les autres menus.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-2F855A?style=flat-square) ![Données Android](https://img.shields.io/badge/Donn%C3%A9es%20Android-475569?style=flat-square) : Lecture des contacts, SMS et journaux Android dans Gaia, après autorisation. Les données locales de Vulpes sont conservées.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Marketplace](https://img.shields.io/badge/Marketplace-475569?style=flat-square) : Retour vers Vulpes sans écran blanc persistant ; un catalogue fermé peut être rouvert.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Clavier](https://img.shields.io/badge/Clavier-475569?style=flat-square) : Le rectangle blanc signalé reste à reproduire sur les appareils concernés.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Données Android](https://img.shields.io/badge/Donn%C3%A9es%20Android-475569?style=flat-square) : Première étape en lecture seule, hors MMS. Envoi et édition des données Android dans les applications Android ; les nouveaux contacts Gaia restent locaux. Accès SMS et journal selon les autorisations de la ROM et de l’installateur. Essais sur Android 9 ; autres versions à confirmer.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Démarrage](https://img.shields.io/badge/D%C3%A9marrage-475569?style=flat-square) : Image de démarrage allégée ; écran noir au lancement corrigé sur Pixel 3a.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Installation](https://img.shields.io/badge/Installation-475569?style=flat-square) : Les corrections communes de Gaia sont incluses dans les images complètes et les mises à jour de démarrage.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Vérification](https://img.shields.io/badge/V%C3%A9rification-475569?style=flat-square) : Appels, audio, SMS/MMS, caméra, heure automatique et autonomie restent à valider sur cette installation.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Installation](https://img.shields.io/badge/Installation-475569?style=flat-square) : Installation complète et redémarrages vérifiés sur Pixel 3a ; données personnelles restaurées. Image pas encore publiée.

<a id="2.7-preview.20"></a>

## 13/10/2026 : 2.7-preview.20

![Publié](https://img.shields.io/badge/Publi%C3%A9-334155?style=flat-square)

### ![Toutes les plateformes](https://img.shields.io/badge/Toutes%20les%20plateformes-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Caméra](https://img.shields.io/badge/Cam%C3%A9ra-475569?style=flat-square) : Mode vidéo, avec miniature et lecture dans Galerie et Vidéo.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Interface](https://img.shields.io/badge/Interface-475569?style=flat-square) : Améliorations des paramètres, de l’apparence, des sélecteurs, du clavier, des contacts et des médias.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Caméra](https://img.shields.io/badge/Cam%C3%A9ra-475569?style=flat-square) : Changement de capteur, arrêt et reprise fiabilisés.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Services](https://img.shields.io/badge/Services-475569?style=flat-square) : Compte Mozilla, Sync, localisation distante, extensions et transfert USB restent incomplets.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Publication](https://img.shields.io/badge/Publication-475569?style=flat-square) : APK Preview 20 disponible.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Compatibilité](https://img.shields.io/badge/Compatibilit%C3%A9-475569?style=flat-square) : Appels et SMS utilisent Android. Cette Preview n’a pas encore été validée en utilisation sur Android.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Caméra](https://img.shields.io/badge/Cam%C3%A9ra-475569?style=flat-square) : Aperçu autour de 16 images par seconde.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Réseau](https://img.shields.io/badge/R%C3%A9seau-475569?style=flat-square) : Mise à jour du Wi-Fi, du Bluetooth, des appels, des SMS/MMS et des réglages réseau.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Audio](https://img.shields.io/badge/Audio-475569?style=flat-square) : Son des vidéos et conversation téléphonique à vérifier séparément.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Installation](https://img.shields.io/badge/Installation-475569?style=flat-square) : Preview 20 installée sur le Pixel 3a, données conservées. Wi-Fi connecté et réseau 4G détecté.

### ![Web](https://img.shields.io/badge/Web-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Changelog](https://img.shields.io/badge/Changelog-475569?style=flat-square) : Historique FR/EN simplifié, badges et filtres par plateforme. Même contenu pour le site et les releases.

[Release](https://nnsprod.com/git/oversu/VulpesOS/releases/tag/v2.7-preview.20)

<a id="development-2026-10-12-video-clock"></a>

## 12/10/2026 : Vidéo et heure

![En développement](https://img.shields.io/badge/En%20d%C3%A9veloppement-334155?style=flat-square)

### ![Toutes les plateformes](https://img.shields.io/badge/Toutes%20les%20plateformes-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Caméra](https://img.shields.io/badge/Cam%C3%A9ra-475569?style=flat-square) : Enregistrement vidéo avec son, miniature et lecture dans Galerie et Vidéo.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Aide](https://img.shields.io/badge/Aide-475569?style=flat-square) : « Améliorer Vulpes » mène aux tickets du projet.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Paramètres](https://img.shields.io/badge/Param%C3%A8tres-475569?style=flat-square) : Sélecteurs de date et d’heure rétablis ; retour du menu Clavier et texte des listes corrigés.

### ![Desktop](https://img.shields.io/badge/Desktop-2563EB?style=flat-square)

- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Caméra](https://img.shields.io/badge/Cam%C3%A9ra-475569?style=flat-square) : Enregistrement vérifié avec une caméra simulée.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Disponibilité](https://img.shields.io/badge/Disponibilit%C3%A9-475569?style=flat-square) : Changements préparés pour un prochain APK ; vidéo non encore testée sur Android.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Caméra](https://img.shields.io/badge/Cam%C3%A9ra-475569?style=flat-square) : Aperçu amélioré, autour de 16 images par seconde.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Horloge](https://img.shields.io/badge/Horloge-475569?style=flat-square) : Heure automatique selon les informations du réseau ; fuseau horaire encore manuel.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Caméra](https://img.shields.io/badge/Cam%C3%A9ra-475569?style=flat-square) : Vidéo et changement de capteur vérifiés. Son des vidéos encore à écouter.

<a id="development-2026-10-12-settings-calls-hotspot"></a>

## 12/10/2026 : Appels et partage Wi-Fi

![En développement](https://img.shields.io/badge/En%20d%C3%A9veloppement-334155?style=flat-square)

### ![Toutes les plateformes](https://img.shields.io/badge/Toutes%20les%20plateformes-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Paramètres](https://img.shields.io/badge/Param%C3%A8tres-475569?style=flat-square) : Fermeture des dialogues et nouvelle tentative après une erreur corrigées.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Appels](https://img.shields.io/badge/Appels-475569?style=flat-square) : Réglages du double appel, de l’affichage du numéro et du renvoi d’appel.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Wi-Fi](https://img.shields.io/badge/Wi--Fi-475569?style=flat-square) : Partage de connexion avec ou sans mot de passe.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Réseau](https://img.shields.io/badge/R%C3%A9seau-475569?style=flat-square) : Les réglages lents ne bloquent plus les appels et les SMS.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Wi-Fi](https://img.shields.io/badge/Wi--Fi-475569?style=flat-square) : Activation du point d’accès vérifiée ; accès Internet d’un autre appareil encore à tester.

<a id="development-2026-10-12-settings-network"></a>

## 12/10/2026 : Paramètres réseau

![En développement](https://img.shields.io/badge/En%20d%C3%A9veloppement-334155?style=flat-square)

### ![Toutes les plateformes](https://img.shields.io/badge/Toutes%20les%20plateformes-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Wi-Fi](https://img.shields.io/badge/Wi--Fi-475569?style=flat-square) : Adresse IP et vitesse de connexion affichées correctement.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Réseau](https://img.shields.io/badge/R%C3%A9seau-475569?style=flat-square) : Choix du type de réseau et modification des points d’accès mobiles.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Paramètres](https://img.shields.io/badge/Param%C3%A8tres-475569?style=flat-square) : Réglages réseau plus fiables lorsque le modem répond lentement.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Réseau](https://img.shields.io/badge/R%C3%A9seau-475569?style=flat-square) : Ajout, suppression et réinitialisation des points d’accès encore incomplets.

<a id="development-2026-10-12-settings-audit"></a>

## 12/10/2026 : Revue des paramètres

![En développement](https://img.shields.io/badge/En%20d%C3%A9veloppement-334155?style=flat-square)

### ![Toutes les plateformes](https://img.shields.io/badge/Toutes%20les%20plateformes-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Paramètres](https://img.shields.io/badge/Param%C3%A8tres-475569?style=flat-square) : Navigation, accessibilité et aide corrigées. Les panneaux incomplets restent visibles.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Vérification](https://img.shields.io/badge/V%C3%A9rification-475569?style=flat-square) : Menus parcourus ; certaines actions dépendent encore du matériel ou de l’opérateur.

### ![Desktop](https://img.shields.io/badge/Desktop-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Stockage](https://img.shields.io/badge/Stockage-475569?style=flat-square) : Informations de stockage et téléchargements raccordés.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Stockage](https://img.shields.io/badge/Stockage-475569?style=flat-square) : Affichage de l’espace utilisé par Vulpes.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Paramètres](https://img.shields.io/badge/Param%C3%A8tres-475569?style=flat-square) : Données mobiles, itinérance, heure, réseaux Wi-Fi masqués et panneau Son corrigés.

<a id="development-2026-10-12-settings-navigation"></a>

## 12/10/2026 : Navigation des paramètres

![En développement](https://img.shields.io/badge/En%20d%C3%A9veloppement-334155?style=flat-square)

### ![Toutes les plateformes](https://img.shields.io/badge/Toutes%20les%20plateformes-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Apparence](https://img.shields.io/badge/Apparence-475569?style=flat-square) : Choix Clair/Sombre et validation ou annulation des sélecteurs rétablis.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![SIM](https://img.shields.io/badge/SIM-475569?style=flat-square) : Gestionnaire adapté aux téléphones à une seule SIM.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![SMS](https://img.shields.io/badge/SMS-475569?style=flat-square) : Informations SIM, centre de messagerie et accusés de réception.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Wi-Fi](https://img.shields.io/badge/Wi--Fi-475569?style=flat-square) : Chargement plus rapide des réseaux enregistrés.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Paramètres](https://img.shields.io/badge/Param%C3%A8tres-475569?style=flat-square) : Certificats Wi-Fi, sécurité SIM et stockage USB encore incomplets.

<a id="development-2026-10-12-sargo-appearance"></a>

## 12/10/2026 : Apparence sur Pixel 3a

![En développement](https://img.shields.io/badge/En%20d%C3%A9veloppement-334155?style=flat-square)

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Apparence](https://img.shields.io/badge/Apparence-475569?style=flat-square) : Modes clair et sombre communs disponibles sur le Pixel 3a.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Interface](https://img.shields.io/badge/Interface-475569?style=flat-square) : Correctifs des paramètres et polices Firefox OS intégrés.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Vérification](https://img.shields.io/badge/V%C3%A9rification-475569?style=flat-square) : Pas de nouvel essai des appels, SMS ou Bluetooth à cette étape.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Apparence](https://img.shields.io/badge/Apparence-475569?style=flat-square) : Thèmes et affichage vérifiés sur le téléphone.

<a id="development-2026-10-11-appearance-input"></a>

## 11/10/2026 : Apparence et clavier

![En développement](https://img.shields.io/badge/En%20d%C3%A9veloppement-334155?style=flat-square)

### ![Toutes les plateformes](https://img.shields.io/badge/Toutes%20les%20plateformes-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Apparence](https://img.shields.io/badge/Apparence-475569?style=flat-square) : Modes Clair, Sombre et Système, conservés au redémarrage.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Clavier](https://img.shields.io/badge/Clavier-475569?style=flat-square) : Sélection et suppression de texte corrigées.

### ![Desktop](https://img.shields.io/badge/Desktop-2563EB?style=flat-square)

- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Interface](https://img.shields.io/badge/Interface-475569?style=flat-square) : Thèmes et saisie de SMS vérifiés.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Clavier](https://img.shields.io/badge/Clavier-475569?style=flat-square) : Clavier Gaia expérimental ; le clavier Android reste proposé par défaut.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Caméra](https://img.shields.io/badge/Cam%C3%A9ra-475569?style=flat-square) : Nouvelle tentative possible quand la caméra est occupée.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Vérification](https://img.shields.io/badge/V%C3%A9rification-475569?style=flat-square) : Preview 19 construite ; thèmes, clavier et caméra avant encore à vérifier sur Android.

<a id="development-2026-10-11-settings"></a>

## 11/10/2026 : Paramètres et accueil

![En développement](https://img.shields.io/badge/En%20d%C3%A9veloppement-334155?style=flat-square)

### ![Toutes les plateformes](https://img.shields.io/badge/Toutes%20les%20plateformes-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Accueil](https://img.shields.io/badge/Accueil-475569?style=flat-square) : Second écran d’accueil, aperçus de fonds d’écran et bandeau d’installation corrigés.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Caméra](https://img.shields.io/badge/Cam%C3%A9ra-475569?style=flat-square) : Fermeture du message d’erreur rétablie.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Paramètres](https://img.shields.io/badge/Param%C3%A8tres-475569?style=flat-square) : Sonneries, code de verrouillage, permissions et libellés FR/EN corrigés.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Notifications](https://img.shields.io/badge/Notifications-475569?style=flat-square) : Ouverture du volet en touchant la barre de statut.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Disponibilité](https://img.shields.io/badge/Disponibilit%C3%A9-475569?style=flat-square) : Preview 18 construite localement.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Stabilité](https://img.shields.io/badge/Stabilit%C3%A9-475569?style=flat-square) : Retour à la version précédente après un redémarrage instable de l’interface.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Bluetooth](https://img.shields.io/badge/Bluetooth-475569?style=flat-square) : Fonctionnement confirmé par l’utilisateur.

<a id="development-2026-10-09-mms-bluetooth"></a>

## 09/10/2026 : MMS et Bluetooth

![En développement](https://img.shields.io/badge/En%20d%C3%A9veloppement-334155?style=flat-square)

### ![Toutes les plateformes](https://img.shields.io/badge/Toutes%20les%20plateformes-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Bluetooth](https://img.shields.io/badge/Bluetooth-475569?style=flat-square) : Panneaux Gaia reliés aux capacités de chaque plateforme.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Bluetooth](https://img.shields.io/badge/Bluetooth-475569?style=flat-square) : Recherche, association, connexion, oubli d’appareils et sortie audio.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![MMS](https://img.shields.io/badge/MMS-475569?style=flat-square) : Envoi conservé et repris après une interruption.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Vérification](https://img.shields.io/badge/V%C3%A9rification-475569?style=flat-square) : MMS accepté par l’opérateur, réception non confirmée. Audio d’appel sur casque à tester.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Bluetooth](https://img.shields.io/badge/Bluetooth-475569?style=flat-square) : Lecture audio Bluetooth vers un PC vérifiée.

<a id="development-2026-10-08-camera-mms"></a>

## 08/10/2026 : Caméra et MMS

![En développement](https://img.shields.io/badge/En%20d%C3%A9veloppement-334155?style=flat-square)

### ![Toutes les plateformes](https://img.shields.io/badge/Toutes%20les%20plateformes-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Caméra](https://img.shields.io/badge/Cam%C3%A9ra-475569?style=flat-square) : Changement de capteur, arrêt et affichage après rotation corrigés.

### ![Desktop + Sargo](https://img.shields.io/badge/Desktop%20%2B%20Sargo-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![MMS](https://img.shields.io/badge/MMS-475569?style=flat-square) : Pièces jointes conservées et envoi affiché en attente jusqu’à confirmation.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Caméra](https://img.shields.io/badge/Cam%C3%A9ra-475569?style=flat-square) : Aperçu mesuré autour de 16 images/s à l’arrière et 25 à 27 à l’avant.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![MMS](https://img.shields.io/badge/MMS-475569?style=flat-square) : Envoi réel encore bloqué par la connexion aux données mobiles.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Caméra](https://img.shields.io/badge/Cam%C3%A9ra-475569?style=flat-square) : Mise au point, zoom et prise de photo vérifiés.

<a id="development-2026-10-08-call-log-dialogs"></a>

## 08/10/2026 : Journal d’appel et dialogues

### ![Toutes les plateformes](https://img.shields.io/badge/Toutes%20les%20plateformes-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Interface](https://img.shields.io/badge/Interface-475569?style=flat-square) : Messages d’erreur lisibles, avec des boutons utilisables.

### ![Desktop + Sargo](https://img.shields.io/badge/Desktop%20%2B%20Sargo-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![MMS](https://img.shields.io/badge/MMS-475569?style=flat-square) : Message clair si l’envoi est indisponible, sans perdre le brouillon.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Téléphone](https://img.shields.io/badge/T%C3%A9l%C3%A9phone-475569?style=flat-square) : Rappel depuis le journal d’appel rétabli.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Appels](https://img.shields.io/badge/Appels-475569?style=flat-square) : Parcours vérifié avec des appels simulés ; audio réel non testé.

<a id="development-2026-10-08-sms-audio"></a>

## 08/10/2026 : SMS et audio

![En développement](https://img.shields.io/badge/En%20d%C3%A9veloppement-334155?style=flat-square)

### ![Toutes les plateformes](https://img.shields.io/badge/Toutes%20les%20plateformes-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Interface](https://img.shields.io/badge/Interface-475569?style=flat-square) : Affichage du volume, verrouillage et balayage des notifications corrigés.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![SMS](https://img.shields.io/badge/SMS-475569?style=flat-square) : Envoi en un appui, sans fermer d’abord le clavier. Menu des pièces jointes rétabli.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Audio](https://img.shields.io/badge/Audio-475569?style=flat-square) : Corrections du routage du son des appels.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Appels](https://img.shields.io/badge/Appels-475569?style=flat-square) : Le réseau a empêché de vérifier une conversation réelle ; son dans les deux sens non confirmé.

<a id="development-2026-10-08-radio-reliability"></a>

## 08/10/2026 : Fiabilité du réseau

![En développement](https://img.shields.io/badge/En%20d%C3%A9veloppement-334155?style=flat-square)

### ![Toutes les plateformes](https://img.shields.io/badge/Toutes%20les%20plateformes-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![SMS](https://img.shields.io/badge/SMS-475569?style=flat-square) : Messages associés à la bonne conversation.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Réseau](https://img.shields.io/badge/R%C3%A9seau-475569?style=flat-square) : Récupération du modem améliorée ; les nouvelles tentatives évitent de doubler appels et SMS.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Appels](https://img.shields.io/badge/Appels-475569?style=flat-square) : Stabilité du réseau et audio dans les deux sens encore à confirmer.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Réseau](https://img.shields.io/badge/R%C3%A9seau-475569?style=flat-square) : Retour sur le réseau 4G après redémarrage du modem vérifié.

<a id="2026-10-08-source-publication"></a>

## 08/10/2026 : Sources publiques

### ![Toutes les plateformes](https://img.shields.io/badge/Toutes%20les%20plateformes-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Sources](https://img.shields.io/badge/Sources-475569?style=flat-square) : Publication des corrections caméra, contacts, SMS et Marketplace, avec présentations FR/EN à jour.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Construction](https://img.shields.io/badge/Construction-475569?style=flat-square) : Construction depuis une copie neuve du dépôt corrigée.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Disponibilité](https://img.shields.io/badge/Disponibilit%C3%A9-475569?style=flat-square) : L’APK public reste en Preview 17 ; ces corrections sont dans les sources.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Réseau](https://img.shields.io/badge/R%C3%A9seau-475569?style=flat-square) : Recherche de réseau encore instable à cette étape ; pas de nouvelle image publiée.

<a id="development-2026-10-08-camera-lifecycle"></a>

## 08/10/2026 : Caméra et contacts

![En développement](https://img.shields.io/badge/En%20d%C3%A9veloppement-334155?style=flat-square)

### ![Toutes les plateformes](https://img.shields.io/badge/Toutes%20les%20plateformes-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Caméra](https://img.shields.io/badge/Cam%C3%A9ra-475569?style=flat-square) : Ouverture et changement de capteur fiabilisés.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Contacts](https://img.shields.io/badge/Contacts-475569?style=flat-square) : Photos, dates, modifications et choix d’un numéro depuis SMS ou Téléphone corrigés.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Galerie](https://img.shields.io/badge/Galerie-475569?style=flat-square) : Sélection des médias corrigée.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Disponibilité](https://img.shields.io/badge/Disponibilit%C3%A9-475569?style=flat-square) : Correctifs dans les sources ; APK public inchangé à cette étape.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![SMS](https://img.shields.io/badge/SMS-475569?style=flat-square) : Numéro et texte transmis correctement à l’application Android.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Bluetooth](https://img.shields.io/badge/Bluetooth-475569?style=flat-square) : Recherche disponible ; association et usages audio encore à vérifier.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Caméra](https://img.shields.io/badge/Cam%C3%A9ra-475569?style=flat-square) : Photo, mise au point, zoom et changements de capteur vérifiés.

<a id="development-2026-10-06-marketplace-theme"></a>

## 06/10/2026 : Thème Marketplace

![En développement](https://img.shields.io/badge/En%20d%C3%A9veloppement-334155?style=flat-square)

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Disponibilité](https://img.shields.io/badge/Disponibilit%C3%A9-475569?style=flat-square) : Intégration prévue dans un prochain APK.

### ![Web](https://img.shields.io/badge/Web-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Marketplace](https://img.shields.io/badge/Marketplace-475569?style=flat-square) : Thème intégré : police Fira, navigation compacte, boutons tactiles et captures défilantes.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Marketplace](https://img.shields.io/badge/Marketplace-475569?style=flat-square) : Affichage intégré conservé pendant la recherche, les filtres et les changements de langue.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Disponibilité](https://img.shields.io/badge/Disponibilit%C3%A9-475569?style=flat-square) : Thème préparé localement, pas encore déployé sur le site.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Affichage](https://img.shields.io/badge/Affichage-475569?style=flat-square) : Pages françaises et anglaises vérifiées sur petits écrans.

<a id="development-2026-10-06-system-banner"></a>

## 06/10/2026 : Bandeaux de notification

![En développement](https://img.shields.io/badge/En%20d%C3%A9veloppement-334155?style=flat-square)

### ![Toutes les plateformes](https://img.shields.io/badge/Toutes%20les%20plateformes-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Notifications](https://img.shields.io/badge/Notifications-475569?style=flat-square) : Le bandeau « Application installée » disparaît automatiquement et se remplace correctement.

### ![Desktop](https://img.shields.io/badge/Desktop-2563EB?style=flat-square)

- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Notifications](https://img.shields.io/badge/Notifications-475569?style=flat-square) : Affichage et fermeture des bandeaux vérifiés.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Disponibilité](https://img.shields.io/badge/Disponibilit%C3%A9-475569?style=flat-square) : Correctif préparé pour le prochain APK.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Notifications](https://img.shields.io/badge/Notifications-475569?style=flat-square) : Disparition du bandeau après cinq secondes vérifiée.

<a id="development-2026-10-06-wifi"></a>

## 06/10/2026 : Wi-Fi et paramètres

![En développement](https://img.shields.io/badge/En%20d%C3%A9veloppement-334155?style=flat-square)

### ![Toutes les plateformes](https://img.shields.io/badge/Toutes%20les%20plateformes-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Paramètres](https://img.shields.io/badge/Param%C3%A8tres-475569?style=flat-square) : Ouverture des panneaux rétablie quand une animation ne se termine pas normalement.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Disponibilité](https://img.shields.io/badge/Disponibilit%C3%A9-475569?style=flat-square) : Correctifs encore absents de l’APK public.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Wi-Fi](https://img.shields.io/badge/Wi--Fi-475569?style=flat-square) : Réseaux détectés et déconnexions affichés correctement.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Wi-Fi](https://img.shields.io/badge/Wi--Fi-475569?style=flat-square) : Recherche, connexion et accès Internet vérifiés.

<a id="development-2026-10-06-marketplace-views"></a>

## 06/10/2026 : Navigation Marketplace

![En développement](https://img.shields.io/badge/En%20d%C3%A9veloppement-334155?style=flat-square)

### ![Desktop + Sargo](https://img.shields.io/badge/Desktop%20%2B%20Sargo-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Marketplace](https://img.shields.io/badge/Marketplace-475569?style=flat-square) : Message local avec bouton Réessayer si le catalogue est inaccessible.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Marketplace](https://img.shields.io/badge/Marketplace-475569?style=flat-square) : Le catalogue reste sous la barre de statut et se masque en revenant à l’accueil ou en le fermant.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Navigation](https://img.shields.io/badge/Navigation-475569?style=flat-square) : Une ancienne erreur ne masque plus une nouvelle tentative.

### ![Desktop](https://img.shields.io/badge/Desktop-2563EB?style=flat-square)

- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Marketplace](https://img.shields.io/badge/Marketplace-475569?style=flat-square) : Navigation, erreurs, retour à l’accueil et fermeture vérifiés.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Disponibilité](https://img.shields.io/badge/Disponibilit%C3%A9-475569?style=flat-square) : Preview 17 reconstruite localement, sans nouveau test Android.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Marketplace](https://img.shields.io/badge/Marketplace-475569?style=flat-square) : Interface testée avec une page locale ; catalogue distant non vérifié sans Internet.

<a id="2.7-preview.17"></a>

## 05/10/2026 : 2.7-preview.17

![APK construit · non publié](https://img.shields.io/badge/APK%20construit%20%C2%B7%20non%20publi%C3%A9-334155?style=flat-square)

### ![Toutes les plateformes](https://img.shields.io/badge/Toutes%20les%20plateformes-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Applications](https://img.shields.io/badge/Applications-475569?style=flat-square) : Installation, lancement et désinstallation d’applications web empaquetées.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Marketplace](https://img.shields.io/badge/Marketplace-475569?style=flat-square) : Catalogue Vulpes sur l’accueil, en français et en anglais, avec son icône originale.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Sécurité](https://img.shields.io/badge/S%C3%A9curit%C3%A9-475569?style=flat-square) : Applications installées séparées des applications système.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Compatibilité](https://img.shields.io/badge/Compatibilit%C3%A9-475569?style=flat-square) : Certaines anciennes applications et API Firefox OS ne sont pas encore prises en charge.

### ![Desktop](https://img.shields.io/badge/Desktop-2563EB?style=flat-square)

- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Marketplace](https://img.shields.io/badge/Marketplace-475569?style=flat-square) : Installation et utilisation de 2048 vérifiées.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Marketplace](https://img.shields.io/badge/Marketplace-475569?style=flat-square) : 2048 installé, conservé après redémarrage et désinstallé sur un émulateur Android.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Marketplace](https://img.shields.io/badge/Marketplace-475569?style=flat-square) : Accueil vérifié ; installation d’applications encore à valider sur le Pixel.

<a id="2.7-preview.16"></a>

## 05/10/2026 : 2.7-preview.16

![APK construit · non publié](https://img.shields.io/badge/APK%20construit%20%C2%B7%20non%20publi%C3%A9-334155?style=flat-square)

### ![Toutes les plateformes](https://img.shields.io/badge/Toutes%20les%20plateformes-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Démarrage](https://img.shields.io/badge/D%C3%A9marrage-475569?style=flat-square) : Logo Vulpes au démarrage.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Accueil](https://img.shields.io/badge/Accueil-475569?style=flat-square) : Défilement horizontal involontaire supprimé ; applications de test masquées.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Personnalisation](https://img.shields.io/badge/Personnalisation-475569?style=flat-square) : Choix des fonds d’écran et des sons rétabli. Langue appliquée à l’accueil et conservée au redémarrage.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Disponibilité](https://img.shields.io/badge/Disponibilit%C3%A9-475569?style=flat-square) : APK construit, non publié ; image Pixel essayée sans installation permanente.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Interface](https://img.shields.io/badge/Interface-475569?style=flat-square) : Barres Android masquées, accessibles par balayage ; mode lanceur vérifié.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Verrouillage](https://img.shields.io/badge/Verrouillage-475569?style=flat-square) : Retour après veille et depuis la caméra du verrouillage corrigé.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Démarrage](https://img.shields.io/badge/D%C3%A9marrage-475569?style=flat-square) : Les anciens fichiers ne remplacent plus les mises à jour au démarrage.

<a id="2026-10-04-sargo-standalone"></a>

## 04/10/2026 : Installation autonome

![En développement](https://img.shields.io/badge/En%20d%C3%A9veloppement-334155?style=flat-square)

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Installation](https://img.shields.io/badge/Installation-475569?style=flat-square) : Installateur avec vérification du modèle et des fichiers avant écriture.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Installation](https://img.shields.io/badge/Installation-475569?style=flat-square) : Installation autonome de Vulpes, sans passer par Droidian.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Disponibilité](https://img.shields.io/badge/Disponibilit%C3%A9-475569?style=flat-square) : Paquet non publié ; un seul Pixel testé. L’installation remplace les données du téléphone.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Secours](https://img.shields.io/badge/Secours-475569?style=flat-square) : Sauvegardes vérifiées ; restauration complète encore à essayer.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Démarrage](https://img.shields.io/badge/D%C3%A9marrage-475569?style=flat-square) : Démarrages installés, conservation des réglages, caméra, clavier et notifications vérifiés.

<a id="2026-10-03-sargo-per-device-installation"></a>

## 03/10/2026 : Installation par appareil

![En développement](https://img.shields.io/badge/En%20d%C3%A9veloppement-334155?style=flat-square)

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Installation](https://img.shields.io/badge/Installation-475569?style=flat-square) : Préparation adaptée à chaque Pixel, avec sauvegardes propres à l’appareil.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Caméra](https://img.shields.io/badge/Cam%C3%A9ra-475569?style=flat-square) : Mise au point parfois trop lente ; problème encore ouvert.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Installation](https://img.shields.io/badge/Installation-475569?style=flat-square) : Installation directe depuis Android d’origine pas encore disponible.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Démarrage](https://img.shields.io/badge/D%C3%A9marrage-475569?style=flat-square) : Démarrages temporaires, conservation des réglages et retour à l’installation précédente vérifiés.

<a id="2026-10-03-sargo-installation-tools"></a>

## 03/10/2026 : Installation et secours

![En développement](https://img.shields.io/badge/En%20d%C3%A9veloppement-334155?style=flat-square)

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Installation](https://img.shields.io/badge/Installation-475569?style=flat-square) : Préparation des paquets et kit de secours avec sauvegarde du démarrage.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Secours](https://img.shields.io/badge/Secours-475569?style=flat-square) : Restauration possible sans démarrer l’outil de diagnostic.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Disponibilité](https://img.shields.io/badge/Disponibilit%C3%A9-475569?style=flat-square) : Préparation vérifiée localement ; installation sur un autre Pixel encore à finaliser.

### ![Web](https://img.shields.io/badge/Web-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Changelog](https://img.shields.io/badge/Changelog-475569?style=flat-square) : Historique commun inclus dans les prochaines publications de sources.

<a id="2026-10-03-sargo-modem-persistence"></a>

## 03/10/2026 : Modem et premier démarrage

![En développement](https://img.shields.io/badge/En%20d%C3%A9veloppement-334155?style=flat-square)

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Réseau](https://img.shields.io/badge/R%C3%A9seau-475569?style=flat-square) : Récupération du modem sans redémarrer tout le téléphone.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Démarrage](https://img.shields.io/badge/D%C3%A9marrage-475569?style=flat-square) : Polices et initialisation du modem corrigées sur une installation neuve.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Stabilité](https://img.shields.io/badge/Stabilit%C3%A9-475569?style=flat-square) : Redémarrages intermittents du modem encore à résoudre ; paquet public incomplet.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Matériel](https://img.shields.io/badge/Mat%C3%A9riel-475569?style=flat-square) : Caméras, focus, zoom, clavier, notifications et recherche Wi-Fi vérifiés.

<a id="2026-10-01-sargo-distribution-preparation"></a>

## 01/10/2026 : Préparation de la distribution

![En développement](https://img.shields.io/badge/En%20d%C3%A9veloppement-334155?style=flat-square)

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Installation](https://img.shields.io/badge/Installation-475569?style=flat-square) : Préparation d’une image avec des données vierges.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Polices](https://img.shields.io/badge/Polices-475569?style=flat-square) : Affichage des polices au premier démarrage corrigé.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Disponibilité](https://img.shields.io/badge/Disponibilit%C3%A9-475569?style=flat-square) : Image non publiée. Appels, SMS et données mobiles encore à vérifier de bout en bout.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Stabilité](https://img.shields.io/badge/Stabilit%C3%A9-475569?style=flat-square) : Redémarrage intermittent du modem identifié.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Matériel](https://img.shields.io/badge/Mat%C3%A9riel-475569?style=flat-square) : SIM, 4G, recherche Wi-Fi, caméras, clavier et notifications vérifiés en démarrage temporaire.

<a id="2.7-preview.15"></a>

## 30/09/2026 : 2.7-preview.15

![Publié](https://img.shields.io/badge/Publi%C3%A9-334155?style=flat-square)

### ![Toutes les plateformes](https://img.shields.io/badge/Toutes%20les%20plateformes-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Sources](https://img.shields.io/badge/Sources-475569?style=flat-square) : Première publication des sources PC, Android et Tundra, avec présentation FR/EN.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Caméra](https://img.shields.io/badge/Cam%C3%A9ra-475569?style=flat-square) : Arrêt et remplacement du flux caméra fiabilisés.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![SMS](https://img.shields.io/badge/SMS-475569?style=flat-square) : Dates et états d’envoi corrigés dans les conversations.

### ![Desktop](https://img.shields.io/badge/Desktop-2563EB?style=flat-square)

- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Applications](https://img.shields.io/badge/Applications-475569?style=flat-square) : Navigation, réglages, gestes et conservation des données vérifiés.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Stabilité](https://img.shields.io/badge/Stabilit%C3%A9-475569?style=flat-square) : Mise à jour, Photo, Galerie et retours d’arrière-plan vérifiés sur un émulateur Android.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Disponibilité](https://img.shields.io/badge/Disponibilit%C3%A9-475569?style=flat-square) : Sources incluses ; installation universelle encore indisponible à cette étape.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Matériel](https://img.shields.io/badge/Mat%C3%A9riel-475569?style=flat-square) : Flash, vidéo, rotation, veille et audio d’appel encore incomplets ou à vérifier.

[Release](https://nnsprod.com/git/oversu/VulpesOS/releases/tag/v2.7-preview.15)

<a id="development-2026-09-30-sms-camera-followup"></a>

## 30/09/2026 : Retours SMS et caméra

![En développement](https://img.shields.io/badge/En%20d%C3%A9veloppement-334155?style=flat-square)

### ![Toutes les plateformes](https://img.shields.io/badge/Toutes%20les%20plateformes-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Caméra](https://img.shields.io/badge/Cam%C3%A9ra-475569?style=flat-square) : Libération du capteur et changement de caméra corrigés.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![SMS](https://img.shields.io/badge/SMS-475569?style=flat-square) : Conversations vides corrigées.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Disponibilité](https://img.shields.io/badge/Disponibilit%C3%A9-475569?style=flat-square) : Sources communes mises à jour, sans nouvel APK.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Notifications](https://img.shields.io/badge/Notifications-475569?style=flat-square) : Arrêt du vibreur rétabli.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![À suivre](https://img.shields.io/badge/%C3%80%20suivre-475569?style=flat-square) : Dialogue après envoi SMS et fluidité caméra encore à corriger.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Caméra](https://img.shields.io/badge/Cam%C3%A9ra-475569?style=flat-square) : Focus et zoom confirmés par l’utilisateur.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![SMS](https://img.shields.io/badge/SMS-475569?style=flat-square) : Envoi et réception confirmés par l’utilisateur ; conversations affichées.

<a id="development-2026-09-30-sms-camera"></a>

## 30/09/2026 : SMS et photo

![En développement](https://img.shields.io/badge/En%20d%C3%A9veloppement-334155?style=flat-square)

### ![Desktop + Sargo](https://img.shields.io/badge/Desktop%20%2B%20Sargo-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![SMS](https://img.shields.io/badge/SMS-475569?style=flat-square) : Messages en échec conservés et états d’envoi mis à jour.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Disponibilité](https://img.shields.io/badge/Disponibilit%C3%A9-475569?style=flat-square) : APK Preview 14 inchangé à cette étape.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Caméra](https://img.shields.io/badge/Cam%C3%A9ra-475569?style=flat-square) : Mise au point au toucher et zoom numérique. Photos jusqu’à 12 Mpx à l’arrière et 8 Mpx à l’avant.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Caméra](https://img.shields.io/badge/Cam%C3%A9ra-475569?style=flat-square) : Retour de l’aperçu après une photo corrigé.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![SMS](https://img.shields.io/badge/SMS-475569?style=flat-square) : Réception par le destinataire non encore confirmée.

<a id="2.7-preview.14"></a>

## 30/09/2026 : 2.7-preview.14

![Publié](https://img.shields.io/badge/Publi%C3%A9-334155?style=flat-square)

### ![Toutes les plateformes](https://img.shields.io/badge/Toutes%20les%20plateformes-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Interface](https://img.shields.io/badge/Interface-475569?style=flat-square) : Polices, informations de version, verrouillage et notifications harmonisés.

### ![Desktop + Sargo](https://img.shields.io/badge/Desktop%20%2B%20Sargo-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Clavier](https://img.shields.io/badge/Clavier-475569?style=flat-square) : Clavier agrandi, édition de texte et saisie du numéro de destinataire améliorées.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Démarrage](https://img.shields.io/badge/D%C3%A9marrage-475569?style=flat-square) : Démarrage et polices vérifiés sur un émulateur Android.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Notifications](https://img.shields.io/badge/Notifications-475569?style=flat-square) : Arrêt de la vibration corrigé.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![SMS](https://img.shields.io/badge/SMS-475569?style=flat-square) : Notifications conservées, ouverture de la conversation et doublons corrigés.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Wi-Fi](https://img.shields.io/badge/Wi--Fi-475569?style=flat-square) : Réseaux enregistrés, reconnexion et oubli d’un réseau corrigés.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Audio](https://img.shields.io/badge/Audio-475569?style=flat-square) : Contrôles audio testés hors appel ; conversation et son des notifications encore à vérifier.

[Release](https://nnsprod.com/git/oversu/VulpesOS/releases/tag/android-2.7-preview.14)

<a id="2.7-preview.13"></a>

## 27/09/2026 : 2.7-preview.13

![APK construit · non publié](https://img.shields.io/badge/APK%20construit%20%C2%B7%20non%20publi%C3%A9-334155?style=flat-square)

### ![Toutes les plateformes](https://img.shields.io/badge/Toutes%20les%20plateformes-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Calendrier](https://img.shields.io/badge/Calendrier-475569?style=flat-square) : Rappels des événements corrigés, y compris après suppression.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Galerie](https://img.shields.io/badge/Galerie-475569?style=flat-square) : Premier affichage et fermeture de l’éditeur corrigés.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![SMS](https://img.shields.io/badge/SMS-475569?style=flat-square) : Filtres des conversations corrigés.

### ![Desktop](https://img.shields.io/badge/Desktop-2563EB?style=flat-square)

- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Applications](https://img.shields.io/badge/Applications-475569?style=flat-square) : Photo, vidéo, calendrier et conversations vérifiés.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Applications](https://img.shields.io/badge/Applications-475569?style=flat-square) : Caméra, Galerie, Calendrier et reprise après arrière-plan vérifiés.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Matériel](https://img.shields.io/badge/Mat%C3%A9riel-475569?style=flat-square) : Caméra, Wi-Fi et luminosité vérifiés sur la version installée.

<a id="2.7-preview.12"></a>

## 27/09/2026 : 2.7-preview.12

![APK construit · non publié](https://img.shields.io/badge/APK%20construit%20%C2%B7%20non%20publi%C3%A9-334155?style=flat-square)

### ![Toutes les plateformes](https://img.shields.io/badge/Toutes%20les%20plateformes-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Navigateur](https://img.shields.io/badge/Navigateur-475569?style=flat-square) : Page d’accueil locale, en français ou en anglais selon la langue.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Applications](https://img.shields.io/badge/Applications-475569?style=flat-square) : Conversations SMS et traductions du Calendrier corrigées.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Caméra](https://img.shields.io/badge/Cam%C3%A9ra-475569?style=flat-square) : Changement de capteur et zoom de l’interface corrigés ; flash grisé s’il est indisponible.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Interface](https://img.shields.io/badge/Interface-475569?style=flat-square) : Icônes plus nettes, appui long sur Accueil et gestes corrigés.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Caméra](https://img.shields.io/badge/Cam%C3%A9ra-475569?style=flat-square) : Aperçu plus fluide, autour de 23 images par seconde lors des essais.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Matériel](https://img.shields.io/badge/Mat%C3%A9riel-475569?style=flat-square) : Luminosité plus réactive et connexion Wi-Fi corrigée.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Matériel](https://img.shields.io/badge/Mat%C3%A9riel-475569?style=flat-square) : Vidéo, flash, Bluetooth et réglages d’appel avancés encore incomplets.

<a id="development-2026-09-27-4"></a>

## 27/09/2026 : Interface et matériel

![En développement](https://img.shields.io/badge/En%20d%C3%A9veloppement-334155?style=flat-square)

### ![Toutes les plateformes](https://img.shields.io/badge/Toutes%20les%20plateformes-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Navigateur](https://img.shields.io/badge/Navigateur-475569?style=flat-square) : Première page d’accueil locale.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Extinction](https://img.shields.io/badge/Extinction-475569?style=flat-square) : Animation d’extinction conservée, avec des ronds bleus.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Interface](https://img.shields.io/badge/Interface-475569?style=flat-square) : Textes des listes et de Vidéo corrigés ; barre Accueil transparente et adaptée au paysage.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Téléphone](https://img.shields.io/badge/T%C3%A9l%C3%A9phone-475569?style=flat-square) : En-têtes et icônes du journal d’appel corrigés.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Luminosité](https://img.shields.io/badge/Luminosit%C3%A9-475569?style=flat-square) : Réglage de la luminosité raccordé.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Matériel](https://img.shields.io/badge/Mat%C3%A9riel-475569?style=flat-square) : Appels audio, vidéo, pleine résolution photo et rotation encore à vérifier.

<a id="development-2026-09-27-3"></a>

## 27/09/2026 : Stabilité Wi-Fi

![En développement](https://img.shields.io/badge/En%20d%C3%A9veloppement-334155?style=flat-square)

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Disponibilité](https://img.shields.io/badge/Disponibilit%C3%A9-475569?style=flat-square) : Preview 9 construite avec les corrections communes ; Wi-Fi géré par Android.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Wi-Fi](https://img.shields.io/badge/Wi--Fi-475569?style=flat-square) : Recherche des réseaux stabilisée pour éviter les blocages du téléphone.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Matériel](https://img.shields.io/badge/Mat%C3%A9riel-475569?style=flat-square) : Caméra et appels encore incomplets.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Interface](https://img.shields.io/badge/Interface-475569?style=flat-square) : Verrouillage, polices, date, batterie et Wi-Fi vérifiés.

<a id="development-2026-09-27-2"></a>

## 27/09/2026 : Retour aux composants Gaia

![En développement](https://img.shields.io/badge/En%20d%C3%A9veloppement-334155?style=flat-square)

### ![Toutes les plateformes](https://img.shields.io/badge/Toutes%20les%20plateformes-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![À propos](https://img.shields.io/badge/%C3%80%20propos-475569?style=flat-square) : Remerciements, écran de démarrage et nom du navigateur mis à jour.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Interface](https://img.shields.io/badge/Interface-475569?style=flat-square) : Panneaux et styles Gaia d’origine rétablis dans Paramètres, Suivi conso, Radio FM et les imports.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Interface](https://img.shields.io/badge/Interface-475569?style=flat-square) : Bouton Accueil dégagé des commandes ; date, batterie et écran de verrouillage rétablis.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Intégration](https://img.shields.io/badge/Int%C3%A9gration-475569?style=flat-square) : Mode lanceur, accès aux paramètres Android et reprise après arrière-plan.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Wi-Fi](https://img.shields.io/badge/Wi--Fi-475569?style=flat-square) : Première intégration instable ; retour à la version précédente.

<a id="development-2026-09-27-1"></a>

## 27/09/2026 : Appels et boutons physiques

![En développement](https://img.shields.io/badge/En%20d%C3%A9veloppement-334155?style=flat-square)

### ![Desktop + Sargo](https://img.shields.io/badge/Desktop%20%2B%20Sargo-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Téléphone](https://img.shields.io/badge/T%C3%A9l%C3%A9phone-475569?style=flat-square) : Interfaces Gaia d’appel entrant et sortant, avec journal d’appel.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Interface](https://img.shields.io/badge/Interface-475569?style=flat-square) : Polices Fira, contacts et affichage de la batterie corrigés.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Boutons](https://img.shields.io/badge/Boutons-475569?style=flat-square) : Prise en charge des touches Marche/Arrêt et Volume, du menu d’extinction et du réveil de l’écran.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Caméra](https://img.shields.io/badge/Cam%C3%A9ra-475569?style=flat-square) : Caméra native encore indisponible.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) ![Appels](https://img.shields.io/badge/Appels-475569?style=flat-square) : Sonnerie et raccrochage vérifiés ; conversation audio encore à tester.

<a id="development-2026-09-26-1"></a>

## 26/09/2026 : Démarrage et polices

![En développement](https://img.shields.io/badge/En%20d%C3%A9veloppement-334155?style=flat-square)

### ![Toutes les plateformes](https://img.shields.io/badge/Toutes%20les%20plateformes-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Interface](https://img.shields.io/badge/Interface-475569?style=flat-square) : Polices Fira et informations de batterie corrigées ; boutons de test retirés des paramètres.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Installation](https://img.shields.io/badge/Installation-475569?style=flat-square) : Conservation des données lors du démarrage installé.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Démarrage](https://img.shields.io/badge/D%C3%A9marrage-475569?style=flat-square) : Plein écran stable, sans gestes ni ouverture automatique d’applications.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Matériel](https://img.shields.io/badge/Mat%C3%A9riel-475569?style=flat-square) : Son et micro testés séparément ; audio d’appel, caméra et veille non validés.

<a id="development-2026-09-25-1"></a>

## 25/09/2026 : Accueil et premiers essais natifs

![En développement](https://img.shields.io/badge/En%20d%C3%A9veloppement-334155?style=flat-square)

### ![Toutes les plateformes](https://img.shields.io/badge/Toutes%20les%20plateformes-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Accueil](https://img.shields.io/badge/Accueil-475569?style=flat-square) : Bouton rond, fond transparent sur l’accueil et bleu dans les applications.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Interface](https://img.shields.io/badge/Interface-475569?style=flat-square) : État appuyé du bouton, dégradé, polices et informations système corrigés.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Stabilité](https://img.shields.io/badge/Stabilit%C3%A9-475569?style=flat-square) : Reprise de l’application modifiée dans les sources, pas encore testée sur Android.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Démarrage](https://img.shields.io/badge/D%C3%A9marrage-475569?style=flat-square) : Premiers essais d’une image native avec affichage accéléré et batterie.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Disponibilité](https://img.shields.io/badge/Disponibilit%C3%A9-475569?style=flat-square) : Essais temporaires ; de nombreuses fonctions matérielles restent à raccorder.

<a id="2.7-preview.7"></a>

## 2.7-preview.7

![APK construit · non publié](https://img.shields.io/badge/APK%20construit%20%C2%B7%20non%20publi%C3%A9-334155?style=flat-square)

### ![Desktop + Android](https://img.shields.io/badge/Desktop%20%2B%20Android-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![À propos](https://img.shields.io/badge/%C3%80%20propos-475569?style=flat-square) : Versions de Vulpes, Gaia et Gecko distinguées.

### ![Desktop](https://img.shields.io/badge/Desktop-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Caméra](https://img.shields.io/badge/Cam%C3%A9ra-475569?style=flat-square) : Gestion des autorisations et messages d’erreur plus précis.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Caméra](https://img.shields.io/badge/Cam%C3%A9ra-475569?style=flat-square) : Reprise après la première demande d’autorisation corrigée.

<a id="2.7-preview.6"></a>

## 2.7-preview.6

![APK construit · non publié](https://img.shields.io/badge/APK%20construit%20%C2%B7%20non%20publi%C3%A9-334155?style=flat-square)

### ![Desktop](https://img.shields.io/badge/Desktop-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Caméra](https://img.shields.io/badge/Cam%C3%A9ra-475569?style=flat-square) : Application Photo Gaia reliée à la webcam.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Galerie](https://img.shields.io/badge/Galerie-475569?style=flat-square) : Import de fichiers et photos disponibles dans Galerie.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Caméra](https://img.shields.io/badge/Cam%C3%A9ra-475569?style=flat-square) : Changement de capteur selon le matériel ; flash et vidéo indisponibles.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Caméra](https://img.shields.io/badge/Cam%C3%A9ra-475569?style=flat-square) : Application Photo Gaia reliée aux caméras Android.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Galerie](https://img.shields.io/badge/Galerie-475569?style=flat-square) : Import de fichiers et photos disponibles dans Galerie.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Caméra](https://img.shields.io/badge/Cam%C3%A9ra-475569?style=flat-square) : Changement de capteur selon le matériel ; flash et vidéo indisponibles.

<a id="2.7-preview.5"></a>

## 2.7-preview.5

![APK construit · non publié](https://img.shields.io/badge/APK%20construit%20%C2%B7%20non%20publi%C3%A9-334155?style=flat-square)

### ![Desktop](https://img.shields.io/badge/Desktop-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Intégration](https://img.shields.io/badge/Int%C3%A9gration-475569?style=flat-square) : Réglages système, imports de médias et de contacts, notifications et essai webcam.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Interface](https://img.shields.io/badge/Interface-475569?style=flat-square) : Interface et numérotation des versions alignées avec Android.

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Interface](https://img.shields.io/badge/Interface-475569?style=flat-square) : Interface et numérotation des versions alignées avec le PC.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Stabilité](https://img.shields.io/badge/Stabilit%C3%A9-475569?style=flat-square) : Reprise après arrière-plan et récupération de l’affichage améliorées.

<a id="2.7-156.0.2"></a>

## 2.7-156.0.2

![APK construit · non publié](https://img.shields.io/badge/APK%20construit%20%C2%B7%20non%20publi%C3%A9-334155?style=flat-square)

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Intégration](https://img.shields.io/badge/Int%C3%A9gration-475569?style=flat-square) : Réglages Android, son, luminosité, imports et notifications.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Applications](https://img.shields.io/badge/Applications-475569?style=flat-square) : Appels, SMS, horloge et caméra confiés aux applications Android.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Stabilité](https://img.shields.io/badge/Stabilit%C3%A9-475569?style=flat-square) : Écrans blancs et reprise après arrière-plan corrigés.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Version](https://img.shields.io/badge/Version-475569?style=flat-square) : Ancienne numérotation : ce numéro ne correspond pas à une mise à jour de Gecko.

<a id="2.7-156.0.1"></a>

## 2.7-156.0.1

![Publié](https://img.shields.io/badge/Publi%C3%A9-334155?style=flat-square)

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Identité](https://img.shields.io/badge/Identit%C3%A9-475569?style=flat-square) : Nom « Vulpes OS – Preview » et icône du projet.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Accueil](https://img.shields.io/badge/Accueil-475569?style=flat-square) : Clignotement du fond d’écran corrigé.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Version](https://img.shields.io/badge/Version-475569?style=flat-square) : Ancienne numérotation, conservée pour retrouver cette publication.

[Release](https://nnsprod.com/git/oversu/VulpesOS/releases/tag/android-2.7-156.0.1)

<a id="2.7-preview.2"></a>

## 2.7-preview.2

![Publié](https://img.shields.io/badge/Publi%C3%A9-334155?style=flat-square)

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) ![Accueil](https://img.shields.io/badge/Accueil-475569?style=flat-square) : Clignotement du fond d’écran corrigé.

[Release](https://nnsprod.com/git/oversu/VulpesOS/releases/tag/android-2.7-preview.2)

<a id="2.7-preview.1"></a>

## 2.7-preview.1

![Publié](https://img.shields.io/badge/Publi%C3%A9-334155?style=flat-square)

### ![Android / APK](https://img.shields.io/badge/Android%20%2F%20APK-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Découverte](https://img.shields.io/badge/D%C3%A9couverte-475569?style=flat-square) : Première Preview Android pour découvrir Vulpes sans flasher le téléphone.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) ![Accueil](https://img.shields.io/badge/Accueil-475569?style=flat-square) : Fond d’écran clignotant connu dans cette première version.

[Release](https://nnsprod.com/git/oversu/VulpesOS/releases/tag/android-2.7-preview.1)

<a id="history"></a>

## Premières étapes

### ![Desktop + Sargo](https://img.shields.io/badge/Desktop%20%2B%20Sargo-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Applications](https://img.shields.io/badge/Applications-475569?style=flat-square) : Adaptation des contacts, messages, paramètres, alarmes et du stockage.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Identité](https://img.shields.io/badge/Identit%C3%A9-475569?style=flat-square) : Création de Vulpes : identité visuelle, traductions et informations système.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) ![Moteur](https://img.shields.io/badge/Moteur-475569?style=flat-square) : Passage des anciens moteurs Firefox OS à un Gecko moderne.

### ![Sargo / Pixel 3a](https://img.shields.io/badge/Sargo%20%2F%20Pixel%203a-2563EB?style=flat-square)

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) ![Démarrage](https://img.shields.io/badge/D%C3%A9marrage-475569?style=flat-square) : Premiers démarrages natifs et essais matériels sur le Pixel 3a.
