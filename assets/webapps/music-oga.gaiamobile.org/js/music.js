;'use strict';var App=(function(){var app;var chromeInteractive=false;init();function init(){navigator.mozL10n.once(function onLocalizationInit(){window.performance.mark('navigationLoaded');Database.init();TitleBar.init();TabBar.init();setStartMode();navigator.mozL10n.ready(function(){ModeManager.updateTitle();if(!chromeInteractive){chromeInteractive=true;window.performance.mark('navigationInteractive');}});});}
function setStartMode(){if(document.URL.indexOf('#pick')!==-1){navigator.mozSetMessageHandler('activity',function activityHandler(a){var activityName=a.source.name;if(activityName==='pick'){document.body.classList.add('picker-mode');app.pendingPick=a;document.getElementById('overlay-cancel-button').addEventListener('click',function(){if(App.pendingPick){App.pendingPick.postError('pick cancelled');}});}
TabBar.option='title';ModeManager.start(MODE_PICKER);});}else{TitleBar.doneButton.parentNode.removeChild(TitleBar.doneButton);TabBar.option='mix';ModeManager.start(MODE_TILES);}}
function showOverlay(id){document.activeElement.blur();app.currentOverlay=id;function setVisibility(visible){Array.forEach(document.body.children,function(elt){if(elt.id==='overlay'){elt.classList.toggle('hidden',!visible);}else{elt.setAttribute('aria-hidden',visible);}});}
if(id===null){setVisibility(false);return;}
var menu=document.getElementById('overlay-menu');if(app.pendingPick){menu.classList.remove('hidden');}else{menu.classList.add('hidden');}
var l10nIds={'title':id+'-title','text':id+'-text'};if(id==='nocard'){l10nIds.title='nocard2-title';l10nIds.text='nocard3-text';}
var titleElement=document.getElementById('overlay-title');var textElement=document.getElementById('overlay-text');titleElement.dataset.l10nId=l10nIds.title;textElement.dataset.l10nId=l10nIds.text;setVisibility(true);}
function showCorrectOverlay(){if(app.knownSongs.length>0){if(app.currentOverlay==='empty'||app.currentOverlay==='upgrade'){app.showOverlay(null);}}else{app.showOverlay('empty');}}
function dbEnumerable(callback){if(app.currentOverlay==='upgrade'){app.showOverlay(null);}
refreshViews(function(){window.performance.mark('visuallyLoaded');window.performance.mark('contentInteractive');TitleBar.view.removeAttribute('no-font-fit');document.getElementById('spinner').classList.add('hidden');setTimeout(function(){document.getElementById('spinner-overlay').classList.add('hidden');},100);if(document.URL.indexOf('#pick')===-1){setupCommunications();}
if(callback){callback();}});}
function setupCommunications(){var files=['shared/js/bluetooth_helper.js','shared/js/media/remote_controls.js','js/communications.js',];LazyLoader.load(files).then(()=>{MusicComms.init();});}
function dbReady(refresh,callback){if(app.currentOverlay==='nocard'||app.currentOverlay==='pluggedin'){app.showOverlay(null);}
if(refresh){refreshViews(callback);}else if(callback){callback();}}
function dbUnavailable(why){if(typeof PlayerView!=='undefined'){PlayerView.stop();}
if(!app.pendingPick){TabBar.option='mix';ModeManager.start(MODE_TILES,function(){TilesView.hideSearch();});}
if(why==='nocard'){app.showOverlay('nocard');}else if(why==='unmounted'){app.showOverlay('pluggedin');}}
var hidSearchBox=false;function refreshViews(callback){function showListView(){var option=TabBar.option;var info={key:'metadata.'+option,range:null,direction:(option==='title')?'next':'nextunique',option:option};ModeManager.waitForView(MODE_PICKER,()=>{ListView.activate(info);});}
if(app.pendingPick){showListView();if(callback){callback();}
return;}
if(ModeManager.currentMode===MODE_LIST&&TabBar.option!=='playlist'){showListView();}
ModeManager.waitForView(MODE_TILES,()=>{TilesView.activate(function(songs){TabBar.setDisabled(!songs.length);app.knownSongs=songs;app.showCorrectOverlay();if(app.currentOverlay===null&&!hidSearchBox){hidSearchBox=true;window.setTimeout(function(){TilesView.hideSearch();},1000);}
if(callback){callback();}});});}
app={pendingPick:null,currentOverlay:null,knownSongs:[],showOverlay:showOverlay,showCorrectOverlay:showCorrectOverlay,dbEnumerable:dbEnumerable,dbReady:dbReady,dbUnavailable:dbUnavailable,refreshViews:refreshViews};return app;})();