import {describe,expect,it} from 'vitest';
import {EMAIL,NOT_STARTED,progressLabel,progressText,requestDetails,SERVICE_NEEDS,sectionState,submitLabel,territoryProblem} from '../../apps/web/src/features/request-form-model';

describe('territory request form',()=>{
 it('needs at least one need and the KML file',()=>{
  expect(territoryProblem([],[1])).toMatch(/Tick at least one/);
  expect(territoryProblem(['cards'],[])).toMatch(/KML file from JW Hub/);
  expect(territoryProblem(['cards'],[1])).toBe('');
 });
 it('writes the details with needs, area and where they are now',()=>{
  expect(requestDetails(['cards','map'],['City','Backwaters'],2,'About 40 territories'))
   .toBe('[Needs: Territory Cards, Full map] [Area: City, Backwaters] [Now: Done up to step 2: Splitting them] About 40 territories');
  expect(requestDetails(['software'],[],0,'')).toBe(`[Needs: Territory Management Software] [Now: ${NOT_STARTED}]`);
  expect(progressLabel(0)).toBe(NOT_STARTED);
 });
 it('labels sections, the progress bar and the button',()=>{
  expect([sectionState(true),sectionState(false,true),sectionState(false)]).toEqual(['Done','Optional','To do']);
  expect([submitLabel(true,true),submitLabel(false,true),submitLabel(false,false)]).toEqual(['Sending…','Review request','Send request']);
  expect([progressText(true,1,5),progressText(false,5,5),progressText(false,2,5)]).toEqual(['Check your request, then send it','Ready to review','2 of 5 required answers']);
 });
 it('maps landing-page services to needs and checks email addresses',()=>{
  expect(SERVICE_NEEDS.package).toEqual(['cards','map','software']);
  expect(EMAIL.test('servant@example.invalid')).toBe(true);
  expect(EMAIL.test('not an email')).toBe(false);
 });
});
