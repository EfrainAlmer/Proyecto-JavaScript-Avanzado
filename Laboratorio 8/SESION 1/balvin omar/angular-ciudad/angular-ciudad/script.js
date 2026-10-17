// SCRIPT: hace funcionar las demostraciones.
// Es JavaScript simple que imita lo que hace Angular, para entender la idea.

const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// PESTAÑAS: al hacer clic en un botón, se muestra su sección y se ocultan las demás.
document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('#tabs button').forEach(x=>x.setAttribute('aria-selected',x===b));
  document.querySelectorAll('section').forEach(s=>s.classList.toggle('on',s.id===b.dataset.t));
});
// ROUTER (simulado): "pages" guarda cada ruta y su contenido.
// go(ruta) cambia la URL mostrada y la vista, como haría el Router de Angular.
const pages={'':['Inicio','🏠 Bienvenido a la ciudad. Esta es la ruta raíz.'],menu:['Menú','🍽️ Aquí se carga MenuComponent.'],'pedido/42':['Pedido 42','📦 Parámetro de ruta :id = 42, leído con ActivatedRoute.'],'ruta-rara':['404','🚧 Ninguna ruta coincide: entra la ruta comodín **.']};
function go(k){
  $('metro').innerHTML=Object.keys(pages).map((p,i)=>(i?'<i></i>':'')+`<button class="${p===k?'cur':''}" data-p="${p}">${pages[p][0]}</button>`).join('');
  $('url').textContent='tuapp.com/'+k;
  $('view').innerHTML='<b>&lt;router-outlet&gt;</b><br>'+pages[k][1];
  document.querySelectorAll('#metro button').forEach(b=>b.onclick=()=>go(b.dataset.p));
}
go('');
// COMPONENTES (simulado): "bricks" es la lista de edificios.
// Cada edificio se dibuja con la misma plantilla = un componente reutilizado.
const bricks=[['Panadería','🥖'],['Librería','📚']];const cols=['--red','--teal','--gold'];
function drawB(){$('bricks').innerHTML=bricks.map((b,i)=>`<div class="brick" style="--c:var(${cols[i%3]})"><b>${b[1]} ${esc(b[0])}</b><small>&lt;app-tienda nombre="${esc(b[0])}" /&gt;</small></div>`).join('')}
$('cadd').onclick=()=>{const n=$('cn').value.trim()||'Tienda';bricks.push([n,$('cc').value]);$('cn').value='';drawB()};
drawB();
// PIPES (simulado): se aplican en orden las transformaciones activadas,
// igual que {{ texto | uppercase | slice:0:10 }} en Angular.
function drawP(){
  let v=$('pin').value;const on=[...document.querySelectorAll('#pp input:checked')].map(i=>i.value);const names=[];
  let tpl='{{ texto';
  on.forEach(o=>{
    if(o==='upper'){v=v.toUpperCase();tpl+=' | uppercase'}
    if(o==='slice'){v=v.slice(0,10);tpl+=' | slice:0:10'}
    if(o==='title'){v=v.replace(/\w\S*/g,w=>w[0].toUpperCase()+w.slice(1).toLowerCase());tpl+=' | titlecase'}
  });
  tpl+=' }}';
  const n=parseFloat($('pnum').value)||0;
  let num=$('pcur').checked?new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(n):String(n);
  $('pout').textContent=v+'   ·   '+num;
  $('ptpl').textContent=tpl+($('pcur').checked?'   {{ precio | currency:\'PEN\' }}':'');
}
document.querySelectorAll('#pin,#pp input,#pnum,#pcur').forEach(e=>e.addEventListener('input',drawP));drawP();
// FORMULARIOS (simulado): se comprueba cada campo en vivo.
// El botón se activa solo cuando correo y contraseña son válidos.
const t={fe:0,fp:0};
function drawF(){
  const e=$('fe').value,p=$('fp').value;
  const eok=/^\S+@\S+\.\S+$/.test(e),pok=p.length>=6;
  $('fee').textContent=t.fe&&!eok?(e?'Escribe un correo válido.':'El correo es obligatorio.'):'';
  $('fpe').textContent=t.fp&&!pok?(p?'Faltan '+(6-p.length)+' caracteres.':'La contraseña es obligatoria.'):'';
  $('fs').disabled=!(eok&&pok);
  $('fst').textContent=`form.valid   = ${eok&&pok}\ncorreo.valid = ${eok}  touched = ${!!t.fe}\nclave.valid  = ${pok}  touched = ${!!t.fp}`;
}
['fe','fp'].forEach(i=>{$(i).addEventListener('input',()=>{t[i]=1;drawF()});$(i).addEventListener('blur',()=>{t[i]=1;drawF()})});
$('fs').onclick=()=>{$('fmsg').innerHTML='<span class="ok">✔ Trámite enviado</span>';setTimeout(()=>$('fmsg').textContent='',2500)};
drawF();
