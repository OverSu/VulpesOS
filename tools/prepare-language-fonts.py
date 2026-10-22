#!/usr/bin/env python3
# SPDX-License-Identifier: MPL-2.0
"""Regenerate bundled language-name fallback fonts from installed Noto fonts.

Requires fonttools with WOFF2 support and Arch noto-fonts/noto-fonts-cjk.
Normal builds use the bundled subsets and do not need these packages.
"""
from pathlib import Path
import json,hashlib,shutil
from fontTools.ttLib import TTFont
from fontTools import subset
root=Path(__file__).resolve().parents[1]
out=root/'gaia/shared/elements/vulpes-fonts/languages';out.mkdir(exist_ok=True)
labels=json.loads((root/'assets/webapps/settings.gaiamobile.org/shared/resources/languages.json').read_text())
wanted=set(map(ord,''.join(labels.values())))
fira=TTFont(out.parent/'FiraSans-Regular.otf');covered=set(fira.getBestCmap());missing=wanted-covered
sources=['/usr/share/fonts/noto/NotoSans'+s+'-Regular.ttf' for s in ['Arabic','Bengali','Devanagari','Gurmukhi','Khmer']]+['/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc']
css=['/* Native language names missing from Fira Sans. Subsets retain shaping tables. */']
report=[]
for source in sources:
 p=Path(source);font=TTFont(p,fontNumber=0);chars=missing&set(font.getBestCmap())
 if not chars:continue
 name=p.stem.replace('NotoSans','VulpesLanguage');family=name+' Subset'
 attrib={str(i):font['name'].getDebugName(i) for i in (0,5,13,14)}
 opt=subset.Options();opt.flavor='woff2';opt.name_IDs=['*'];opt.name_legacy=True;opt.name_languages=['*']
 sub=subset.Subsetter(options=opt);sub.populate(unicodes=chars);sub.subset(font)
 for record in font['name'].names:
  if record.nameID in (1,4,6,16):record.string=(family if record.nameID!=6 else name).encode(record.getEncoding())
 font.flavor='woff2';target=out/(name+'.woff2');font.save(target)
 css.append('@font-face {\n  font-family: FiraSans;\n  src: url("languages/'+target.name+'") format("woff2");\n  font-weight: 100 900;\n  font-style: normal;\n  font-display: swap;\n  unicode-range: '+','.join('U+%04X'%c for c in sorted(chars))+';\n}')
 report.append({'file':target.name,'source':p.name,'sourceSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'attribution':attrib,'unicode':sorted(chars)})
 missing-=chars
if missing:raise SystemExit('Uncovered label characters: '+str(missing))
shutil.copy('/usr/share/licenses/noto-fonts-cjk/LICENSE',out/'LICENSE')
(out/'provenance.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
p=out.parent/'fonts.css';text=p.read_text();start='\n/* Native language names missing from Fira Sans.'
text=text.split(start)[0];p.write_text(text.rstrip()+'\n\n'+'\n\n'.join(css)+'\n')
print(len(report),'fallback fonts,',sum(p.stat().st_size for p in out.glob('*.woff2')),'bytes')
