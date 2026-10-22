import {test,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {parseHTML} from 'linkedom';
import {Field} from '../../packages/ui/Field';

test('Field connects its label, instructions and validation error to the control',()=>{
 const html=renderToStaticMarkup(createElement(Field,{label:'Publisher name',controlId:'publisher',hint:'Use the full name',error:'Enter a name',children:props=>createElement('input',props)}));
 const {document}=parseHTML(html),input=document.querySelector('input')!;
 expect(document.querySelector('label')?.getAttribute('for')).toBe(input.id);
 expect(input.getAttribute('aria-invalid')).toBe('true');
 const descriptions=input.getAttribute('aria-describedby')!.split(' ').map(id=>document.getElementById(id)?.textContent);
 expect(descriptions).toEqual(['Use the full name','Enter a name']);
 expect(document.querySelector('[role="alert"]')?.textContent).toBe('Enter a name');
});

test('Field generates distinct control ids and leaves valid inputs without error semantics',()=>{
 const field=()=>createElement(Field,{label:'Name',children:props=>createElement('input',props)});
 const {document}=parseHTML(renderToStaticMarkup(createElement('form',{},field(),field())));
 const inputs=[...document.querySelectorAll('input')];
 expect(new Set(inputs.map(input=>input.id)).size).toBe(2);
 for(const input of inputs){expect(input.id).toBeTruthy();expect(input.hasAttribute('aria-invalid')).toBe(false);expect(input.hasAttribute('aria-describedby')).toBe(false);}
});
