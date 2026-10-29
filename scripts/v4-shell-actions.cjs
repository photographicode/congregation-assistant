async function openAssistant(page){await page.locator('.topbar').getByRole('button',{name:'Search people and actions',exact:true}).click();await page.getByRole('option',{name:'Ask the assistant',exact:true}).click();}
async function openAccount(page){await page.locator('.topbar').getByRole('button',{name:'Account and appearance',exact:true}).click();}
async function openQuick(page){const button=page.locator('.topbar').getByRole('button',{name:'Quick actions',exact:true});if(await button.isVisible())return button.click();await openAccount(page);await page.getByRole('dialog').getByRole('button',{name:'Quick actions',exact:true}).click();}
async function openUpdates(page){await openAccount(page);await page.getByRole('dialog').getByRole('button',{name:'What’s new',exact:true}).click();}
module.exports={openAssistant,openAccount,openQuick,openUpdates};
