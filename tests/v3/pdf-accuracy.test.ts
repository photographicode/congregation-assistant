import {it,expect} from 'vitest';import {dueReportMonths,missingReportMonths,publisherFileName} from '../../packages/core/pdf-accuracy';
it('does not call future reporting months missing',()=>{expect(dueReportMonths(2027,new Date(2026,9,18))).toEqual([8]);expect(dueReportMonths(2028,new Date(2026,9,18))).toEqual([]);expect(dueReportMonths(2026,new Date(2026,9,18))).toHaveLength(12);});
it('counts submissions including an explicit no-activity report',()=>expect(missingReportMonths('p',2027,[{pubId:'p',serviceYear:2027,month:8}],new Date(2026,9,18))).toBe(0));
it('keeps first and middle names in order after the last name',()=>{expect(publisherFileName('Maria Ann Thomas')).toBe('Thomas-Maria-Ann');expect(publisherFileName('மரியா')).toBe('மரியா');});
