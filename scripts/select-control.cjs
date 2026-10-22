const assert=require('node:assert/strict');
async function selectControl(control,value){
 const tag=await control.evaluate(element=>element.tagName);
 if(tag==='SELECT')return control.selectOption(value);
 await control.click();
 const option=control.page().getByRole('listbox').locator('[role=option][data-value='+JSON.stringify(String(value))+']');
 assert.equal(await option.count(),1,'One real option must match the requested value');
 await option.click();
 assert.equal(await control.getAttribute('data-value'),String(value));
}
module.exports={selectControl};
