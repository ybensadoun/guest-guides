L=open(__import__('os').path.join(__import__('os').path.dirname(__file__),'src.html')).read().split('\n')
T='\n'.join(L); seg1=T[:T.index('/* ---------- State ---------- */')].rstrip('\n'); views=T[T.index('/* ---------- Field rendering ---------- */'):T.index('/* ---------- After sending ---------- */')].rstrip('\n'); runtime=open(__import__('os').path.join(__import__('os').path.dirname(__file__),'runtime.js')).read()
def rep(s,a,b,n=1):
    assert s.count(a)==n,(a[:70],s.count(a)); return s.replace(a,b)
seg1=rep(seg1,'<title>Guest Guide Maker</title>','<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<title>Guest Guide Maker · Build your guest guide</title>\n<meta name="description" content="Tell us about your place and we build a guest guide for your guests\' phones.">\n<meta name="robots" content="noindex">')
seg1=rep(seg1,'*{box-sizing:border-box}','html{color-scheme:light}\n:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}\n*{box-sizing:border-box}\nimg{max-width:100%}\n[hidden]{display:none!important}\nbody{margin:0}')
seg1=rep(seg1,'.loading{padding:40px;text-align:center;color:var(--muted)}','''.loading{padding:40px;text-align:center;color:var(--muted)}
.notebox{display:flex;flex-direction:column;gap:8px;background:var(--sunk);border-radius:var(--r-s);padding:14px}
.notebox label{display:flex;flex-direction:column;gap:2px}
.notebox label span{font-size:13.5px;color:var(--muted)}
.nrow{display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap}
.nrow textarea{flex:1 1 220px;min-height:52px}
.survey{display:flex;flex-direction:column;gap:18px;border-top:1.5px solid var(--line);padding-top:18px}
.survey h2{font-size:22px}
#sendState{margin:0;font-size:14px;color:var(--muted)}
/* Step navigation: rail on wide screens, bottom bar and list sheet everywhere */
.split{display:grid;grid-template-columns:240px minmax(0,1fr);gap:22px;align-items:start}
.col{display:flex;flex-direction:column;gap:18px;min-width:0}
.rail{position:sticky;top:calc(env(safe-area-inset-top,0px) + 14px);max-height:calc(100vh - 120px);overflow-y:auto;scrollbar-width:thin}
@media (max-width:900px){.split{grid-template-columns:minmax(0,1fr)}.rail{display:none}}
.wrap:has(.split){max-width:1120px}
.si{display:grid;grid-template-columns:24px minmax(0,1fr) auto;gap:10px;align-items:center;padding:8px 10px;border-radius:12px;text-decoration:none;color:var(--muted);font-weight:600;font-size:14.5px}
.si:hover{background:var(--surface)}
.si[aria-current]{background:var(--surface);color:var(--ink);box-shadow:inset 3px 0 0 var(--tc,var(--ink))}
.si .st{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.si .sl{font-size:12px;font-weight:700;color:var(--faint)}
.si.s-done .sl{color:var(--ok)}.si.s-chk .sl{color:var(--warn)}
.sic{width:22px;height:22px;display:grid;place-items:center;color:var(--ink)}
.sic svg{width:18px;height:18px}
.s-done .sic{background:var(--ok);color:#fff;border-radius:50%}
.s-done .sic svg{width:13px;height:13px;stroke-width:3}
.sic .ring{width:16px;height:16px;border-radius:50%;box-shadow:inset 0 0 0 2px var(--line)}
.sic .half{width:16px;height:16px;border-radius:50%;background:linear-gradient(90deg,var(--warn) 50%,transparent 50%);box-shadow:inset 0 0 0 2px var(--warn)}
.si.send{color:var(--ink)}
.sg{margin:14px 10px 4px;font-size:11.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--faint)}
#navbar{position:fixed;left:0;right:0;bottom:0;z-index:30;background:var(--surface);border-top:1.5px solid var(--line);padding:10px 16px calc(10px + env(safe-area-inset-bottom,0px))}
.nbin{max-width:1120px;margin:0 auto;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px}
.nbin > :first-child{justify-self:start}.nbin > :last-child{justify-self:end}
.nb{display:inline-flex;align-items:center;gap:8px;min-height:46px;padding:0 16px;border-radius:999px;border:2px solid var(--ink);background:var(--surface);color:var(--ink);font-weight:700;text-decoration:none;cursor:pointer;white-space:nowrap;max-width:100%}
.nb span{overflow:hidden;text-overflow:ellipsis}
.nb svg{width:18px;height:18px;flex:none}
.nb.primary{background:var(--ink);color:var(--paper)}
.nb.ghost{border-color:transparent;padding:0 10px 0 6px;color:var(--muted);max-width:30vw}
.nb.count{border:0;background:var(--sunk);font-weight:600;color:var(--muted);gap:6px}
.nb.count b{color:var(--ink);font-variant-numeric:tabular-nums}
.nb.count .chev{width:8px;height:8px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(-135deg) translate(-2px,-2px)}
@media (max-width:520px){.hide-s{display:none}.nb.ghost{padding:0 8px}}
.sheet{position:fixed;inset:0;z-index:50;background:rgba(10,10,10,.5);display:flex;align-items:flex-end;justify-content:center}
.sheet-card{width:100%;max-width:520px;max-height:82vh;overflow:auto;background:var(--paper);border-radius:22px 22px 0 0;padding:10px 12px calc(16px + env(safe-area-inset-bottom,0px))}
.sheet-h{display:flex;align-items:center;justify-content:space-between;padding:8px 10px}
.sheet-h b{font:700 22px var(--display)}
.sheet-x{width:40px;height:40px;border-radius:50%;border:0;background:var(--surface);font-size:24px;cursor:pointer;color:var(--ink)}
.slugbox{display:flex;align-items:stretch;border:1.5px solid var(--line);border-radius:var(--r-s);background:var(--sunk);overflow:hidden;min-width:0}
.slugbox:focus-within{border-color:var(--ink);background:var(--surface)}
.slugbox span{display:flex;align-items:center;padding:0 2px 0 12px;color:var(--muted);font-size:15px;white-space:nowrap;flex:none;max-width:60%;overflow:hidden;text-overflow:ellipsis}
.slugbox input{border:0!important;background:none!important;padding-left:0!important;min-width:0;flex:1}
.hint.okc{color:var(--ok)}
.hint.err{color:var(--danger)}''')
seg1=rep(seg1,'''</style>

<div class="wrap">''','''</style>
</head>
<body>
<div class="wrap">''')
seg1=rep(seg1,'''    <span id="ownerSlot"></span>\n''','')
seg1=rep(seg1,"need:['placeName','town'],fields:['listingUrl','listingText','autofill','placeName'","need:['placeName','town'],fields:['listingUrl','listingText','placeName'")
seg1=rep(seg1,"lead:'Paste your listing link and description: we fill in what we can. Nothing is copied from Airbnb by us, only what you paste.',","lead:'Your listing link and the basics. Pasting your description helps us write the guide in your words.',")
seg1=rep(seg1,"need:['languages'],fields:['guideName','tagline','languages','guests','up:logo']","need:['slug','languages'],fields:['guideName','slug','tagline','languages','guests']")
seg1=rep(seg1,"title:'Name and languages',sub:'What guests see'","title:'Name, address, languages',sub:'What guests see'")
seg1=rep(seg1,"need:['upload:inspiration','mood','upload:cover'],fields:['styleBrief','up:inspiration','lookLikes','mood','up:cover','lookAvoid']",
 "need:[],fields:['up:logo','up:cover','mood','colorsFrom']")
