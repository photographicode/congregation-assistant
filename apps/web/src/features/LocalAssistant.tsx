import {prepareAssignment} from '../../../../packages/core/assignment-action';
import {programSchema} from '../../../../packages/core/meeting';
import type {ScheduleDraft} from '../../../../packages/core/repositories';
import {createReportLink,manageGroupLink} from './link-action';
import {savePublisherAction} from './publisher-action';
import React from "react";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";

import {
  localCommand,
  type LocalPlan,
} from "../../../../packages/core/local-command";
import { repositories, reportSchema } from "../../../../packages/core/repositories";
import { t } from "../../../../packages/core/i18n";
import { demoPublishers } from "../../../../packages/core/demo-publishers";
import { rpc, demo,storeFor } from "./client";
import { publisherS21 } from "./pdf-download";
import { useDemoReports } from "./demo-reports";
import type { Context } from "../main";
import { PersonPicker, Button } from "../../../../packages/ui/components";
import { commandRegistry } from "../../../../packages/core/command-registry";
import { Plus, Send } from "lucide-react";
import { TIMING } from "../../../../packages/core/timing";

export function LocalAssistant({
  context: c,
  onExport,
  compact = false,
}: {
  context: Context;
  onExport: () => void;
  compact?: boolean;
}) {
  const [input, setInput] = React.useState(""),
    [plan, setPlan] = React.useState<LocalPlan | null>(null),
    [publisher, setPublisher] = React.useState(""),
    [error, setError] = React.useState(""),
    [busy, setBusy] = React.useState(false),
    cache = useQueryClient(),
    demoRows = useDemoReports((s) => s.rows),
    updateDemo = useDemoReports((s) => s.update);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const sendRef = React.useRef<HTMLButtonElement>(null);
  const [quickOpen, setQuickOpen] = React.useState(false);
  const [lastCommand, setLastCommand] = React.useState("");
  const placeholder = React.useMemo(
    () =>
      [
        "S-21 for Maria Thomas",
        "add attendance 45",
        "set Daniel’s baptism to 4 May 2019",
      ][Math.floor(Math.random() * 3)],
    [],
  );
  React.useEffect(() => {
    const keys = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editing = target?.matches("input, textarea, [contenteditable=true]");
      if (event.key === "/" && !editing) {
        event.preventDefault();
        inputRef.current?.focus();
      } else if (event.key === "Escape" && document.activeElement === inputRef.current) {
        setInput("");
        setPlan(null);
        setError("");
      } else if (event.key === "ArrowUp" && document.activeElement === inputRef.current && !input) {
        event.preventDefault();
        setInput(lastCommand);
      }
    };
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  }, [input, lastCommand]);
  const people = {
    data: demo
      ? cache.getQueryData<Array<{id:string;name:string}>>(["assistant-people",c.account,c.cong]) || demoPublishers
      : cache.getQueryData<Array<{ id: string; name: string }>>([
          "assistant-people",
          c.account,
          c.cong,
        ]) || [],
    isPending: false,
    error: null as Error | null,
  };
  const [apUndo,setAPUndo]=React.useState<{id:string;until:number;record:z.infer<typeof reportSchema>}|null>(null);
  const [publisherUndo,setPublisherUndo]=React.useState<{id:string;field:string;previous:unknown;value:unknown;until:number}|null>(null);
  const lock = React.useRef(false);
  const [meeting, setMeeting] = React.useState<
    | {
        date: string;
        kind: string;
        canSubmit: boolean;
        count: number | null;
        timezone: string;
      }
    | undefined
  >();
  const year =
      plan?.kind === "report"
        ? Number(plan.period.slice(0, 4)) +
          (Number(plan.period.slice(5)) >= 9 ? 1 : 0)
        : 0,
    month = plan?.kind === "report" ? Number(plan.period.slice(5)) - 1 : 0;
  const rows = demo
    ? demoRows
    : cache.getQueryData<Array<z.infer<typeof reportSchema>>>([
        "assistant-records",
        c.account,
        c.cong,
      ]) || [];
  const current = {
    data:
      rows.find(
        (r) =>
          r.pub_id === publisher &&
          r.service_year === year &&
          r.month === month,
      ) || null,
    isPending: false,
    error: null as Error | null,
    refetch: async () => {},
  };
  const assignmentPreview=(()=>{if(plan?.kind!=='assignment')return null;try{const saved=cache.getQueryData<{revision:number;draft:ScheduleDraft}>(['assistant-schedule',c.account,c.cong]);const program=programSchema.parse(saved?.draft.programs?.[plan.week]);const parts=program.parts.filter(part=>part.title.toLowerCase()===plan.part.toLowerCase()||part.type.toLowerCase()===plan.part.replace(/\s/g,'').toLowerCase());if(!saved||parts.length!==1)throw Error('Choose one exact part title from Schedule.');return {caution:prepareAssignment(saved.draft,plan.week,parts[0],publisher).caution,error:null};}catch(error){return {caution:null,error:(error as Error).message};}})();
  async function confirm() {
    if (!c.roles.includes("admin") || lock.current || !plan) return;
    if(plan.kind==='assignment'){
      const saved=cache.getQueryData<{revision:number;draft:ScheduleDraft}>(['assistant-schedule',c.account,c.cong]);
      const parsed=programSchema.safeParse(saved?.draft?.programs?.[plan.week]);if(!saved?.draft||!parsed.success){setError('Load a meeting program for this week in Schedule first.');return;}
      const matches=parsed.data.parts.filter(part=>part.title.toLowerCase()===plan.part.toLowerCase()||part.type.toLowerCase()===plan.part.replace(/\s/g,'').toLowerCase());if(matches.length!==1){setError('Use the exact title of one part in this week’s program.');return;}
      lock.current=true;setBusy(true);try{const next=prepareAssignment(saved.draft,plan.week,matches[0],publisher);if(!demo)await repositories(storeFor(c.cong,c.roles),c.cong).schedules.save(saved.revision,next.draft);await cache.invalidateQueries({queryKey:['assistant-home-ready']});setPlan(null);c.notify(demo?'Fictional assignment reviewed.':'Assignment saved in the unpublished draft. Review Schedule before publishing.');}catch(error){setError((error as Error).message);}finally{lock.current=false;setBusy(false);}return;
    }
    if(plan.kind==='group-link'){
      lock.current=true;setBusy(true);try{
        const groups=demo?[{name:'Group 1'},{name:'Group 2'}]:await rpc('ca_v3_report_groups',{p_cong_id:c.cong});
        const group=(groups as {name:string}[]).find(row=>row.name.toLowerCase()===plan.group.toLowerCase());if(!group)throw Error('Use the full name of an accessible group.');
        if(plan.action==='create')await createReportLink(c.cong,'report',group.name);
        else if(!demo){const date=new Date();const list=await rpc('ca_v3_home_group_links',{p_cong_id:c.cong,p_year:date.getFullYear()+(date.getMonth()>=8?1:0),p_month:date.getMonth()});const row=(list as {name:string;token:string|null}[]).find(item=>item.name===group.name);if(!row?.token)throw Error('No active link exists for this group.');await manageGroupLink(c.cong,row.token,plan.action);}
        await cache.invalidateQueries({queryKey:['home-group-links']});setPlan(null);setInput('');c.notify(demo?'Fictional link action reviewed; no public link was created.':'Group link updated. The current link is shown on Home.');
      }catch(error){setError((error as Error).message);}finally{lock.current=false;setBusy(false);}return;
    }
    if(plan.kind==='ap-revoke'){
      const [calendarYear,calendarMonth]=plan.period.split('-').map(Number);const serviceYear=calendarYear+(calendarMonth>=9?1:0);
      const record=rows.find(row=>row.pub_id===publisher&&row.service_year===serviceYear&&row.month===calendarMonth-1);
      if(!record?.is_ap){setError('No auxiliary-pioneer report exists for this publisher and month.');return;}
      lock.current=true;setBusy(true);try{if(demo)updateDemo(current=>current.map(row=>row.id===record.id?{...row,is_ap:false}:row));else {const result=await repositories(storeFor(c.cong,c.roles),c.cong).reports.revokeAP(record);setAPUndo({id:result.actionId,until:Date.now()+10000,record});setTimeout(()=>setAPUndo(null),TIMING.undo);}await cache.invalidateQueries({queryKey:['reports']});await cache.invalidateQueries({queryKey:['assistant-home-ready']});setPlan(null);c.notify('Auxiliary-pioneer status revoked for this month. The report is retained.');}catch(error){setError((error as Error).message);}finally{lock.current=false;setBusy(false);}return;
    }
    if (plan.kind === "publisher-edit") {
      if(!publisher||lock.current)return;
      const source=people.data.find(person=>person.id===publisher);
      if(!source){setError("Reload the publisher records before saving.");return;}
      lock.current=true;setBusy(true);
      try{let sourceRecord=source as Record<string,unknown>;
        if(!demo){const fresh=(await rpc('ca_v2_people',{p_cong_id:c.cong}) as Record<string,unknown>[]).find(row=>row.id===publisher);if(!fresh)throw Error('Publisher no longer available.');const oldField=({service_group:'group',is_elder:'isElder',is_ms:'isMS',is_rp:'isRP',is_sp:'isSP',is_fm:'isFM',is_sfts:'isSFTS'} as Record<string,string>)[plan.field]||plan.field;if(fresh[oldField]!==sourceRecord[oldField])throw Error('This field changed on another device. Review it again before saving.');sourceRecord=fresh;}
        const keys:Record<string,string>={service_group:'group',is_elder:'isElder',is_ms:'isMS',is_rp:'isRP',is_sp:'isSP',is_fm:'isFM',is_sfts:'isSFTS'};
        const field=keys[plan.field]||plan.field;
        const expected=demo?[]:await rpc('get_publisher_login',{p_cong_id:c.cong,p_publisher_id:publisher});
        const person={...sourceRecord,[field]:plan.value,expected_login:expected};
        const shared=Boolean(sourceRecord.email&&people.data.some(row=>row.id!==publisher&&(row as Record<string,unknown>).email===sourceRecord.email));
        await savePublisherAction(c.cong,person,shared,c.roles);setPublisherUndo({id:publisher,field,previous:sourceRecord[field],value:plan.value,until:Date.now()+10000});setTimeout(()=>setPublisherUndo(null),TIMING.undo);cache.setQueryData(["assistant-people",c.account,c.cong],people.data.map(row=>row.id===publisher?person:row));await cache.invalidateQueries({queryKey:["dashboard-people"]});setPlan(null);setInput("");c.notify(demo?"Publisher edit applied to this fictional preview.":"Publisher saved.");}catch(error){setError((error as Error).message);}finally{lock.current=false;setBusy(false);}
      return;
    }
    if (plan.kind === "s21-person") {
      await download(publisher);
      return;
    }
    if (plan.kind === "attendance") {
      if (
        !meeting?.canSubmit ||
        !["midweek", "weekend"].includes(meeting.kind) ||
        (plan.meeting && plan.meeting !== meeting.kind)
      ) {
        setError(
          "No matching current meeting. Open Attendance to review the calendar.",
        );
        return;
      }
      lock.current = true;
      setBusy(true);
      try {
        if (!demo)
          await rpc("ca_v3_submit_attendance", {
            p_cong_id: c.cong,
            p_date: meeting.date,
            p_count: plan.count,
          });
        cache.setQueryData(["assistant-meeting", c.account, c.cong], {
          ...meeting,
          count: plan.count,
        });
        await cache.invalidateQueries({ queryKey: ["attendance"] });
        await cache.invalidateQueries({ queryKey: ["current-meeting"] });
        setPlan(null);
        setInput("");
        c.notify(
          demo
            ? "Demo attendance recorded for this preview."
            : "Attendance saved.",
        );
      } catch (error) {
        setError((error as Error).message);
      } finally {
        lock.current = false;
        setBusy(false);
      }
      return;
    }
    if (plan.kind === "s21-all") {
      onExport();
      return;
    }
    if (!publisher || current.isPending || current.error) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const previous = current.data,
        expected = previous
          ? {
              shared: previous.shared_in_ministry ?? false,
              hours: Number(previous.hours || 0),
              studies: previous.studies || 0,
              comments: previous.comments || "",
              auxiliary: previous.is_ap ?? false,
            }
          : null;
      if (demo)
        updateDemo((rows) => [
          ...rows.filter(
            (row) =>
              !(
                row.pub_id === publisher &&
                row.service_year === year &&
                row.month === month
              ),
          ),
          {
            id: previous?.id || crypto.randomUUID(),
            cong_id: c.cong,
            pub_id: publisher,
            service_year: year,
            month,
            hours: plan.hours,
            studies: plan.studies,
            shared_in_ministry: true,
            comments:
              previous?.comments === "Not Participated"
                ? ""
                : previous?.comments || "",
            is_ap: previous?.is_ap || false,
          },
        ]);
      else
        await rpc("ca_v3_save_assistant_report", {
          p_cong_id: c.cong,
          p_publisher_id: publisher,
          p_year: year,
          p_month: month,
          p_hours: plan.hours,
          p_studies: plan.studies,
          p_expected: expected,
        });
      await cache.invalidateQueries({ queryKey: ["reports"] });
      await cache.invalidateQueries({ queryKey: ["annual-reports"] });
      await cache.invalidateQueries({ queryKey: ["assistant-current"] });
      setPlan(null);
      setInput("");
      c.notify(t("assistant.saved"));
    } catch (error) {
      setError((error as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function download(id: string) {
    if (!c.roles.includes("admin") || !id || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await publisherS21(
        c,
        id,
        demo ? demoPublishers.find((p) => p.id === id) : undefined,
      );
      setPlan(null);
      setInput("");
    } catch (error) {
      setError((error as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  if (!c.roles.includes("admin")) return null;
  return (
    <div className="stack">
      {!compact && (
        <>
          <div className="assistant-privacy">
            <p>{t("refine.assistantPrivacy0")}</p>
            <p>{t("refine.assistantPrivacy1")}</p>
            <p>{t("refine.assistantPrivacy2")}</p>
            <p>{t("refine.assistantPrivacy3")}</p>
            <p>{t("refine.assistantPrivacy4")}</p>
          </div>
          <section>
            <h3>{t("refine.assistantExamples")}</h3>
            <ul>
              <li>{t("refine.assistantExample0")}</li>
              <li>{t("refine.assistantExample1")}</li>
            </ul>
          </section>
        </>
      )}
      {compact && (
        <div className="actions assistant-suggestions">
          {commandRegistry
            .filter((command) =>
              ["pdf.s21", "attendance.save", "report.save"].includes(
                command.name,
              ),
            )
            .flatMap((command) => command.examples.slice(0, 1))
            .map((suggestion) => (
              <Button
                type="button"
                className="subtle"
                key={suggestion}
                onClick={() => {
                  setInput(suggestion);
                  setPlan(null);
                  setError("");
                }}
              >
                {suggestion}
              </Button>
            ))}
        </div>
      )}
      <div className={compact ? "assistant-prompt" : "stack"}>
        {compact && (
          <Button className="assistant-plus" type="button" aria-label={"Quick actions"} aria-expanded={quickOpen} onClick={() => setQuickOpen((value) => !value)}>
            <Plus aria-hidden="true" />
          </Button>
        )}
        <label className="assistant-command-label">
        <span className="sr-only">{t("assistant.command")}</span>
        <textarea
          ref={inputRef}
          disabled={busy}
          aria-label={t("assistant.command")}
          placeholder={compact ? placeholder : undefined}
          maxLength={500}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setPlan(null);
            setError("");
          }}
          onKeyDown={(event) => {
            if (compact && event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              sendRef.current?.click();
            }
          }}
        />
      </label>
      <Button
        ref={sendRef}
        className={compact ? "assistant-send" : undefined}
        aria-label={compact ? "Send command" : undefined}
        disabled={people.isPending || !!people.error || busy}
        onClick={() => {
          setError("");
          if (!input.trim()) {
            setError("Type a command first.");
            inputRef.current?.focus();
            return;
          }
          setLastCommand(input);
          try {
            const next = localCommand(input, people.data || []);
            if (next.kind === "attendance")
              setMeeting(
                cache.getQueryData(["assistant-meeting", c.account, c.cong]),
              );
            setPlan(next);
            setPublisher(
              (next.kind === "report" || next.kind === "s21-person" || next.kind === "publisher-edit" || next.kind === "ap-revoke" || next.kind === "assignment") &&
                next.people.length === 1
                ? next.people[0].id
                : "",
            );
            if (next.kind === "s21-person" && next.people.length === 1)
              void download(next.people[0].id);
          } catch (error) {
            setError((error as Error).message);
          }
        }} type="button"
      >
        {compact ? <Send aria-hidden="true" /> : t("assistant.review")}
      </Button>
      </div>
      {compact && quickOpen && (
        <div className="assistant-quick-actions" role="group" aria-label={"Quick actions"}>
          {["Add publisher", "Enter report", "Download S-21", "Record attendance", "Assign a part"].map((action) => (
            <Button type="button" key={action} onClick={() => { setInput(action); setQuickOpen(false); inputRef.current?.focus(); }}>{action}</Button>
          ))}
        </div>
      )}
      {compact && <p className="assistant-device-privacy">{"Runs on this device. What you type isn’t sent anywhere."}</p>}
      {apUndo&&<p role="status">{"AP revoked for this month. "}<Button disabled={busy} onClick={async()=>{if(!apUndo||Date.now()>apUndo.until||lock.current)return;lock.current=true;setBusy(true);try{if(!demo)await repositories(storeFor(c.cong,c.roles),c.cong).reports.undoAP(apUndo.id);else updateDemo(current=>current.map(row=>row.id===apUndo.record.id?apUndo.record:row));await cache.invalidateQueries({queryKey:['reports']});await cache.invalidateQueries({queryKey:['assistant-home-ready']});setAPUndo(null);c.notify('AP status restored.');}catch(error){setError((error as Error).message);}finally{lock.current=false;setBusy(false);}}} type="button">{"Undo"}</Button></p>}
      {publisherUndo&&<p role="status">{"Publisher saved. "}<Button disabled={busy} onClick={async()=>{if(!publisherUndo||Date.now()>publisherUndo.until||lock.current)return;lock.current=true;setBusy(true);try{const currentPeople=demo?people.data:await rpc('ca_v2_people',{p_cong_id:c.cong});const person=(currentPeople as Record<string,unknown>[]).find(row=>row.id===publisherUndo.id);if(!person||person[publisherUndo.field]!==publisherUndo.value)throw Error('This record changed. Review it in People before undoing.');const expected=demo?[]:await rpc('get_publisher_login',{p_cong_id:c.cong,p_publisher_id:publisherUndo.id});await savePublisherAction(c.cong,{...person,[publisherUndo.field]:publisherUndo.previous??null,expected_login:expected},Boolean(person.email&&(currentPeople as Record<string,unknown>[]).some(row=>row.id!==person.id&&row.email===person.email)),c.roles);cache.setQueryData(['assistant-people',c.account,c.cong],(currentPeople as Record<string,unknown>[]).map(row=>row.id===publisherUndo.id?{...row,[publisherUndo.field]:publisherUndo.previous??null}:row));await cache.invalidateQueries({queryKey:['dashboard-people']});setPublisherUndo(null);c.notify('Publisher change undone.');}catch(error){setError((error as Error).message);}finally{lock.current=false;setBusy(false);}}} type="button">{"Undo"}</Button></p>}
      {(error || people.error || current.error) && (
        <p role="alert">
          {error || people.error?.message || current.error?.message}
          {current.error && (
            <Button onClick={() => void current.refetch()} type="button">
              {t("search.retry")}
            </Button>
          )}
        </p>
      )}
      {plan?.kind==='assignment'&&<section className="card stack"><h3>{t('assistant.preview')}</h3><PersonPicker label={t('s21.person')} value={publisher} onChange={setPublisher} people={plan.people}/><p>{plan.week}: {plan.part}</p><p role="status">{assignmentPreview?.error||assignmentPreview?.caution||"No same-meeting conflict found. This saves an unpublished draft."}</p><Button disabled={busy||!publisher||Boolean(assignmentPreview?.error)} onClick={()=>void confirm()} type="button">{t('assistant.update')}</Button></section>}
      {plan?.kind==='group-link' &&<section className="card stack"><h3>{t('assistant.preview')}</h3><p>{plan.action}: {plan.group}</p><Button disabled={busy} onClick={()=>void confirm()} type="button">{t('assistant.update')}</Button></section>}
      {plan?.kind==='ap-revoke' &&<section className="card stack"><h3>{t('refine.confirmAPQuestion')}</h3><PersonPicker label={t('s21.person')} value={publisher} onChange={setPublisher} people={plan.people}/><p>{plan.period}</p><Button disabled={busy||!publisher} onClick={()=>void confirm()} type="button">{t('refine.confirmAPQuestion')}</Button></section>}
      {plan?.kind === "publisher-edit" && <section className="card stack"><h3>{t("assistant.preview")}</h3><PersonPicker label={t("s21.person")} value={publisher} onChange={setPublisher} people={plan.people}/><p translate="no">{plan.field}: {String(plan.value)}</p><Button disabled={busy||!publisher} onClick={()=>void confirm()} type="button">{t("assistant.update")}</Button></section>}
      {plan?.kind === "s21-person" && plan.people.length > 1 && (
        <section className="card stack">
          <h3>{t("assistant.choosePublisher")}</h3>
          <p>{t("assistant.ambiguous")}</p>
          {plan.people.map((person) => (
            <Button
              key={person.id}
              disabled={busy}
              onClick={() => void download(person.id)} type="button"
            >
              {t("assistant.downloadPerson")} {person.name}
            </Button>
          ))}
        </section>
      )}
      {plan?.kind === "attendance" && (
        <section className="card stack">
          <h3>{t("assistant.attendanceReview")}</h3>
          <p>
            {meeting?.date} · {meeting?.kind} · {meeting?.timezone}
          </p>
          <p>
            {t("assistant.attendanceCount")} {plan.count}
            {meeting?.count != null ? ` (previously ${meeting.count})` : ""}
          </p>
          {!meeting?.canSubmit ||
          (plan.meeting && plan.meeting !== meeting?.kind) ? (
            <p role="alert">{t("assistant.noCurrentMeeting")}</p>
          ) : (
            <Button disabled={busy} onClick={() => void confirm()} type="button">
              {t("assistant.attendanceSave")}
            </Button>
          )}
        </section>
      )}
      {plan?.kind === "s21-all" && (
        <section className="card">
          <h3>{t("assistant.exportTitle")}</h3>
          <p>{t("assistant.exportExplanation")}</p>
          <Button onClick={() => void confirm()} type="button">
            {t("assistant.openExport")}
          </Button>
        </section>
      )}
      {plan?.kind === "report" && (
        <section className="card stack">
          <h3>{t("assistant.preview")}</h3>
          <PersonPicker
            label={t("s21.person")}
            value={publisher}
            onChange={setPublisher}
            people={plan.people}
          />
          <dl>
            <dt>{t("assistant.period")}</dt>
            <dd>{plan.period}</dd>
            <dt>{t("home.hours")}</dt>
            <dd>{plan.hours}</dd>
            <dt>{t("home.studies")}</dt>
            <dd>{plan.studies}</dd>
          </dl>
          <p>{t("assistant.participation")}</p>
          {current.data && (
            <p>
              {t("assistant.previous")}: {current.data.hours} {t("home.hours")}{" "}
              · {current.data.studies || 0} {t("home.studies")}
            </p>
          )}
          <Button
            disabled={
              !publisher || busy || current.isPending || !!current.error
            }
            onClick={() => void confirm()} type="button"
          >
            {t(current.data ? "assistant.update" : "assistant.confirm")}
          </Button>
        </section>
      )}
    </div>
  );
}
