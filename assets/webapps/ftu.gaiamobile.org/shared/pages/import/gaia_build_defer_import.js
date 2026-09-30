;;'use strict';var Normalizer={initAsciiNormalizer:function normalizer_init(){var equivalentChars={'a':'áăǎâäȧạȁàảȃāąåḁⱥãǽǣæ','A':'ÁĂǍÂÄȦẠȀÀẢȂĀĄÅḀȺÃǼǢÆ','b':'ḃḅɓḇƀƃ','B':'ḂḄƁḆɃƂ','c':'ćčçĉċƈȼ','C':'ĆČÇĈĊƇȻ','d':'ďḑḓḋḍɗḏđƌð','D':'ĎḐḒḊḌƊḎĐƋ','e':'éĕěȩêḙëėẹȅèẻȇēę','E':'ÉĔĚȨÊḘËĖẸȄÈẺȆĒĘ','f':'ḟƒ','F':'ḞƑ','g':'ǵğǧģĝġɠḡǥ','G':'ǴĞǦĢĜĠƓḠǤ','h':'ḫȟḩĥⱨḧḣḥħ','H':'ḪȞḨĤⱧḦḢḤĦ','i':'íĭǐîïịȉìỉȋīįɨĩḭı','I':'ÍĬǏÎÏỊȈÌỈȊĪĮƗĨḬ','j':'ĵɉ','J':'ĴɈ','k':'ḱǩķⱪꝃḳƙḵꝁ','K':'ḰǨĶⱩꝂḲƘḴꝀ','l':'ĺƚľļḽḷⱡꝉḻŀɫł','L':'ĹȽĽĻḼḶⱠꝈḺĿⱢŁ','m':'ḿṁṃɱ','M':'ḾṀṂⱮ','n':'ńňņṋṅṇǹɲṉƞñ','N':'ŃŇŅṊṄṆǸƝṈȠÑ','o':'óŏǒôöȯọőȍòỏơȏꝋꝍōǫøõœ','O':'ÓŎǑÔÖȮỌŐȌÒỎƠȎꝊꝌŌǪØÕŒ','p':'ṕṗꝓƥᵽꝑ','P':'ṔṖꝒƤⱣꝐ','q':'ꝗ','Q':'Ꝗ','r':'ŕřŗṙṛȑȓṟɍɽ','R':'ŔŘŖṘṚȐȒṞɌⱤ','s':'śšşŝșṡṣß','S':'ŚŠŞŜȘṠṢ','t':'ťţṱțⱦṫṭƭṯʈŧ','T':'ŤŢṰȚȾṪṬƬṮƮŦ','u':'úŭǔûṷüṳụűȕùủưȗūųůũṵ','U':'ÚŬǓÛṶÜṲỤŰȔÙỦƯȖŪŲŮŨṴ','v':'ṿʋṽ','V':'ṾƲṼ','w':'ẃŵẅẇẉẁⱳ','W':'ẂŴẄẆẈẀⱲ','x':'ẍẋ','X':'ẌẊ','y':'ýŷÿẏỵỳƴỷỿȳɏỹ','Y':'ÝŶŸẎỴỲƳỶỾȲɎỸ','z':'źžẑⱬżẓȥẕƶ','Z':'ŹŽẐⱫŻẒȤẔƵ'};this._toAsciiForm={};for(var letter in equivalentChars){var accentedForms=equivalentChars[letter];for(var i=accentedForms.length-1;i>=0;i--){this._toAsciiForm[accentedForms[i]]=letter;}}},toAscii:function normalizer_toAscii(str){if(!str||typeof str!='string'){return'';}
if(!this._toAsciiForm){Normalizer.initAsciiNormalizer();}
var result='';for(var i=0,len=str.length;i<len;i++){result+=this._toAsciiForm[str.charAt(i)]||str.charAt(i);}
return result;},escapeHTML:function normalizer_escapeHTML(str,escapeQuotes){if(Array.isArray(str)){return Normalizer.escapeHTML(str.join(' '),escapeQuotes);}
if(!str||typeof str!='string'){return'';}
var escaped=str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');if(escapeQuotes){return escaped.replace(/"/g,'&quot;').replace(/'/g,'&#x27;');}
return escaped;},unescapeHTML:function normalizer_unescapeHTML(text){return text.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#x27;/g,'\'');},escapeRegExp:function normalizer_escapeRegExp(str){return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g,'\\$&');}};;'use strict';var SimplePhoneMatcher={mcc:'724',sanitizedNumber:function spm_sanitizedNumber(number){var join=this._formattingChars.join('|\\');var regexp=new RegExp('(\\'+join+')','g');return number.replace(regexp,'');},generateVariants:function spm_generateVariants(number){var sanitizedNumber=this.sanitizedNumber(number);var variants=[];variants=variants.concat(this._internationalPrefixes(sanitizedNumber),this._trunkPrefixes(sanitizedNumber),this._carrierPrefixes(sanitizedNumber),this._areaPrefixes(sanitizedNumber));return variants.sort(function shortestFirst(a,b){return a.length>b.length;});},bestMatch:function spm_bestMatchIndex(variants,matches){var bestMatchIndex=0;var bestLocalIndex=0;var bestMatchLength=0;var allMatches=[];var matchNum=0;matches.forEach(function(match,matchIndex){var indexes=[];match.forEach(function(number,localIndex){var sanitizedNumber=this.sanitizedNumber(number);variants.forEach(function match(variant){if(variant.indexOf(sanitizedNumber)!==-1||sanitizedNumber.indexOf(variant)!==-1){var length=sanitizedNumber.length;if(indexes.indexOf(localIndex)===-1){indexes.push(localIndex);matchNum+=1;}
if(length>bestMatchLength){bestMatchLength=length;bestMatchIndex=matchIndex;bestLocalIndex=localIndex;}}});},this);if(indexes.length){allMatches.push(indexes);}else{matchNum+=1;allMatches.push([0]);}},this);return{totalMatchNum:matchNum,allMatches:allMatches,bestMatchIndex:bestMatchIndex,localIndex:bestLocalIndex};},_formattingChars:['\s','-','.','(',')'],_mccWith00Prefix:['208','214','234','235','724'],_mccWith011Prefix:['310','311','312','313','314','315','316'],_countryPrefixes:[{p:'1',t:false},{p:'1242',t:false},{p:'1246',t:false},{p:'1264',t:false},{p:'1268',t:false},{p:'1284',t:false},{p:'1340',t:false},{p:'1345',t:false},{p:'1441',t:false},{p:'1473',t:false},{p:'1649',t:false},{p:'1664',t:false},{p:'1670',t:false},{p:'1671',t:false},{p:'1684',t:false},{p:'1721',t:false},{p:'1758',t:false},{p:'1767',t:false},{p:'1784',t:false},{p:'1787',t:false},{p:'1809',t:false},{p:'1829',t:false},{p:'1849',t:false},{p:'1868',t:false},{p:'1869',t:false},{p:'1876',t:false},{p:'1939',t:false},{p:'20',t:false},{p:'210',t:false},{p:'211',t:false},{p:'212',t:false},{p:'213',t:false},{p:'214',t:false},{p:'215',t:false},{p:'216',t:false},{p:'217',t:false},{p:'218',t:false},{p:'219',t:false},{p:'220',t:false},{p:'221',t:false},{p:'222',t:false},{p:'223',t:false},{p:'224',t:false},{p:'225',t:false},{p:'226',t:false},{p:'227',t:false},{p:'228',t:false},{p:'229',t:false},{p:'230',t:false},{p:'231',t:false},{p:'232',t:false},{p:'233',t:false},{p:'234',t:false},{p:'235',t:false},{p:'236',t:false},{p:'237',t:false},{p:'238',t:false},{p:'239',t:false},{p:'240',t:false},{p:'241',t:false},{p:'242',t:false},{p:'243',t:false},{p:'244',t:false},{p:'245',t:false},{p:'246',t:false},{p:'247',t:false},{p:'248',t:false},{p:'249',t:false},{p:'250',t:false},{p:'251',t:false},{p:'252',t:false},{p:'253',t:false},{p:'254',t:false},{p:'255',t:false},{p:'256',t:false},{p:'257',t:false},{p:'258',t:false},{p:'259',t:false},{p:'260',t:false},{p:'261',t:false},{p:'262',t:false},{p:'263',t:false},{p:'264',t:false},{p:'265',t:false},{p:'266',t:false},{p:'267',t:false},{p:'268',t:false},{p:'269',t:false},{p:'27',t:false},{p:'28',t:false},{p:'290',t:false},{p:'291',t:false},{p:'292',t:false},{p:'293',t:false},{p:'294',t:false},{p:'295',t:false},{p:'296',t:false},{p:'297',t:false},{p:'298',t:false},{p:'299',t:false},{p:'30',t:false},{p:'31',t:true},{p:'32',t:true},{p:'33',t:true},{p:'34',t:false},{p:'350',t:false},{p:'351',t:true},{p:'352',t:false},{p:'353',t:false},{p:'354',t:false},{p:'355',t:true},{p:'356',t:false},{p:'357',t:false},{p:'358',t:false},{p:'359',t:true},{p:'36',t:true},{p:'370',t:true},{p:'371',t:false},{p:'372',t:false},{p:'373',t:true},{p:'374',t:false},{p:'375',t:true},{p:'376',t:false},{p:'377',t:false},{p:'378',t:false},{p:'379',t:false},{p:'380',t:true},{p:'381',t:true},{p:'382',t:true},{p:'383',t:false},{p:'384',t:false},{p:'385',t:true},{p:'386',t:false},{p:'387',t:true},{p:'388',t:false},{p:'389',t:true},{p:'39',t:false},{p:'40',t:true},{p:'41',t:true},{p:'420',t:false},{p:'421',t:false},{p:'422',t:false},{p:'423',t:false},{p:'424',t:false},{p:'425',t:false},{p:'426',t:false},{p:'427',t:false},{p:'428',t:false},{p:'429',t:false},{p:'43',t:true},{p:'44',t:true},{p:'45',t:false},{p:'46',t:true},{p:'47',t:false},{p:'48',t:true},{p:'49',t:true},{p:'500',t:false},{p:'501',t:false},{p:'502',t:false},{p:'503',t:false},{p:'504',t:false},{p:'505',t:false},{p:'506',t:false},{p:'507',t:false},{p:'508',t:false},{p:'509',t:false},{p:'51',t:true},{p:'52',t:false},{p:'53',t:false},{p:'54',t:true},{p:'55',t:true},{p:'56',t:false},{p:'57',t:false},{p:'58',t:false},{p:'590',t:false},{p:'591',t:true},{p:'592',t:false},{p:'593',t:false},{p:'594',t:false},{p:'595',t:false},{p:'596',t:false},{p:'597',t:false},{p:'598',t:false},{p:'599',t:true},{p:'60',t:true},{p:'61',t:true},{p:'62',t:true},{p:'63',t:true},{p:'64',t:false},{p:'65',t:true},{p:'66',t:true},{p:'670',t:false},{p:'671',t:false},{p:'672',t:false},{p:'673',t:true},{p:'674',t:false},{p:'675',t:false},{p:'676',t:false},{p:'677',t:false},{p:'678',t:false},{p:'679',t:false},{p:'680',t:false},{p:'681',t:false},{p:'682',t:false},{p:'683',t:false},{p:'684',t:false},{p:'685',t:false},{p:'686',t:false},{p:'687',t:false},{p:'688',t:false},{p:'689',t:false},{p:'690',t:false},{p:'691',t:false},{p:'692',t:false},{p:'693',t:false},{p:'694',t:false},{p:'695',t:false},{p:'696',t:false},{p:'697',t:false},{p:'698',t:false},{p:'699',t:false},{p:'699',t:false},{p:'7',t:true},{p:'76',t:true},{p:'77',t:true},{p:'7840',t:false},{p:'7940',t:false},{p:'800',t:false},{p:'801',t:false},{p:'802',t:false},{p:'803',t:false},{p:'804',t:false},{p:'805',t:false},{p:'806',t:false},{p:'807',t:false},{p:'808',t:false},{p:'809',t:false},{p:'81',t:false},{p:'82',t:true},{p:'83',t:false},{p:'84',t:true},{p:'850',t:true},{p:'851',t:false},{p:'852',t:false},{p:'853',t:false},{p:'854',t:false},{p:'855',t:true},{p:'856',t:true},{p:'857',t:false},{p:'858',t:false},{p:'859',t:false},{p:'86',t:true},{p:'870',t:false},{p:'871',t:false},{p:'872',t:false},{p:'873',t:false},{p:'874',t:false},{p:'875',t:false},{p:'876',t:false},{p:'877',t:false},{p:'878',t:false},{p:'879',t:false},{p:'880',t:true},{p:'881',t:false},{p:'882',t:false},{p:'883',t:false},{p:'884',t:false},{p:'885',t:false},{p:'886',t:true},{p:'887',t:false},{p:'888',t:false},{p:'889',t:false},{p:'89',t:false},{p:'90',t:false},{p:'91',t:true},{p:'92',t:true},{p:'93',t:true},{p:'94',t:false},{p:'95',t:true},{p:'960',t:false},{p:'961',t:false},{p:'962',t:false},{p:'963',t:false},{p:'964',t:false},{p:'965',t:false},{p:'966',t:false},{p:'967',t:false},{p:'968',t:false},{p:'969',t:false},{p:'970',t:false},{p:'971',t:false},{p:'972',t:false},{p:'973',t:false},{p:'974',t:false},{p:'975',t:true},{p:'976',t:true},{p:'977',t:true},{p:'978',t:false},{p:'979',t:false},{p:'98',t:false},{p:'990',t:false},{p:'991',t:false},{p:'992',t:false},{p:'993',t:true},{p:'994',t:true},{p:'995',t:true},{p:'996',t:false},{p:'997',t:false},{p:'998',t:true},{p:'999',t:false}],_trunkCodes:['0'],_areaCodeSwipe:{'55':2,'44':3,'1':3},_internationalPrefixes:function spm_internatialPrefixes(number){var variants=[number];var internationalPrefix='';if(this._mccWith00Prefix.indexOf(this.mcc)!==-1){internationalPrefix='00';}
if(this._mccWith011Prefix.indexOf(this.mcc)!==-1){internationalPrefix='011';}
var plusRegexp=new RegExp('^\\+');if(number.match(plusRegexp)){variants.push(number.replace(plusRegexp,internationalPrefix));}
var ipRegexp=new RegExp('^'+internationalPrefix);if(number.match(ipRegexp)){variants.push(number.replace(ipRegexp,'+'));}
return variants;},_trunkPrefixes:function spm_trunkPrefixes(number){var variants=[];var prefixesWithTrunk0=[];var prefixesWithNoTrunk=[];this._countryPrefixes.forEach(function(prefix){if(prefix.t){prefixesWithTrunk0.push(prefix.p);}else{prefixesWithNoTrunk.push(prefix.p);}});var trunk0Join=prefixesWithTrunk0.join('|');var trunk0Regexp=new RegExp('^\\+('+trunk0Join+')');this._internationalPrefixes(number).some(variant=>{var match=variant.match(trunk0Regexp);if(match){variants.push(variant.replace(trunk0Regexp,'0'));variants.push(variant.replace(trunk0Regexp,''));}
return match;});var noTrunkJoin=prefixesWithNoTrunk.join('|');var noTrunkRegexp=new RegExp('^\\+('+noTrunkJoin+')');this._internationalPrefixes(number).some(variant=>{var match=variant.match(noTrunkRegexp);if(match){variants.push(variant.replace(noTrunkRegexp,''));}
return match;});var withTrunkRegexp=new RegExp('^('+this._trunkCodes.join('|')+')');if(number.match(withTrunkRegexp)){variants.push(number.replace(withTrunkRegexp,''));}
return variants;},_areaPrefixes:function spm_areaPrefixes(number){var variants=[];Object.keys(this._areaCodeSwipe).forEach(function(country){var re=new RegExp('^\\+'+country);this._internationalPrefixes(number).some(variant=>{var match=variant.match(re);if(match){var afterArea=1+country.length+this._areaCodeSwipe[country];variants.push(variant.substring(afterArea));}
return match;});},this);return variants;},_carrierPrefixes:function spm_carrierPrefix(number){if(this.mcc!='724'){return[];}
var variants=[];var withTrunk=new RegExp('^0');if(number.length>=13&&number.match(withTrunk)){var afterCarrier=3;variants.push(number.substring(afterCarrier));}
return variants;}};;(function(exports){'use strict';function getThumbnail(contact){return getOnePhoto(contact,'begin');}
function getFullResolution(contact){return getOnePhoto(contact,'end');}
function getOnePhoto(contact,position){if(!contact||!contact.photo||!contact.photo.length){return null;}
if(contact.photo.length===1){return contact.photo[0];}
var photos=contact.photo;var category=contact.category;if(Array.isArray(category)&&category.indexOf('fb_linked')!==-1){if(photos.length>=4){return photos[(position=='begin')?1:0];}
return photos[0];}
photos=photosBySize(contact);var index=(position=='begin')?0:photos.length-1;return photos[index];}
function photosBySize(contact){var photos=contact.photo.slice(0);photos.sort(function(p1,p2){if(size(p1)<size(p2)){return-1;}
if(size(p1)>size(p2)){return 1;}
return 0;});return photos;}
function size(photo){if(typeof photo=='string'){return photo.length;}
return photo.size;}
exports.ContactPhotoHelper={getThumbnail:getThumbnail,getFullResolution:getFullResolution};})(window);;(function(exports){'use strict';function MatcherObj(pdataProvider){var blankRegExp=/\s+/g;var FB_CATEGORY='facebook';var FB_LINKED='fb_linked';var dataProvider=pdataProvider;function MultipleMatcher(ptargets,pmatchingOptions){var next=0;var self=this;var targets=ptargets;var matchingOptions=pmatchingOptions;var finalMatchings={};function doMatchBy(target,callbacks){var options={filterValue:target,filterBy:matchingOptions.filterBy,filterOp:matchingOptions.filterOp};var req=dataProvider.find(options);req.onsuccess=function(){var matchings=req.result.filter(function(aResult){return filterFacebook(aResult,matchingOptions.linkParams);});var filterBy=options.filterBy;var sanitizedTarget=SimplePhoneMatcher.sanitizedNumber(target);var targetVariants=SimplePhoneMatcher.generateVariants(target);matchings.forEach(function(aMatching){if(matchingOptions.selfContactId===aMatching.id){return;}
var field=options.filterBy[0];var values=aMatching[field];values.forEach(function(aValue){var value=aValue.value;var sanitizedValue=SimplePhoneMatcher.sanitizedNumber(value);var valueMatched=false;if(targetVariants.length>1){if(targetVariants.indexOf(sanitizedValue)!==-1){valueMatched=true;}}else if(SimplePhoneMatcher.generateVariants(sanitizedValue).indexOf(sanitizedTarget)!==-1){valueMatched=true;}
if(valueMatched){var matchings,matchingObj;if(!finalMatchings[aMatching.id]){matchingObj={matchings:{},matchingContact:aMatching};finalMatchings[aMatching.id]=matchingObj;matchingObj.matchings[filterBy[0]]=[];}
else{matchingObj=finalMatchings[aMatching.id];}
matchings=matchingObj.matchings[filterBy[0]];var sameValueMatchings=matchings.filter(function(matching){return(matching.matchedValue===value);});if(sameValueMatchings.length===0){matchings.push({'target':target,'matchedValue':value});}}});});carryOn();};req.onerror=function(e){window.console.error('Error while trying to do the matching',e.target.error.name);notifyMismatch(self);};}
function carryOn(){next++;if(next<targets.length){doMatchBy(targets[next],callbacks);}
else if(Object.keys(finalMatchings).length>0){notifyMatch(self,finalMatchings);}
else{notifyMismatch(self);}}
function matched(contacts){carryOn();}
var callbacks={onmatch:matched,onmismatch:carryOn};this.start=function(){doMatchBy(targets[0],callbacks);};}
function notifyMatch(obj,matchings){typeof obj.onmatch==='function'&&obj.onmatch(matchings);}
function notifyMismatch(obj){typeof obj.onmismatch==='function'&&obj.onmismatch();}
function matchBy(aContact,field,filterOper,callbacks,poptions){var options=poptions||{};var values=[];if(Array.isArray(aContact[field])){aContact[field].forEach(function(aField){if(field==='tel'){var variants=SimplePhoneMatcher.generateVariants(aField.value);variants.forEach(function(aVariant){values.push(aVariant);});}
else if(typeof aField.value==='string'){values.push(aField.value.trim());}});}
if(values.length>0){var matcher=new MultipleMatcher(values,{filterBy:[field],filterOp:filterOper,selfContactId:aContact.id,linkParams:options});matcher.onmatch=callbacks.onmatch;matcher.onmismatch=callbacks.onmismatch;matcher.start();}
else{notifyMismatch(callbacks);}}
function matchByTel(aContact,callbacks,options){matchBy(aContact,'tel','match',callbacks,options);}
function matchByEmail(aContact,callbacks,options){matchBy(aContact,'email','startsWith',callbacks,options);}
function doMatch(aContact,mode,callbacks){if(mode==='passive'){doMatchPassive(aContact,callbacks);}
else if(mode==='active'){doMatchActive(aContact,callbacks);}}
function doMatchTelAndEmail(aContact,callbacks,options){var localCbs={onmatch:function(telMatches){var matchCbs={onmatch:function(mailMatches){var allMatches=telMatches;Object.keys(mailMatches).forEach(function(aMatch){if(!allMatches[aMatch]){allMatches[aMatch]=mailMatches[aMatch];}
else{allMatches[aMatch].matchings.email=mailMatches[aMatch].matchings.email;}});notifyMatch(callbacks,allMatches);},onmismatch:function(){notifyMatch(callbacks,telMatches);}};matchByEmail(aContact,matchCbs,options);},onmismatch:function(){matchByEmail(aContact,callbacks,options);}};matchByTel(aContact,localCbs,options);}
function getSourceSimUrl(aContact){var out;if(Array.isArray(aContact.category)&&aContact.category.indexOf('sim')!==-1&&Array.isArray(aContact.url)){for(var j=0;j<aContact.url.length;j++){var aUrl=aContact.url[j];if(aUrl.type.indexOf('source')!==-1&&aUrl.type.indexOf('sim')!==-1){out=aUrl.value;}}}
return out;}
function doMatchPassive(aContact,callbacks){if(!hasName(aContact)){notifyMismatch(callbacks);return;}
var simUrl=getSourceSimUrl(aContact);if(simUrl){performPassiveMatchForSimContact(simUrl,aContact,callbacks);}
else{performPassiveMatch(aContact,callbacks);}}
function performPassiveMatchForSimContact(simUrl,aContact,callbacks){var localCbs={onmatch:function(results){var matchingFound=false;Object.keys(results).forEach(function(aResultId){var matchingContact=results[aResultId].matchingContact;var matchingUrl=getSourceSimUrl(matchingContact);if(matchingUrl&&matchingUrl===simUrl){matchingFound=true;var matchings={};matchings[aResultId]={matchingContact:matchingContact};callbacks.onmatch(matchings);return;}});if(!matchingFound){performPassiveMatch(aContact,callbacks);}},onmismatch:function(){performPassiveMatch(aContact,callbacks);}};matchByName(aContact,localCbs);}
function performPassiveMatch(aContact,callbacks){var matchingsFound={};var localCbs={onmatch:function(results){var names=[];Object.keys(results).forEach(function(aResultId){var mContact=results[aResultId].matchingContact;if(!hasName(mContact)){return;}
var targetFN=null;if(!isEmptyStr(aContact.familyName)){targetFN=Normalizer.toAscii(aContact.familyName[0].trim().toLowerCase()).replace(blankRegExp,'');}
var targetGN=null;if(!isEmptyStr(aContact.givenName)){targetGN=Normalizer.toAscii(aContact.givenName[0].trim().toLowerCase()).replace(blankRegExp,'');}
var targetName=(targetGN||'')+(targetFN||'');var mFamilyName=null;var mGivenName=null;if(!isEmptyStr(mContact.familyName)){mFamilyName=Normalizer.toAscii(mContact.familyName[0].trim().toLowerCase()).replace(blankRegExp,'');}
if(!isEmptyStr(mContact.givenName)){mGivenName=Normalizer.toAscii(mContact.givenName[0].trim().toLowerCase()).replace(blankRegExp,'');}
var mName=(mGivenName||'')+(mFamilyName||'');names.push({contact:mContact,familyName:mFamilyName,givenName:mGivenName,name:mName});var matchingList=names.filter(function(obj){return((obj.familyName===targetFN&&obj.givenName===targetGN)||(obj.name&&obj.name===targetName)&&(!Array.isArray(obj.contact.category)||obj.contact.category.indexOf(FB_CATEGORY)===-1));});matchingList.forEach(function(aMatching){var contact=aMatching.contact;matchingsFound[contact.id]={matchingContact:contact};});});reconcileResults(aContact,matchingsFound,results,callbacks);},onmismatch:function(){notifyMismatch(callbacks);}};doMatchTelAndEmail(aContact,localCbs);}
function doMatchActive(aContact,callbacks){var options={linkedMatched:{},linkedTo:getLinkedTo(aContact)};var localCbs={onmatch:function(results){var cbsName={onmatch:function(nameResults){Object.keys(nameResults).forEach(function(aId){if(!results[aId]){results[aId]=nameResults[aId];}
else{results[aId].matchings.name=nameResults[aId].matchings.name;}});notifyMatch(callbacks,results);},onmismatch:function(){notifyMatch(callbacks,results);}};matchByName(aContact,cbsName,options);},onmismatch:function(){matchByName(aContact,callbacks,options);}};doMatchTelAndEmail(aContact,localCbs,options);}
function notifyFindNameReady(){document.dispatchEvent(new CustomEvent('by_name_ready'));}
function matchByName(aContact,callbacks,options){var isSimContact=(Array.isArray(aContact.category)&&aContact.category.indexOf('sim')!==-1);if((isEmptyStr(aContact.familyName)||isEmptyStr(aContact.givenName))&&!isSimContact){notifyMismatch(callbacks);return;}
var finalResult={};var resultsByName=[];if(!isEmptyStr(aContact.name)){var targetName=aContact.name[0].trim();var reqName=dataProvider.find({filterValue:targetName,filterBy:['name'],filterOp:'startsWith'});reqName.onsuccess=function(){resultsByName=reqName.result.filter(function(aResult){return filterFacebook(aResult,options);});notifyFindNameReady();};reqName.onerror=function(e){window.console.warn('Error while trying to find by name: ',e.target.error.name);notifyFindNameReady();};}
else{notifyFindNameReady();}
if(isEmptyStr(aContact.familyName)){endOfMatchByName(finalResult,aContact,resultsByName,callbacks);}
else{var targetFamilyName=aContact.familyName[0].trim();var reqFamilyName=dataProvider.find({filterValue:targetFamilyName,filterBy:['familyName'],filterOp:'startsWith'});reqFamilyName.onsuccess=function(){var results=reqFamilyName.result;var givenNames=[];var targetGN=null;if(!isEmptyStr(aContact.givenName)){targetGN=Normalizer.toAscii(aContact.givenName[0].trim().toLowerCase()).replace(blankRegExp,'');}
results.forEach(function(mContact){if(mContact.id===aContact.id||isEmptyStr(mContact.givenName)){return;}
givenNames.push({contact:mContact,givenName:Normalizer.toAscii(mContact.givenName[0].trim().toLowerCase()).replace(blankRegExp,'')});});var finalMatchings=givenNames.filter(function(obj){var gn=obj.givenName;return((gn===targetGN||targetGN.startsWith(gn)||gn.startsWith(targetGN))&&filterFacebook(obj.contact,options));});finalMatchings.forEach(function(aMatching){finalResult[aMatching.contact.id]={matchings:{'name':[{target:targetFamilyName,matchedValue:Array.isArray(aMatching.contact.name)?aMatching.contact.name[0]:getCompleteName(aMatching.contact)}]},matchingContact:aMatching.contact};});if(resultsByName){endOfMatchByName(finalResult,aContact,resultsByName,callbacks);}
else{document.addEventListener('by_name_ready',function nameReady(){document.removeEventListener('by_name_ready',nameReady);endOfMatchByName(finalResult,aContact,resultsByName,callbacks);});}};reqFamilyName.onerror=function(e){window.console.error('Error while trying to find by familyName: ',e.target.error.name);notifyMismatch(callbacks);};}}
function getLinkedTo(contact){var out=null;if(Array.isArray(contact.category)){var idx=contact.category.indexOf(FB_LINKED);if(idx!==-1){out=contact.category[idx+1];}}
return out;}
function isFbLinked(contact){return(Array.isArray(contact.category)&&contact.category.indexOf(FB_LINKED)!==-1);}
function isFbContact(contact){return(Array.isArray(contact.category)&&contact.category.indexOf(FB_CATEGORY)!==-1);}
function filterFacebook(contact,linkParams){var out=false;if(!isFbContact(contact)){out=true;}
else if(isFbLinked(contact)){var linkedTo=getLinkedTo(contact);var targetUid=linkParams.linkedTo||'';var linkedMatched=linkParams.linkedMatched||{};if(targetUid===linkedTo){out=true;}
else if((Object.keys(linkedMatched).length===0||linkedMatched[linkedTo])&&!targetUid){linkedMatched[linkedTo]=linkedTo;out=true;}}
return out;}
function endOfMatchByName(finalResult,aContact,resultsByName,callbacks){resultsByName.forEach(function(aResult){if(aResult.id===aContact.id){return;}
var matchingObj={matchings:{'name':[{target:(Array.isArray(aContact.name)&&(typeof aContact.name[0]==='string'))?aContact.name[0].trim():getCompleteName(aContact),matchedValue:Array.isArray(aResult.name)?aResult.name[0]:getCompleteName(aResult)}]},matchingContact:aResult};if(!finalResult[aResult.id]){finalResult[aResult.id]=matchingObj;}
else{finalResult[aResult.id].matchings.name=matchingObj.matchings.name;}});if(Object.keys(finalResult).length>0){notifyMatch(callbacks,finalResult);}
else{notifyMismatch(callbacks);}}
function getCompleteName(contact){var givenName=Array.isArray(contact.givenName)?contact.givenName[0]:'';var familyName=Array.isArray(contact.familyName)?contact.familyName[0]:'';var completeName=givenName&&familyName?givenName+' '+familyName:givenName||familyName;return completeName;}
function isEmpty(collection){return((!Array.isArray(collection)||!collection[0])||(collection[0]&&collection[0].value&&!collection[0].value.trim()));}
function isEmptyStr(collection){return(!Array.isArray(collection)||(typeof collection[0]!=='string')||!(collection[0].trim()));}
function hasName(aContact){return(!isEmptyStr(aContact.givenName)||!isEmptyStr(aContact.familyName));}
function reconcileResults(incomingContact,nameMatches,phoneMailMatches,callbacks){var finalMatchings={};Object.keys(nameMatches).forEach(function(aNameMatching){var matchingContact=nameMatches[aNameMatching].matchingContact;var isPhoneMatching=Array.isArray(phoneMailMatches[aNameMatching].matchings.tel);var isMailMatching=Array.isArray(phoneMailMatches[aNameMatching].matchings.email);if(isPhoneMatching&&isMailMatching){finalMatchings[aNameMatching]=phoneMailMatches[aNameMatching];}
else if(isPhoneMatching&&(isEmpty(incomingContact.email)||isEmpty(matchingContact.email))){finalMatchings[aNameMatching]=phoneMailMatches[aNameMatching];}
else if(isMailMatching&&(isEmpty(incomingContact.tel)||isEmpty(matchingContact.tel))){finalMatchings[aNameMatching]=phoneMailMatches[aNameMatching];}});if(Object.keys(finalMatchings).length>0){notifyMatch(callbacks,finalMatchings);}
else{notifyMismatch(callbacks);}}
this.match=doMatch;Object.defineProperty(this,'dataProvider',{set:function(theProvider){dataProvider=theProvider;}});}
exports.Matcher=new MatcherObj(navigator.mozContacts);}(window));;'use strict';var contacts=window.contacts||{};contacts.Merger=(function(){var DEFAULT_ADR_TYPE='home';var DEFAULT_TEL_TYPE='other';var DEFAULT_EMAIL_TYPE='other';function doMerge(pmasterContact,pmatchingContacts,callbacks){window.setTimeout(function contactsMerge(){mergeAll(pmasterContact,pmatchingContacts,filled,callbacks);},0);}
function doInMemoryMerge(pmasterContact,pmatchingContacts){return new Promise(function(resolve,reject){mergeAll(pmasterContact,pmatchingContacts,inMemoryMergeDone,{success:function(masterContact){resolve(masterContact);},error:function(err){reject(err);}});});}
function inMemoryMergeDone(callbacks,matchingContacts,masterContact){callbacks.success(masterContact);}
function isSimContact(contact){return Array.isArray(contact.category)&&contact.category.indexOf('sim')!==-1;}
function mergeAll(masterContact,matchingContacts,onFilled,callbacks){var emailsHash;var categoriesHash;var telsHash;var mergedContact={};var mergedPhoto;mergedContact.givenName=[];copyStringArray(masterContact.givenName,mergedContact.givenName);mergedContact.familyName=[];copyStringArray(masterContact.familyName,mergedContact.familyName);mergedContact.photo=masterContact.photo||[];mergedPhoto=mergedContact.photo;mergedContact.bday=masterContact.bday;mergedContact.anniversary=masterContact.anniversary;mergedContact.adr=masterContact.adr||[];telsHash={};mergedContact.tel=[];if(Array.isArray(masterContact.tel)){masterContact.tel.forEach(function(aTel){if(!telsHash[aTel.value]){aTel.type=(Array.isArray(aTel.type)?aTel.type:[aTel.type]);aTel.type[0]=aTel.type[0]||DEFAULT_TEL_TYPE;mergedContact.tel.push(aTel);}
var variants=SimplePhoneMatcher.generateVariants(aTel.value);variants.forEach(function(aVariant){telsHash[aVariant]=true;});});}
mergedContact.email=[];emailsHash={};populateEmails(masterContact.email,emailsHash,mergedContact.email);mergedContact.org=masterContact.org||[];mergedContact.category=[];categoriesHash={};populateNoDuplicates(masterContact.category,categoriesHash,mergedContact.category);mergedContact.url=masterContact.url||[];mergedContact.note=masterContact.note||[];matchingContacts.forEach(function(aResult){var theMatchingContact=aResult.matchingContact;var givenName=theMatchingContact.givenName;if(Array.isArray(givenName)&&givenName[0]){if(mergedContact.givenName.indexOf(givenName[0])===-1){if(mergedContact.givenName[0]&&mergedContact.givenName[0].trim()){mergedContact.givenName.push(givenName[0]);}
else{mergedContact.givenName[0]=givenName[0];}}}
var familyName=theMatchingContact.familyName;if(Array.isArray(familyName)&&familyName[0]){if(mergedContact.familyName.indexOf(familyName[0])===-1){if(mergedContact.familyName[0]&&mergedContact.familyName[0].trim()){mergedContact.familyName.push(familyName[0]);}
else{mergedContact.familyName[0]=familyName[0];}}}
if((!isDefined(masterContact.givenName)||!isDefined(masterContact.familyName))&&isSimContact(theMatchingContact)){if(isDefined(mergedContact.givenName)&&isDefined(mergedContact.familyName)&&mergedContact.familyName[0]===mergedContact.givenName[0]){if(!isDefined(masterContact.givenName)){mergedContact.givenName=[];mergedContact.name=mergedContact.familyName;}
if(!isDefined(masterContact.familyName)){mergedContact.familyName=[];mergedContact.name=mergedContact.givenName;}}}
if(!mergedContact.bday&&theMatchingContact.bday){mergedContact.bday=theMatchingContact.bday;}
if(!mergedContact.anniversary&&theMatchingContact.anniversary){mergedContact.anniversary=theMatchingContact.anniversary;}
if(isDefined(theMatchingContact.org)&&mergedContact.org.length===0){mergedContact.org=theMatchingContact.org;}
if(isDefined(theMatchingContact.category)){populateNoDuplicates(theMatchingContact.category,categoriesHash,mergedContact.category);}
populateEmails(theMatchingContact.email,emailsHash,mergedContact.email);if(Array.isArray(theMatchingContact.tel)){var theMatchings=aResult.matchings||{};var telMatchings=theMatchings.tel;theMatchingContact.tel.forEach(function(aTel){var theValue=aTel.value;var target=theValue,matchedValue='';if(telMatchings){var matchedFrom=telMatchings.filter(function(x){return(x.target===theValue||x.matchedValue===theValue);});if(matchedFrom[0]){target=matchedFrom[0].target;matchedValue=matchedFrom[0].matchedValue;}}
var variants=SimplePhoneMatcher.generateVariants(theValue);var alreadyPresent=false;for(var j=0;j<variants.length;j++){if(telsHash[variants[j]]){alreadyPresent=true;}}
if(!alreadyPresent){theValue=target.length>matchedValue.length?target:matchedValue;mergedContact.tel.push({type:aTel.type||[DEFAULT_TEL_TYPE],value:theValue,carrier:aTel.carrier,pref:aTel.pref});variants.forEach(function(aVariant){telsHash[aVariant]=true;});}});}
if(!Array.isArray(mergedPhoto)||mergedPhoto.length===0&&isDefined(theMatchingContact.photo)){var photo=ContactPhotoHelper.getFullResolution(theMatchingContact);mergedPhoto=[photo];}
populateField(theMatchingContact.adr,mergedContact.adr,DEFAULT_ADR_TYPE);populateField(theMatchingContact.url,mergedContact.url);populateField(theMatchingContact.note,mergedContact.note);});mergedContact.name=[((mergedContact.givenName[0]?mergedContact.givenName[0]:'')+' '+
(mergedContact.familyName[0]?mergedContact.familyName[0]:'')).trim()];fillMasterContact(masterContact,mergedContact,mergedPhoto,onFilled.bind(null,callbacks,matchingContacts));}
function filled(callbacks,matchingContacts,masterContact){var req=navigator.mozContacts.save(utils.misc.toMozContact(masterContact));req.onsuccess=function(){matchingContacts.forEach(function(aMatchingContact){if(aMatchingContact.matchingContact.id){var contact=aMatchingContact.matchingContact;navigator.mozContacts.remove(utils.misc.toMozContact(contact));}});if(typeof callbacks.success==='function'){callbacks.success(masterContact);}};req.onerror=function(){window.console.error('Error while saving merged Contact: ',req.error.name);typeof callbacks.error==='function'&&callbacks.error(req.error);};}
function isDefined(field){return(Array.isArray(field)&&field[0]&&((typeof field[0]==='string'&&field[0].trim().length>0)||typeof field[0]==='object'));}
function copyStringArray(source,dest){if(Array.isArray(source)){source.forEach(function(aVal){if(aVal&&aVal.trim()){dest.push(aVal);}});}}
function populateEmails(sourceEmails,hash,out){if(Array.isArray(sourceEmails)){sourceEmails.forEach(function(aEmail){aEmail.type=Array.isArray(aEmail.type)?aEmail.type:[aEmail.type];aEmail.type[0]=aEmail.type[0]||DEFAULT_EMAIL_TYPE;var value=aEmail.value;if(value&&value.trim()){value=value.toLowerCase();if(!hash[value]){aEmail.value=value;out.push(aEmail);hash[value]=true;}}});}}
function populateNoDuplicates(source,hash,out){if(Array.isArray(source)){source.forEach(function(aCat){if(!hash[aCat]){out.push(aCat);hash[aCat]=true;}});}}
function populateField(source,destination,defaultType){if(Array.isArray(source)){var stringifiedDestination=destination.map(function(element){return JSON.stringify(element);});source.forEach(function(as,index){if(stringifiedDestination.indexOf(JSON.stringify(as))===-1){if(defaultType&&(!as.type||!as.type[0])){as.type=[defaultType];}
destination.push(as);}});}}
function fillMasterContact(masterContact,mergedContact,mergedPhotos,done){var fields=['familyName','givenName','name','org','email','tel','bday','anniversary','adr','category','url','note','photo'];fields.forEach(function(aField){masterContact[aField]=mergedContact[aField];});if(!Array.isArray(mergedPhotos)||!mergedPhotos[0]||mergedPhotos.length>=2){done(masterContact);return;}
var mergedPhoto=mergedPhotos[0];utils.thumbnailImage(mergedPhoto,function gotTumbnail(thumbnail){if(mergedPhoto!==thumbnail){masterContact.photo=[mergedPhoto,thumbnail];}else{masterContact.photo=[mergedPhoto];}
done(masterContact);});}
return{merge:doMerge,inMemoryMerge:doInMemoryMerge};})();;'use strict';var contacts=window.contacts||{};contacts.adaptAndMerge=function(incomingContact,matches,callbacks){var listIds=Object.keys(matches);var totalMatches=listIds.length;var masterContact=matches[listIds[0]].matchingContact;var matchingContacts=[];for(var j=1;j<totalMatches;j++){matchingContacts.push(matches[listIds[j]]);}
matchingContacts.push({matchingContact:incomingContact});contacts.Merger.merge(masterContact,matchingContacts,callbacks);};;'use strict';var utils=window.utils||{};if(!utils.alphaScroll){(function initScrollbar(doc){var alphaScroll=utils.alphaScroll={};var scrollToCallback,jumper,overlay,overlayStyle,groupSelector,liSearch,liFavorites;var isScrolling=false;var alreadyRendered=false;var isDesktop=false;var P_SCROLLTO_CB='scrollToCb';var P_JUMPER='jumper';var P_OVERLAY='overlay';var P_GROUP_SELECTOR='groupSelector';var TRANSITION_DELAY='0.3s';var TRANSITION_DURATION='0.2s';var RESET_TRANSITION='0s';var offset=0,lastY=0;var isTouch='ontouchstart'in window;var touchstart=isTouch?'touchstart':'mousedown';var touchmove=isTouch?'touchmove':'mousemove';var touchend=isTouch?'touchend':'mouseup';var getY=(function getYWrapper(){return isTouch?function(e){return e.touches[0].pageY;}:function(e){return e.pageY;};})();var getTarget=(function getTargetWrapper(){if(isTouch){return function(e){var touch=e.touches[0];return document.elementFromPoint(touch.pageX,touch.pageY);};}else{return function(e){return e.target;};}})();alphaScroll.init=function(params,desktop){isDesktop=params&&params.desktop;if(alreadyRendered&&!isDesktop){return;}
scrollToCallback=params[P_SCROLLTO_CB];jumper=params[P_JUMPER];overlay=params[P_OVERLAY];groupSelector=params[P_GROUP_SELECTOR];overlay.textContent='';overlayStyle=overlay.style;jumper.addEventListener(touchstart,scrollStart);jumper.addEventListener(touchmove,scrollTo);jumper.addEventListener(touchend,scrollEnd);if(typeof jumper==='string'){jumper=document.querySelector(jumper);}
var template=jumper.querySelector('*[data-template]');if(!template){alreadyRendered=true;return;}
var frag=document.createDocumentFragment();var alphabet=[];for(var i=65;i<=90;i++){alphabet.push({anchor:String.fromCharCode(i)});}
alphabet.push({anchor:'#'});utils.templates.append(jumper,alphabet,frag);jumper.appendChild(frag);alreadyRendered=true;};alphaScroll.showGroup=function(name){var selector='[data-anchor="group-'+name+'"]';var group=jumper.querySelector(selector);if(group){group.classList.remove('hide');}};alphaScroll.hideGroup=function(name){var selector='[data-anchor="group-'+name+'"]';var group=jumper.querySelector(selector);if(group){group.classList.add('hide');}};function hideExtraItems(value){if(!liSearch){liSearch=jumper.querySelector('li[data-anchor="search-container"]');}
if(!liFavorites){liFavorites=jumper.querySelector('li[data-anchor="group-favorites"]');}
liSearch.hidden=value;liFavorites.hidden=value;}
alphaScroll.toggleFormat=function(type){hideExtraItems(type==='short');};function scrollTo(evt){evt.preventDefault();evt.stopPropagation();if(!isScrolling){return;}
var currentY=getY(evt);if(Math.abs(lastY-currentY)<offset/2&&!isDesktop){return;}
lastY=currentY;var elem=getTarget(evt);if(!elem){return;}
var dataset=elem.dataset;if(dataset.letter){overlay.textContent=dataset.letter;}else if(dataset.img){overlay.textContent='';var img=new Image();img.src='style/images/'+dataset.img;overlay.appendChild(img);}
var anch=dataset.anchor;var selector=anch==='group-#'?'group-und':anch;var domTarget=doc.querySelector('#section-'+selector+', #'+selector);if(!domTarget){return;}
scrollToCallback(domTarget,selector.replace('group-',''));}
function scrollStart(evt){var dataset=getTarget(evt).dataset;evt.preventDefault();evt.stopPropagation();if(!dataset.letter&&!dataset.img){return;}
offset=offset||jumper.querySelector('[data-anchor]').offsetHeight;overlayStyle.MozTransitionDelay=RESET_TRANSITION;overlayStyle.MozTransitionDuration=RESET_TRANSITION;overlayStyle.opacity='1';isScrolling=true;scrollTo(evt);}
function scrollEnd(evt){evt.preventDefault();evt.stopPropagation();var transitionDelay=TRANSITION_DELAY;var transitionDuration=TRANSITION_DURATION;if(overlay.textContent==='#'||overlay.textContent===''){transitionDelay=RESET_TRANSITION;transitionDuration=RESET_TRANSITION;}
overlayStyle.MozTransitionDelay=transitionDelay;overlayStyle.MozTransitionDuration=transitionDuration;overlayStyle.opacity='0';overlay.textContent=null;isScrolling=false;lastY=0;}
(function(doc){var images=doc.querySelectorAll('li[data-img]');Object.keys(images).forEach(function(value){var img=new Image();img.src='contacts/style/images/'+images[value].dataset.img;});}(doc));})(document);};'use strict';window.ContactsCleaner=function(contacts){this.lcontacts=contacts;var total=contacts.length;var next=0;var self=this;var CHUNK_SIZE=5;var numResponses=0;var notifyClean=false;var mustHold=false;var holded=false;var mustFinish=false;this.start=function(){mustHold=holded=mustFinish=false;if(total>0){cleanContacts(0);}
else if(typeof self.onsuccess==='function'){window.setTimeout(self.onsuccess,0);}};this.hold=function(){mustHold=true;};this.finish=function(){mustFinish=true;if(holded){notifySuccess();}};this.resume=function(){mustHold=holded=mustFinish=false;window.setTimeout(function resume_clean(){cleanContacts(next);});};this.performClean=function(contact,number,cbs){var req=navigator.mozContacts.remove(utils.misc.toMozContact(contact));req.number=number;req.onsuccess=cbs.success;req.onerror=function(e){errorHandler(contact.id,e.target.error);};};function successHandler(e){if(notifyClean||typeof self.oncleaned==='function'){notifyClean=true;var cleaned=e.target.number;window.setTimeout(function(){self.oncleaned(cleaned);},0);}
continueCb();}
function errorHandler(contactid,error){if(typeof self.onerror==='function'){self.onerror(contactid,error);}
continueCb();}
function cleanContacts(from){for(var idx=from;idx<(from+CHUNK_SIZE)&&idx<total;idx++){var contact=contacts[idx];self.performClean(contact,idx,{success:successHandler});}}
function notifySuccess(){if(typeof self.onsuccess==='function'){window.setTimeout(self.onsuccess);}}
function continueCb(){next++;numResponses++;if(next<total&&numResponses===CHUNK_SIZE){numResponses=0;if(!mustHold&&!mustFinish){cleanContacts(next);}
else if(mustFinish&&!holded){notifySuccess();}
if(mustHold){holded=true;}}
else if(next>=total){notifySuccess();}}};;'use strict';var utils=window.utils||{};if(typeof utils.squareImage==='undefined'){utils.squareImage=function(blob,callback){var img=document.createElement('img');var url=URL.createObjectURL(blob);img.src=url;function cleanupImg(){img.src='';URL.revokeObjectURL(url);}
img.onerror=cleanupImg;img.onload=function onBlobLoad(){var width=img.width;var height=img.height;if(width===height){cleanupImg();callback(blob);}else{var canvas=document.createElement('canvas');var min=canvas.width=canvas.height=Math.min(width,height);var context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(img,(width-min)/2,(height-min)/2,min,min,0,0,min,min);cleanupImg();canvas.toBlob(function onCanvasToBlob(canvasBlob){context=null;canvas.width=canvas.height=0;canvas=null;callback(canvasBlob);},'image/jpeg',0.95);}};};};'use strict';var utils=window.utils||{};(function(utils){var DEPENDENCIES=['/shared/js/contacts/import/utilities/config.js','/shared/js/image_utils.js'];var dpr=window.devicePixelRatio||1;var CONFIG_FILE='/config-images.json';var DEFAULT_CONFIG={'thumbnail':{'format':'image/jpeg','size':65,'quality':1.0}};var THUMB_CONFIG=DEFAULT_CONFIG.thumbnail;if(typeof utils.thumbnailImage!=='undefined'){return;}
function getThumbsConfig(){return new Promise(function(resolve,reject){utils.config.load(CONFIG_FILE).then(function resolved(config){resolve(config);},function rejected(){resolve(DEFAULT_CONFIG);});});}
function scaleImage(blob,configData){var thumbConfig=configData&&configData.thumbnail||{};var thumbnailEdge=(thumbConfig.size||THUMB_CONFIG.size)*dpr;var format=thumbConfig.format||THUMB_CONFIG.format;var encodingQuality=thumbConfig.quality||THUMB_CONFIG.quality;return ImageUtils.resizeAndCropToCover(blob,thumbnailEdge,thumbnailEdge,format,encodingQuality);}
utils.thumbnailImage=function(blob,callback){LazyLoader.load(DEPENDENCIES,function(){getThumbsConfig().then(function(config){return scaleImage(blob,config);}).then(callback).catch(function(err){console.error('Error while converting image to thumbnail:',err.name);callback(blob);});});};})(utils);;'use strict';var utils=window.utils||{};if(!utils.dom){(function(document){var Dom=utils.dom={};Dom.removeChildNodes=function(node){while(node.hasChildNodes()){node.removeChild(node.firstChild);}};Dom.addClassToNodes=function(container,selector,clazz){var nodes=container.querySelectorAll(selector);for(var i=0,n=nodes.length;i<n;++i){nodes[i].classList.add(clazz);}};Dom.removeClassFromNodes=function(container,selector,clazz){var nodes=container.querySelectorAll(selector);for(var i=0,n=nodes.length;i<n;++i){nodes[i].classList.remove(clazz);}};Dom.updatePhoto=function(photo,dest){var background='';if(photo!=null){background='url('+URL.createObjectURL(photo)+')';}
dest.style.backgroundImage=background;dest.dataset.photoReady='true';};})(document);};'use strict';if(!window.Rest){window.Rest=(function(){function RestRequest(xhr){var cancelled=false;this.cancel=function oncancel(){cancelled=true;window.setTimeout(xhr.abort.bind(xhr),0);};this.isCancelled=function isCancelled(){return cancelled;};}
function Rest(){}
Rest.prototype={get:function(uri,callback,pOptions){var DEFAULT_TIMEOUT=30000;var options=pOptions||{};var xhr=new XMLHttpRequest({mozSystem:true});var outReq=new RestRequest(xhr);xhr.open('GET',uri,true);var responseType=options.responseType||'json';xhr.responseType=responseType;var responseProperty=responseType==='xml'?'responseXML':'response';xhr.timeout=options.operationsTimeout||DEFAULT_TIMEOUT;if(!xhr.timeout||xhr.timeout===DEFAULT_TIMEOUT&&(parent&&parent.config&&parent.config.operationsTimeout)){xhr.timeout=parent.config.operationsTimeout;}
if(options.requestHeaders){for(var header in options.requestHeaders){xhr.setRequestHeader(header,options.requestHeaders[header]);}}
xhr.onload=function(e){if(xhr.status===200||xhr.status===400||xhr.status===0){if(callback&&typeof callback.success==='function'){setTimeout(function(){callback.success(xhr[responseProperty]);},0);}}
else{console.error('HTTP error executing GET. ',uri,' Status: ',xhr.status);if(callback&&typeof callback.error==='function'){setTimeout(function errorHandler(){callback.error({status:xhr.status});},0);}}};xhr.ontimeout=function(e){console.error('Timeout!!! while HTTP GET: ',uri);if(callback&&typeof callback.timeout==='function'){setTimeout(callback.timeout,0);}};xhr.onerror=function(e){console.error('Error while executing HTTP GET: ',uri,': ',e);if(callback&&typeof callback.error==='function'&&!outReq.isCancelled()){setTimeout(function(){callback.error(e);},0);}};xhr.send();return outReq;}};return new Rest();})();};'use strict';var utils=window.utils||{};if(!utils.templates){(function(){var Templates=utils.templates={};function getTarget(element){var target=element;if(!element.tagName){target=document.querySelector(element);}
return target;}
function getTemplate(target,data){var templates=target.querySelectorAll('*[data-template]');if(templates.length===0){throw new Error('No template declared');}
if(templates.length>1&&templates.item(0).dataset.condition){throw new Error('Only one template supported in this version');}
return{template:templates.item(0),isMulti:false};}
function templateReplace(data){return function(text,property){var out;if(property.indexOf('.')===-1){out=data[property];if(Array.isArray(out)&&out.length>0){out=out[0];}}else{throw new Error('Dotted expressions not supported');}
if(typeof out==='undefined'){out=text;}
return out;};}
function add(element,data,mode,targetNode){var target=getTarget(element);var newElem;var theData=[data];if(data instanceof Array){theData=data;}
var multiTemplate=true;var template;var idx=0;theData.forEach(function(oneData){oneData._idx_=idx++;if(multiTemplate===true){var tresult=getTemplate(target,oneData);template=tresult.template;if(tresult.isMulti===false){multiTemplate=false;}}
if(template){newElem=this.render(template,oneData);target=targetNode||target;if(mode==='A'){target.appendChild(newElem);}else if(mode==='P'){if(target.firstChild){target.insertBefore(newElem,element.firstChild);}else{target.appendChild(newElem);}}}}.bind(Templates));return newElem;}
Templates.append=function(element,data,targetNode){var f=add.bind(this);return f(element,data,'A',targetNode);};Templates.prepend=function(element,data,targetNode){var f=add.bind(this);return f(element,data,'P',targetNode);};Templates.render=function(eleTemplate,data){var newElem=eleTemplate.cloneNode(true);newElem.removeAttribute('data-template');newElem.removeAttribute('data-condition');var pattern=/#(\w+[\w.]*)#/g;var inner=newElem.innerHTML;var replaceFunction=templateReplace(data);var ninner=inner.replace(pattern,replaceFunction);newElem.innerHTML=ninner;var attrs=newElem.attributes;var total=attrs.length;for(var c=0;c<total;c++){var val=attrs[c].value;var nval=val.replace(pattern,replaceFunction);newElem.setAttribute(attrs[c].name,nval);}
if(!newElem.id){if(data.id){newElem.id=data.id;}}
return newElem;};Templates.clear=function(element){var target=getTarget(element);var templates=target.querySelectorAll('*[data-template]');target.innerHTML='';var total=templates.length;for(var c=0;c<total;c++){target.appendChild(templates.item(c));}};})();};'use strict';var utils=window.utils||{};if(!utils.listeners){(function(document){var Listeners=utils.listeners={};Listeners.add=function(config){try{for(var id in config){var handler=config[id];var nodes=document.querySelectorAll(id);for(var i=0;i<nodes.length;i++){var node=nodes[i];if(Array.isArray(handler)){handler.forEach(function handle(item){if(!item.hasOwnProperty('event')&&!item.hasOwnProperty('handler')){return;}
node.addEventListener(item.event,item.handler);});}else{node.addEventListener('click',handler);}}}}
catch(e){window.console.error('Error while registering listener for: ',id,e);}};})(document);};'use strict';if(!window.ImageLoader){var ImageLoader=function ImageLoader(pContainer,pItems){var container,items,itemsSelector,lastScrollTime,scrollLatency=100,scrollTimer,itemHeight,total,imgsLoading=0,loadImage=defaultLoadImage,self=this;init(pContainer,pItems);function init(pContainer,pItems){itemsSelector=pItems;container=document.querySelector(pContainer);attachHandlers();window.addEventListener('image-loader-resume',resuming);window.addEventListener('image-loader-pause',unload);load();}
function resuming(){window.clearTimeout(scrollTimer);attachHandlers();update();}
function onUpdate(evt){evt.stopPropagation();onScroll();}
function load(){window.clearTimeout(scrollTimer);scrollTimer=null;items=container.querySelectorAll(itemsSelector);itemHeight=items[0]?items[0].offsetHeight:1;total=items.length;window.setTimeout(update,0);}
function attachHandlers(){container.addEventListener('scroll',onScroll);document.addEventListener('onupdate',onUpdate);}
function unload(){container.removeEventListener('scroll',onScroll);document.removeEventListener('onupdate',onUpdate);window.clearTimeout(scrollTimer);scrollTimer=null;}
function setResolver(pResolver){loadImage=pResolver;}
function onScroll(){if(imgsLoading>0){window.stop();imgsLoading=0;}
lastScrollTime=Date.now();if(!scrollTimer){scrollTimer=window.setTimeout(updateFromScroll,scrollLatency);}}
function updateFromScroll(){scrollTimer=null;var deltaLatency=lastScrollTime-Date.now()+scrollLatency;if(deltaLatency>0){scrollTimer=window.setTimeout(updateFromScroll,deltaLatency);}else{update();}}
function defaultLoadImage(item){var image=item.querySelector('span[data-type=img][data-src]');if(!image){image=item.querySelector('img[data-src]');if(!image){image=item.querySelector('span[data-type=img][data-group]');if(image){item.dataset.visited='true';}
return;}}
++imgsLoading;var tmp=new Image();var src=tmp.src=image.dataset.src;tmp.onload=function onload(){--imgsLoading;image.style.backgroundImage='url('+src+')';if(tmp.complete){item.dataset.visited='true';}
tmp=null;};tmp.onabort=tmp.onerror=function onerror(){--imgsLoading;item.dataset.visited='false';tmp=null;};}
function update(){if(total===0){return;}
var viewTop=container.scrollTop;var index=Math.floor(viewTop/itemHeight);var containerHeight=container.offsetHeight;for(var i=index;i>=0;i--){var item=items[i];if(item){if(item.offsetTop+itemHeight<viewTop){break;}
if(item.dataset.visited!=='true'&&item.offsetTop<=viewTop+containerHeight){loadImage(item,self);}}}
for(var j=index+1;j<total;j++){var theItem=items[j];if(!theItem){return;}
if(theItem.offsetTop>viewTop+containerHeight){return;}
if(theItem.dataset.visited!=='true'){loadImage(theItem,self);}}}
function releaseImage(item){var image=item.querySelector('span[data-type=img][data-src]');if(!image){image=item.querySelector('span[data-type=img][data-group]');if(image){item.dataset.visited='false';}
return null;}
image.style.backgroundImage='none';item.dataset.visited='false';return image;}
function destroy(){unload();window.removeEventListener('image-loader-pause',unload);window.removeEventListener('image-loader-resume',resuming);container=items=itemsSelector=lastScrollTime=scrollLatency=null;scrollTimer=itemHeight=total=imgsLoading=loadImage=null;}
this.reload=load;this.unload=unload;this.setResolver=setResolver;this.defaultLoad=defaultLoadImage;this.releaseImage=releaseImage;this.destroy=destroy;};};'use strict';(function(){var CHUNK_SIZE=5;window.ContactsImporter=function(pContacts,pAccessToken,pConnector){this.contacts=Object.keys(pContacts);var contactsHash=pContacts;var access_token=pAccessToken;var total=this.contacts.length;var self=this;var serviceConnector=pConnector;var numImported=0;var mustHold=false;var holded=false;var mustFinish=false;var isOnLine=navigator.onLine;var numMergedDuplicated=0;window.addEventListener('online',onLineChanged);window.addEventListener('offline',onLineChanged);function onLineChanged(){isOnLine=navigator.onLine;}
function contactSaved(e){var cfdata=this;if(typeof self.oncontactimported==='function'){window.setTimeout(function(){self.oncontactimported(cfdata);},0);}
continueCb();}
function contactSaveError(err){window.console.error('Error while importing contact: ',err.name);if(typeof self.onerror==='function'){window.setTimeout(self.onerror.bind(null,err),0);}
continueCb();}
function saveMozContact(deviceContact,successCb,errorCb){var req=navigator.mozContacts.save(utils.misc.toMozContact(deviceContact));req.onsuccess=successCb;req.onerror=errorCb;}
function pictureReady(blobPicture){var serviceContact=this;var done=function(){var deviceContact=self.adapt(serviceContact);self.persist(deviceContact,contactSaved.bind(serviceContact),contactSaveError);};if(!blobPicture){done();return;}
utils.thumbnailImage(blobPicture,function gotThumbnail(thumbnail){if(blobPicture!==thumbnail){serviceContact.photo=[blobPicture,thumbnail];}else{serviceContact.photo=[blobPicture];}
done();});}
function pictureError(){window.console.error('Error while getting picture for contact: ',this.user_id);self.persist(self.adapt(this),contactSaved.bind(this),contactSaveError);}
function pictureTimeout(){window.console.warn('Timeout while getting picture for contact: ',this.user_id);self.persist(self.adapt(this),contactSaved.bind(this),contactSaveError);}
this.start=function(){numMergedDuplicated=0;mustHold=false;holded=false;mustFinish=false;importContacts(numImported);};this.hold=function(){mustHold=true;};this.finish=function(){mustFinish=true;if(holded){notifySuccess();}};this.resume=function(){mustHold=false;holded=false;mustFinish=false;window.setTimeout(function resume_import(){importContacts(numImported);},0);};this.persist=function(contactData,successCb,errorCb){var cbs={onmatch:function(matches){numMergedDuplicated++;contacts.adaptAndMerge(this,matches,{success:successCb,error:errorCb});}.bind(utils.misc.toMozContact(contactData)),onmismatch:function(){saveMozContact(this,successCb,function onMismatchError(evt){errorCb(evt.target.error);});}.bind(contactData)};Matcher.match(contactData,'passive',cbs);};this.adapt=function(serviceContact){return serviceConnector.adaptDataForSaving(serviceContact);};function importContacts(from){for(var i=from;i<from+CHUNK_SIZE&&i<total;i++){importContact(i);}}
function importContact(index){var serviceContact=contactsHash[self.contacts[index]];var callbacks={success:pictureReady.bind(serviceContact),error:pictureError.bind(serviceContact),timeout:pictureTimeout.bind(serviceContact)};if(isOnLine===true){serviceConnector.downloadContactPicture(serviceContact,access_token,callbacks);}
else{callbacks.success(null);}}
function notifySuccess(){if(typeof self.onsuccess==='function'){window.setTimeout(function do_success(){self.onsuccess(numImported,numMergedDuplicated);},0);}}
function continueCb(){numImported++;var next=numImported+CHUNK_SIZE-1;if(next<total){if(!mustHold&&!mustFinish){importContact(next);}
else if(mustFinish&&!holded){notifySuccess();}
if(mustHold){holded=true;}}
else if(numImported>=total){notifySuccess();}}};})();;'use strict';if(typeof window.importer==='undefined'){(function(document){var Importer=window.importer={};var UI=Importer.ui={};var TOKEN_EXPIRED_STR='request_token_expired';var TOKEN_EXPIRED_CODE=190;var serviceConnector;var targetApp;var access_token;var startCallback;var selectedContacts={};var unSelectedContacts={};var selectableFriends={};var myFriends,myFriendsByUid;var checked=0;var checkNodeList;var existingContacts=[];var existingContactsByUid={};var contactsLoaded=false,friendsLoaded=false;var currentRequest;var currentNetworkRequest=null;var cancelled=false;var friendsImported;var syncOngoing=false;var updateButton,selectAllButton,deSelectAllButton,contactList,headerElement,friendsMsgElement,scrollableElement;var imgLoader;var HARD_LIMIT_SYNC=300;var tokenKey;var isOnLine=navigator.onLine;var ongoingImport=false;var ongoingClean=false;var theImporter,theCleaner;window.addEventListener('online',onLineChanged);window.addEventListener('offline',onLineChanged);function notifyParent(message,origin){parent.postMessage({type:message.type||'',data:message.data||'',messageId:message.messageId,additionalMessageId:message.additionalMessageId},origin);}
function showOfflineDialog(yesCb,noCb){var recommend=serviceConnector.name==='facebook';var dialog=parent.document.getElementById('confirmation-message');parent.LazyLoader.load(dialog,function(){LazyLoader.load('/shared/js/confirm.js',function(){ConfirmDialog.show('connectionLost','connectionLostMsg',{title:'noOption',isRecommend:!recommend,callback:function(){ConfirmDialog.hide();noCb();}},{title:'yesOption',isRecommend:recommend,callback:function(){ConfirmDialog.hide();yesCb();}},{zIndex:'10000'});});});}
function onLineChanged(){isOnLine=navigator.onLine;if(isOnLine===false&&ongoingImport){theImporter.hold();showOfflineDialog(function(){theImporter.resume();},function(){theImporter.finish();});}}
function getTokenKey(){var key='tokenData';var serviceName=serviceConnector.name;if(serviceName!=='facebook'){key+=('_'+serviceName);}
return key;}
var searchSource={getNodes:function(){return contactList.querySelectorAll('section > ol > li');},getFirstNode:function(){return contactList.querySelector('section > ol > li');},getNextNode:function(contact){var out=contact.nextElementSibling;var nextParent=contact.parentNode.parentNode.nextElementSibling;while(!out&&nextParent){out=nextParent.querySelector('ol > li:first-child');nextParent=nextParent.nextElementSibling;}
return out;},expectMoreNodes:function(){return false;},clone:function(node){return node.cloneNode(true);},getNodeById:function(id){return contactsList.querySelector('[data-uuid="'+id+'"]');},getSearchText:function(node){return node.dataset.search;},click:onSearchResultCb};UI.init=function(){var overlay=document.querySelector('nav[data-type="scrollbar"] p');var jumper=document.querySelector('nav[data-type="scrollbar"] ol');updateButton=document.getElementById('import-action');selectAllButton=document.querySelector('#select-all');deSelectAllButton=document.querySelector('#deselect-all');contactList=document.querySelector('#groups-list');headerElement=document.querySelector('header');friendsMsgElement=document.querySelector('#friends-msg');scrollableElement=document.querySelector('#mainContent');var params={overlay:overlay,jumper:jumper,groupSelector:'#group-',scrollToCb:scrollToCb};utils.alphaScroll.init(params);window.Search.init(searchSource,true);};function notifyLogout(){var msg={type:'logout_finished',data:''};parent.postMessage(msg,targetApp);}
UI.end=function(event){notifyParent({type:'window_close'},targetApp);notifyLogout();};function removeToken(cb){var theCb=(typeof cb==='function')?cb:function(){};ImportStatusData.remove(tokenKey).then(theCb,theCb);}
function markPendingLogout(url,service,cb){var PENDING_LOGOUT_KEY='pendingLogout';window.asyncStorage.getItem(PENDING_LOGOUT_KEY,function(data){var obj=data||{};obj[service]=url;var theCb=(typeof cb==='function')?cb:function(){};window.asyncStorage.setItem(PENDING_LOGOUT_KEY,obj,theCb,theCb);});}
function serviceLogout(cb){if(serviceConnector.automaticLogout){var serviceName=serviceConnector.name;var logoutUrl=oauthflow.params[serviceName].logoutUrl;var callbacks={error:function(){window.console.warn('Error while logging out user ',logoutUrl);removeToken();markPendingLogout(logoutUrl,serviceName,cb);},timeout:function(){window.console.warn('Timeout while logging out user ',logoutUrl);removeToken();markPendingLogout(logoutUrl,serviceName,cb);},success:function(){window.console.log('Successfully logged out');removeToken(cb);}};if(navigator.onLine===true){Rest.get(logoutUrl,callbacks);}
else{removeToken();markPendingLogout(logoutUrl,serviceName,cb);}}
else{cb();}}
function tokenExpired(error){return(error.code===TOKEN_EXPIRED_CODE||error===TOKEN_EXPIRED_STR);}
function scrollToCb(groupContainer){scrollableElement.scrollTop=groupContainer.offsetTop;}
function onSearchResultCb(e){var target=e.target;var uid=target.dataset.uuid;var checkbox=target.querySelector('input[type="checkbox"]');checkbox.checked=!checkbox.checked;var realNode=contactList.querySelector('[data-uuid='+'"'+uid+'"'+']');UI.selection({target:realNode});}
Importer.reset=function(){selectedContacts={};unSelectedContacts={};selectableFriends={};myFriends=[];myFriendsByUid={};checked=0;existingContacts=[];existingContactsByUid={};contactsLoaded=false;friendsLoaded=false;currentRequest=null;currentNetworkRequest=null;friendsImported=false;syncOngoing=false;ongoingImport=ongoingClean=false;selectAllButton=document.getElementById('select-all');deSelectAllButton=document.getElementById('deselect-all');};Importer.start=function(acc_tk,connector,ptargetApp,startCb){startCallback=startCb;var serviceName=connector.name;document.querySelector('#content h1').setAttribute('data-l10n-id',serviceName+'-serviceName');document.body.classList.add(serviceName);serviceConnector=connector;targetApp=ptargetApp;tokenKey=getTokenKey();setCurtainHandlers();if(acc_tk){access_token=acc_tk;Importer.getFriends(acc_tk);}
else{oauth2.getAccessToken(function(new_acc_tk){access_token=new_acc_tk;Importer.getFriends(new_acc_tk);},'friends',serviceConnector.name);}};function contactsReady(result){existingContacts=result;contactsLoaded=true;if(friendsLoaded){markExisting(existingContacts);}}
function syncSuccess(numChanged){window.console.log('Synchronization ended!!!');syncOngoing=false;serviceConnector.scheduleNextSync();var msg={type:'sync_finished',data:numChanged||''};parent.postMessage(msg,targetApp);}
function startSync(){var totalExisting=existingContacts.length;if(totalExisting>0&&totalExisting<HARD_LIMIT_SYNC&&!syncOngoing){syncOngoing=true;serviceConnector.startSync(existingContacts,myFriendsByUid,syncSuccess);}
else{var msg={type:'sync_finished',data:0};parent.postMessage(msg,targetApp);}}
function friendsAvailable(){imgLoader=new ImageLoader('#mainContent','.block-item:not([data-uuid="#uid#"])');var s='.block-item:not([data-uuid="#uid#"]) input[type="checkbox"]';checkNodeList=contactList.querySelectorAll(s);Array.prototype.slice.call(checkNodeList,0,checkNodeList.length);friendsLoaded=true;if(contactsLoaded){window.addEventListener('message',function importOnViewPort(e){if(e.origin!==targetApp){return;}
var data=e.data;if(data&&data.type==='dom_transition_end'){window.removeEventListener('message',importOnViewPort);window.setTimeout(startSync,0);}});markExisting(existingContacts);}
Curtain.hide(sendReadyEvent);if(typeof startCallback==='function'){window.setTimeout(startCallback,0);}}
function sendReadyEvent(){parent.postMessage({type:'ready',data:''},targetApp);}
function markExisting(deviceFriends){updateButton.setAttribute('data-l10n-id',deviceFriends.length===0?'import':'update');var reallyExisting=0;deviceFriends.forEach(function(fbContact){var uid=serviceConnector.getContactUid(fbContact);if(myFriendsByUid[uid]){reallyExisting++;}
delete selectableFriends[uid];var ele=document.querySelector('[data-uuid="'+uid+'"]');if(ele){setChecked(ele.querySelector('input[type="checkbox"]'),true);}
if(existingContactsByUid[uid]){existingContactsByUid[uid].push(fbContact);}else{existingContactsByUid[uid]=[fbContact];}});if(myFriends.length<1){friendsMsgElement.setAttribute('data-l10n-id','fbNoFriends');}else{var newValue=myFriends.length-
Object.keys(existingContactsByUid).length;navigator.mozL10n.setAttributes(friendsMsgElement,'fbFriendsFound',{numFriends:newValue<0?0:newValue});}
checkDisabledButtons();}
Importer.setSelected=function(friends){selectedContacts=friends;};function setCurtainHandlers(){Curtain.oncancel=cancelCb;}
Importer.getFriends=function(acc_tk){currentNetworkRequest=serviceConnector.listAllContacts(acc_tk,{success:importer.friendsReady,error:importer.errorHandler,timeout:importer.timeoutHandler});if(!navigator.mozContacts){return;}
var callbacks={success:contactsReady,error:function(errorName){window.console.error('Error while retrieving existing dev contacts: ',errorName);}};serviceConnector.listDeviceContacts(callbacks);};Importer.friendsReady=function(response){if(typeof response.error==='undefined'){var lmyFriends=response.data;if(lmyFriends.length===0){showNoFriends(function(){Curtain.hide(UI.end);});return;}
if(typeof serviceConnector.oncontactsloaded==='function'){serviceConnector.oncontactsloaded(lmyFriends);}
myFriendsByUid={};myFriends=[];var totalMyFriends=lmyFriends.length;for(var i=0;i<totalMyFriends;i++){var aFriend=lmyFriends[i];aFriend._idxFriendsArray=i;myFriends.push(serviceConnector.adaptDataForShowing(aFriend));myFriendsByUid[aFriend.uid]=aFriend;selectableFriends[aFriend.uid]=aFriend;}
asyncStorage.getItem('order.lastname',function orderValue(lastName){var options={container:'#groups-list',orderBy:lastName?'lastName':'firstName'};FriendListRenderer.render(myFriends,friendsAvailable,options);});}
else{window.console.error('Error, while retrieving friends',response.error.message);if(!tokenExpired(response.error)){setCurtainHandlersErrorFriends();Curtain.show('error','friends');}
else{window.console.warn('Access Token expired or revoked');Curtain.hide(notifyParent.bind(null,{type:'token_error'},targetApp));ImportStatusData.remove(tokenKey).then(function token_removed(){oauth2.getAccessToken(function(new_acc_tk){access_token=new_acc_tk;Importer.getFriends(new_acc_tk);},'friends',serviceConnector.name);});}}};function showNoFriends(callback){var dialog=parent.document.getElementById('confirmation-message');parent.LazyLoader.load(dialog,function(){LazyLoader.load('/shared/js/confirm.js',function(){ConfirmDialog.show(null,'emptyAccount',{title:'ok',isRecommend:true,callback:function(){ConfirmDialog.hide();if(typeof callback==='function'){callback();}}},null,{zIndex:'10000'});if(typeof startCallback==='function'){window.setTimeout(startCallback,0);}});});}
function cancelImport(){cancelled=true;var cancelFunc=onUpdate;if(ongoingImport){cancelFunc=theImporter.finish;}else if(ongoingClean){cancelFunc=theCleaner.finish;}
cancelFunc();Curtain.show('message','canceling');}
function cancelCb(){if(currentNetworkRequest){currentNetworkRequest.cancel();currentNetworkRequest=null;}
Curtain.hide(notifyParent.bind(null,{type:'abort'},targetApp));}
function setCurtainHandlersErrorFriends(){Curtain.oncancel=function friends_cancel(){Curtain.hide(notifyParent.bind(null,{type:'abort'},targetApp));};Curtain.onretry=function get_friends(){Curtain.oncancel=cancelCb;Curtain.show('wait','friends');Importer.getFriends(access_token);};}
function checkUpdateButton(){if(Object.keys(selectedContacts).length>0||Object.keys(unSelectedContacts).length>0){updateButton.disabled=false;}else{updateButton.disabled=true;}}
function checkDisabledButtons(){checkUpdateButton();switch(checked){case 0:deSelectAllButton.disabled=true;selectAllButton.disabled=false;break;case myFriends.length:selectAllButton.disabled=true;deSelectAllButton.disabled=false;break;default:deSelectAllButton.disabled=false;selectAllButton.disabled=false;break;}}
function setChecked(element,value){if(element.checked!==value){value?++checked:--checked;}
element.checked=value;}
Importer.baseHandler=function(type){setCurtainHandlersErrorFriends();Curtain.show(type,'friends');};Importer.timeoutHandler=function(){Importer.baseHandler('timeout');};Importer.errorHandler=function(){Importer.baseHandler('error');};function onUpdate(numFriends,numMergedDuplicated){serviceLogout(notifyLogout);if(Importer.getContext()==='ftu'){Curtain.hide(notifyParent.bind(null,{type:'window_close',messageId:cancelled?null:{id:'friendsUpdated',args:{numFriends:numFriends}},additionalMessageId:(cancelled||!numMergedDuplicated)?null:{id:'friendsMerged',args:{numDups:numMergedDuplicated}}},targetApp));}else{notifyParent({type:'import_updated'},targetApp);window.addEventListener('message',function finished(e){if(e.origin!==targetApp){return;}
if(e.data.type==='contacts_loaded'){var messageId=cancelled?null:{id:'friendsUpdated',args:{numFriends:numFriends}};var additionalMessageId=(cancelled||!numMergedDuplicated)?null:{id:'friendsMerged',args:{numDups:numMergedDuplicated}};Curtain.hide(notifyParent.bind(null,{type:'window_close',messageId:messageId,additionalMessageId:additionalMessageId},targetApp));window.removeEventListener('message',finished);}});}}
function cleanContacts(onsuccess,progress){if(cancelled){return;}
var contacts=[];var unSelectedKeys=Object.keys(unSelectedContacts);unSelectedKeys.forEach(function iterator(uid){var deviceContacts=unSelectedContacts[uid];for(var i=0;i<deviceContacts.length;i++){contacts.push(deviceContacts[i]);}});var mode='update';if(unSelectedKeys.length===existingContacts.length&&Object.keys(selectedContacts).length===0){mode='clear';Curtain.hideMenu();}
serviceConnector.cleanContacts(contacts,mode,function gotCleaner(cleaner){if(cleaner){theCleaner=cleaner;ongoingClean=true;cleaner.oncleaned=progress.update;cleaner.onsuccess=function(){ongoingClean=false;theCleaner=null;onsuccess();};}
else{Importer.errorHandler();}});}
function getTotalUnselected(){var total=0;Object.keys(unSelectedContacts).forEach(function surfing(uid){total=total+unSelectedContacts[uid].length;});return total;}
UI.importAll=function(e){imgLoader.unload();var selected=Object.keys(selectedContacts).length;var unSelected=getTotalUnselected();var total=selected+unSelected;cancelled=false;var progress;if(selected>0){progress=Curtain.show('progress','import');progress.setTotal(total);Curtain.oncancel=cancelImport;Importer.importAll(function on_all_imported(totalImported,numDups){if(typeof serviceConnector.oncontactsimported==='function'){serviceConnector.oncontactsimported(existingContacts,friendsImported,function(){friendsImported=true;});}
if(!cancelled&&unSelected>0){progress.setFrom('update');cleanContacts(function callback(){onUpdate(progress.getValue(),numDups);},progress);}else{onUpdate(progress.getValue(),numDups);}},progress);}else if(unSelected>0){progress=Curtain.show('progress','update');progress.setTotal(total);Curtain.oncancel=cancelImport;cleanContacts(function callback(){onUpdate(progress.getValue());},progress);}};UI.selectAll=function(e){deSelectAllButton.disabled=false;selectAllButton.disabled=true;window.setTimeout(function doSelectAll(){bulkSelection(true);unSelectedContacts={};selectedContacts={};for(var uid in selectableFriends){selectedContacts[uid]=selectableFriends[uid];}
checkUpdateButton();},0);return false;};UI.unSelectAll=function(e){deSelectAllButton.disabled=true;selectAllButton.disabled=false;window.setTimeout(function doUnSelectAll(){bulkSelection(false);selectedContacts={};unSelectedContacts={};for(var uid in existingContactsByUid){unSelectedContacts[uid]=existingContactsByUid[uid];}
checkUpdateButton();},0);return false;};function bulkSelection(value){window.setTimeout(function(){doSelect(value,checkNodeList,0,10);},0);}
function doSelect(value,list,from,chunkSize){var total=list.length;for(var j=from;j<from+chunkSize&&j<total;j++){setChecked(list[j],value);}
var leftInterval=from+chunkSize;var rightInterval=leftInterval+chunkSize<total?leftInterval+chunkSize:total;window.setTimeout(function(){doSelect(value,list,leftInterval,rightInterval);},0);}
UI.selection=function(e){var out=false;var target=e.target;if(target&&target.dataset.uuid){var uuid=target.dataset.uuid;var checkbox=target.querySelector('input[type="checkbox"]');setChecked(checkbox,!checkbox.checked);if(checkbox.checked===true){if(unSelectedContacts[uuid]){delete unSelectedContacts[uuid];}else{selectedContacts[uuid]=myFriendsByUid[uuid];}}else{delete selectedContacts[uuid];if(existingContactsByUid[uuid]){unSelectedContacts[uuid]=existingContactsByUid[uuid];}}
checkDisabledButtons();out=true;}
return out;};Importer.getContext=function(){var out='contacts';if(window.location.search.indexOf('ftu')!==-1){out='ftu';}
return out;};function releaseObjs(cfdata){if(!cfdata){return;}
selectedContacts[cfdata.uid]=null;myFriendsByUid[cfdata.uid]=null;selectableFriends[cfdata.uid]=null;myFriends[cfdata._idxFriendsArray]=null;if(cfdata.fbInfo&&Array.isArray(cfdata.fbInfo.photo)){cfdata.fbInfo.photo=null;}}
function doImportAll(importedCB,progress){if(cancelled){return;}
checkNodeList=null;theImporter=serviceConnector.getImporter(selectedContacts,access_token);var cpuLock,screenLock;theImporter.oncontactimported=function(cfdata){releaseObjs(cfdata);progress.update();};theImporter.onsuccess=function(totalImported,totalMerged){ongoingImport=false;window.setTimeout(function imported(){utils.misc.setTimestamp(serviceConnector.name,()=>{importedCB(totalImported,totalMerged);});},0);if(cpuLock){cpuLock.unlock();}
if(screenLock){screenLock.unlock();}};cpuLock=navigator.requestWakeLock('cpu');screenLock=navigator.requestWakeLock('screen');document.querySelector('#groups-list').innerHTML='';ongoingImport=true;theImporter.start();}
Importer.importAll=function(importedCB,progress){if(isOnLine===true){doImportAll(importedCB,progress);}
else{window.console.warn('User is not online!!');showOfflineDialog(function(){doImportAll(importedCB,progress);},function(){Curtain.hide(UI.end);});}};})(document);};'use strict';(function(document){var params=parseParams(window.location.search.substring(1));var serviceName=getServiceName();var allowedOrigin=location.origin;function parseParams(paramsStr){var out={};var paramsList;if(paramsStr.indexOf('&')!=-1){paramsList=paramsStr.split('&');}
else{paramsList=[paramsStr];}
paramsList.forEach(function(param){var paramsValues=param.split('=');out[paramsValues[0]]=paramsValues[1];});return out;}
function getServiceName(){return params.service;}
var servicesConnectors={'live':function(cb){LazyLoader.load('/shared/js/contacts/import/live/live_connector.js',function(){cb(LiveConnector);});},'gmail':function gmailLoader(cb){LazyLoader.load('/shared/js/contacts/import/gmail/gmail_connector.js',function onLoad(){cb(GmailConnector);});},'facebook':function(cb){var files=['/shared/js/fb/fb_request.js','/shared/js/contacts/import/facebook/fb_data.js','/shared/js/contacts/import/facebook/fb_utils.js','/shared/js/fb/fb_reader_utils.js','/shared/js/contacts/import/facebook/fb_contact_utils.js','/shared/js/contacts/import/facebook/fb_query.js','/shared/js/contacts/import/facebook/fb_contact.js','/shared/js/contacts/import/facebook/facebook_connector.js','/shared/pages/import/style/facebook.css'];if(!params.ftu){files.push('/facebook/js/fb_sync.js');}
LazyLoader.load(files,function(){cb(FacebookConnector);});}};function getServiceConnector(cb){if(serviceName){servicesConnectors[serviceName](cb);}
else{throw new Error('Service Connector not found !!!');}}
function tokenReady(access_token){if(document.readyState==='complete'){onLoad(access_token);}
else{window.addEventListener('load',function do_load(){onLoad(access_token);window.removeEventListener('load',do_load);});}}
function onLoad(access_token){utils.listeners.add({'#import-action':importer.ui.importAll,'#done-search':window.Search.exitSearchMode,'#groups-list':importer.ui.selection,'#header':[{event:'action',handler:importer.ui.end}],'#search-start':[{event:'click',handler:window.Search.enterSearchMode}]});document.querySelector('#select-all').onclick=importer.ui.selectAll;document.querySelector('#deselect-all').onclick=importer.ui.unSelectAll;importer.ui.init();getServiceConnector(function(connector){importer.start(access_token,connector,allowedOrigin);});}
window.addEventListener('message',function getAccessToken(e){if(e.origin!==allowedOrigin){return;}
window.removeEventListener('message',getAccessToken);if(e.data.type==='token'){tokenReady(e.data.data);}});parent.postMessage({type:'messaging_ready',data:''},allowedOrigin);})(document);;;;'use strict';if(!window.ImportStatusData){var ImportStatusData=(function(){var store=null;var DS_NAME='Import_Status_Data';var datastoreLoading=false;var datastoreLoaded=false;var DS_LOADED_EVENT='datastore_loaded';var getDatastore=function getDatastore(){return new Promise(function(resolve,reject){if(!navigator.getDataStores){reject({name:'DatastoreNotEnabled'});return;}
if(datastoreLoaded){resolve(store);return;}
if(datastoreLoading){document.addEventListener(DS_LOADED_EVENT,function loadedHandler(){document.removeEventListener(DS_LOADED_EVENT,loadedHandler);resolve(store);});}
datastoreLoading=true;navigator.getDataStores(DS_NAME).then(function(stores){store=stores[0];},reject).then(function(){datastoreLoading=false;datastoreLoaded=true;document.dispatchEvent(new CustomEvent(DS_LOADED_EVENT));resolve(store);},reject);});};var put=function put(key,obj){return new Promise(function(resolve,reject){getDatastore().then(function success(store){store.put(obj,key).then(resolve,reject);},reject);});};var remove=function remove(key){return new Promise(function(resolve,reject){getDatastore().then(function success(store){store.remove(key).then(resolve,reject);},reject);});};var get=function get(key){return new Promise(function(resolve,reject){getDatastore().then(function success(store){store.get(key).then(resolve,reject);},reject);});};var clear=function clear(){return new Promise(function(resolve,reject){getDatastore().then(function success(store){store.clear().then(resolve,reject);},reject);});};return{put:put,remove:remove,get:get,clear:clear};})();};;'use strict';var utils=window.utils||{};var SCALE_RATIO=window.devicePixelRatio||1;var LAST_IMPORT_TIMESTAMP_SUFFIX='_last_import_timestamp';function scale(size){return Math.round(SCALE_RATIO*size);}
if(!utils.misc){utils.misc={};utils.misc.toMozContact=function(contact){var outContact=contact;if(!(contact instanceof mozContact)){outContact=new mozContact(contact);outContact.id=contact.id||outContact.id;}
return outContact;};const FLAG_YEAR_IGNORED=9996;utils.misc.FLAG_YEAR_IGNORED=FLAG_YEAR_IGNORED;utils.misc.formatDate=function(date,customFormat){var dateString=null;try{var format=customFormat||{month:'short',day:'numeric'};var offset=date.getTimezoneOffset()*60*1000;var normalizedDate=new Date(date.getTime()+offset);var year=normalizedDate.getFullYear();if(year!==FLAG_YEAR_IGNORED){format.year='numeric';}
var f=new Intl.DateTimeFormat(navigator.languages,format);dateString=f.format(normalizedDate);}catch(err){console.error('Error parsing date: ',err);throw err;}
return dateString;};utils.misc.parseName=function(nameString){var MIN_LENGHT_SIGNIFICATIVE=3;var MIN_LENGHT_FN=2;var out={givenName:'',familyName:''};if(!nameString){return out;}
var str=nameString.trim();if(!str){return out;}
function startsWithUpper(str){var firstLetter=str.charAt(0);var capFirstLetter=firstLetter.toLocaleUpperCase();return(capFirstLetter===firstLetter);}
var tokens=nameString.split(/\s+/);var significativeTokens={};for(var j=0;j<tokens.length;j++){var token=tokens[j];if(token.length>MIN_LENGHT_SIGNIFICATIVE||startsWithUpper(token)){significativeTokens[token]=true;}}
var totalTokens=tokens.length;var lastToken=totalTokens-1;var rolePrevToken;var remainingTokens=Object.keys(significativeTokens).length;var outGivenNames=[],outFamilyNames=[];var numFns=0;while(lastToken>=0){if(significativeTokens[tokens[lastToken]]){remainingTokens--;}
var currToken=tokens[lastToken],nextToken=tokens[lastToken+1],prevToken=tokens[lastToken-1];if(!nextToken&&prevToken){outFamilyNames.push(currToken);numFns++;rolePrevToken='FN';}
else if(!prevToken){outGivenNames.push(currToken);rolePrevToken='GN';}
else if(nextToken){if(!significativeTokens[currToken]){if(rolePrevToken==='FN'){outFamilyNames.push(currToken);}
else{outGivenNames.push(currToken);}}
else if(currToken.length<MIN_LENGHT_FN){outGivenNames.push(currToken);rolePrevToken='GN';}
else{if(remainingTokens>=2&&numFns<2){outFamilyNames.push(currToken);numFns++;rolePrevToken='FN';}
else{outGivenNames.push(currToken);rolePrevToken='GN';}}}
lastToken--;}
out.givenName=outGivenNames.reverse().join(' ').trim();out.familyName=outFamilyNames.reverse().join(' ').trim();return out;};utils.misc.getPreferredPictureBox=function(){var imgThumbSize=oauthflow.params.facebook.imgThumbSize;var out={width:scale(imgThumbSize)};out.height=out.width;return out;};utils.misc.getPreferredPictureDetail=function(){var imgDetailWidth=oauthflow.params.facebook.imgDetailWidth;return scale(imgDetailWidth);};utils.misc.setTimestamp=function(type,callback){ImportStatusData.put(type+LAST_IMPORT_TIMESTAMP_SUFFIX,Date.now()).then(callback);};utils.misc.getTimestamp=function(type,callback){ImportStatusData.get(type+LAST_IMPORT_TIMESTAMP_SUFFIX).then(callback);};};;(function(exports){'use strict';exports.ComponentUtils={style:function(baseUrl){if(window.VulpesCompat){window.VulpesCompat.componentStyle(this,baseUrl).catch(console.error);return;}var style=document.createElement('style');var url=baseUrl+'style.css';var self=this;style.setAttribute('scoped','');style.innerHTML='@import url('+url+');';this.appendChild(style);this.style.visibility='hidden';style.addEventListener('load',function(){if(self.shadowRoot){self.shadowRoot.appendChild(style.cloneNode(true));}
self.style.visibility='';});}};}(window));;;'use strict';window.GaiaButtons=(function(win){var proto=Object.create(HTMLElement.prototype);var baseurl=window.GaiaButtonsBaseurl||'/shared/elements/gaia_buttons/';proto.createdCallback=function(){ComponentUtils.style.call(this,baseurl);};return document.registerElement('gaia-buttons',{prototype:proto});})(window);;'use strict';var FriendListRenderer=(function(){var orderCriteria={firstName:['givenName','familyName','email1'],lastName:['familyName','givenName','email1']};var HEADER_LETTERS=['ABCDEFGHIJKLMNOPQRSTUVWXYZ','ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ','АБВГДЂЕЁЖЗИЙЈКЛЉМНЊОПРСТЋУФХЦЧЏШЩЭЮЯ'].join('');var defaults={container:'#groups-list',orderBy:'lastName'};var finishCb;var totalContacts;var lock;var CHUNK_SIZE=10;var render=function render(contacts,cb,options){for(var key in defaults){if(typeof options[key]==='undefined'){options[key]=defaults[key];}}
finishCb=cb;totalContacts=contacts.length;lock=navigator.requestWakeLock('cpu');doRender(contacts,cb,options);};var doRender=function doRender(contacts,cb,options){var groupsList=document.querySelector(options.container);var orderBy=options.orderBy;var order=orderCriteria[orderBy];contacts.sort(function(a,b){return getStringToBeOrdered(a,order).localeCompare(getStringToBeOrdered(b,order));});var groups={};contacts.forEach(function(contact){var groupName=getGroupName(contact,order);if(!groups[groupName]){groups[groupName]=[];}
groups[groupName].push(contact);});var notRenderedParagraph=groupsList.querySelector('[data-order-by="'+
(orderBy==='firstName'?'lastName':'firstName')+'"]');if(notRenderedParagraph){notRenderedParagraph.parentNode.removeChild(notRenderedParagraph);}
var letterStart=0;doRenderGroupChunk(letterStart,HEADER_LETTERS[letterStart],groupsList,groups);};function doRenderGroupChunk(index,group,groupsList,groups){renderGroup(groupsList,group,groups[group],function(fragment){if(fragment){groupsList.appendChild(fragment);}
fragment=null;var headerLettersLength=HEADER_LETTERS.length;if(index+1<=headerLettersLength){window.setTimeout(function renderNextGroup(){doRenderGroupChunk(index+1,HEADER_LETTERS[index+1],groupsList,groups);});}
else if(group!='#'){window.setTimeout(function renderNextGroup(){doRenderGroupChunk(index+1,'#',groupsList,groups);});}
else{groupsList.removeChild(groupsList.firstElementChild);if(typeof finishCb==='function'){window.setTimeout(finishCb,totalContacts*2);}
if(lock){lock.unlock();}}});}
function doRenderGroupItems(from,groupsList,group,friends,element,cb){var end=from+CHUNK_SIZE;var list=element.children[1];for(var i=from;i<end&&i<friends.length;i++){var friend=friends[i];if(friend.search&&friend.search.length>0){var box=utils.misc.getPreferredPictureBox();friend.picwidth=box.width;friend.picheight=box.height;friend.search=Normalizer.toAscii(friend.search);utils.templates.append(list,friend);}}
if(i<friends.length){window.setTimeout(function renderNextChunk(){doRenderGroupItems(end,groupsList,group,friends,element,cb);});}
else{list.removeChild(list.firstElementChild);cb();}}
function renderGroup(groupsList,group,friends,cb){if(!friends||friends.length===0){window.setTimeout(cb);return;}
var fragment=document.createDocumentFragment();var element=utils.templates.append(groupsList,{group:group},fragment);doRenderGroupItems(0,groupsList,group,friends,element,function(){cb(fragment);});}
function getStringToBeOrdered(contact,order){var ret=contact.search;if(!ret){ret=[];order.forEach(function(field){ret.push(getValue(contact,field));});ret=contact.search=ret.join(' ');}
return ret;}
function getValue(contact,field){var out=contact[field];if(out){out=Array.isArray(out)?out[0]:out;}else{out='';}
return out;}
function getGroupName(contact,order){var ret=getStringToBeOrdered(contact,order);ret=ret.charAt(0).toUpperCase();ret=ret.replace(/[ÁÀ]/ig,'A');ret=ret.replace(/[ÉÈ]/ig,'E');ret=ret.replace(/[ÍÌ]/ig,'I');ret=ret.replace(/[ÓÒ]/ig,'O');ret=ret.replace(/[ÚÙ]/ig,'U');if(HEADER_LETTERS.indexOf(ret)<0){ret='#';}
return ret;}
return{'render':render};})();;'use strict';var DateHelper={todayStarted:function dh_todayStarted(){var now=(new Date()).valueOf();return this.getMidnight(now);},yesterdayStarted:function dh_yesterdayStarted(){var now=(new Date()).valueOf();var dayAgo=now-86400000;return this.getMidnight(dayAgo);},thisWeekStarted:function dh_thisWeekStarted(){var now=new Date();var dayOfTheWeek=now.getDay();var firstDay=new Date(now.getFullYear(),now.getMonth(),now.getDate()-dayOfTheWeek);return this.getMidnight(firstDay);},thisMonthStarted:function dh_thisMonthStarted(){var now=new Date();var firstDay=(new Date(now.getFullYear(),now.getMonth(),1).valueOf());return firstDay;},lastSixMonthsStarted:function dh_lastSixMonthsStarted(){var now=new Date().valueOf();var sixMonthsAgo=now-2629743830*6;return sixMonthsAgo;},thisYearStarted:function dh_thisYearStarted(){var now=new Date();var firstDay=(new Date(now.getFullYear(),0).valueOf());return firstDay;},getMidnight:function dh_getMidnight(timestamp){var day=new Date(timestamp);var midnight=(new Date(day.getFullYear(),day.getMonth(),day.getDate(),0).valueOf());return midnight;}};var NumberHelper={zfill:function nh_zfill(string,len){var s=string;while(s.length<len){s='0'+s;}
return s;}};var StringHelper={fromUTF8:function ut_fromUTF8(str){var buf=new Uint8Array(str.length);for(var i=0;i<str.length;i++){buf[i]=str.charCodeAt(i);}
return buf;},camelCase:function ut_camelCase(str){var rdashes=/-(.)/g;return str.replace(rdashes,function replacer(str,p1){return p1.toUpperCase();});}};var HtmlHelper={createHighlightHTML:function ut_createHighlightHTML(text,terms){var toHighlight=[];var normalizedText=Normalizer.toAscii(text).toLowerCase();terms.forEach(function(term){term=Normalizer.toAscii(term).toLowerCase();var index=normalizedText.indexOf(term);while(index>=0){for(var i=0,length=term.length;i<length;i++){toHighlight[index+i]=true;}
index=normalizedText.indexOf(term,index+term.length);}});var fragment=document.createDocumentFragment();for(var i=0;i<text.length;i++){if(!toHighlight[i]){fragment.appendChild(document.createTextNode(text[i]));}else{var term='';while(toHighlight[i]){term+=text[i];i++;}
i--;var mark=document.createElement('mark');mark.textContent=term;fragment.appendChild(mark);}}
return fragment;},escapeHTML:function ut_escapeHTML(str,escapeQuotes){var span=document.createElement('span');span.textContent=str;span.innerHTML=span.innerHTML.replace(/\s/g,'&nbsp;');if(escapeQuotes){return span.innerHTML.replace(/"/g,'&quot;').replace(/'/g,'&#x27;');}
return span.innerHTML;},importElements:function importElements(context){var ids=[].slice.call(arguments,1);ids.forEach(function(id){context[StringHelper.camelCase(id)]=document.getElementById(id);});}};;'use strict';(function(exports){var inSearchMode=false,searchView,searchBox,searchList,searchNoResult,searchProgress,searchTimer=null,contactNodes=null,selectableForm=null,searchableNodes=null,currentTextToSearch='',currentSearchTerms=[],prevTextToSearch='',currentSet={},searchTextCache={},canReuseSearchables=false,blurList=false,theClones={},CHUNK_SIZE=10,searchPageSize=-1,hardLimit=25,emptySearch=true,remainingPending=true,imgLoader,searchEnabled=false,source=null,navigationController=null;var init=function load(_source,defaultEnabled,navigation){searchView=document.getElementById('search-view');searchList=document.getElementById('search-list');selectableForm=document.getElementById('selectable-form');if(!_source){throw new Error('Search requires a contact source!');}
source=_source;if(typeof source.click==='function'){searchList.addEventListener('click',source.click);}
searchEnabled=!!defaultEnabled;navigationController=navigation||window.MainNavigation;};var initialized=false;var ignoreReturnKey=function ignoreReturnKey(evt){if(evt.keyCode==13){evt.preventDefault();}};var doInit=function doInit(){if(initialized){return;}
utils.listeners.add({'#cancel-search':exitSearchMode,'#search-contact':[{event:'keypress',handler:ignoreReturnKey}]});initialized=true;searchBox=document.getElementById('search-contact');var resetButton=searchBox.nextElementSibling;resetButton.addEventListener('ontouchstart'in window?'touchstart':'mousedown',function(){searchBox.value='';searchBox.focus();resetState();window.setTimeout(fillInitialSearchPage,0);});searchList.parentNode.addEventListener('touchstart',function(){if(searchableNodes&&remainingPending){addRemainingResults(searchableNodes,searchPageSize);}
blurList=true;});searchNoResult=document.getElementById('no-result');searchProgress=document.getElementById('search-progress');searchBox.addEventListener('blur',function(){window.setTimeout(onSearchBlur,0);});searchBox.addEventListener('focus',function(){blurList=false;});LazyLoader.load(['/contacts/js/fb_resolver.js','/shared/js/contacts/utilities/image_loader.js'],function(){imgLoader=new ImageLoader('#groups-list-search','li');imgLoader.setResolver(fb.resolver);});};var clearHighlights=function(node){var highlights=node.getElementsByTagName('mark');while(highlights.length){var parent=highlights[0].parentNode;while(highlights[0].firstChild){parent.insertBefore(highlights[0].firstChild,highlights[0]);}
parent.removeChild(highlights[0]);}};var highlightNode=function(node){function doHighlight(text){if(text===''||text===' '){return document.createTextNode('');}
return HtmlHelper.createHighlightHTML(text,currentSearchTerms);}
function locateHTMLTag(text){var tagLocation=[];tagLocation.push(text.indexOf('<'));tagLocation.push(text.indexOf('>',tagLocation[0])+1);tagLocation.push(text.indexOf('<',tagLocation[1]));tagLocation.push(text.indexOf('>',tagLocation[2])+1);return tagLocation;}
var textNode=node.querySelector('.contact-text bdi');if(textNode===null){return;}
var text=textNode.innerHTML;var tagPos=locateHTMLTag(text);var beforeTag=text.substring(0,tagPos[0]);var inTag=text.substring(tagPos[1],tagPos[2]);var afterTag=text.substring(tagPos[3]);var realText=[beforeTag,inTag,afterTag];if(tagPos[0]==-1){var content=doHighlight(Normalizer.unescapeHTML(text));textNode.textContent='';textNode.appendChild(content);}else{for(var i=0,len=realText.length;i<len;i++){realText[i]=doHighlight(Normalizer.unescapeHTML(realText[i]));}
var fragment=document.createDocumentFragment();var strongTag=document.createElement('strong');strongTag.appendChild(realText[1]);fragment.appendChild(realText[0]);fragment.appendChild(strongTag);fragment.appendChild(realText[2]);textNode.textContent='';textNode.appendChild(fragment);}};var updateSearchList=function updateSearchList(cb){if(!inSearchMode){if(cb){cb();}
return;}
window.setTimeout(function(){resetStateAndCache();search(cb);});};var resetStateAndCache=function resetStateAndCache(){contactNodes=null;searchTextCache={};resetState();};var exitSearchMode=function exitSearchMode(evt){if(evt){evt.preventDefault();}
searchView.classList.remove('insearchmode');if(selectableForm){selectableForm.classList.remove('insearchmode');}
if(navigationController){navigationController.back();}
window.setTimeout(function exit_search(){hideProgressResults();searchBox.value='';contactNodes=null;searchTextCache={};resetState();inSearchMode=false;},0);window.removeEventListener('input',onInput);};function resetState(){prevTextToSearch='';currentTextToSearch='';currentSearchTerms=[];searchableNodes=null;canReuseSearchables=false;currentSet={};theClones={};utils.dom.removeChildNodes(searchList);emptySearch=true;remainingPending=true;}
function addRemainingResults(nodes,from){if(remainingPending!==true){return;}
var fragment=document.createDocumentFragment();for(var i=from;i<hardLimit&&i<nodes.length;i++){var node=nodes[i].node;var clon=getClone(node);highlightNode(clon);fragment.appendChild(clon);currentSet[node.dataset.uuid]=clon;}
if(fragment.hasChildNodes()){searchList.appendChild(fragment);imgLoader.reload();}
remainingPending=false;}
function onSearchBlur(e){if(canReuseSearchables&&searchableNodes&&searchView.classList.contains('insearchmode')&&blurList){addRemainingResults(searchableNodes,searchPageSize);}
else if(emptySearch===true&&remainingPending===true){var lastNode=searchList.querySelector('li:last-child');if(lastNode){var lastNodeUid=lastNode.dataset.uuid;var startNode=source.getNextNode(source.getNodeById(lastNodeUid));fillIdentityResults(startNode,hardLimit-searchPageSize);remainingPending=false;imgLoader.reload();}}}
function fillIdentityResults(startNode,number){var fragment=document.createDocumentFragment();var contact=startNode;for(var i=0;i<number&&contact;i++){var clonedNode=getClone(contact);fragment.appendChild(clonedNode);currentSet[contact.dataset.uuid]=clonedNode;contact=source.getNextNode(contact);}
if(fragment.hasChildNodes()){searchList.appendChild(fragment);}}
function getClone(node){var id=node.dataset.uuid;var out=theClones[id];if(!out){out=source.clone(node);cacheClone(id,out);}
return out;}
function cacheClone(id,clone){theClones[id]=clone;}
function onInput(e){if(e.target.id===searchBox.id){search();}}
var enterSearchMode=function searchMode(evt){evt.preventDefault();if(!inSearchMode){window.addEventListener('input',onInput);searchView.classList.add('insearchmode');if(selectableForm){selectableForm.classList.add('insearchmode');}
doInit();fillInitialSearchPage();inSearchMode=true;emptySearch=true;if(navigationController){navigationController.go('search-view','none');}
setTimeout(function nextTick(){searchBox.focus();});}};function fillInitialSearchPage(done){hideProgressResults();var startContact=source.getFirstNode();var numToFill=searchPageSize;if(startContact&&searchPageSize<1){fillIdentityResults(startContact,1);var viewHeight=searchList.getBoundingClientRect().height;var rowHeight=searchList.children[0].getBoundingClientRect().height;searchPageSize=Math.ceil(viewHeight/rowHeight);hardLimit=~~(3.5*searchPageSize);startContact=source.getNextNode(startContact);numToFill=searchPageSize-1;}
fillIdentityResults(startContact,numToFill);if(typeof done==='function'){done();}
if(imgLoader){imgLoader.reload();}}
function doSearch(contacts,from,searchText,pattern,state){if(currentTextToSearch.localeCompare(searchText)!==0){canReuseSearchables=false;window.console.warn('**** Cancelling current search ****');return;}
var end=from+CHUNK_SIZE;currentSearchTerms=pattern.source.split(/\s+/);for(var c=from;c<end&&c<contacts.length;c++){var contact=contacts[c].node||contacts[c];var contactText=contacts[c].text||getSearchText(contacts[c]);contactText=Normalizer.unescapeHTML(contactText);if(!checkContactMatch(currentSearchTerms,contactText)){if(contact.dataset.uuid in currentSet){searchList.removeChild(currentSet[contact.dataset.uuid]);delete currentSet[contact.dataset.uuid];}}else{if(state.count===0){hideProgressResults();}
if(Object.keys(currentSet).length<searchPageSize&&!(contact.dataset.uuid in currentSet)){var clonedNode=getClone(contact);currentSet[contact.dataset.uuid]=clonedNode;searchList.appendChild(clonedNode);}
if(currentSet[contact.dataset.uuid]){clearHighlights(currentSet[contact.dataset.uuid]);highlightNode(currentSet[contact.dataset.uuid]);}
state.searchables.push({node:contact,text:contactText});state.count++;}}
if(c<contacts.length){searchTimer=window.setTimeout(function do_search(){searchTimer=null;doSearch(contacts,from+CHUNK_SIZE,searchText,pattern,state);},0);return;}else if(source.expectMoreNodes()){var delay=250;searchTimer=window.setTimeout(function do_search(){doSearch(contacts,Math.min(end,contacts.length),searchText,pattern,state);},delay);return;}else if(state.count===0){showNoResults();canReuseSearchables=false;}else{imgLoader.reload();searchableNodes=state.searchables;canReuseSearchables=true;if(blurList===true){searchTimer=window.setTimeout(function(){searchTimer=null;addRemainingResults(searchableNodes,searchPageSize);},0);}}
if(typeof state.searchDoneCb==='function'){state.searchDoneCb();}}
var enableSearch=function enableSearch(){if(searchEnabled){return;}
searchEnabled=true;invalidateCache();search();};var appendNodes=function appendNodes(nodes){if(!nodes||!nodes.length||!contactNodes){return;}
contactNodes.push.apply(contactNodes,nodes);if(!currentTextToSearch||!canReuseSearchables||!searchableNodes){return;}
for(var i=0,n=nodes.length;i<n;++i){var node=nodes[i];var nodeText=Normalizer.unescapeHTML(getSearchText(node));if(!checkContactMatch(currentSearchTerms,nodeText)){searchableNodes.push({node:node,text:nodeText});}}};var checkContactMatch=function checkContactMatch(searchTerms,text){for(var i=0,m=searchTerms.length;i<m;i++){if(!RegExp(searchTerms[i],'i').test(text)){return false;}}
return true;};var search=function performSearch(searchDoneCb){prevTextToSearch=currentTextToSearch;currentTextToSearch=Normalizer.toAscii(searchBox.value.trim());currentTextToSearch=Normalizer.escapeRegExp(currentTextToSearch);var thisSearchText=String(currentTextToSearch);if(thisSearchText.length===0){resetState();window.setTimeout(fillInitialSearchPage,0,searchDoneCb);}
else{showProgress();if(!searchEnabled){resetState();return;}
emptySearch=false;remainingPending=true;var pattern=new RegExp(thisSearchText,'i');var contactsToSearch=getContactsToSearch(thisSearchText,prevTextToSearch);var state={count:0,searchables:[],searchDoneCb:searchDoneCb};searchTimer=window.setTimeout(function do_search(){searchTimer=null;doSearch(contactsToSearch,0,thisSearchText,pattern,state);},0);}};function getSearchText(contact){var out='';var uuid=contact.dataset.uuid;if(uuid){out=searchTextCache[uuid];if(!out){out=source.getSearchText(contact);searchTextCache[uuid]=out;}}
else{window.console.error('Search: Not uuid found for the provided node');}
return out;}
var getContactsDom=function contactsDom(){if(!contactNodes){contactNodes=source.getNodes();}
return contactNodes;};var getContactsToSearch=function getContactsToSearch(newText,prevText){var out;if(canReuseSearchables&&newText.length>prevText.length&&prevText.length>0&&newText.indexOf(prevText)===0){out=searchableNodes||getContactsDom();}else{utils.dom.removeChildNodes(searchList);currentSet={};out=getContactsDom();canReuseSearchables=false;}
return out;};var isInSearchMode=function isInSearchMode(){return inSearchMode;};var invalidateCache=function s_invalidate(){if(searchTimer){window.clearTimeout(searchTimer);searchTimer=null;}
currentTextToSearch='';canReuseSearchables=false;searchableNodes=null;contactNodes=null;currentSet={};searchTextCache={};};var removeContact=function s_removeContact(id){var contact=searchList.querySelector('li[data-uuid=\"'+id+'\"]');searchList.removeChild(contact);};var selectRow=function s_selectRow(id,value){var check=searchList.querySelector('#search-view input[value="'+id+'"]');if(check){check.checked=value;}};function showProgress(){searchNoResult.classList.add('hide');searchProgress.classList.remove('hidden');}
function showNoResults(){searchNoResult.classList.remove('hide');searchProgress.classList.add('hidden');}
function hideProgressResults(){searchNoResult.classList.add('hide');searchProgress.classList.add('hidden');}
exports.Search={'init':init,'invalidateCache':invalidateCache,'appendNodes':appendNodes,'removeContact':removeContact,'search':search,'enterSearchMode':enterSearchMode,'exitSearchMode':exitSearchMode,'isInSearchMode':isInSearchMode,'enableSearch':enableSearch,'selectRow':selectRow,'updateSearchList':updateSearchList};})(window);;;window.COMPONENTS_BASE_URL='/shared/elements/';;;(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.GaiaHeader=f()}})(function(){var define,module,exports;return(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){;(function(define){define(function(require,exports,module){'use strict';var debug=0?console.log.bind(console):function(){};var cache={};var MIN=16;var MAX=24;var BUFFER=3;module.exports=function(config){debug('font fit',config);var space=config.space-BUFFER;var min=config.min||MIN;var max=config.max||MAX;var text=trim(config.text);var fontSize=max;var textWidth;var font;do{font=config.font.replace(/\d+px/,fontSize+'px');textWidth=getTextWidth(text,font);}while(textWidth>space&&fontSize!==min&&fontSize--);return{textWidth:textWidth,fontSize:fontSize,overflowing:textWidth>space};};function getTextWidth(text,font){var ctx=getCanvasContext(font);var width=ctx.measureText(text).width;debug('got text width',width);return width;}
function getCanvasContext(font){debug('get canvas context',font);var cached=cache[font];if(cached){return cached;}
var canvas=document.createElement('canvas');canvas.setAttribute('moz-opaque','true');canvas.setAttribute('width','1px');canvas.setAttribute('height','1px');debug('created canvas',canvas);var ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.font=font;return cache[font]=ctx;}
function trim(text){return text.replace(/\s+/g,' ').trim();}});})(typeof define=='function'&&define.amd?define:(function(n,w){'use strict';return typeof module=='object'?function(c){c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){return w[n];},m.exports,m);w[n]=m.exports;};})('font-fit',this));},{}],2:[function(require,module,exports){;(function(define){'use strict';define(function(require,exports,module){var textContent=Object.getOwnPropertyDescriptor(Node.prototype,'textContent');var innerHTML=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');var removeAttribute=Element.prototype.removeAttribute;var setAttribute=Element.prototype.setAttribute;var noop=function(){};exports.register=function(name,props){var baseProto=getBaseProto(props.extends);var template=props.template||baseProto.templateString;var extensible=props.extensible=props.hasOwnProperty('extensible')?props.extensible:true;delete props.extends;if(template){if(extensible&&props.template){props.templateString=props.template;}
var output=processCss(template,name);props.template=document.createElement('template');props.template.innerHTML=output.template;props.lightCss=output.lightCss;props.globalCss=props.globalCss||'';props.globalCss+=output.globalCss;}
injectGlobalCss(props.globalCss);delete props.globalCss;var descriptors=mixin(props.attrs||{},base.descriptors);props._attrs=props.attrs;delete props.attrs;var proto=createProto(baseProto,props);Object.defineProperties(proto,descriptors);try{return document.registerElement(name,{prototype:proto});}catch(e){if(e.name!=='NotSupportedError'){throw e;}}};var base={properties:{GaiaComponent:true,attributeChanged:noop,attached:noop,detached:noop,created:noop,createdCallback:function(){if(this.dirObserver){addDirObserver();}
injectLightCss(this);this.created();},attributeChangedCallback:function(name,from,to){var prop=toCamelCase(name);if(this._attrs&&this._attrs[prop]){this[prop]=to;}
this.attributeChanged(name,from,to);},attachedCallback:function(){if(this.dirObserver){this.setInnerDirAttributes=setInnerDirAttributes.bind(null,this);document.addEventListener('dirchanged',this.setInnerDirAttributes);}
this.attached();},detachedCallback:function(){if(this.dirObserver){document.removeEventListener('dirchanged',this.setInnerDirAttributes);}
this.detached();},setupShadowRoot:function(){if(!this.template){return;}
var node=document.importNode(this.template.content,true);this.createShadowRoot().appendChild(node);if(this.dirObserver){setInnerDirAttributes(this);}
return this.shadowRoot;},setAttr:function(name,value){var internal=this.shadowRoot.firstElementChild;setAttribute.call(internal,name,value);setAttribute.call(this,name,value);},removeAttr:function(name){var internal=this.shadowRoot.firstElementChild;removeAttribute.call(internal,name);removeAttribute.call(this,name);}},descriptors:{textContent:{set:function(value){textContent.set.call(this,value);if(this.lightStyle){this.appendChild(this.lightStyle);}},get:function(){return textContent.get();}},innerHTML:{set:function(value){innerHTML.set.call(this,value);if(this.lightStyle){this.appendChild(this.lightStyle);}},get:innerHTML.get}}};var defaultPrototype=createProto(HTMLElement.prototype,base.properties);function getBaseProto(proto){if(!proto){return defaultPrototype;}
proto=proto.prototype||proto;return!proto.GaiaComponent?createProto(proto,base.properties):proto;}
function createProto(proto,props){return mixin(Object.create(proto),props);}
var hasShadowCSS=(function(){var div=document.createElement('div');try{div.querySelector(':host');div.querySelector('::content');return true;}
catch(e){return false;}})();var regex={shadowCss:/(?:\:host|\:\:content)[^{]*\{[^}]*\}/g,':host':/(?:\:host)/g,':host()':/\:host\((.+)\)(?: \:\:content)?/g,':host-context':/\:host-context\((.+)\)([^{,]+)?/g,'::content':/(?:\:\:content)/g};function processCss(template,name){var globalCss='';var lightCss='';if(!hasShadowCSS){template=template.replace(regex.shadowCss,function(match){var hostContext=regex[':host-context'].exec(match);if(hostContext){globalCss+=match.replace(regex['::content'],'').replace(regex[':host-context'],'$1 '+name+'$2').replace(/ +/g,' ');}else{lightCss+=match.replace(regex[':host()'],name+'$1').replace(regex[':host'],name).replace(regex['::content'],name);}
return'';});}
return{template:template,lightCss:lightCss,globalCss:globalCss};}
function injectGlobalCss(css){if(!css){return;}
var style=document.createElement('style');style.innerHTML=css.trim();headReady().then(function(){document.head.appendChild(style);});}
function headReady(){return new Promise(function(resolve){if(document.head){return resolve();}
window.addEventListener('load',function fn(){window.removeEventListener('load',fn);resolve();});});}
function injectLightCss(el){if(hasShadowCSS){return;}
var stylesheet=el.querySelector('style');if(!stylesheet){stylesheet=document.createElement('style');stylesheet.setAttribute('scoped','');stylesheet.appendChild(document.createTextNode(el.lightCss));el.appendChild(stylesheet);}
el.lightStyle=stylesheet;}
function toCamelCase(string){return string.replace(/-(.)/g,function replacer(string,p1){return p1.toUpperCase();});}
var dirObserver;function setInnerDirAttributes(component){var dir=component.dir||document.dir;Array.from(component.shadowRoot.children).forEach(element=>{if(element.nodeName!=='STYLE'){element.dir=dir;}});}
function addDirObserver(){if(dirObserver){return;}
dirObserver=new MutationObserver(onChanged);dirObserver.observe(document.documentElement,{attributeFilter:['dir'],attributes:true});function onChanged(mutations){document.dispatchEvent(new Event('dirchanged'));}}
function mixin(target,source){for(var key in source){target[key]=source[key];}
return target;}});})(typeof define=='function'&&define.amd?define:(function(n,w){'use strict';return typeof module=='object'?function(c){c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-component',this));},{}],3:[function(require,module,exports){(function(define){'use strict';define(function(require,exports,module){var base=window.GAIA_ICONS_BASE_URL||window.COMPONENTS_BASE_URL||'bower_components/';if(!document.documentElement){window.addEventListener('load',load);}else{load();}
function load(){if(isLoaded()){return;}
var link=document.createElement('link');link.rel='stylesheet';link.type='text/css';link.href=base+'gaia-icons/gaia-icons.css';document.head.appendChild(link);exports.loaded=true;}
function isLoaded(){return exports.loaded||document.querySelector('link[href*=gaia-icons]')||document.documentElement.classList.contains('gaia-icons-loaded');}});})(typeof define=='function'&&define.amd?define:(function(n,w){'use strict';return typeof module=='object'?function(c){c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-icons',this));},{}],4:[function(require,module,exports){;(function(define){'use strict';define(function(require,exports,module){var component=require('gaia-component');var fontFit=require('font-fit');require('gaia-icons');var debug=0?console.log.bind(console):function(){};const KNOWN_ACTIONS={menu:'menu',back:'back',close:'close'};const TITLE_FONT='italic 300 24px FiraSans';const TITLE_PADDING=10;const MINIMUM_FONT_SIZE_CENTERED=20;const MINIMUM_FONT_SIZE_UNCENTERED=16;const MAXIMUM_FONT_SIZE=23;module.exports=component.register('gaia-header',{extensible:false,dirObserver:true,created:function(){debug('created');this.setupShadowRoot();this.els={actionButton:this.shadowRoot.querySelector('.action-button'),titles:this.getElementsByTagName('h1')};this.els.actionButton.addEventListener('click',e=>this.onActionButtonClick(e));this.observer=new MutationObserver(this.onMutation.bind(this));this.ignoreDir=this.hasAttribute('ignore-dir');this.titleEnd=this.getAttribute('title-end');this.titleStart=this.getAttribute('title-start');this.noFontFit=this.getAttribute('no-font-fit');this.notFlush=this.hasAttribute('not-flush');this.action=this.getAttribute('action');this.unresolved={};this.pending={};this._resizeThrottlingId=null;this.onResize=this.onResize.bind(this);},attached:function(){debug('attached');this.runFontFitSoon();this.observerStart();window.addEventListener('resize',this.onResize);},detached:function(){debug('detached');window.removeEventListener('resize',this.onResize);this.observerStop();this.clearPending();},clearPending:function(){for(var key in this.pending){this.pending[key].clear();delete this.pending[key];}
window.cancelAnimationFrame(this._resizeThrottlingId);this._resizeThrottlingId=null;},runFontFit:function(){debug('run font-fit');if(this.noFontFit){return Promise.resolve();}
var titles=this.els.titles;var space=this.getTitleSpace();var styles=[].map.call(titles,el=>this.getTitleStyle(el,space));return this.setTitleStylesSoon(styles);},runFontFitSoon:function(){debug('run font-fit soon');if(this.pending.runFontFitSoon){return;}
this.pending.runFontFitSoon=this.nextTick(()=>{delete this.pending.runFontFitSoon;this.runFontFit();});},getTitleStyle:function(el,space){debug('get el style',el,space);var text=el.textContent;var styleId=space.start+text+space.end+'#'+space.value;if(!text||!text.trim()){return debug('exit: no text');}
if(getStyleId(el)===styleId){return debug('exit: no change');}
var marginStart=this.getTitleMarginStart();var textSpace=space.value-Math.abs(marginStart);var fontFitResult=this.fontFit(text,textSpace,{min:MINIMUM_FONT_SIZE_CENTERED});var overflowing=fontFitResult.overflowing;var padding={start:0,end:0};if(overflowing){debug('title overflowing');padding.start=!space.start?TITLE_PADDING:0;padding.end=!space.end?TITLE_PADDING:0;textSpace=space.value-padding.start-padding.end;fontFitResult=this.fontFit(text,textSpace);marginStart=0;}
return{id:styleId,fontSize:fontFitResult.fontSize,marginStart:marginStart,overflowing:overflowing,padding:padding};},setTitleStylesSoon:function(styles){debug('set title styles soon',styles);var key='setStyleTitlesSoon';this._titleStyles=styles;if(this.unresolved[key]){return this.unresolved[key];}
this.unresolved[key]=new Promise((resolve)=>{this.pending[key]=this.nextTick(()=>{var styles=this._titleStyles;var els=this.els.titles;[].forEach.call(els,(el,i)=>{if(!styles[i]){return debug('exit');}
this.setTitleStyle(el,styles[i]);});delete this._titleStyles;delete this.unresolved[key];delete this.pending[key];resolve();});});},setTitleStyle:function(el,style){debug('set title style',style);this.observerStop();if(this.ignoreDir){el.style.marginLeft=style.marginStart+'px';el.style.paddingLeft=style.padding.start+'px';el.style.paddingRight=style.padding.end+'px';}else{el.style.marginInlineStart=style.marginStart+'px';el.style.paddingInlineStart=style.padding.start+'px';el.style.paddingInlineEnd=style.padding.end+'px';}
el.style.fontSize=style.fontSize+'px';setStyleId(el,style.id);this.observerStart();},fontFit:function(text,space,opts={}){debug('font fit:',text,space,opts);var fontFitArgs={font:TITLE_FONT,min:opts.min||MINIMUM_FONT_SIZE_UNCENTERED,max:MAXIMUM_FONT_SIZE,text:text,space:space};return fontFit(fontFitArgs);},observerStart:function(){if(this.observing){return;}
this.observer.observe(this,{childList:true,attributes:true,subtree:true});this.observing=true;debug('observer started');},observerStop:function(){if(!this.observing){return;}
this.observer.disconnect();this.observing=false;debug('observer stopped');},onResize:function(e){debug('onResize',this._resizeThrottlingId);if(this._resizeThrottlingId!==null){return;}
this._resizeThrottlingId=window.requestAnimationFrame(()=>{this._resizeThrottlingId=null;this.runFontFitSoon();});},onMutation:function(mutations){debug('on mutation',mutations);if(!this.pending.runFontFitSoon){this.runFontFit();}},getTitleSpace:function(){var start=this.titleStart;var end=this.titleEnd;var space=this.getWidth()-start-end;var result={value:space,start:start,end:end};debug('get title space',result);return result;},getWidth:function(){var value=this.notFlush?this.clientWidth:window.innerWidth;debug('get width',value);return value;},triggerAction:function(){if(this.action){this.els.actionButton.click();}},onActionButtonClick:function(){debug('action button click');var config={detail:{type:this.action}};var e=new CustomEvent('action',config);setTimeout(()=>this.dispatchEvent(e));},getTitleMarginStart:function(){var start=this.titleStart;var end=this.titleEnd;var marginStart=end-start;debug('get title margin start',marginStart);return marginStart;},getButtonsBeforeTitle:function(){var children=this.children;var l=children.length;var els=[];for(var i=0;i<l;i++){var el=children[i];if(el.tagName==='H1'){break;}
if(!contributesToLayout(el)){continue;}
els.push(el);}
if(this.action){els.push(this.els.actionButton);}
return els;},getButtonsAfterTitle:function(){var children=this.children;var els=[];for(var i=children.length-1;i>=0;i--){var el=children[i];if(el.tagName==='H1'){break;}
if(!contributesToLayout(el)){continue;}
els.push(el);}
return els;},sumButtonWidths:function(buttons){var defaultWidth=50;var sum=buttons.reduce((prev,button)=>{var isStandardButton=button===this.els.actionButton;var width=isStandardButton?defaultWidth:button.clientWidth;return prev+width;},0);debug('sum button widths',buttons,sum);return sum;},attrs:{action:{get:function(){return this._action;},set:function(value){var action=KNOWN_ACTIONS[value];if(action===this._action){return;}
this.setAttr('action',action);this._action=action;}},titleStart:{get:function(){debug('get title-start');if('_titleStart'in this){return this._titleStart;}
var buttons=this.getButtonsBeforeTitle();var value=this.sumButtonWidths(buttons);debug('get title-start',buttons,value);return value;},set:function(value){debug('set title-start',value);value=parseInt(value,10);if(value===this._titleStart||isNaN(value)){return;}
this.setAttr('title-start',value);this._titleStart=value;debug('set');}},titleEnd:{get:function(){debug('get title-end');if('_titleEnd'in this){return this._titleEnd;}
var buttons=this.getButtonsAfterTitle();return this.sumButtonWidths(buttons);},set:function(value){debug('set title-end',value);value=parseInt(value,10);if(value===this._titleEnd||isNaN(value)){return;}
this.setAttr('title-end',value);this._titleEnd=value;}},noFontFit:{get:function(){return this._noFontFit||false;},set:function(value){debug('set no-font-fit',value);value=!!(value||value==='');if(value===this.noFontFit){return;}
this._noFontFit=value;if(value){this.setAttr('no-font-fit','');}
else{this.removeAttr('no-font-fit');}}},ignoreDir:{get:function(){return this._ignoreDir||false;},set:function(value){debug('set ignore-dir',value);value=!!(value||value==='');if(value===this.ignoreDir){return;}
this._ignoreDir=value;this.dirObserver=!value;if(value){this.setAttr('ignore-dir','');}
else{this.removeAttr('ignore-dir');}}}},template:`<div class="inner">
    <button class="action-button">
      <content select="[l10n-action]"></content>
    </button>
    <content></content>
  </div>

  <style>

  :host {
    display: block;
    -moz-user-select: none;

    --gaia-header-button-color:
      var(--header-button-color,
      var(--header-color,
      var(--link-color,
      inherit)));
  }

  /**
   * [hidden]
   */

  :host[hidden] {
    display: none;
  }

  /** Reset
   ---------------------------------------------------------*/

  ::-moz-focus-inner { border: 0; }

  /** Inner
   ---------------------------------------------------------*/

  .inner {
    display: flex;
    min-height: 50px;
    -moz-user-select: none;

    background:
      var(--header-background,
      var(--background,
      #fff));
  }

  /** Action Button
   ---------------------------------------------------------*/

  /**
   * 1. Hidden by default
   */

  .action-button {
    position: relative;

    display: none; /* 1 */
    width: 50px;
    font-size: 30px;
    margin: 0;
    padding: 0;
    border: 0;
    outline: 0;

    align-items: center;
    background: none;
    cursor: pointer;
    transition: opacity 200ms 280ms;
    color:
      var(--header-action-button-color,
      var(--header-icon-color,
      var(--gaia-header-button-color)));
  }

  /**
   * [action=back]
   * [action=menu]
   * [action=close]
   *
   * 1. For icon vertical-alignment
   */

  [action=back] .action-button,
  [action=menu] .action-button,
  [action=close] .action-button {
    display: flex; /* 1 */
  }

  /**
   * :active
   */

  .action-button:active {
    transition: none;
    opacity: 0.2;
  }

  /** Action Button Icon
   ---------------------------------------------------------*/

  .action-button:before {
    font-family: 'gaia-icons';
    font-style: normal;
    text-rendering: optimizeLegibility;
    font-weight: 500;
  }

  [action=close] .action-button:before { content: 'close' }
  [action=menu] .action-button:before { content: 'menu' }

  [action=back]:-moz-dir(ltr) .action-button:before { content: 'left' }
  [action=back]:-moz-dir(rtl) .action-button:before { content: 'right' }

  /** Action Button Icon
   ---------------------------------------------------------*/

  /**
   * 1. To enable vertical alignment.
   */

  .action-button:before {
    display: block;
  }

  /** Action Button Text
   ---------------------------------------------------------*/

  /**
   * To provide custom localized content for
   * the action-button, we allow the user
   * to provide an element with the class
   * .l10n-action. This node is then
   * pulled inside the real action-button.
   *
   * Example:
   *
   *   <gaia-header action="back">
   *     <span l10n-action aria-label="Back">Localized text</span>
   *     <h1>title</h1>
   *   </gaia-header>
   */

  ::content [l10n-action] {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    font-size: 0;
  }

  /** Title
   ---------------------------------------------------------*/

  /**
   * 1. Vertically center text. We can't use flexbox
   *    here as it breaks text-overflow ellipsis
   *    without an inner div.
   */

  ::content h1 {
    flex: 1;
    margin: 0;
    padding: 0;
    overflow: hidden;

    white-space: nowrap;
    text-overflow: ellipsis;
    text-align: center;
    line-height: 50px; /* 1 */
    font-weight: 300;
    font-style: italic;
    font-size: 24px;

    color:
      var(--header-title-color,
      var(--header-color,
      var(--title-color,
      var(--text-color,
      inherit))));
  }

  /**
   * [ignore-dir]
   *
   * When the <gaia-header> component has an [ignore-dir] attribute, header
   * direction is forced to LTR but we still want the <h1> text to be reversed
   * so that strings like '1 selected' become 'selected 1'.
   *
   * When we're happy for <gaia-header> to be fully RTL responsive we won't need
   * these rules anymore, but this depends on all Gaia apps being ready.
   *
   * This should be safe to remove when bug 1179459 lands.
   */

  :host[ignore-dir] {
    direction: ltr;
  }

  :host[ignore-dir]:-moz-dir(rtl) h1 {
    direction: rtl;
  }

  /** Buttons
   ---------------------------------------------------------*/

  ::content a,
  ::content button {
    position: relative;
    z-index: 1;
    box-sizing: border-box;
    display: flex;
    width: auto;
    height: auto;
    min-width: 50px;
    margin: 0;
    padding: 0 10px;
    outline: 0;
    border: 0;

    font-size: 14px;
    line-height: 1;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    text-align: center;
    background: none;
    border-radius: 0;
    font-style: italic;
    cursor: pointer;
    transition: opacity 200ms 280ms;
    color: var(--gaia-header-button-color);
  }

  /**
   * :active
   */

  ::content a:active,
  ::content button:active {
    transition: none;
    opacity: 0.2;
  }

  /**
   * [hidden]
   */

  ::content a[hidden],
  ::content button[hidden] {
    display: none;
  }

  /**
   * [disabled]
   */

  ::content a[disabled],
  ::content button[disabled] {
    pointer-events: none;
    color: var(--header-disabled-button-color);
  }

  /** Icon Buttons
   ---------------------------------------------------------*/

  /**
   * Icons are a different color to text
   */

  ::content .icon,
  ::content [data-icon] {
    color:
      var(--header-icon-color,
      var(--gaia-header-button-color));
  }

  /**
   * If users want their action button
   * to be in the component's light-dom
   * they can add an .action class
   * to make it look like the
   * shadow action button.
   */

  ::content .action {
    color:
      var(--header-action-button-color,
      var(--header-icon-color,
      var(--gaia-header-button-color)));
  }

  /**
   * [data-icon]:empty
   *
   * Icon buttons with no textContent,
   * should always be 50px.
   *
   * This is to prevent buttons being
   * larger than they should be before
   * icon-font has loaded.
   */

  ::content [data-icon]:empty {
    width: 50px;
  }

  </style>`,nextTick:nextTick});function contributesToLayout(el){return el.localName!=='style'&&!el.hasAttribute('l10n-action');}
function setStyleId(el,id){el._styleId=id;}
function getStyleId(el){return el._styleId;}
function nextTick(fn){var cleared;Promise.resolve().then(()=>{if(!cleared){fn();}});return{clear:function(){cleared=true;}};}});})(typeof define=='function'&&define.amd?define:(function(n,w){'use strict';return typeof module=='object'?function(c){c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-header',this));},{"font-fit":1,"gaia-component":2,"gaia-icons":3}]},{},[4])(4)});