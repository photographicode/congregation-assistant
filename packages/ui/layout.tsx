import React from 'react';
import type {HTMLAttributes,ReactNode} from 'react';
function classes(base:string,extra?:string){return [base,extra].filter(Boolean).join(' ');}
type Space='none'|'xs'|'s'|'m'|'l'|'xl';
type LayoutProps=HTMLAttributes<HTMLDivElement>&{gap?:Space};
export function Page({children,className,...props}:HTMLAttributes<HTMLElement>){return <main {...props} className={classes("ui-page",className)}>{children}</main>;}
export function PageHeader({title,description,actions}:{title:string;description?:string;actions?:ReactNode}){return <header className="ui-page-header"><div><h1>{title}</h1>{description&&<p>{description}</p>}</div>{actions&&<div className="ui-toolbar">{actions}</div>}</header>;}
export function Stack({gap='m',children,className,...props}:LayoutProps){return <div {...props} className={classes("ui-stack",className)} data-gap={gap}>{children}</div>;}
export function Inline({gap='s',children,className,wrap=true,align='center',...props}:LayoutProps&{wrap?:boolean;align?:'start'|'center'|'end'}){return <div {...props} className={classes("ui-inline",className)} data-gap={gap} data-wrap={String(wrap)} data-align={align}>{children}</div>;}
export function Grid({gap='m',children,className,minItem='m',...props}:LayoutProps&{minItem?:'s'|'m'|'l'}){return <div {...props} className={classes("ui-grid",className)} data-gap={gap} data-min-item={minItem}>{children}</div>;}
export function Split({children,className,...props}:HTMLAttributes<HTMLDivElement>){return <div {...props} className={classes("ui-split",className)}>{children}</div>;}
export function Toolbar({children,className,label,...props}:HTMLAttributes<HTMLDivElement>&{label:string}){return <div {...props} className={classes("ui-toolbar",className)} role="group" aria-label={label}>{children}</div>;}
export function FormRow({children,className,...props}:HTMLAttributes<HTMLDivElement>){return <div {...props} className={classes("ui-form-row",className)}>{children}</div>;}
export function TableShell({children,className,label,...props}:HTMLAttributes<HTMLDivElement>&{label:string}){return <div {...props} className={classes("ui-table-shell",className)} role="region" aria-label={label} tabIndex={0}>{children}</div>;}
