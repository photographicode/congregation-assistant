function control(locator){return locator.and(locator.page().locator('input,select'));}
async function chooseAssignment(locator,value){const field=control(locator),tag=await field.evaluate(el=>el.tagName);if(tag==='SELECT')return field.selectOption(value);await field.focus();await field.fill('');const id=await field.getAttribute('aria-controls');await field.page().locator('[id='+JSON.stringify(id)+']').locator('[data-value='+JSON.stringify(value)+']').click();}
async function assignmentValue(locator){const field=control(locator);return await field.getAttribute('data-assignment-id')??await field.inputValue();}
module.exports={chooseAssignment,assignmentValue};