seg1=rep(seg1,"title:'The look',sub:'Images and mood'","title:'The look',sub:'Logo, cover, layout, colours'")
seg1=rep(seg1,"lead:'Upload one to three images: an artwork you love, a photo of the place, a poster, or a screenshot of a website whose style you like. Colours, shapes and layout are built from them.',",
 "lead:'Four steps: your logo, the cover picture, the layout and its colours. All optional, and you can change them later.',")
seg1=rep(seg1,"""  {id:'bold',name:'Big colour tiles',d:'Like an app: bold blocks, strong shapes.',cls:'m-bold',n:6},
""","")
seg1=rep(seg1,""",
  {id:'auto',name:'Decide for me',d:'We match it to your images.',cls:'m-auto',n:0}
];""","""
];""")
seg1=rep(seg1,"const MOODS = [\n","const MOODS = [\n  {id:'bold',name:'Big colour tiles',d:'Like an app: bold blocks, strong shapes.',cls:'m-bold',n:6},\n")
seg1=rep(seg1,"  mood:{t:'mood',label:'Which feels closest?',hint:'This sets the layout, not only the colours.'},",
"""  mood:{t:'mood',label:'Layout',opt:true,hint:'Each one shows the same sections in a different way. Not sure? Leave it: we pick one that suits your listing.'},
  colorsFrom:{t:'radio',label:'Colours',opt:true,def:'The colours of the layout',opts:['The colours of the layout','From my logo','From my cover picture'],hint:'Each layout comes with its own colours. You can also take them from your logo or your cover picture.'},
  slug:{t:'slug',label:'Web address of your guide',hint:'The first part is ours, the last part is yours. Short and easy to type works best.'},
  refLinks:{t:'area',rows:2,label:'Apps or websites you love using',opt:true,full:true,ph:'Airbnb, Citymapper, a hotel site, a magazine…',hint:'Names or links. We read them for the overall feel, like the fonts and how round or sharp the corners are. Your guide keeps its own sections.'},
  feelWords:{t:'chips',label:'Words for the feel',opt:true,opts:['Cosy','Elegant','Playful','Modern','Rustic','Calm','Local and authentic','Luxurious','Family friendly','Colourful']},
  navStyle:{t:'radio',label:'How should guests find things?',opts:['Big tiles, like an app','A simple list','Photo-led, like a magazine','Map first','Search first','Not sure']},
  homeFirst:{t:'chips',label:'What should guests see first?',opt:true,hint:'Pick up to four.',opts:['Wi-Fi','Check-out time','House guide','How to get in','Places to eat','What\\u2019s on today','Beaches','Map','Your phone number','Rubbish tonight']},""")
