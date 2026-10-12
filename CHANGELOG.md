# Journal des modifications — Vulpes OS

[English](CHANGELOG.en.md)

PC, Android (APK) et Tundra/Sargo. Les statuts indiquent des sources en développement, un APK construit ou une version publiée. Les changements des sources nécessitent une mise à jour du paquet installé.

<a id="2.7-preview.20"></a>

## 2.7-preview.20 — APK publié · 13 octobre 2026

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Preview 20 réunit les corrections communes depuis l’APK Preview 17 : paramètres Gaia, apparence, sélecteurs, clavier, contacts, Marketplace et médias.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Photo : enregistrement WebM avec miniature et lecture dans Galerie/Vidéo. Autorisation micro demandée ; commandes adaptées aux capacités du matériel.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Caméra : changement de capteur, arrêt et reprise fiabilisés. PC et Android utilisent leurs API caméra ; Sargo conserve son adaptateur HAL.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Sargo : mises à jour Wi-Fi, Bluetooth, appels, SMS/MMS et réglages réseau incluses dans les sources. Les fonctions non raccordées restent indiquées dans les panneaux.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Changelog : reprise des textes simplifiés FR/EN, badges conservés, filtres PC/APK/Sargo indépendants des titres. Markdown, site et notes de release issus du même JSON.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) APK signé avec la clé des Preview précédentes ; alignement et cohérence des 53 fichiers partagés vérifiés. Exécution de cette Preview sur Android non qualifiée dans cette passe : émulateur Android instable sans accélération KVM.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Gecko PC/Sargo 156.0.1 ; GeckoView Android 156.0. Gaia 2.7.0. L’APK délègue appels/SMS à Android : il ne remplace pas le système téléphonique Android.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Preview expérimentale : Compte Mozilla/Sync, localisation distante, extensions Firefox OS et transfert USB restent incomplets. Sargo : aperçu autour de 16 FPS ; son des vidéos et audio téléphonique à qualifier séparément.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Pixel 3a : Preview 20 r62 démarrée en RAM puis flashée sur boot_a. Empreinte relue identique ; démarrage installé, onze contrôles Gaia et dix contrôles natifs réussis. Données conservées, Wi-Fi connecté et enregistrement LTE observé. Pas de nouvelle conversation audio testée.

[Release](https://nnsprod.com/git/oversu/VulpesOS/releases/tag/v2.7-preview.20)

<a id="development-2026-10-12-video-clock"></a>

## En développement — 12 octobre 2026 — Vidéo et réglages de l’heure

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Photo : enregistrement WebM VP8/Opus avec autorisation micro, miniature et stockage. Tampon limité à 32 Mio, arrêt avant libération du capteur.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Photo, Galerie et Vidéo : prise en charge des fichiers WebM et de leurs miniatures.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Paramètres : véritables sélecteurs Date/Heure Gaia, retour du clavier intégré et lettres non tronquées dans les listes.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Améliorer Vulpes : lien vers les tickets du projet. Services non raccordés expliqués dans leurs panneaux.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) PC : vidéo simulée 1920 × 1080 relue ; photo, galerie, reprise caméra et navigation vérifiées.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo r61 en RAM : vidéo 480 × 640 relue, huit bascules avant/arrière réussies. Médias de test supprimés ; son enregistré non écouté.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Sargo : aperçu mesuré autour de 16 FPS contre 12 dans le test précédent. 30 FPS restent à atteindre.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo : heure automatique par NITZ, réglage persistant et protection des écritures manuelles. Synchronisation dépendante du réseau ; pas de NTP de secours, fuseau choisi manuellement.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Android : ressources préparées et Java compilé, sans nouvel APK ni test vidéo Android à cette étape. Compte Mozilla/Sync, localisation distante, extensions Firefox OS et transfert USB restent à implémenter. Aucun flash ni publication.

<a id="development-2026-10-12-settings-calls-hotspot"></a>

## En développement — 12 octobre 2026 — Appels et partage Wi-Fi

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Dialogues Gaia : fermeture après ouverture, transitions interrompues et nouvelle saisie après validation refusée.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Sargo : délai des services opérateur augmenté ; réglages lents séparés des commandes voix/SMS.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo : double appel, présentation du numéro et quatre règles de renvoi raccordés à oFono, avec validation et relecture.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo : point d’accès Wi-Fi WPA2 ou ouvert, configuration NetworkManager et pare-feu adapté. Mot de passe privé, accessible uniquement à Paramètres.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) r59 en RAM : 69 panneaux, dialogues et APN vérifiés sur PC/Pixel. Point d’accès enregistré, activé puis arrêté depuis Gaia ; Wi-Fi précédent restauré. 44 tests Python et régressions des dialogues réussis.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Transit Internet vers un autre appareil non testé. Messagerie vocale, blocage d’appels, PIN/PUK, certificats Wi-Fi et partage USB restent ouverts. Ressources Android synchronisées ; aucun nouvel APK, flash ou publication.

<a id="development-2026-10-12-settings-network"></a>

## En développement — 12 octobre 2026 — Paramètres réseau

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Wi-Fi : adresse IPv4 et débit réels ; ne plus afficher « undefined » lorsqu’une mesure manque.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo : choix GSM/UMTS/LTE et modification des APN Internet/MMS existants, avec validation et relecture.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) APN : refuser les changements d’un profil actif, protéger IMS et les mots de passe, tenter la restauration après échec et signaler son résultat.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Sargo : file bornée pour les réglages lents. Lecture des appels en 20 ms pendant une attente de réglages de 5 secondes.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) 38 tests Python, 69 panneaux PC et parcours APN/réseau sur Pixel en RAM vérifiés. Ressources Android synchronisées.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Ajout, suppression et réinitialisation des APN indisponibles. Sélection manuelle d’opérateur et certificats encore ouverts. Aucun nouvel APK, flash ou publication.

