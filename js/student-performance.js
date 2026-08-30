
const habits=['HTF Analysis','Check News','London Session Plan','Journal Trade','Watch Lesson','Complete Quiz','Backtest','Exercise','Read Psychology','Sleep 8 Hours'];
const c=document.getElementById('habits');
function render(){let done=0;c.innerHTML='<h2>Habit Tracker</h2>';habits.forEach((h,i)=>{let v=localStorage.getItem('stu_'+i)==='1';if(v)done++;let l=document.createElement('label');let b=document.createElement('input');b.type='checkbox';b.checked=v;b.onchange=()=>{localStorage.setItem('stu_'+i,b.checked?'1':'0');render()};l.appendChild(b);l.append(' '+h);c.appendChild(l);});let p=Math.round(done/habits.length*100);prog.value=p;pct.textContent=p+'%';ready.textContent='Trading Readiness: '+p+'%';}
render();