seg1=rep(seg1,"  notes:{t:'area',rows:3,label:'Anything else?',opt:true,full:true}",
"""  notes:{t:'area',rows:3,label:'Anything else?',opt:true,full:true},
  sMinutes:{t:'radio',label:'How did filling this in feel?',opt:true,opts:['Quick and easy','About right','Too long','Confusing in places']},
  sMissing:{t:'area',rows:3,label:'What did we not ask that we should have?',opt:true,full:true},
  sIdeal:{t:'area',rows:3,label:'Describe your ideal guest guide in one or two sentences',opt:true,full:true,ph:'Guests open it and immediately see…'},
  sUseNow:{t:'radio',label:'What do you use today for guests?',opt:true,opts:['Nothing, I answer messages','A printed folder','A PDF or Google Doc','Airbnb guidebook','Another app (Touch Stay, Hostfully…)']},
  sPay:{t:'radio',label:'Would you pay for this?',opt:true,opts:['No','Up to 5 € a month','5 to 10 € a month','10 to 20 € a month','A one-off price']}""")
views=rep(views,"  if (k === 'autofill') return sample ? `<div class=\"full\"><button class=\"btn sun\" type=\"button\" id=\"autofill\"${v('listingText').length < 40 ? ' disabled' : ''}>Fill in from my listing</button> <span class=\"hint\" id=\"afState\"></span></div>` : '';\n",
"""  if (k === 'slug') { const pr = slugProblem(v('slug')); return `<div class="f full"><label for="f_slug">${esc(Q.slug.label)} ${badge('slug')}</label><p class="hint">${esc(Q.slug.hint)}</p><div class="slugbox"><span>${esc(BASE)}/</span><input id="f_slug" data-k="slug" type="text" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" value="${esc(v('slug'))}" placeholder="villa-mar" maxlength="40"></div><p id="slugMsg" class="hint${pr ? ' err' : ' okc'}">${esc(pr || `Your guests will open ${BASE}/${v('slug')}`)}</p></div>`; }
""")
views=rep(views,"      ${db && uid ? `<label class=\"btn small\">","      ${true ? `<label class=\"btn small\">")
views=rep(views,"  const accept = o.doc && assets ? 'image/*,application/pdf' : 'image/*';","  const accept = 'image/*';")
views=rep(views,"(o.doc && assets ? 'Photos or PDFs' : 'JPG or PNG')","'Photos or screenshots'")
views=rep(views,"""        </div></div></section>`;
}
function sendHTML(){""","""        </div></div></section>
    <section class="card" style="padding-block:16px">${noteBox(m.id)}</section>`;
}
function sendHTML(){""")
views=rep(views,"""      <div class="grid">${field('email')}${field('notes')}""","""      <div class="grid">${field('email')}${field('notes')}
        <div class="survey full"><h2>Five quick questions about this form</h2><div class="grid">${['sMinutes','sMissing','sIdeal','sUseNow','sPay'].map(field).join('')}</div></div>""")
