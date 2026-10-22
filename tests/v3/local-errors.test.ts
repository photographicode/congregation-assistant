import {beforeEach,afterEach,expect,test,vi} from 'vitest';
import fc from 'fast-check';
import {clearErrors,handleError,ignoreError,recentErrors,subscribeErrors} from '../../packages/core/errors';
beforeEach(()=>clearErrors());afterEach(()=>vi.unstubAllGlobals());
test('diagnostics exclude exception messages, stacks, URLs and personal records',()=>{
 fc.assert(fc.property(fc.string(),message=>{clearErrors();const error=new Error('PRIVATE-PUBLISHER '+message);error.stack='PRIVATE-STACK';handleError(error,{scope:'report.save',severity:'error'});const saved=JSON.stringify(recentErrors());expect(saved).not.toContain('PRIVATE-');expect(Object.keys(recentErrors()[0]||{}).sort()).toEqual(['at','category','scope','severity']);}));
});
test('ring buffer is bounded and memory only',()=>{const network=vi.fn(),storage=vi.fn();vi.stubGlobal('fetch',network);vi.stubGlobal('localStorage',{setItem:storage});for(let index=0;index<100;index++)handleError(new Error('private'),{scope:'test.'+index,severity:'warning'});expect(recentErrors()).toHaveLength(50);expect(network).not.toHaveBeenCalled();expect(storage).not.toHaveBeenCalled();});
test('identical bursts are rate limited',()=>{for(let index=0;index<20;index++)handleError(new Error('private'),{scope:'report.save',severity:'error'});expect(recentErrors()).toHaveLength(1);});
test('user-facing errors notify a local subscriber without persisting its text',()=>{const listener=vi.fn();const unsubscribe=subscribeErrors(listener);handleError(new Error('private'),{scope:'form',severity:'error',userMessage:'Retry the save.'});expect(listener).toHaveBeenCalledWith(expect.objectContaining({scope:'form'}),'Retry the save.');expect(JSON.stringify(recentErrors())).not.toContain('Retry');unsubscribe();});
test('an intentional ignored error must explain the fallback',()=>{expect(()=>ignoreError('')).toThrow();expect(()=>ignoreError('Optional storage is unavailable; use memory.')).not.toThrow();});