<a id="development-2026-10-12-settings-audit"></a>

## En développement — 12 octobre 2026 — Audit des paramètres

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Paramètres : navigation récupérable après échec d’un contrôleur ou d’un dialogue ; génération cohérente des modules.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Filtres d’accessibilité et assistance Vulpes. Panneaux d’origine conservés avec explication des fonctions indisponibles.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) PC : statistiques du profil et téléchargements Gecko. Android : statistiques du stockage privé.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo : données mobiles, itinérance, horloge et Wi-Fi masqué raccordés. Erreurs des anciennes interfaces réseau du panneau Son corrigées.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) 97 vues inventoriées ; 69 panneaux PC/Pixel ouverts et sept dialogues natifs vérifiés. Stockage, données et fuseau relus après écriture sur r51 en RAM.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Les vues contextuelles et services indisponibles ne sont pas tous qualifiés. Java Android compilé, sans nouvel APK. Aucun flash, ticket fermé ni publication.

<a id="development-2026-10-12-settings-navigation"></a>

## En développement — 12 octobre 2026 — Navigation des paramètres

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Listes déroulantes : sélecteur Gaia avec confirmation/annulation ; choix Clair/Sombre accessible. Gestionnaire SIM adapté à un emplacement.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Panneaux indisponibles : explication et commandes désactivées au lieu de liens sans effet.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Sargo : réseaux Wi-Fi mémorisés séparés des scans lents ; cache conservé lors des lectures d’état.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo : informations SIM, centre SMS et accusés de réception reliés au modem.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) r45 en RAM : huit contrôles d’apparence, cinq panneaux et changement réel des accusés SMS validés, puis réglage restauré. Sélecteur PC vérifié ; ressources APK préparées.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Certificats Enterprise et autres options opérateur encore indisponibles. Aucun SMS émis, nouvel APK, flash ou publication.

<a id="development-2026-10-12-sargo-appearance"></a>

## En développement — 12 octobre 2026 — Correctifs communs sur Pixel 3a

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Sargo : boot r39 en RAM avec correctifs partagés et premier mode sombre. Noyau et configuration matérielle du r35 conservés.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Démarrage, taille d’écran, réglages persistants, batterie, interface d’appel et Fira vérifiés. Services modem, audio, Wi-Fi et Bluetooth actifs.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sept contrôles d’apparence réussis dans Gaia : thème propagé, en-têtes lisibles, libellés placés et retour au clair. Capture Pixel inspectée.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Outil de mise à jour Gaia dans un boot privé, avec empreintes, sources conservées et vérification des composants matériels inchangés.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Aucun nouvel appel, SMS ou appairage testé. Thème complet et comportement Android encore à qualifier. Aucun nouvel APK, flash ou publication.

<a id="development-2026-10-11-appearance-input"></a>

## En développement — 11 octobre 2026 — Apparence et clavier partagé

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Apparence : Clair, Sombre ou Selon le système, partagé entre les applications et conservé au redémarrage. Fonds d’écran, photos et sites externes préservés.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Clavier : opérations d’édition mutualisées, sélection et effacement, protection contre les réponses tardives.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) PC : neuf contrôles d’apparence et gestes de saisie dans Messages réussis, sans envoi de SMS. Revue visuelle de Paramètres, Messages, Téléphone et Contacts.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Android : option expérimentale de clavier Gaia ; clavier Android conservé par défaut et mode de saisie restauré à la fermeture.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Android : réessayer brièvement le même capteur encore occupé, sans réessayer après refus de permission ou fermeture de Photo.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Preview 19 construit localement : signature, alignement, parité et tests du pont/caméra réussis.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Clavier Gaia, caméra avant Android et thème complet encore à qualifier. Sources prêtes pour Sargo, resté sur r35 à cette étape. Aucun upload, flash ni ticket fermé.

<a id="development-2026-10-11-settings"></a>

## En développement — 11 octobre 2026 — Paramètres et accueil

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Paramètres : gestion des sonneries, saisie/effacement du code PIN, désactivation du verrouillage et liste des permissions des applications tierces.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Accueil : première initialisation du second lanceur et aperçus des fonds d’écran.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Langues : actualiser les libellés Vulpes au changement de langue ; anglais de secours hors français. Fermer le panneau d’échec caméra et les bandeaux d’installation.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Android : ouvrir le volet Gaia en touchant la barre de statut. Preview 18 construit, signé et comparé aux sources.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) PC : neuf parcours Gaia, cinq contrôles de bandeaux et douze tests activités/caméra réussis. Bluetooth Sargo r35 confirmé par l’utilisateur.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Redémarrage à chaud du compositeur encore instable : fichiers restaurés et retour à r35. Corrections non qualifiées sur Sargo à cette étape ; clavier/thème Android ouverts. Aucun APK publié ni flash.

<a id="development-2026-10-09-mms-bluetooth"></a>

## En développement — 9 octobre 2026 — MMS et Bluetooth

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Bluetooth : adaptateur Gaia partagé, commandes matérielles séparées et accès limité aux applications autorisées.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo : activation, découverte, appairage explicite, connexion et suppression depuis le panneau Bluetooth Gaia. Modules audio Bluetooth intégrés.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Sargo : services réseau Qualcomm et transport MMS raccordés. Une déconnexion D-Bus ne termine plus le daemon MMS. État persistant, reprise sans doublon ni renvoi automatique incertain.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) r35 en RAM : MMS avec image visible et accepté par le MMSC Orange ; réception destinataire à confirmer. Cinq appareils Bluetooth détectés, A2DP vers PC validé.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) 191 tests Python Tundra et 18 tests JavaScript réussis. Ramdisk allégé et ressources Android synchronisées.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Audio d’appel via casque non qualifié. Aucun nouvel APK, flash ni push à cette étape.

<a id="development-2026-10-08-camera-mms"></a>