views=rep(views,"""        <div class="row"><button class="btn primary" type="button" id="send\"""","""        <p id="sendState"></p>
        <div class="row"><button class="btn primary" type="button" id="send\"""")
views=rep(views,"<p>We build your guide and send you a link to try it. Every round of changes is included.</p>","<p>We build your guide from your answers and email you a link to try it. Every round of changes is included.</p>")
views=rep(views,"    case 'guide': return [v('guideName') || v('placeName'),","    case 'guide': return [v('guideName') || v('placeName'), v('slug') ? BASE + '/' + v('slug') : '',")
a=views.index('function moduleHTML(m){'); b=views.index('function summary(m){')
views=views[:a]+open(__import__('os').path.join(__import__('os').path.dirname(__file__),'nav.js')).read()+'\n'+open(__import__('os').path.join(__import__('os').path.dirname(__file__),'prefill.js')).read()+'\n'+open(__import__('os').path.join(__import__('os').path.dirname(__file__),'preview.js')).read()+'\n'+open(__import__('os').path.join(__import__('os').path.dirname(__file__),'start.js')).read()+'\n'+open(__import__('os').path.join(__import__('os').path.dirname(__file__),'account.js')).read()+'\n'+open(__import__('os').path.join(__import__('os').path.dirname(__file__),'editor.js')).read()+'\n'+views[b:]
views=rep(views,"function badge(k){ const q = k.startsWith('up:') ? UP[k.slice(3)] : Q[k]; if (!q || q.opt) return '<span class=\"opt\">optional</span>'; const key = k.startsWith('up:') ? 'upload:' + k.slice(3) : k;",
 "const NEEDED = new Set(MODULES.flatMap(m => m.need));\nfunction badge(k){ const key = k.startsWith('up:') ? 'upload:' + k.slice(3) : k; if (!NEEDED.has(key)) return '<span class=\"opt\">optional</span>';")
seg1=rep(seg1,"need:['placeName','town'],fields:['listingUrl','listingText','placeName'","need:['placeName','town'],fields:['listingUrl','listingText','fillBtn','placeName'")
seg1=rep(seg1,"lead:'Your listing link and the basics. Pasting your description helps us write the guide in your words.',","lead:'Paste your listing and we fill in most of the steps for you. You then only check them and approve.',")
seg1=rep(seg1,"  listingText:{t:'area',rows:7,label:'Listing description',opt:true,full:true,ph:'Paste the “About this space” text, house rules and amenities.'},",
"  listingText:{t:'area',rows:8,label:'Your listing text',opt:true,full:true,ph:'Entire home in [town], [country]\\n6 guests · 4 bedrooms · 5 beds\\n…\\nCheck-in after 4:00 PM\\nCheckout before 11:00 AM\\nNo parties or events…',hint:'On your listing page, select everything from the title down to the house rules (including “What this place offers”), copy and paste it here.'},")
seg1=rep(seg1,".loading{padding:40px;text-align:center;color:var(--muted)}",""".loading{padding:40px;text-align:center;color:var(--muted)}
.pill.pre{background:var(--surface);color:var(--sky)}
.meter i.p{background:#8FB3E8}
.legend i.p{background:#8FB3E8}
.sic .pre{width:16px;height:16px;border-radius:50%;background:var(--sky)}
.si.s-pre .sl{color:var(--sky)}
.frm{font-size:11px;font-weight:700;letter-spacing:.04em;padding:2px 7px;border-radius:999px;background:color-mix(in srgb,var(--sky) 15%,transparent);color:var(--sky)}
:root:not([data-theme="light"]) .pill.pre{color:#2c5aa0}""")
views=rep(views,"  if (k === 'privacyNote')","  if (k === 'fillBtn') return `<div class=\"full\" style=\"display:flex;gap:12px;align-items:center;flex-wrap:wrap\"><button class=\"btn sun\" type=\"button\" id=\"fillListing\">Fill in from my listing</button><span class=\"hint\">Fills the steps it can and marks them “Review”. Nothing you typed is replaced.</span></div>`;\n  if (k === 'privacyNote')")
views=rep(views,"  const head = `${esc(q.label)} ${badge(k)}`;","  const head = `${esc(q.label)} ${badge(k)}${A._pre && A._pre[k] && filled(k) ? (A._basis && A._basis[k] === 'suggested' ? ' <span class=\"frm sug\">Suggested by Claude: please check</span>' : ' <span class=\"frm\">From your listing</span>') : ''}`;")
# ---- v2: link-first, everything optional except the listing and the town ----
import re as _re
seg1=_re.sub(r"need:\[[^\]]*\]","need:[]",seg1)
seg1=rep(seg1,"lead:'Paste your listing and we fill in most of the steps for you. You then only check them and approve.',","lead:'Your listing is where everything starts. With the link (or its text) and the town, we write the rest.',")
seg1=rep(seg1,"need:[],fields:['listingUrl'","need:['source','town'],fields:['listingUrl'")
seg1=rep(seg1,"  {id:'taste',group:'area'","""  {id:'nearby',group:'area',title:'Attractions',sub:'Museums, parks, activities',icon:'heart',tc:'var(--clay)',ti:'#fff',sh:'var(--sun)',shape:'circle',
   lead:'Places guests go to visit or to do something: museums, castles, theme parks, karting, nature. Keep the ones you would send a friend to, and add any we missed. Restaurants and bars go in Eat and drink.',need:[],fields:['swipe','favDo','favourites']},
  {id:'taste',group:'area'""")
