/* Каталог «Залы мира 2025»
 * Читает halls-2025.csv (разделитель ;), строит каталог.
 * Фото берёт из колонки «Фото» (список путей через запятую) или,
 * если её нет, из папки photos/<слаг>/01.jpg … 06.jpg.
 */
(function(){
var CSV = 'halls-2025.csv';

var SECTIONS = [
  ['Концертные залы','concert','Симфонические, филармонические и многофункциональные концертные залы'],
  ['Театральные залы','theatre','Драматические, оперные, танцевальные и гибкие театральные залы'],
  ['Музыкальные залы','music','Музыкальные школы, консерватории, камерные и репетиционные залы'],
  ['Лекционные залы','lecture','Университетские аудитории и лекционные залы'],
  ['Выставочные залы','exhibition','Музеи и выставочные залы'],
  ['Кинозалы','cinema','Кинотеатры и кинозалы'],
  ['Залы библиотек','library','Читальные залы и библиотеки'],
  ['Прочие залы','other','Арены, конгресс-холлы, планетарии и многофункциональные объекты']
];

function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function slug(s){ return String(s).toLowerCase().replace(/[^a-z0-9а-яё]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,60); }
function fmtNum(n){ return n.toLocaleString('ru-RU').replace(/\u00a0/g,'\u2009'); }

function parseCSV(text){
  var rows=[], cur=[], field='', inQ=false;
  for(var i=0;i<text.length;i++){
    var c=text[i];
    if(inQ){
      if(c=='"'){ if(text[i+1]=='"'){field+='"';i++;} else inQ=false; }
      else field+=c;
    } else {
      if(c=='"') inQ=true;
      else if(c==';'){ cur.push(field); field=''; }
      else if(c=='\n'||c=='\r'){ if(c=='\r'&&text[i+1]=='\n')i++; cur.push(field); field='';
        if(cur.some(function(x){return x.trim();})) rows.push(cur); cur=[]; }
      else field+=c;
    }
  }
  if(field!==''||cur.length){ cur.push(field); if(cur.some(function(x){return x.trim();})) rows.push(cur); }
  return rows;
}

function capNum(cap){
  var m=String(cap).match(/(\d[\d\s\u00a0]*)/);
  if(!m) return null;
  return parseInt(m[1].replace(/[\s\u00a0,]/g,''),10);
}

function capHTML(cap){
  cap=String(cap||'').trim();
  if(!cap||cap==='н/д'||cap==='-'||cap==='—') return '<div class="cap txt"><span class="nd">вместимость<br>не указана</span></div>';
  var n=capNum(cap);
  if(n!=null) return '<div class="cap">'+fmtNum(n)+'<small>мест</small></div>';
  return '<div class="cap txt">'+esc(cap)+'</div>';
}

function fieldHTML(v){
  v=String(v||'').trim();
  if(!v||v==='н/д') return '<span class="nd">не указан</span>';
  if(v.toLowerCase().indexOf('н/д')===0){
    var rest=v.slice(3).trim();
    if(rest) return '<span class="nd">не указан</span> <span class="nd" style="font-style:normal">'+esc(rest)+'</span>';
    return '<span class="nd">не указан</span>';
  }
  return esc(v);
}

function srcHTML(src,src2){
  src=String(src||'').trim();
  if(!src||src==='н/д') return '';
  var urls=src.split(',').map(function(s){return s.trim();}).filter(function(s){return /^https?:\/\//.test(s);});
  var more='';
  if(src2&&String(src2).trim()) more='<span class="more">+1 доп. источников</span>';
  else if(urls.length>1) more='<span class="more">+'+(urls.length-1)+' доп. источников</span>';
  if(!urls.length) return '<div class="src">Источник: <span class="nd">'+esc(src)+'</span></div>';
  var url=urls[0], disp=url.replace(/^https?:\/\//,'');
  if(disp.length>60) disp=disp.slice(0,60);
  return '<div class="src">Источник: <a href="'+esc(url)+'" target="_blank" rel="noopener">'+esc(disp)+'</a>'+more+'</div>';
}

var PHOTOS={}; // манифест photos.json: папка -> список файлов

function photoPaths(row){
  // колонка «Фото» (индекс 13) — папка или список путей через запятую
  var f=row[13];
  if(f&&String(f).trim()){
    var parts=String(f).split(',').map(function(s){return s.trim();}).filter(Boolean);
    var out=[];
    parts.forEach(function(p){
      if(/\.(jpe?g|png|webp|gif|avif)$/i.test(p)){ out.push(p); } // это файл
      else { // это папка — берём список из манифеста
        var folder=p.replace(/^photos\/?/,'').replace(/\/+$/,'');
        (PHOTOS[folder]||[]).forEach(function(fn){ out.push('photos/'+folder+'/'+fn); });
      }
    });
    return out;
  }
  // нет колонки «Фото» — ищем папку по слагу в манифесте (без 404)
  var s=slug(row[1]);
  return (PHOTOS[s]||[]).map(function(fn){ return 'photos/'+s+'/'+fn; });
}

function itemHTML(row){
  var name=row[1].trim(), comp=row[2].trim(), city=row[3].trim(), country=row[4].trim();
  var arch=row[7].trim(), acous=row[8].trim(), date=row[9].trim(), comment=row[10].trim();
  var src=row[11].trim(), src2=(row[12]||'').trim();
  var loc=(city&&city!=='н/д')?esc(city)+' · '+esc(country):esc(country);
  var nm=esc(name);
  if(comp&&comp!=='н/д') nm+=' <span style="color:var(--mut)">— '+esc(comp)+'</span>';
  var search=[name,comp,city,country,arch,acous,comment].join(' ').toLowerCase();
  var photos=photoPaths(row).map(function(p){
    return '<img src="'+esc(p)+'" loading="lazy" onerror="this.style.display=\'none\'">';
  }).join('');
  var ph=photos?'<div class="photos">'+photos+'</div>':'';
  return '<article class="item" data-s="'+esc(search)+'" data-reg="'+esc(row[5]&&row[5].trim?row[5].trim():'')+'">'+
    '<div class="top"><div><div class="nm">'+nm+'</div><div class="loc">'+loc+'</div></div>'+capHTML(row[6])+'</div>'+
    ph+
    '<div class="meta">'+
      '<div class="f"><div class="k">Архитектор</div><div class="v">'+fieldHTML(arch)+'</div></div>'+
      '<div class="f"><div class="k">Акустический консультант</div><div class="v">'+fieldHTML(acous)+'</div></div>'+
      '<div class="f"><div class="k">Открытие / сдача</div><div class="v">'+fieldHTML(date)+'</div></div>'+
    '</div>'+
    '<div class="note">'+esc(comment)+'</div>'+
    srcHTML(src,src2)+
  '</article>';
}

function build(data){
  var total=data.length;
  var countries={}, regions={};
  data.forEach(function(r){
    if(r[4]&&r[4].trim()&&r[4].trim()!=='н/д') countries[r[4].trim()]=1;
    var reg=r[5]&&r[5].trim()?r[5].trim():'';
    if(reg) regions[reg]=1;
  });
  document.getElementById('lead').innerHTML='Сводный каталог: <b>'+total+' зал</b> в <b>'+Object.keys(countries).length+' странах</b>, введённых в эксплуатацию или официально открытых в течение 2025 календарного года.';
  document.getElementById('stats').innerHTML=
    st(total,'залов в каталоге')+st(Object.keys(countries).length,'страны');
  function st(n,l){ return '<div class="st"><div class="n">'+n+'</div><div class="l">'+l+'</div></div>'; }

  // выпадающий список регионов
  var regSel=document.getElementById('reg');
  if(regSel){
    Object.keys(regions).sort().forEach(function(reg){
      var o=document.createElement('option');
      o.value=reg; o.textContent=reg;
      regSel.appendChild(o);
    });
  }

  var nav=document.getElementById('nav');
  SECTIONS.forEach(function(s){
    nav.innerHTML+='<a href="#'+s[1]+'">'+esc(s[0])+'</a>';
  });
  nav.innerHTML+='<input id="q" type="search" placeholder="Поиск: зал, город, бюро…" autocomplete="off">';

  var content=document.getElementById('content');
  SECTIONS.forEach(function(s){
    var items=data.filter(function(r){return r[0].trim()===s[0];});
    if(!items.length) return;
    var body=items.map(itemHTML).join('');
    content.insertAdjacentHTML('beforeend',
      '<section id="'+s[1]+'"><div class="shead"><h2>'+esc(s[0])+'</h2></div>'+
      '<p class="sdesc">'+esc(s[2])+'</p>'+body+'</section>');
  });

  initLightbox();

  // поиск + фильтр по региону
  var q=document.getElementById('q'), reg=document.getElementById('reg'), items=document.querySelectorAll('.item'), nr=document.getElementById('nr');
  function applyFilter(){
    var v=(q?q.value:'').trim().toLowerCase(), rg=reg?reg.value:'', shown=0;
    items.forEach(function(it){
      var ok=(!v||it.dataset.s.indexOf(v)>-1) && (!rg||it.dataset.reg===rg);
      it.style.display=ok?'':'none'; if(ok)shown++;
    });
    document.querySelectorAll('section[id]').forEach(function(s){
      var vis=s.querySelectorAll('.item:not([style*="none"])').length;
      s.style.display=((v||rg)&&!vis)?'none':'';
    });
    nr.style.display=((v||rg)&&!shown)?'block':'none';
  }
  if(q) q.addEventListener('input',applyFilter);
  if(reg) reg.addEventListener('change',applyFilter);
}

function initLightbox(){
  var lb=document.getElementById('lightbox'), img=document.getElementById('lbImg'),
      count=document.getElementById('lbCount'), cur=[], idx=0;
  function show(i){
    if(!cur.length) return;
    idx=(i+cur.length)%cur.length;
    img.src=cur[idx].src;
    count.textContent=(idx+1)+' / '+cur.length;
    lb.style.display='flex';
  }
  document.addEventListener('click',function(e){
    var t=e.target;
    if(t.tagName==='IMG'&&t.closest('.photos')){
      var imgs=Array.prototype.slice.call(t.closest('.photos').querySelectorAll('img'));
      cur=imgs.filter(function(im){return im.style.display!=='none';});
      idx=cur.indexOf(t); if(idx<0) idx=0;
      show(idx);
    }
  });
  document.getElementById('lbClose').addEventListener('click',function(){lb.style.display='none';});
  document.getElementById('lbPrev').addEventListener('click',function(e){e.stopPropagation();show(idx-1);});
  document.getElementById('lbNext').addEventListener('click',function(e){e.stopPropagation();show(idx+1);});
  lb.addEventListener('click',function(e){ if(e.target===lb) lb.style.display='none'; });
  document.addEventListener('keydown',function(e){
    if(lb.style.display!=='flex') return;
    if(e.key==='Escape') lb.style.display='none';
    if(e.key==='ArrowLeft') show(idx-1);
    if(e.key==='ArrowRight') show(idx+1);
  });
}

Promise.all([
  fetch(CSV).then(function(res){ if(!res.ok) throw new Error(res.status); return res.text(); }),
  fetch('photos.json').then(function(r){ return r.json(); }).catch(function(){ return {}; })
]).then(function(res){
  PHOTOS=res[1]||{};
  var rows=parseCSV(res[0]);
  if(rows.length<2) throw new Error('CSV пуст');
  var data=rows.slice(1).filter(function(r){return r.some(function(c){return c.trim();});});
  build(data);
})
  .catch(function(e){
    document.getElementById('lead').innerHTML='<b>Не удалось загрузить '+CSV+'</b> ('+esc(e.message)+'). Проверьте, что файл лежит рядом с index.html.';
  });
})();