## En développement — 8 octobre 2026 — Caméra et transport MMS

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Caméra : arrêter le flux avant de détacher la vidéo ; attendre la fermeture du capteur, réinitialiser le viseur et recalculer sa taille après rotation.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) MMS : préserver les pièces jointes Blob et garder les messages en attente jusqu’à confirmation du transport.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Sargo : viseur WebGL réutilisé sans recapture vidéo intermédiaire ; écran maintenu éveillé pendant l’aperçu.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) PC et Sargo : parcours Photo/Galerie et huit bascules natives vérifiés. JPEG, focus et zoom fonctionnels ; arrière ~16 FPS, avant ~25–27 FPS dans cet essai.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo : file MMS persistante, codec Nuntium et transport oFono. Interface texte/photo testée avec transport simulé.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Données mobiles bloquantes pour les MMS opérateur à cette étape. Ressources Android synchronisées ; aucun nouvel APK, flash ou push.

<a id="development-2026-10-08-call-log-dialogs"></a>

## 8 octobre 2026 — Rappel et messages d’erreur

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Dialogues Gaia : texte visible au lieu d’un écran gris avec un bouton seul.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Journal d’appel : rappel via le même service que le pavé numérique, sans anciennes API Gecko. Fichier partagé PC/Android/Sargo.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) MMS : signaler clairement l’envoi indisponible, garder texte et pièces jointes, ne plus annoncer un faux mode avion.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) PC : dialogues FR/EN et composeur préservé. Sargo en RAM : 11 contrôles Gaia réussis, rappel testé avec modem simulé.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Aucun appel réel ni validation audio dans cette étape. Ressources Android synchronisées, aucun nouvel APK publié.

<a id="development-2026-10-08-sms-audio"></a>

## En développement — 8 octobre 2026 — SMS et audio

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) SMS : envoyer en un appui en conservant le clavier. Trombone raccordé au menu Gaia : image, audio, vidéo ou contact.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Interface : indicateur de volume visible, gestes du verrouillage et balayage des notifications corrigés.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) PC : clavier, pièces jointes, Galerie, interface d’appel et volume vérifiés ; notification balayée sans déplacer la page. Aucun nouvel APK publié.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Sargo : accès à PulseAudio, relais Qualcomm, protocole D-Bus et périphériques de calibration rétablis. Service audio Android concurrent retiré.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo : 11 contrôles Gaia, calibration et prévisualisations arrière/avant/arrière réussis.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Appels échouant avant sonnerie avec une erreur réseau dans cet essai. Audio bidirectionnel, geste Pixel et MMS encore non validés. Aucun flash ni publication.

<a id="development-2026-10-08-radio-reliability"></a>

## En développement — 8 octobre 2026 — Fiabilité téléphonie

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Sargo : service radio maintenu après fermeture d’un client. Jamais de nouvel appel ou SMS automatique après une réponse perdue. Erreurs sans numéro ni texte du message.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Diagnostic réseau/audio sans identifiants personnels et paramètres opérateur épinglés dans l’image native.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) SMS : attendre le vrai gestionnaire Gaia et accepter les identifiants oFono avec majuscules. Contrôle des conversations rétabli sans réémission.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo : LTE retrouvé après redémarrage, SMS confirmé envoyé par le modem, microphone non silencieux et lecture audio acceptée.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Réception destinataire, audio d’appel bidirectionnel et stabilité modem restent à qualifier. Compositeur instable au redémarrage à chaud. Aucun nouvel APK, flash ou push.

<a id="2026-10-08-source-publication"></a>

## 8 octobre 2026 — Mise à jour des sources publiques

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Publication des correctifs Caméra, Contacts, SMS et Marketplace, et des outils Sargo de construction et de restauration.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) README français et anglais actualisés avec les fonctions et limites vérifiées.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Création du dossier de rapports lors du contrôle de parité Android sur un dépôt neuf.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Configuration Wi-Fi native vérifiée : aucun profil de connexion embarqué.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Documents internes, données personnelles et clés exclus du dépôt.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) APK public inchangé (Preview17) ; correctifs du 8 octobre non inclus. Aucune nouvelle image native publiée.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Sargo : modem encore en recherche réseau ; audio des appels, appairage et profils Bluetooth à valider.

<a id="development-2026-10-08-camera-lifecycle"></a>

## 8 octobre 2026 — Caméra et parcours Contacts · en développement

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Caméra : ouvertures successives, libération du capteur et identification avant/arrière corrigées.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Contacts : transport des photos et des dates corrigé sur PC, Android et Tundra.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Contacts : actualisation après modification, ouverture de SMS, sélection d’un numéro et préremplissage du pavé numérique rétablis.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Galerie : ouverture en mode sélection pour la photo d’un contact, même si l’application est déjà ouverte.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Sargo : fichiers Contacts corrigés inclus dans l’image de démarrage.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Android : transmission du destinataire et du texte à l’application SMS, y compris les réponses et les numéros non encore validés.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Tests de caméra, stockage des contacts, permissions, transport binaire et activités.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) PC : capture JPEG, Galerie, photo de contact, création, édition, recherche, favoris et suppression vérifiés. Aucun appel ni SMS émis.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo en RAM : autofocus, zoom, quatre bascules de caméra, capture et Galerie vérifiés ; parcours Contacts testés au toucher.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo : conversations stockées, clavier et notifications vérifiés ; quatre réseaux Wi-Fi détectés. Nouveaux SMS et audio d’appel à valider.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo : BlueZ et ses dépendances avec empreintes SHA256. Activation et recherche Bluetooth testées ; appairage et profils à valider.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo : magasin de certificats natif. HTTPS, archives altérées, collisions de fichiers et reconstructions testés.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Preview17 publié avec téléchargement et SHA256 vérifiés. Les correctifs ci-dessus restent dans les sources ; essai SMS Android réel nécessaire. Aucun flash Sargo.

<a id="development-2026-10-06-marketplace-theme"></a>