seg1=seg1.replace('family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Figtree:wght@400;500;600;700','family=Gloock&family=Onest:wght@400;500;600;700')
seg1=rep(seg1,"</style>\n</head>","\n"+open(__import__('os').path.join(__import__('os').path.dirname(__file__),'theme2.css')).read()+"\n</style>\n</head>")
views=rep(views,"  if (k === 'privacyNote')","  if (k === 'swipe') return swipeHTML();\n  if (k === 'privacyNote')")
views=rep(views,"    case 'taste':","    case 'nearby': { const y = Object.values(A.swipes || {}).filter(x => x.d === 'yes').length + lines('favDo').length; return y ? `${y} places` : 'Not started'; }\n    case 'taste':")
# ---- v3: loading the listing is its own first step; the place details come right after ----
seg1=rep(seg1,"{id:'listing',group:'basics',title:'Your listing',sub:'Link, name, town',icon:'link',tc:'var(--pine)',sh:'var(--sun)',shape:'circle',",
 "{id:'listing',group:'basics',title:'Load your listing',sub:'We read it for you',icon:'link',tc:'var(--pine)',sh:'var(--sun)',shape:'circle',")
seg1=rep(seg1,"lead:'Your listing is where everything starts. With the link (or its text) and the town, we write the rest.',",
 "lead:'Paste your listing link and press the button. We read the listing: the photos, the rooms, the rules and the times. The next steps arrive already filled in, and you only check them.',")
seg1=rep(seg1,"need:['source','town'],fields:['listingUrl','listingText','fillBtn','placeName','propertyType','town','region','sleeps','bedrooms','bathrooms','beds','hostName','privacyNote']},",
 "need:['source'],fields:['listingUrl','listingText','loadListing']},\n  {id:'place',group:'basics',title:'About the place',sub:'Name, town, size',icon:'tag',tc:'var(--pine)',ti:'#fff',sh:'var(--sky)',shape:'half',\n   lead:'What we found in your listing. Fix anything that is off.',\n   need:['placeName','town'],fields:['placeName','propertyType','town','region','sleeps','bedrooms','bathrooms','beds','hostName','privacyNote']},")
seg1=rep(seg1,"  town:{label:'Town or village',ph:'Where the place is'},","  town:{label:'Town or village',ph:'Where the place is'},\n  source:{label:'Your listing link or text'},")
views=rep(views,"  if (k === 'privacyNote')","""  if (k === 'loadListing') return loadListingHTML();
  if (k === 'listingText' && !(START.need === 'text' || v('listingText'))) return '';
  if (k === 'privacyNote')""")
views=rep(views,"    case 'listing': return","    case 'place': return")
views=views.replace("    case 'place': return [v('placeName')","    case 'listing': return A._draftAt ? `Loaded: ${uploads.filter(u => u.remote).length} photos, details filled in` : 'Not loaded yet';\n    case 'place': return [v('placeName')",1)

