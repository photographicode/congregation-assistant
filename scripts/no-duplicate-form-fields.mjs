export default {
 meta:{type:'problem',schema:[],messages:{duplicate:'This form binds {{field}} twice. Keep one canonical control.'}},
 create(context){const forms=[];return {
  JSXElement(node){const tag=node.openingElement.name?.name;if(tag==='form')forms.push(new Map());if(!forms.length||!['input','select','textarea'].includes(tag))return;
   const attributes=node.openingElement.attributes;
   const binding=attributes.find(a=>['value','checked'].includes(a.name?.name))?.value;
   if(binding?.type!=='JSXExpressionContainer')return;
   const expression=binding.expression;if(!['Identifier','MemberExpression'].includes(expression.type))return;
   const field=context.sourceCode.getText(expression).replace(/\s/g,'');
   // Literal option values are not state bindings; radio members share one group by design.
   const type=attributes.find(a=>a.name?.name==='type')?.value?.value;if(type==='radio')return;
   if(forms.at(-1).has(field))context.report({node,messageId:'duplicate',data:{field}});else forms.at(-1).set(field,node);
  },
  'JSXElement:exit'(node){if(node.openingElement.name?.name==='form')forms.pop();}
 };}
};