## 6 octobre 2026 — Thème Marketplace intégré · en développement

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Marketplace : thème intégré avec Fira locale, navigation compacte, boutons tactiles, filtres repliables et captures défilantes.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Conservation de `mode=app` dans la navigation, la recherche, les filtres et le changement de langue.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) En-têtes du site masqués en mode intégré. Confirmations gérées par Gaia, sans privilèges supplémentaires pour le catalogue.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) 16 pages FR/EN, 2 pages classiques et affichages mobiles à 320 et 360 pixels vérifiés.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Thème prêt localement, non déployé. Lanceurs PC et Sargo mis à jour ; intégration Android au prochain APK.

<a id="development-2026-10-06-system-banner"></a>

## 6 octobre 2026 — Bandeaux Gaia · en développement

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Fermeture automatique du bandeau « Application installée », même sans événement de fin d’animation.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Annulation des anciens délais lorsqu’un nouveau bandeau remplace le précédent.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) PC : affichage, expiration, remplacement et fermeture au clic vérifiés. Sargo : disparition après cinq secondes vérifiée en RAM.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Correctif disponible dans les sources communes pour le prochain APK. Aucun flash ni publication.

<a id="development-2026-10-06-wifi"></a>

## 6 octobre 2026 — Wi-Fi et panneaux Paramètres · en développement

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Paramètres : ouverture des panneaux même sans événement de fin d’animation, sans double initialisation.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Sargo : événements Wi-Fi corrigés pour rétablir l’affichage des réseaux et signaler correctement la déconnexion.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo : quatre points d’accès détectés, regroupés en deux réseaux. Connexion confirmée et requête HTTPS réussie avec certificats vérifiés.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Sources communes, serveur PC et essai Sargo en RAM mis à jour. Correctifs non inclus dans l’APK public.

<a id="development-2026-10-06-marketplace-views"></a>

## 6 octobre 2026 — Marketplace · en développement

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) PC/Sargo : catalogue Marketplace contenu sous la barre de statut, masqué à l’accueil et retiré à la fermeture.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Une navigation annulée ou une ancienne page d’erreur ne masque plus la nouvelle tentative.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Message d’erreur local avec bouton Réessayer lorsque le catalogue est inaccessible.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) PC : navigation, erreur réseau, nouvelle tentative, accueil et fermeture vérifiés.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo en RAM : sept contrôles réussis avec une page locale et déverrouillage forcé. Catalogue distant non validé sans connexion Internet.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) APK Preview17 local reconstruit ; signature, alignement et ressources vérifiés. Aucun nouveau test sur appareil Android ni publication.

<a id="2.7-preview.17"></a>

## 2.7-preview.17 — APK construit · 5 octobre 2026

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Marketplace sur l’accueil, avec son icône originale et le catalogue Vulpes en français ou en anglais.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Installation confirmée des applications ZIP, lancement depuis l’accueil et désinstallation.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Applications installées isolées des sources Gaia et des privilèges système.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) PC : parcours complet avec 2048 et contrôles des archives, chemins, limites, annulations et confirmations à usage unique.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) APK Preview17 construit et signé avec Marketplace, GeckoView et stockage privé des paquets.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Émulateur Android 16/API 36 : installation, lancement, isolation, conservation après redémarrage de l’application et désinstallation de 2048.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo en RAM le 6 octobre : accueil et ressources Marketplace vérifiés, 9 contrôles système sur 10 réussis. Variation du viewport au déverrouillage ; installation de paquets à valider.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Prise en charge initiale des applications web empaquetées. Anciennes API privilégiées et applications hébergées non restaurées. Aucune publication à cette étape.

<a id="2.7-preview.16"></a>

## 2.7-preview.16 — APK construit · 5 octobre 2026

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Sélecteurs Gaia de fond d’écran et de sons rétablis, avec retour vers Paramètres et annulation par Accueil.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Changement de langue appliqué à l’accueil et conservé après redémarrage.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Arrêt du balayage horizontal sur chaque page ; applications de développement masquées sur l’accueil.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Logo Vulpes au démarrage et liste des sons adaptée au moteur actuel. Transport des médias partagé entre PC et Android.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Android : verrouillage Gaia après veille et retour depuis la caméra du verrouillage. Mode lanceur HOME validé.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Android : barres système masquées en mode immersif, accessibles par balayage. APK Preview16 construit et signé.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) PC et émulateur Android 16/API 36 : fonds d’écran, sons et panneaux vérifiés ; langue, verrouillage et persistance du fond testés sur Android.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Sargo : image de démarrage mise à jour pour ne plus restaurer d’anciens fichiers.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo en RAM : 6 contrôles d’interface et 10 contrôles système réussis. Installation conservée en Preview15, sans flash.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) APK non publié. Installation FFAA et audio d’appel à valider ; le choix d’un son Gaia ne change pas la sonnerie Android.

<a id="2026-10-04-sargo-standalone"></a>

## En développement — 4 octobre 2026 — Installation autonome Sargo

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo : volume ext4 autonome pour userdata, avec système, données et composants vendor/modem. Installation indépendante de Droidian et d’ADB.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Installateur Fastboot avec contrôles du modèle, du déverrouillage, des tailles et des empreintes. Remplacement de userdata, dtbo_a, vbmeta_a et boot_a ; calibrations conservées.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sauvegarde complète de userdata et archive de restauration vérifiées avant le flash. Restauration réelle non testée.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Deux démarrages installés réussis : 11 contrôles Gaia et 10 contrôles natifs par démarrage, réglages conservés et boot relu conforme.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Variante sans SSH ni clés de maintenance démarrée après flash. Variante de développement réinstallée ; caméra, clavier et notifications vérifiés.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Paquet Fastboot local assemblé ; 44 tests ciblés réussis.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Paquet non publié : provenance et redistribution de composants matériels à finaliser. Essais sur un seul Pixel 3a ; volume de 8 Gio dont 1 Gio modifiable, sans extension automatique.

