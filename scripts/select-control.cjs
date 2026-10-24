const assert=require('node:assert/strict');
async function requestControl(control,value){
 const tag=await control.evaluate(element=>element.tagName);
 if(tag==='SELECT')return control.selectOption(value);
 await control.click();
 const option=control.page().getByRole('listbox').locator('[role=option][data-value='+JSON.stringify(String(value))+']');
 assert.equal(await option.count(),1,'One real option must match the requested value');
 await option.click();
}
async function selectControl(control,value){await requestControl(control,value);assert.equal(await controlValue(control),String(value));}

async function controlValue(control){return await control.evaluate(element=>element.tagName)==='BUTTON'?await control.getAttribute('data-value'):await control.inputValue();}
async function controlOptions(control){
 if(await control.evaluate(element=>element.tagName)==='SELECT')return control.locator('option').evaluateAll(options=>options.map(option=>option.value));
 await control.click();const values=await control.page().getByRole('listbox').locator('[role=option]').evaluateAll(options=>options.map(option=>option.getAttribute('data-value')));await control.page().keyboard.press('Escape');return values;
}
module.exports={selectControl,requestControl,controlValue,controlOptions};
