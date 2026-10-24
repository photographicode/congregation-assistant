import {z} from 'zod';
export const INPUT_LIMITS={name:120,comment:500,hours:744,hourStep:0.25,studies:99,email:254,phone:20} as const;
// Reject invisible control payloads while preserving Unicode names and script text.
const visible=(max:number)=>z.string().max(max).refine(value=>!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u200b\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/u.test(value),'Remove invisible control characters.');
export const nameInput=visible(INPUT_LIMITS.name).trim().min(1,'Name is required.');
const commentInput=visible(INPUT_LIMITS.comment);
const hoursInput=z.coerce.number().min(0).max(INPUT_LIMITS.hours).multipleOf(INPUT_LIMITS.hourStep);
const studiesInput=z.coerce.number().int().min(0).max(INPUT_LIMITS.studies);
export const serviceInput=z.object({hours:hoursInput,studies:studiesInput,comments:commentInput});
export const publisherInput=z.object({name:nameInput,email:z.union([z.literal(''),z.email().max(INPUT_LIMITS.email)]).optional(),phone:visible(INPUT_LIMITS.phone).optional(),address:visible(INPUT_LIMITS.comment).optional(),emergencyName:visible(INPUT_LIMITS.name).optional(),emergencyPhone:visible(INPUT_LIMITS.phone).optional(),emergencyRelationship:visible(INPUT_LIMITS.name).optional()});