<a id="2026-10-03-sargo-per-device-installation"></a>

## En développement — 3 octobre 2026 — Installation Sargo par appareil

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo : dossier appareil portable pour les builds, l’installation et le secours, indépendant de l’inventaire du Pixel de développement.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Collecte en lecture seule des six partitions de démarrage et du stockage, liée à l’identité du téléphone. Sauvegardes privées.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Transfert SSH avec contrôle d’identité, du stockage et des empreintes, sans écrasement, formatage ni flash.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Deux boots RAM : 11 contrôles Gaia et 10 contrôles natifs réussis chacun ; réglage conservé. Timeout autofocus au premier essai, caméra fonctionnelle au second.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Retour au build installé vérifié ; boot inchangé et écrasement des données refusé.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Timeout autofocus non déclaré corrigé. Provenance exacte du HAL encore à établir ; noyau et stockage ext4/LVM compatibles requis, sans installation directe depuis Android d’origine.

<a id="2026-10-03-sargo-installation-tools"></a>

## En développement — 3 octobre 2026 — Préparation et secours Sargo

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo : préparation locale des paquets avec contrôles d’empreintes, décompression bornée, vérification ext4 et création de données vierges sans écrasement.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Kit de secours privé avec sauvegarde de boot_a et contrôles du modèle, du numéro de série, du slot et des empreintes. Données utilisateur non incluses.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Restauration possible sans l’image de diagnostic.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Construction système : référence matérielle ARM64 complète exigée.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Archive système préparée et kit de secours vérifié localement. Installation sur un autre Sargo à finaliser ; aucun flash ni ROM publiée.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Journal JSON inclus dans les prochaines publications de sources ; documents de travail exclus.

<a id="2026-10-03-sargo-modem-persistence"></a>

## En développement — 3 octobre 2026 — Sargo : récupération modem et installation vierge

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Sargo : cache des polices et création du dossier privé oFono au premier démarrage corrigés dans l’image système.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Récupération du modem sans redémarrer le téléphone. Réenregistrement réseau mesuré à environ 22 secondes lors d’un essai contrôlé.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Profil neuf : Gaia, rendu matériel, Fira, deux caméras, focus, zoom, clavier et notifications vérifiés. Scan Wi-Fi fonctionnel après redémarrage du modem.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Deux démarrages avec conservation des réglages dans un espace de données séparé. Installation existante préservée.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Cause du watchdog IMS non corrigée. Paquet public d’installation et de restauration encore incomplet ; aucune image publiée.

<a id="2026-10-01-sargo-distribution-preparation"></a>

## 1er octobre 2026 — Sargo : préparation de la distribution — en développement

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Sargo : image Preview15 reconstruite avec profils vierges, licences et inventaire des 493 paquets. Documents de travail exclus.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Table de montage générée depuis l’inventaire du stockage. Prise en charge limitée à une seule étendue ext4 sur userdata.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Droits du cache des polices au premier démarrage : fc-cache exécuté avec le compte de session.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Contrôles ext4, contenu et transfert réussis. Essais RAM sans écriture de boot_a ; retour au build v59 vérifié.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) SIM, LTE, scan Wi-Fi, Gaia, rendu matériel, Fira, caméras, clavier et notifications vérifiés en RAM.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Récupération ciblée après identification d’un redémarrage intermittent du firmware IMS. Second démarrage réussi ; nouveau crash IMS non testé.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Qualification de l’image incomplète, sans validation des appels, SMS ou données mobiles de bout en bout. Image non publiée et non flashable.

<a id="2.7-preview.15"></a>

## 2.7-preview.15 — 30 septembre 2026 — publiée

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Première publication des sources PC, Android et Tundra, avec README FR/EN, licences et scripts de préparation. Fichiers privés exclus.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) SMS : dates des bulles et états d’envoi/échec corrigés. Libération et remplacement des flux caméra fiabilisés.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) PC : tests de navigation stabilisés, délai de démarrage à froid ajusté et fermeture propre après dépassement du délai Gaia.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) PC avec Gecko 156.0.1 : 42 tests de services, démarrage, navigation, réglages, gestes, historique, isolation et persistance vérifiés.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) APK Preview15 signé avec la clé précédente et GeckoView 156.0 ; parité des ressources vérifiée.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Émulateur Android 16 : mise à jour, Photo/Galerie, reprise caméra, dix retours d’arrière-plan et récupération du rendu validés.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Sargo : sources incluses, build privé v59 conservé. Aucune ROM générique ; démarrage lié au stockage et aux images préinstallées.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Sargo : aperçu proche de 16 i/s ; flash, vidéo, rotation et veille profonde incomplets. Audio d’appel et dialogue après envoi SMS à examiner.

[Release](https://nnsprod.com/git/oversu/VulpesOS/releases/tag/v2.7-preview.15)

<a id="development-2026-09-30-sms-camera-followup"></a>

## En développement — retours SMS et caméra · 30 septembre 2026

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) SMS : conversion des dates pour corriger les conversations vides.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Caméra : fermeture des flux et libération du capteur corrigées ; une ancienne session ne peut plus fermer la suivante.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Sargo : arrêt physique du vibreur via DRV2624, avec coupure de secours au démarrage et à l’arrêt du service.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) PC : composition et affichage des SMS vérifiés avec modem simulé. Sargo : bascules caméra et arrêt du capteur testés sur deux boots RAM.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo v54 : focus, zoom et SMS dans les deux sens confirmés par l’utilisateur. Cinq conversations affichées ; arrêt du vibreur confirmé.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Sargo v59 installé sur boot_a après deux boots RAM ; démarrage, relecture et slot A vérifiés.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Dialogue après envoi SMS et fluidité caméra encore à traiter. Sources communes mises à jour, sans nouvel APK.

<a id="development-2026-09-30-sms-camera"></a>

