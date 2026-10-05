(() => {
 const base='https://photographicode.github.io/Congregation-Assistant_Public/how-to-use.html#';
 const topics=[
  ['dashboard','start','Start here','Find your assigned tools, check saves, and sign out safely.'],
  ['publishers','publishers','Publisher records','Add, search, edit, and check publisher records.'],
  ['groups','groups','Groups and report links','Organize groups, check missing reports, and share a scoped form.'],
  ['overseer','groups','My group','Review your assigned group’s members and missing reports.'],
  ['analytics','reports','Reports and PDFs','Check periods and totals; download S-21 and review printable reports.'],
  ['attendance','attendance','Meeting attendance','Enter counts, share the form, and download S-3 or S-88.'],
  ['oclm','midweek','OCLM scheduling','Plan three weeks ahead, assign parts, review, publish, and open the live link.'],
  ['emergency','emergency','Emergency contacts','Keep contact details current and use the authorized printable directory.'],
  ['admin','roles','Access and roles','Approve accounts and assign each person the correct responsibility.'],
  ['publishers','imports','Imports and exports','Use supported file formats and check your exported copies.'],
  ['support','reminders','My reminders','Choose meeting days and times, monthly reminders, and calendar alerts.'],
  ['support','install','Install as an app','Use the browser or add the software to your home screen.'],
  ['support','settings','Settings and announcements','Choose readable text and themes; read notices and get support.'],
  ['support','sharing','Sharing and privacy','Check the purpose of each link before sharing it.'],
  ['support','backup','Failed saves and recovery','Preserve drafts, retry errors, and understand backups.']
 ];
 window.CAGuide={open(){const allowed=window.ui.getAllowedTabs();document.getElementById('ca-role-guide').innerHTML=topics.filter(([permission])=>permission==='support'||permission==='admin'&&window.ui.canManageAccess()||allowed.includes(permission)).map(([,key,title,body])=>`<article class="ca-help-card"><h3>${title}</h3><p>${body}</p><a href="${base+key}" target="_blank" rel="noopener noreferrer">Read the steps ↗</a></article>`).join('');window.ui.openModal('modal-how-to-use');}};
})();
