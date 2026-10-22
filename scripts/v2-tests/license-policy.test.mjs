import {test} from 'node:test';
import assert from 'node:assert/strict';
import {licenseAllowed} from '../check-licenses.mjs';
const allowed=new Set(['MIT','Apache-2.0','OFL-1.1']);
test('permitted alternative does not erase a required copyleft conjunct',()=>{assert.equal(licenseAllowed('GPL-3.0 AND (MIT OR Apache-2.0)',allowed),false);assert.equal(licenseAllowed('(GPL-3.0 AND MIT) OR Apache-2.0',allowed),true);assert.equal(licenseAllowed('(MIT OR Apache-2.0) AND OFL-1.1',allowed),true);});
test('unknown, malformed and unapproved exception expressions fail closed',()=>{for(const value of ['','MIT OR','(MIT','MIT Apache-2.0','MIT WITH Unknown-exception','Unknown-license'])assert.equal(licenseAllowed(value,allowed),false);});
test('licence metadata cannot exhaust nesting or length limits',()=>{assert.equal(licenseAllowed('('.repeat(100)+'MIT'+')'.repeat(100),allowed),false);assert.equal(licenseAllowed('x'.repeat(5000),allowed),false);});
