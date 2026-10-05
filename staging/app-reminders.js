/* Personal device reminders. No private names or public access tokens enter alerts/calendar files. */
(() => {
 const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
 const definitions=[
  {id:'oclm',label:'Plan OCLM — three weeks ahead',roles:['admin','oclm'],day:1,time:'09:00',topic:'midweek',tab:'oclm',body:'Assign and review the meeting week three weeks ahead. Publish only after checking the schedule.'},
  {id:'attendance_midweek',label:'Record midweek attendance',roles:['admin','attendance'],day:3,time:'21:00',topic:'attendance',tab:'attendance',body:'Check the meeting date, record attendance, and confirm the save.'},
  {id:'attendance_weekend',label:'Record weekend attendance',roles:['admin','attendance'],day:0,time:'12:00',topic:'attendance',tab:'attendance',body:'Check the meeting date, record attendance, and confirm the save.'},
  {id:'attendance_link',label:'Share the attendance form link',roles:['admin','attendance'],day:3,time:'17:00',topic:'sharing',tab:'attendance',body:'Open Attendance and share the approved form link with the person counting. This reminder does not send a link automatically.'},
  {id:'reports',label:'Service reports — every 1st',roles:['admin','field_service','group_overseer','publisher'],monthly:true,time:'09:00',topic:'reports',tab:'groups',body:'Collect the previous month’s service reports and follow up on missing entries in your assigned section.'},
  {id:'report_link',label:'Share the service report form link',roles:['admin','field_service','group_overseer'],monthly:true,time:'09:00',topic:'sharing',tab:'groups',body:'Open your group or report tools and share the approved report form link. This reminder does not send a link automatically.'}
 ];
 const esc=s=>window.ui.escapeHtml(String(s));
 function eligible(){
  if(!window.currentCongId||window.auth?.verifiedOwner||sessionStorage.getItem('ca_signed_out')==='true'||document.body.classList.contains('public-mode'))return [];
  const roles=document.body.classList.contains('overseer-mode')?['group_overseer']:sessionStorage.getItem('fs_auth')==='true'?window.ui.getRoleGrants():[];
  return definitions.filter(d=>d.roles.some(r=>roles.includes(r)));
 }
 function key(){return 'ca_reminders_v1_'+JSON.stringify([window.currentCongId,window.auth?.verifiedEmail||sessionStorage.getItem('fs_auth_type')||'legacy',window.auth?.verifiedGroups||window.ui.overseerGroup||'']);}
 function read(){try{return JSON.parse(localStorage.getItem(key())||'{}');}catch{return {};}}
 function settings(){const saved=read();return eligible().map(d=>({...d,enabled:saved[d.id]?.enabled===true,day:Number.isInteger(saved[d.id]?.day)&&saved[d.id].day>=0&&saved[d.id].day<=6?saved[d.id].day:d.day,time:/^([01]\d|2[0-3]):[0-5]\d$/.test(saved[d.id]?.time||'')?saved[d.id].time:d.time}));}
 function dateAt(d,rule){const result=new Date(d);const [h,m]=rule.time.split(':').map(Number);result.setHours(h,m,0,0);return result;}
 function occurrence(rule,now=new Date(),next=false){
  let d=dateAt(now,rule);
  if(rule.monthly){d.setDate(1);if(next&&d<now)d.setMonth(d.getMonth()+1);else if(!next&&d>now)d.setMonth(d.getMonth()-1);}
  else{const offset=(d.getDay()-rule.day+7)%7;d.setDate(d.getDate()-offset);if(next&&d<now)d.setDate(d.getDate()+7);else if(!next&&d>now)d.setDate(d.getDate()-7);}
  return d;
 }
 function planningDate(now=new Date()){const d=new Date(now);d.setHours(12,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7)+21);return d;}
 function due(now=new Date()){const saved=read();return settings().filter(r=>r.enabled).map(rule=>({rule,date:occurrence(rule,now)})).filter(item=>now-item.date>=0&&now-item.date<86400000&&saved[item.rule.id]?.done!==item.date.toISOString());}
 function open(){window.ui.openModal('modal-reminders');render();window.CAOnboarding?.mailSettings();}
 function render(){
  const zone=Intl.DateTimeFormat().resolvedOptions().timeZone||'device time';document.getElementById('reminder-timezone').textContent='Times use this device’s time zone: '+zone+'. Choose your actual meeting days and times.';
  const rules=settings(),box=document.getElementById('reminder-settings');
  box.innerHTML=rules.map(r=>`<fieldset class="ca-reminder-card"><legend>${esc(r.label)}</legend><label class="ca-reminder-enable"><input type="checkbox" id="reminder-enable-${r.id}" ${r.enabled?'checked':''}> Remind me</label><div class="ca-reminder-fields">${r.monthly?'<p>Every month, on the 1st</p>':`<label>Day<select id="reminder-day-${r.id}">${days.map((day,i)=>`<option value="${i}" ${i===r.day?'selected':''}>${day}</option>`).join('')}</select></label>`}<label>Time<input type="time" id="reminder-time-${r.id}" value="${r.time}" required></label></div><p>${esc(r.body)}</p></fieldset>`).join('')||'<p>No congregation reminders apply to this account. Open your congregation workspace first.</p>';
  const now=new Date();document.getElementById('reminder-upcoming').innerHTML=rules.filter(r=>r.enabled).map(r=>`<li><strong>${esc(r.label)}</strong><span>${esc(occurrence(r,now,true).toLocaleString())}</span></li>`).join('')||'<li>Enable a reminder and save to see the next time.</li>';
  renderDue();
 }
 function renderDue(){const box=document.getElementById('reminder-due');if(!box)return;box.innerHTML=due().map(({rule,date})=>`<div class="ca-reminder-due"><strong>${esc(rule.label)}</strong><p>${esc(rule.body)}</p><div class="ca-reminder-actions"><button type="button" class="ca-secondary-action" onclick="window.CAReminders.openTask('${rule.id}')">Open task</button><button type="button" class="ca-secondary-action" onclick="window.CAReminders.done('${rule.id}','${date.toISOString()}')">Done for this reminder</button></div></div>`).join('')||'<p>No reminders due in the past 24 hours.</p>';const badge=document.getElementById('reminder-badge');if(badge){const count=due().length;badge.textContent=count?String(count):'';badge.hidden=!count;}}
 function save(){
  try{const saved=read();for(const rule of settings()){const time=document.getElementById('reminder-time-'+rule.id).value;if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw new Error('Choose a valid time for '+rule.label+'.');const day=rule.monthly?undefined:Number(document.getElementById('reminder-day-'+rule.id).value);if(!rule.monthly&&(!Number.isInteger(day)||day<0||day>6))throw new Error('Choose a valid day.');saved[rule.id]={enabled:document.getElementById('reminder-enable-'+rule.id).checked,time,day,done:saved[rule.id]?.done};}localStorage.setItem(key(),JSON.stringify(saved));document.getElementById('reminder-save-status').textContent='Saved on this device for your account and congregation.';render();tick();window.CAPush?.syncPreferences();}
  catch(error){document.getElementById('reminder-save-status').textContent='Not saved. '+error.message;}
 }
 function done(id,stamp){if(!eligible().some(r=>r.id===id))return;try{const saved=read();saved[id]={...saved[id],done:stamp};localStorage.setItem(key(),JSON.stringify(saved));renderDue();}catch{window.ui.showToast('Could not save the reminder dismissal.','error');}}
 function openTask(id){const rule=eligible().find(r=>r.id===id);if(!rule)return;window.ui.closeModal('modal-reminders');if(id==='oclm'){window.ui.switchTab('oclm');window.setSchedulerWeek?.(weekId(planningDate()));}else if(window.ui.getRoleGrants().includes('group_overseer')&&!window.ui.getAllowedTabs().includes(rule.tab))window.ui.switchTab('overseer');else if(document.body.classList.contains('overseer-mode'))window.ui.renderOverseerView(window.ui.overseerGroup);else window.ui.switchTab(rule.tab);}
 function weekId(d){const n=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));n.setUTCDate(n.getUTCDate()+4-(n.getUTCDay()||7));const start=new Date(Date.UTC(n.getUTCFullYear(),0,1));return n.getUTCFullYear()+'-W'+String(Math.ceil((((n-start)/86400000)+1)/7)).padStart(2,'0');}
 const pad=n=>String(n).padStart(2,'0');
 const localStamp=d=>d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate())+'T'+pad(d.getHours())+pad(d.getMinutes())+'00';
 const calendarText=s=>String(s).replace(/\\/g,'\\\\').replace(/[\r\n]+/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
 function calendar(now=new Date()){
  const rows=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Congregation Assistant//Personal reminders//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
  const base=new URL('./',location.href);base.search='';base.hash='';
  for(const r of settings().filter(r=>r.enabled)){const start=occurrence(r,now,true);rows.push('BEGIN:VEVENT','UID:'+r.id+'-'+crypto.randomUUID()+'@congregation-assistant','DTSTAMP:'+now.toISOString().replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z'),'DTSTART:'+localStamp(start),'DURATION:PT15M','RRULE:'+(r.monthly?'FREQ=MONTHLY;BYMONTHDAY=1':'FREQ=WEEKLY;BYDAY='+['SU','MO','TU','WE','TH','FR','SA'][r.day]),'SUMMARY:'+calendarText('CA: '+r.label),'DESCRIPTION:'+calendarText(r.body+' Open the software: '+base.href),'BEGIN:VALARM','TRIGGER:PT0M','ACTION:DISPLAY','DESCRIPTION:'+calendarText(r.label),'END:VALARM','END:VEVENT');}
  rows.push('END:VCALENDAR');return rows.map(line=>{let result='',bytes=0;for(const ch of line){const size=new TextEncoder().encode(ch).length;if(bytes+size>74){result+='\r\n ';bytes=1;}result+=ch;bytes+=size;}return result;}).join('\r\n')+'\r\n';
 }
 function download(){if(!settings().some(r=>r.enabled)){window.ui.showToast('Enable and save at least one reminder first.','error');return;}const url=URL.createObjectURL(new Blob([calendar()],{type:'text/calendar;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='congregation-assistant-reminders.ics';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);document.getElementById('reminder-save-status').textContent='Calendar downloaded. Import it and check your calendar alerts. Remove older imported CA reminders before importing changes.';}
 const delivered=new Set();
 async function tick(){if(!window.ui||!window.auth)return;renderDue();if(document.visibilityState==='hidden'||sessionStorage.getItem('fs_auth')!=='true'||!('Notification' in window)||Notification.permission!=='granted')return;for(const item of due()){const tag=key()+item.rule.id+item.date.toISOString();if(delivered.has(tag))continue;try{await window.CANotifications.sendReminder(item.rule.label,item.rule.body);delivered.add(tag);}catch{/* Due reminders remain visible if device notification fails. */}}}
 window.CAReminders={open,render,save,done,openTask,download,calendar,settings,due,occurrence,planningDate,weekId,tick};
 window.addEventListener('load',()=>{tick();setInterval(tick,60000);});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')tick();});
})();