## En développement — SMS et Photo · 30 septembre 2026

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) PC/Tundra : conservation des SMS après refus du modem et transmission des états envoi, échec et envoyé à Gaia.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Sargo : états SMS persistants après disparition de l’objet oFono ; envoi refusé si le modem n’est pas enregistré.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo : focus tactile, zoom numérique et capture JPEG du capteur dans Photo Gaia.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Photos mesurées : 4032 × 3024 à l’arrière, 3264 × 2448 à l’avant. Aperçu 640 × 480 ; focus avant fixe.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Caméra native : données binaires séparées des traces HAL, réponses bornées et reprise de l’aperçu après capture ou erreur de focus.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) PC : échec d’envoi visible et parcours Photo/Galerie vérifiés. Sargo v54 : deux boots RAM puis installation, persistance et caméra validées.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Réseau instable ; aucune livraison SMS de bout en bout confirmée dans cette passe. Confirmation modem distincte de l’accusé de réception. APK public inchangé (Preview14).

<a id="2.7-preview.14"></a>

## 2.7-preview.14 — APK publié · 30 septembre 2026

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Informations système : alignement des versions et polices Fira dans les composants Shadow DOM.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) PC/Tundra : taille des touches en portrait, curseur dans le champ actif et réponses de saisie obsolètes.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) PC/Tundra : pont clavier Gaia et pavé numérique pour les destinataires SMS. Clavier Android inchangé.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Verrouillage : redimensionnement sans fenêtre clavier. Notifications silencieuses respectées, y compris après restauration.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo : notifications persistantes dans le volet et sur le verrouillage, avec ouverture de l’application concernée.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo : vibrations annulables, limitées à dix secondes ; profils Wi-Fi privés persistants, reconnexion automatique et oubli du réseau.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Sargo : stockage des SMS entrants avant acquittement, dédoublonnage et création du dossier d’état.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo : commandes écouteur/haut-parleur, micro muet et volume d’appel. Bascule, sourdine et volume testés hors appel.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Installation : flash des images de diagnostic avec débogueur refusé. Sargo v48 installé après deux boots RAM ; persistance, relecture et slot A vérifiés.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) PC : Calendrier et clavier vérifiés. Sargo : clavier, notifications et reconnexion Wi-Fi vérifiés ; son des notifications et téléphonie réelle à valider.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) APK Preview14 signé et publié. Démarrage, versions et polices vérifiés sur émulateur Android 16. Aucune image Sargo publiée.

[Release](https://nnsprod.com/git/oversu/VulpesOS/releases/tag/android-2.7-preview.14)

<a id="2.7-preview.13"></a>

## 2.7-preview.13 — parcours dans les applications · 27 septembre 2026

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Calendrier : sauvegarde des événements avec alarme, remontée des erreurs et exclusion des rappels d’événements supprimés.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Notifications : texte vide accepté ; notification refusée non marquée comme livrée. Support natif Tundra encore incomplet.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Galerie : taille des vignettes au démarrage masqué et arrêt des mises à jour après fermeture de l’éditeur.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) SMS : filtres par correspondant, lecture, période et livraison appliqués.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) PC : vidéo WebM, édition et copie de photo, calendrier, lecture et suppression des conversations vérifiés.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Copie isolée : démarrage, tests PC, persistance et empaquetage Android réussis.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) APK Preview13 construit et signé. Photo/Galerie, Calendrier, dix reprises d’arrière-plan et récupération du rendu validés sur Android 16 émulé.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo v40 installé après deux boots RAM ; Gaia, caméra, Wi-Fi, luminosité, commandes et relecture de boot_a vérifiés.

<a id="2.7-preview.12"></a>

## 2.7-preview.12 — revue des applications · 27 septembre 2026

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Icônes Gaia : variantes de 1× à 2,25× restaurées dans 1 047 références CSS.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Photo : changement de capteur après détection et désactivation du zoom de l’interface au pincement. Flash indisponible grisé.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Accueil : appui long et transmission des gestes rétablis, sans privilèges supplémentaires pour les sites web.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Navigateur : page d’accueil locale bilingue, suivant la langue Gaia sans redémarrage.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) SMS : identifiants, migration, dates, événements d’envoi, requêtes multi-destinataires et écritures concurrentes corrigés.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Calendrier : libellé d’accessibilité du jour courant rétabli dans 37 langues.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Revue de 14 applications ; 26 contrôles Galerie/Musique/Horloge/UI, tests Contacts/SMS et isolation web.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) APK Preview12 reconstruit avec les mêmes ressources ; parité vérifiée. Fonctions matérielles adaptées séparément sur Android et Tundra.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Sargo : aperçu caméra NV21 par shader et transport binaire, environ 23 i/s mesurées contre 8 dans l’essai intermédiaire.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Sargo : fermeture du worker caméra attendue avant changement de capteur ; luminosité manuelle réglée en environ 200 ms.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo : activation Wi-Fi depuis Gaia et connexion WPA-PSK aux réseaux mixtes WPA2/WPA3.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo : scan, connexion et HTTPS validés en RAM. v38 installé après deux boots RAM, relecture et slot A vérifiés.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Sargo : profils Wi-Fi temporaires ; flash, vidéo, capteurs, Bluetooth, comptage de données et appels avancés incomplets.

<a id="development-2026-09-27-4"></a>

