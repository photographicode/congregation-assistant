import React, {useId} from 'react';
import type {ReactNode} from 'react';
type ControlProps={id:string;'aria-describedby'?:string;'aria-invalid'?:true};
type FieldProps={label:string;controlId?:string;hint?:string;help?:string;error?:string;children:(props:ControlProps)=>ReactNode};
/** The render callback attaches the label, hint and error to the actual control. */
export function Field({label,controlId,hint,help,error,children}:FieldProps){
 const generated=useId(),id=controlId??generated,description=hint??help;
 const describedBy=[description&&id+'-hint',error&&id+'-error'].filter(Boolean).join(' ')||undefined;
 return <div className="ui-field"><label htmlFor={id}>{label}</label>{children({id,'aria-describedby':describedBy,'aria-invalid':error?true:undefined})}{description&&<p id={id+'-hint'} className="ui-field-hint">{description}</p>}{error&&<p id={id+'-error'} role="alert">{error}</p>}</div>;
}
