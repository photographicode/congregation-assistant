import {describe,it,expect} from 'vitest';
import {parseRoute,formatRoute,routeForTool} from '../../apps/web/src/router';
describe('shareable app routes',()=>{
 it('round trips screen, tab and refinements without losing demo',()=>{const route=parseRoute('/app/?screen=schedule&tab=weekend&week=2026-10-26&demo=publisher&q=Sam+%26+Jo');expect(parseRoute(formatRoute(route))).toEqual(route);expect(route).toMatchObject({screen:'schedule',tab:'weekend',week:'2026-10-26',demo:'publisher',q:'Sam & Jo'});});
 it.each([['people','people'],['reports','reports'],['meetings','schedule'],['messages','messages'],['forms','pdf'],['admin','settings']])('maps legacy section %s', (section,screen)=>expect(parseRoute('/?section='+section).screen).toBe(screen));
 it('maps legacy tool into destination and tab',()=>expect(parseRoute('/?tool=weekend&demo=admin')).toMatchObject({screen:'schedule',tab:'weekend',demo:'admin'}));
 it('keeps document selection in the URL',()=>expect(routeForTool('s21')).toMatchObject({screen:'pdf',doc:'s21'}));
 it('preserves an explicit tab over a stale legacy tool',()=>expect(parseRoute('/?screen=schedule&tool=midweek&tab=weekend').tab).toBe('weekend'));
 it('rejects unknown screens and malformed dates',()=>expect(parseRoute('/?screen=arbitrary&week=bad&month=2026-99')).toMatchObject({screen:'notFound'}));
 it('ignores inherited-property names as legacy sections',()=>expect(parseRoute('/?section=constructor')).toEqual({screen:'home'}));
 it('rejects impossible calendar weeks',()=>expect(parseRoute('/?screen=schedule&week=2026-02-31')).not.toHaveProperty('week'));
 it('does not serialize undefined values or invent a demo account',()=>expect(formatRoute({screen:'people',tab:undefined})).toBe('?screen=people'));
 it('supports account/display and advanced appearance deep links',()=>expect(parseRoute('/?screen=settings&tab=display&view=advanced')).toMatchObject({screen:'settings',tab:'display',view:'advanced'}));
});
