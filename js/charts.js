const initChart=(id,type,labels,data,color)=> {
  const ctx=document.getElementById(id); if(!ctx)return;
  if(ctx.chart)ctx.chart.destroy();
  ctx.chart=new Chart(ctx,{type,data:{labels,datasets:[{data,backgroundColor:color,borderColor:color,tension:0.4}]},options:{responsive:true,plugins:{legend:{display:id==='pieChart'}}}});
}
const renderCharts=()=>{
  const last7=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));return d});
  const trend=last7.map(d=>state.history.filter(h=>new Date(h.time).toDateString()===d.toDateString()).length);
  const succ=state.history.filter(h=>h.status==='success').length, fail=state.history.filter(h=>h.status==='failed').length;
  const types={email:0,web:0,manual:0}; state.flows.forEach(f=>types[f.trigger.id]++);
  initChart('trendChart','line',last7.map(d=>['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]),trend,'#D2691E');
  initChart('pieChart','doughnut',['Success','Failed'],[succ||1,fail],['#8FBC8F','#A52A2A']);
  initChart('barChart','bar',['Email','Web','Manual'],[types.email,types.web,types.manual],'#D2691E');
}