## En développement — retours Sargo et interface · 27 septembre 2026

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Animation d’arrêt Gaia recolorée en bleu.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Téléphone : en-têtes fixes au changement d’onglet et icônes du journal adaptées aux densités jusqu’à 2,25×.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Texte coupé dans les menus déroulants et débordement du texte d’accueil Vidéo.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Luminosité : valeurs numériques et regroupement des commandes obsolètes, avec ordre veille/réveil préservé.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Accueil : fond sous le dégradé et bouton à droite en paysage, sans recouvrir les applications.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Navigateur : page d’accueil locale modifiable, avec mode privé conservé.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Wi-Fi : message d’erreur et bouton Réessayer à la place des relances sans fin.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) APK Preview11 construit et signé ; rotation et position du bouton Accueil vérifiées sur Android 16 émulé.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo : aperçu, JPEG et bascules caméra validés en RAM. Capture limitée à 640 × 480 ; flash et vidéo indisponibles.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo v33 installé après deux boots RAM ; démarrage, données, relecture et slot A vérifiés. Luminosité et résultats Wi-Fi contrôlés dans Gaia.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Sargo : compatibilité PulseAudio 14 et suppression du double chargement des modules audio. Profils appel/média et écouteur testés.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Sargo : conversation audio, capture pleine résolution, vidéo et rotation automatique à valider.

<a id="development-2026-09-27-3"></a>

## En développement — stabilité Wi-Fi native · 27 septembre 2026

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Wi-Fi : intervalle de recherche rétabli à 20 secondes et regroupement des scans simultanés.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Sargo : un seul scan matériel à la fois, avec cache court et invalidation à la connexion/déconnexion. Corrige l’épuisement mémoire des builds v21/v22.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Tests de rafales, erreurs et temporisation Wi-Fi.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Version commune Preview9, Gaia 2.7.0 ; nouvel APK avec les mêmes sources. Wi-Fi Android toujours géré par Android.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo v25 : deux boots RAM puis installation, 11 contrôles Gaia et 10 système réussis, sans arrêt de processus par manque de mémoire.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Verrouillage, polices, batterie, date et Wi-Fi vérifiés ; veille/réveil et volume testés par événements injectés. Données, relecture et slot A contrôlés.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Caméra native et validation complète des appels encore à terminer.

<a id="development-2026-09-27-2"></a>

## En développement — restauration Gaia · 27 septembre 2026

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Panneaux Gaia restaurés : Paramètres, Suivi conso, FM et imports. Interfaces provisoires retirées ; fonctions indisponibles désactivées.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Styles des anciens composants, icônes du verrouillage et glyphes Téléphone corrigés.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Espace de 44 pixels réservé au bouton Accueil ; date et batterie rétablies, sans texte `{{ level }}`.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Verrouillage Gaia réactivé, splash stabilisé, nom Navigateur/Browser localisé et crédits ajoutés.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) PC : 26 contrôles applicatifs réussis, plus panneaux, imports, batterie, navigation et appels simulés.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) APK Preview8 installé sur Android 16 émulé : batterie Android, accès aux paramètres et mode HOME optionnel. Catalogue Android encore incomplet.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Android émulé : dix reprises d’arrière-plan, récupération du rendu et parité des ressources vérifiées. Verrouillage Gaia distinct de la sécurité Android.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo v21/v22 : scan et association Wi-Fi raccordés à Gaia via NetworkManager.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo : essais RAM interrompus par l’arrêt du service graphique (code 139). Retour au v20 installé vérifié, sans nouveau flash.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Wi-Fi du candidat, caméra, API SIM/Bluetooth et suspension CPU non validés.

<a id="development-2026-09-27-1"></a>

## En développement — 27 septembre 2026

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Callscreen Gaia pour les appels entrants/sortants, avec réponse et raccrochage. Remplace l’écran provisoire v13.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Journal d’appels persistant avec acquittement et dédoublonnage.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Batterie inconnue distincte d’une batterie vide ; index Contacts absent ou mal formé toléré.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Textes système affichés avec Fira Sans, sans modifier les polices d’icônes.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) PC avec modem simulé : appels, raccrochage en échec puis nouvel essai, journal, veille/réveil, menu Power, volume et batterie.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo : boutons Power/Volume raccordés à Gaia et commandes natives d’écran, volume, arrêt et redémarrage.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Sargo : luminosité et alimentation sérialisées pour éviter l’écran noir au réveil ; accès PulseAudio corrigé pour le volume.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Sargo : un raccrochage réussi avec réponse D-Bus vide ne produit plus de fausse erreur.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo v13 puis v20 installés après essais RAM ; démarrage, relecture, réglages et validation du slot contrôlés.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Appel sortant réel arrivé à la sonnerie puis raccroché. Appels entrants et audio de conversation non validés.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Diagnostic caméra : un timeout n’est plus présenté comme une initialisation réussie. Deux capteurs détectés, sans trames reçues.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Caméra native indisponible, suspension CPU et commandes audio avancées incomplètes. Aucun nouvel APK.

<a id="development-2026-09-26-1"></a>

## En développement — 26 septembre 2026

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Polices Fira Sans historiques utilisées dans Gaia et Tundra ; repli sans-serif et contrôle Fontconfig corrigés.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Boutons de diagnostic retirés des Paramètres.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Panneau matériel : capacités de la plateforme transmises correctement pour afficher la batterie.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Sargo : erreurs modem et transport distinguées ; message caméra indisponible corrigé.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo : données persistantes sur ext4 2 Gio et validation du succès A/B après installation.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo v8 : deux boots avec persistance, 9 contrôles Gaia et 9 système par boot. Outils d’installation et de secours testés localement.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo v9 installé sur boot_a : deux démarrages avec 10 contrôles Gaia et 9 système chacun. Relecture conforme, cinq autres partitions préservées ; restauration réelle non testée.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Démarrage normal sans gestes de diagnostic automatiques ; plein écran établi avant Gaia, dimensions stables à 360 × 740 pixels CSS.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Mode `--diagnostics` séparé ; images de diagnostic exclues du lancement normal.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo : v13 testé en RAM (8 contrôles de démarrage, 9 système), v14 en diagnostic (13 contrôles interactifs), Wi-Fi inclus.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Enregistrement UMTS, lecture audio et signal du micro vérifiés. Audio d’appel, caméra et veille non validés.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Construction du ramdisk indépendante de la langue du PC grâce à readelf en locale C.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Essais privés, sans ROM publique. Sources PC synchronisées ; correctif commun disponible pour Android, sans nouvel APK.

