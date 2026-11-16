import {describe,expect,it} from 'vitest';
import {outlineNumber} from '../../apps/web/src/features/territory-outlines';

describe('territory outlines',()=>{
 it('reads the territory number at the start of a placemark name',()=>{
  expect(outlineNumber('No. 12 – Market Street')).toBe('12');
  expect(outlineNumber('12')).toBe('12');
  expect(outlineNumber('Territory 7a')).toBe('7A');
  expect(outlineNumber('House to House 4')).toBe('');
 });
});
