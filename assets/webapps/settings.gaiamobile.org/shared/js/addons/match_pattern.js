
(function(exports){const PERMITTED_SCHEMES=['http','https','file','ftp','app'];function globToRegexp(pat,allowQuestion){pat=pat.replace(/[.+^${}()|[\]\\]/g,'\\$&');if(allowQuestion){pat=pat.replace(/\?/g,'.');}else{pat=pat.replace(/\?/g,'\\?');}
pat=pat.replace(/\*/g,'.*');return new RegExp('^'+pat+'$');}
function SingleMatchPattern(pat){if(pat=='<all_urls>'){this.scheme=PERMITTED_SCHEMES;this.host='*';this.path=new RegExp('.*');}else if(!pat){this.scheme=[];}else{var re=new RegExp('^(http|https|file|ftp|app|\\*)://(\\*|\\*\\.[^*/]+|[^*/]+|)(/.*)$');var match=re.exec(pat);if(!match){console.error(`Invalid match pattern: '${pat}'`);this.scheme=[];return;}
if(match[1]=='*'){this.scheme=['http','https'];}else{this.scheme=[match[1]];}
this.host=match[2];this.path=globToRegexp(match[3],false);if(this.host===''&&this.scheme[0]!=='file'){console.error(`Invalid match pattern: '${pat}'`);this.scheme=[];return;}}}
SingleMatchPattern.prototype={matches(uri,ignorePath=false){if(this.scheme.indexOf(uri.protocol.slice(0,-1))==-1){return false;}
if(this.host=='*'){}else if(this.host[0]=='*'){var suffix=this.host.substr(2);if(uri.hostname!=suffix&&!uri.hostname.endsWith('.'+suffix)){return false;}}else{if(this.host!=uri.hostname){return false;}}
if(!ignorePath&&!this.path.test(uri.pathname)){return false;}
return true;}};function MatchPattern(pat){this.pat=pat;if(!pat){this.matchers=[];}else if(pat instanceof String||typeof(pat)==='string'){this.matchers=[new SingleMatchPattern(pat)];}else{this.matchers=Array.from(pat, p => new SingleMatchPattern(p));}}
MatchPattern.prototype={matches(uri){for(var matcher of this.matchers){if(matcher.matches(uri)){return true;}}
return false;},matchesIgnoringPath(uri){for(var matcher of this.matchers){if(matcher.matches(uri,true)){return true;}}
return false;},serialize(){return this.pat;},};exports.MatchPattern=MatchPattern;})(window);