export default {
 meta:{type:'problem',schema:[],messages:{duplicate:'This form binds {{field}} twice. Keep one canonical control.'}},
 create(context){const forms=[];function binding(node){if(!node)return null;if(['TSAsExpression','TSTypeAssertion','TSNonNullExpression','ChainExpression'].includes(node.type))return binding(node.expression);if(node.type==='LogicalExpression'&&['||','??'].includes(node.operator))return binding(node.left);if(node.type==='CallExpression'&&node.callee.type==='Identifier'&&['Boolean','Number','String'].includes(node.callee.name)&&node.arguments.length===1)return binding(node.arguments[0]);if(node.type==='Identifier')return node.name;if(node.type==='MemberExpression'){const base=binding(node.object),key=node.computed?(node.property.type==='Literal'?String(node.property.value):null):node.property.name;return base&&key?base+'.'+key:null;}return null;}return {
  JSXElement(node){const tag=node.openingElement.name?.name;if(tag==='form')forms.push(new Map());if(!forms.length||!['input','select','textarea'].includes(tag))return;
   const attributes=node.openingElement.attributes,type=attributes.find(a=>a.name?.name==='type')?.value?.value;if(type==='radio')return;
   const field=attributes.filter(a=>['value','checked'].includes(a.name?.name)&&a.value?.type==='JSXExpressionContainer').map(a=>binding(a.value.expression)).find(Boolean);if(!field)return;
   if(forms.at(-1).has(field))context.report({node,messageId:'duplicate',data:{field}});else forms.at(-1).set(field,node);
  },
  'JSXElement:exit'(node){if(node.openingElement.name?.name==='form')forms.pop();}
 };}
};
