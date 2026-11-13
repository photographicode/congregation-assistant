import {test,expect} from 'vitest';
import React from 'react';
import {legacyOptions} from '../../packages/ui/components';
const o=(text:string,value?:string)=>React.createElement('option',value===undefined?{key:text}:{key:text,value},text);
// Regression: options without a value (service groups, hope) all read as "", so choosing a group saved "No group".
test('options without a value use their text, like a native select',()=>{
 const options=legacyOptions(React.createElement(React.Fragment,null,o('No group',''),[o('Group 1'),o('Group 2')],o('Labelled','x')));
 expect(options.map(x=>x.value)).toEqual(['','Group 1','Group 2','x']);
 expect(options.map(x=>x.label)).toEqual(['No group','Group 1','Group 2','Labelled']);
});
