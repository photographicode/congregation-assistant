import type {WorkspacePlan} from '../../../packages/core/plan';
/** Shared route context is a type-only boundary, independent of the application entry. */
export type Context={
 account?:string;
 onCounts?:(counts:Record<string,number>)=>void;
 cong:string;
 name:string;
 roles:string[];
 caps:Record<string,unknown>;
 firstName?:string;
 plan?:WorkspacePlan;
 notify:(message:string)=>void;
};
