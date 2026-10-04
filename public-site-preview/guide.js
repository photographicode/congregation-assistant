(() => {
 const tabs=[...document.querySelectorAll('[data-guide]')];
 function show(key,update=false){const chosen=tabs.find(t=>t.dataset.guide===key)||tabs[0];tabs.forEach(t=>{const active=t===chosen;t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1;document.getElementById('guide-'+t.dataset.guide).hidden=!active;});if(update)history.replaceState(null,'','#'+chosen.dataset.guide);}
 tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>show(tab.dataset.guide,true));tab.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight'||e.key==='ArrowDown')next=(i+1)%tabs.length;else if(e.key==='ArrowLeft'||e.key==='ArrowUp')next=(i+tabs.length-1)%tabs.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;else return;e.preventDefault();tabs[next].focus();show(tabs[next].dataset.guide,true);});});
 const restore=()=>show(location.hash.slice(1));window.addEventListener('hashchange',restore);restore();
})();