// Locate an AMD definition without swallowing surrounding require() callbacks.
const fs=require('node:fs'), esprima=require('esprima');
const [path,name]=process.argv.slice(2), source=fs.readFileSync(path,'utf8');
let result;
function visit(node) {
  if(!node || typeof node!=='object')return;
  if(node.type==='CallExpression' && node.callee.type==='Identifier' && node.callee.name==='define' && node.arguments[0]?.value===name)result=node.range;
  for(const [key,value] of Object.entries(node))if(key!=='range') {
    if(Array.isArray(value))value.forEach(visit);else visit(value);
  }
}
visit(esprima.parseScript(source,{range:true}));
if(result)while(result[1]<source.length && /[;\s]/.test(source[result[1]]))result[1]++;
process.stdout.write(JSON.stringify(result||null));