<a id="development-2026-09-25-1"></a>

## En développement — 25 septembre 2026

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Bouton Accueil rond, dégradé transparent sur le fond d’écran et barre bleue dans les applications.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Dégradé masqué en bas de page et rétabli au défilement ; plus de rectangle bleu à l’appui sur Accueil.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Fira Sans embarquée avec graisses et italiques ; versions produit, Gaia, moteur et plateforme affichées séparément.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Reprise du chargement des icônes après une première mesure de taille nulle sur les trois plateformes.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) PC : icônes, navigation, permissions et panneau Informations FR/EN vérifiés avec Gecko 156.0.1.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Android : état de navigation conservé après recréation de l’activité. Compilation Java réussie ; rendu à retester, aucun nouvel APK livré.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Tundra : image ext4 avec runtime ARM64, HAL, Phoc, Gecko et Gaia ; petits correctifs embarqués dans le ramdisk.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo : backend dédié, informations Pixel 3a et lecture matérielle de la batterie. Sources de construction archivées avec empreintes.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo : WebRender matériel, icônes et polices contrôlés sur capture physique. v5 : 10 contrôles Gaia et 8 système réussis.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Sargo : ajout de pd-mapper, désactivation d’IPA non initialisé et du sondage caméra prématuré. Données NV du modem copiées en RAM pour les essais.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Sargo v6 : scan Wi-Fi, connexion, IPv4, DNS et HTTPS vérifiés ; 13 contrôles Gaia et 9 système réussis. Sélection du réseau dans Gaia encore à raccorder.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Essais RAM sans flash, retour automatique après dix minutes et modifications perdues à l’arrêt. Démarrage à froid réussi ; redémarrage à chaud du compositeur en échec.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Pas de ROM publique ; modem, audio, caméra et veille encore à intégrer ou valider.

<a id="2.7-preview.7"></a>

## 2.7-preview.7 — APK construit, référence locale

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Permission caméra sur PC et reprise après la première autorisation Android.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Messages distincts pour une permission refusée, un capteur absent et un échec d’ouverture.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Versions produit et moteur séparées : Vulpes Preview7, Gaia 2.7.0, Gecko PC 156.0.1 et GeckoView Android 156.0.

<a id="2.7-preview.6"></a>

## 2.7-preview.6 — APK construit

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Photo Gaia sur PC et Android : aperçu et capture JPEG via webcam ou GeckoView.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Enregistrement dans Galerie et import par le sélecteur du système.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Flash et vidéo désactivés ; changement de caméra selon les capteurs disponibles.

<a id="2.7-preview.5"></a>

## 2.7-preview.5 — APK construit

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Versions centralisées dans `release.json` ; produit, Gaia et moteur séparés.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Interface native commune PC/Android et contrôle de parité des ressources de l’APK.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) PC : réglages Linux, imports médias/vCard, notifications et capture webcam de test.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Android : retour au premier plan et récupération après arrêt du processus de rendu.

<a id="2.7-156.0.2"></a>

## 2.7-156.0.2 — APK historique construit (révision 4)

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Android : reprise de l’activité et des sessions pour réduire les écrans blancs.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Accès aux réglages Android, volume et luminosité de la fenêtre.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Import de médias et contacts ; notifications natives avec permissions.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Transfert vers Téléphone, SMS, Horloge et Appareil photo Android. Aucun envoi silencieux ni remplacement des applications par défaut.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Numérotation historique : moteur Android Gecko 156.0, malgré le nom 2.7-156.0.2.

<a id="2.7-156.0.1"></a>

## 2.7-156.0.1 — APK publié (révision 3)

- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Nom « Vulpes OS - Preview » et icône du projet.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Clignotement du fond d’écran corrigé.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Numérotation historique, distincte de la version du moteur Android.

[Release](https://nnsprod.com/git/oversu/VulpesOS/releases/tag/android-2.7-156.0.1)

<a id="2.7-preview.2"></a>

## 2.7-preview.2 — APK publié

- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Clignotement du fond d’écran dans la Preview Android.

[Release](https://nnsprod.com/git/oversu/VulpesOS/releases/tag/android-2.7-preview.2)

<a id="2.7-preview.1"></a>

## 2.7-preview.1 — APK publié

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Première Preview Android avec Gaia et GeckoView.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Version archivée ; clignotement du fond d’écran connu.

[Release](https://nnsprod.com/git/oversu/VulpesOS/releases/tag/android-2.7-preview.1)

<a id="history"></a>

## Étapes antérieures — rétrospective technique

- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Base Gaia historique avec identité Vulpes, fond d’écran, traductions et informations système.
- ![Change](https://img.shields.io/badge/Change-64748B?style=flat-square) Portage expérimental Gecko 45 vers 52, puis séparation de Gaia, des services et du moteur.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) API de réglages, applications, contacts, messages, alarmes, stockage et communications entre applications.
- ![Fix](https://img.shields.io/badge/Fix-52677D?style=flat-square) Adaptation des composants Gaia, gestes tactiles, navigateur et applications aux moteurs récents.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Mise à jour Gecko avec contrôles et retour arrière ; mise à jour Gaia sans recompilation du moteur.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Applications Firefox OS archivées, QEMU, puis Gecko ARM64 dans Droidian et sous compositeur dédié.
- ![Add](https://img.shields.io/badge/Add-487768?style=flat-square) Sargo : inventaire, sauvegardes de boot, racine distincte, services HAL et PID 1 Tundra.
- ![Test](https://img.shields.io/badge/Test-75658A?style=flat-square) Essais graphiques Fastboot temporaires avec secours SSH et retour automatique.
- ![Note](https://img.shields.io/badge/Note-6B7280?style=flat-square) Noyau 4.9-124-google-sargo, adaptation Android 9/API 28. Étapes historiques, sans nouvelles releases datées.
