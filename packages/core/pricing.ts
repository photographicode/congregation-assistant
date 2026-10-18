import pricing from '../../pricing.json';
export {pricing};
// Declared size selects a price, never an authorization boundary or an automatic charge.
export function priceTier(publishers:number){if(!Number.isSafeInteger(publishers)||publishers<0)throw Error('Enter a whole congregation size.');return pricing.tiers.find(t=>publishers>=t.minimumPublishers&&(t.maximumPublishers===null||publishers<=t.maximumPublishers))!;}
export function founderSlots(confirmedPayingFounders:number|null){if(confirmedPayingFounders===null)return null;if(!Number.isSafeInteger(confirmedPayingFounders)||confirmedPayingFounders<0)throw Error('Verified founder count required.');return Math.max(0,pricing.founders.capacity-confirmedPayingFounders);}
export function foundingPeriod(now:Date){return now.getTime()<Date.parse(pricing.paidStartDate+'T00:00:00Z');}
