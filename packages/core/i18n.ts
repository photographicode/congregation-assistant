const en={
 'fixture.heading':'Fictional component review','fixture.count':'Fictional count','fixture.person':'Fictional person','fixture.switch':'Fictional switch','fixture.dialog':'Fictional dialog','fixture.palette':'Fictional command palette','fixture.tabs':'Fictional tabs','fixture.table':'Fictional table','fixture.name':'Fictional name','fixture.edits':'Fictional unsaved edits','fixture.reset':'Reset fictional count','fixture.changed':'Fictional change saved',
'scene.publishers':'Room for everyone','scene.reports':'A fresh reporting month','scene.caughtUp':'All caught up','scene.schedule':'Ready for the week','scene.import':'Your records are ready','scene.offline':'We’ll reconnect','scene.error':'Let’s try again','scene.welcome':'Good to have you here',
 'stepper.less':'Decrease','stepper.more':'Increase','table.actions':'Actions',
 'theme.gallery':'Theme gallery','theme.surprise':'Surprise me','theme.preview':'Clear words. Your colors.','theme.accent':'A little color','theme.hint':'All nine themes work with Calm, Balanced and Lively.','theme.auto':'Follow system',
 'theme.mono-light':'Mono Light','theme.mono-dark':'Mono Dark','theme.paper':'Paper','theme.lagoon-glass':'Lagoon Glass','theme.neon-night':'Neon Night','theme.sunset-pop':'Sunset Pop','theme.neo-brutal':'Neo Brutal','theme.forest':'Forest','theme.aurora':'Aurora',
 'appearance.intensity':'Background intensity','common.close':'Close','common.discard':'Discard changes','common.discardTitle':'Discard changes?','common.unsaved':'Your unsaved changes will be lost.','common.keepEditing':'Keep editing','common.copy':'Copy','common.copied':'Copied','common.undo':'Undo','common.search':'Search','common.next':'Next','common.back':'Back','common.cancel':'Cancel','common.choose':'Choose','common.noResults':'No matching results','common.loading':'Loading','common.more':'Show more','qr.code':'QR code','table.previous':'Previous rows','table.next':'Next rows'
} as const;
export type Locale='en'|'hi'|'ml'|'ta';export type MessageKey=keyof typeof en;
// Translation scaffolds deliberately fall back to reviewed English copy.
export const messages:Record<Locale,Partial<Record<MessageKey,string>>>={en,hi:{},ml:{},ta:{}};
export function t(key:MessageKey,locale:Locale='en'){return messages[locale][key]||en[key];}