# sections come right after the place: what you keep here decides which questions follow
_i=seg1.index("  {id:'sections',"); _j=seg1.index("  {id:'photos',")
_blk=seg1[_i:_j]; seg1=seg1[:_i]+seg1[_j:]
_blk=_blk.replace("lead:'Each section you keep adds its own short set of questions to this page. Ticked ones fit your answers so far.'","lead:'Choose what goes into your guide. Each section you keep adds its questions to the steps that follow, and each one you remove takes them away. Ticked ones already fit your listing.'")
_k=seg1.index("  {id:'guide',"); seg1=seg1[:_k]+_blk+seg1[_k:]

# ---- v4: sleeping arrangements, optional ratings and reviews ----
seg1=rep(seg1,"  source:{label:'Your listing link or text'},","""  source:{label:'Your listing link or text'},
  sleeping:{t:'area',rows:4,label:'Sleeping arrangements',opt:true,full:true,ph:'Bedroom 1: double bed\\nBedroom 2: two single beds\\nLiving room: sofa bed',hint:'One line per bedroom, as your listing says. Guests see it in the Bedrooms part of the house guide.'},
  ratingAvg:{t:'number',label:'Your rating',ph:'4.9',opt:true,hint:'Out of 5, as shown on your listing.'},
  ratingCount:{t:'number',label:'Number of reviews',ph:'89',opt:true},
  reviewQuotes:{t:'area',rows:5,label:'Reviews you would like to show',opt:true,full:true,ph:'Lovely house, we did not want to leave. - Marie\\nPerfect for a family weekend. - Jordi',hint:'Up to three short reviews, one per line, with the first name after a dash. Only add reviews you are happy to share.'},
  reviewsNote:{label:'Ratings and reviews'},""")
seg1=rep(seg1,"'beds','hostName','privacyNote']}","'beds','sleeping','hostName','privacyNote']}")
seg1=rep(seg1,"  {id:'map',name:'Map'","  {id:'reviews',name:'Ratings and reviews',d:'Your listing rating and latest reviews, shown as they are.',built:true,on:()=>false},\n  {id:'map',name:'Map'")
seg1=rep(seg1,"  {id:'taste',group:'area'","""  {id:'reviews',group:'area',title:'Ratings and reviews',sub:'Optional',icon:'heart',tc:'var(--sun)',ti:'#1b1407',sh:'var(--pine)',shape:'half',sec:'reviews',
   lead:'Show your listing rating and reviews at the end of the guide, as they are on your listing. We read them from your listing, you do not pick or type anything.',need:[],fields:['ratingAvg','ratingCount','reviewsNote']},
  {id:'taste',group:'area'""")
views=rep(views,"  if (k === 'privacyNote')","  if (k === 'reviewsNote') return `<div class=\"note full\"><div>Guests see your rating and your latest reviews as they are on your listing, with a link to read the rest. We do not choose or edit them.</div></div>`;\n  if (k === 'privacyNote')")

# ---- v5: photos show their image, room names match the tiles, start over ----
views=rep(views,"${/^image\\//.test(u.type) || u.dataUrl ?","${/^image\\//.test(u.type) || u.dataUrl || u.remote ?")
views=rep(views,"${ROOMS.map(r => `<option${u.room===r?' selected':''}>${r}</option>`).join('')}","${roomChoices(u).map(r => `<option${(u.roomLabel||u.room)===r?' selected':''}>${esc(r)}</option>`).join('')}")
forms=open(__import__('os').path.join(__import__('os').path.dirname(__file__),'forms.html')).read()
html=seg1+'\n'+views+'\n'+runtime+'\n})();\n</script>\n'+forms+'</body>\n</html>\n'
import subprocess,datetime
try: _h=subprocess.run(['git','rev-parse','--short','HEAD'],capture_output=True,text=True,cwd=__import__('os').path.dirname(__file__)).stdout.strip()
except Exception: _h=''
from zoneinfo import ZoneInfo
_stamp=datetime.datetime.now(ZoneInfo('Europe/Madrid')).strftime('%d %b %Y, %H:%M')+' (Madrid time'+(', after commit '+_h if _h else '')+')'
html=html.replace('__BUILD__',_stamp)
open(__import__('os').path.join(__import__('os').path.dirname(__file__),'index.html'),'w').write(html)
