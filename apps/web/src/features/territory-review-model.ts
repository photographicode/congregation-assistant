// Decisions behind the card review screen and the request's progress, kept apart from the screen so they are tested.
import {MILESTONES,type Territory} from './territory-model';

const LAST=MILESTONES.length-1;
export type MilestoneState='done'|'now'|'next';
/** Where a milestone stands for a request at `stage`; the last stage marks every milestone done. */
export function milestoneState(i:number,stage:number):MilestoneState{
 if(i<stage||stage===LAST)return 'done';
 return i===stage?'now':'next';
}
/** The line under the milestones. */
export function progressNote(stage:number,review:string){
 if(stage===LAST)return 'Everything is ready. Download the cards and the full map below.';
 if(review==='approved')return 'You approved the cards. We are making the full map, and will email you when it is ready.';
 return 'We email you at each step.';
}
/** Who is looking at cards in review: the congregation's admin decides; owners and viewers only look. */
export function reviewer(role:string,owner:boolean):'admin'|'owner'|'viewer'{
 if(owner)return 'owner';
 return role==='admin'?'admin':'viewer';
}
export function reviewIntro(who:'admin'|'owner'|'viewer',cards:number){
 if(who==='admin')return `Look at each of the ${cards} cards. Tap a card to see it full size. Check each territory’s name and landmarks on the map. Press "Mark as right" on each card that is right, or write a comment on any card that needs a change, then press "Send comments". When every card is right, press "Approve all cards".`;
 if(who==='owner')return 'Waiting for the congregation’s admin to check these cards. You see their comments here as they write them.';
 return 'The admin is checking these cards. You can look at them; only an admin can comment or approve.';
}
export const plural=(n:number,word:string)=>`${n} ${word}${n===1?'':'s'}`;
/** The card was saved again after the admin commented on it. */
export const changedSinceComment=(t:Pick<Territory,'review_comment_at'|'updated_at'>)=>Boolean(t.review_comment_at&&t.updated_at>t.review_comment_at);
/** The admin ticked the card as right, and it was not saved again since. */
export const checkedCard=(t:Pick<Territory,'review_ok_at'|'updated_at'>)=>Boolean(t.review_ok_at&&t.updated_at<=t.review_ok_at);
/** A file name from free text: letters, digits and dashes only, never empty. */
export function safeFileName(text:string,max:number,fallback='territories'){
 return text.replace(/[^\w-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,max)||fallback;
}
