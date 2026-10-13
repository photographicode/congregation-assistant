export const greetings = {
 en: ['Good morning', 'Good afternoon', 'Good evening', 'Hello'],
 hi: ['सुप्रभात', 'शुभ दोपहर', 'शुभ संध्या', 'नमस्ते'],
 ml: ['സുപ്രഭാതം', 'ശുഭ ഉച്ച', 'ശുഭ സായാഹ്നം', 'നമസ്കാരം'],
 ta: ['காலை வணக்கம்', 'மதிய வணக்கம்', 'மாலை வணக்கம்', 'வணக்கம்'],
 te: ['శుభోదయం', 'శుభ మధ్యాహ్నం', 'శుభ సాయంత్రం', 'నమస్కారం'],
 kn: ['ಶುಭೋದಯ', 'ಶುಭ ಮಧ್ಯಾಹ್ನ', 'ಶುಭ ಸಂಜೆ', 'ನಮಸ್ಕಾರ'],
 mr: ['सुप्रभात', 'शुभ दुपार', 'शुभ संध्याकाळ', 'नमस्कार'],
 gu: ['સુપ્રભાત', 'શુભ બપોર', 'શુભ સાંજ', 'નમસ્તે'],
 bn: ['সুপ্রভাত', 'শুভ অপরাহ্ণ', 'শুভ সন্ধ্যা', 'নমস্কার'],
};
export const englishVariants = [
 ['Good morning','Morning','A good morning to you','Welcome this morning','Hello this morning','Hope your morning is going well'],
 ['Good afternoon','Afternoon','A good afternoon to you','Welcome this afternoon','Hello this afternoon','Hope your afternoon is going well'],
 ['Good evening','Evening','A good evening to you','Welcome this evening','Hello this evening','Hope your evening is going well'],
 ['Hello','Welcome','Good to have you here','Glad you are here','Welcome back','Ready when you are'],
];
export function windowFor(hour) { return hour >= 5 && hour < 12 ? 0 : hour >= 12 && hour < 17 ? 1 : hour >= 17 && hour < 21 ? 2 : 3; }
export function greetingModel(now, { locale = 'en', timezone = '', name = '', clock = 'locale' } = {}) {
 const zone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
 const hour = Number(new Intl.DateTimeFormat('en-GB', {timeZone: zone, hour:'2-digit', hourCycle:'h23'}).format(now));
 const dateParts = new Intl.DateTimeFormat('en-CA', {timeZone:zone, year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const part = name => dateParts.find(p=>p.type===name)?.value;
 const dateISO = `${part('year')}-${part('month')}-${part('day')}`;
 const language=locale.split('-')[0];
 const daySeed=Number(dateISO.replaceAll('-',''))%6;
 const text = language==='en' ? englishVariants[windowFor(hour)][daySeed] : (greetings[language] || greetings.en)[windowFor(hour)];
 return {greeting: text + (name ? ', ' + name : '') + '.', period:['morning','afternoon','evening','night'][windowFor(hour)], dateISO,
 date:new Intl.DateTimeFormat(locale,{timeZone:zone,dateStyle:'full'}).format(now),
 time:new Intl.DateTimeFormat(locale,{timeZone:zone,hour:'numeric',minute:'2-digit',...(clock==='locale'?{}:{hour12:clock==='12'})}).format(now),
 zoneLabel:new Intl.DateTimeFormat(locale,{timeZone:zone,timeZoneName:'short'}).formatToParts(now).find(p=>p.type==='timeZoneName')?.value,
 differentZone:zone!==Intl.DateTimeFormat().resolvedOptions().timeZone};
}
export function nextMinuteDelay(time) { return 60000 - (time % 60000); }
