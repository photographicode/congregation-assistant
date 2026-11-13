import {test,expect} from 'vitest';
import {shiftPeriod} from '../../apps/web/src/features/period-label';
test('shiftPeriod crosses year boundaries both ways',()=>{expect(shiftPeriod('2026-01',-1)).toBe('2025-12');expect(shiftPeriod('2025-12',1)).toBe('2026-01');expect(shiftPeriod('2026-10',-1)).toBe('2026-09');expect(shiftPeriod('2026-10',14)).toBe('2027-12');});
