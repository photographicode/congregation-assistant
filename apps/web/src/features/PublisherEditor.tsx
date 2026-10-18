import React from 'react';
import {Dialog,DialogCancel} from '../../../../packages/ui/Dialog';
import {t} from '../../../../packages/core/i18n';
import type {Person} from './publisher-record';
type Props={extendedPeople:boolean;people:Person[];editing:Person|null;setEditing:React.Dispatch<React.SetStateAction<Person|null>>;dirty:boolean;setDirty:React.Dispatch<React.SetStateAction<boolean>>;admin:boolean;busy:boolean;demo:boolean;groups:{id:string;name:string}[];shared:boolean;setShared:React.Dispatch<React.SetStateAction<boolean>>;household:Person[];existingShared:boolean;error:string;run:(task:()=>Promise<void>)=>void;savePerson:()=>Promise<void>};
export default function PublisherEditor({extendedPeople,people,editing,setEditing,dirty,setDirty,admin,busy,demo,groups,shared,setShared,household,existingShared,error,run,savePerson}:Props){return (
      <Dialog
        open={!!editing}
        title={
          people.some((p) => p.id === editing?.id)
            ? "Edit publisher"
            : "Add publisher"
        }
        dirty={dirty}
        onClose={() => {
          setEditing(null);
          setDirty(false);
        }}
      >
        {editing && (
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              run(savePerson);
            }}
          >
            <h3>Basics</h3>
            <div className="form-grid">
              <label>
                Full name
                <input
                  required
                  value={editing.name}
                  onChange={(e) => {
                    setEditing((p) => (p ? { ...p, name: e.target.value } : p));
                    setDirty(true);
                  }}
                />
              </label>
              <fieldset className="publisher-gender" aria-describedby="publisher-gender-help">
                <legend>{t('polish.gender')} <span aria-hidden="true">*</span></legend>
                <div className="gender-segments">
                  {(['Male','Female'] as const).map(value=><label key={value} className={editing.gender===value?'selected':''}><input required type="radio" name="publisher-gender" value={value} checked={editing.gender===value} onInvalid={e=>e.currentTarget.setCustomValidity(t('polish.chooseGender'))} onChange={e=>{e.currentTarget.form?.querySelectorAll<HTMLInputElement>('[name=publisher-gender]').forEach(input=>input.setCustomValidity(''));setEditing(p=>p?{...p,gender:value}:p);setDirty(true);}}/>{t(value==='Male'?'polish.brother':'polish.sister')}</label>)}
                </div>
                <small id="publisher-gender-help">{t('polish.chooseGender')}</small>
              </fieldset>
              <label>
                Service group
                <select
                  value={editing.group}
                  onChange={(e) => {
                    setEditing((p) =>
                      p ? { ...p, group: e.target.value } : p,
                    );
                    setDirty(true);
                  }}
                >
                  <option value="">No group</option>
                  {groups.map((g) => (
                    <option key={g.id}>{g.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <h3>Sign-in & contact</h3>
            <label htmlFor="v2-publisher-email">
              Email (for sign-in)
              <input
                id="v2-publisher-email"
                aria-describedby="v2-publisher-email-hint"
                type="email"
                value={editing.email}
                disabled={busy || (!admin && !demo)}
                onChange={(e) => {
                  setEditing((p) => (p ? { ...p, email: e.target.value } : p));
                  setDirty(true);
                  setShared(false);
                }}
              />
            </label>
            <small id="v2-publisher-email-hint">
              Optional. A shared email grants household report submission only.
            </small>
            {household.length > 0 && !shared && !existingShared && (
              <section className="banner">
                <p>
                  This email is already used by{" "}
                  {household.map((p) => p.name).join(", ")}. Treat as a
                  household so one sign-in can report for everyone?
                </p>
                <div className="actions">
                  <button type="button" onClick={() => setShared(true)}>
                    Yes, share reports
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditing((p) => (p ? { ...p, email: "" } : p))
                    }
                  >
                    No, use a different email
                  </button>
                </div>
              </section>
            )}
            {(shared||existingShared) && (
              <p role="status">
                Household reporting confirmed. Contacts and private details stay
                separate.
              </p>
            )}
            <div className="form-grid">
              <label>
                Phone
                <input
                  type="tel"
                  value={editing.phone}
                  onChange={(e) => {
                    setEditing((p) =>
                      p ? { ...p, phone: e.target.value } : p,
                    );
                    setDirty(true);
                  }}
                />
              </label>
              <label>
                Address
                <input
                  value={editing.address}
                  onChange={(e) => {
                    setEditing((p) =>
                      p ? { ...p, address: e.target.value } : p,
                    );
                    setDirty(true);
                  }}
                />
              </label>
            </div>
            <details><summary>Household, emergency contact & publisher record</summary>
            {demo||extendedPeople?<div className="stack">
              <div className="form-grid">{([['dob','Date of birth'],['baptized','Date of baptism'],['emergencyName','Emergency contact name'],['emergencyRelationship','Relationship'],['emergencyPhone','Emergency phone'],['spiritualStatus','Publisher status']] as const).map(([key,label])=><label key={key}>{label}<input type={key==='dob'||key==='baptized'?'date':key==='emergencyPhone'?'tel':'text'} value={editing[key]||''} onChange={e=>{setEditing(p=>p?{...p,[key]:e.target.value}:p);setDirty(true);}}/></label>)}</div>
              <label>Household head<select value={editing.familyHeadId||''} onChange={e=>{setEditing(p=>p?{...p,familyHeadId:e.target.value}:p);setDirty(true);}}><option value="">This person is the household head</option>{people.filter(p=>p.id!==editing.id&&!p.familyHeadId).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
              <label>Hope<select value={editing.hope||''} onChange={e=>{setEditing(p=>p?{...p,hope:e.target.value}:p);setDirty(true);}}><option value="">Not recorded</option><option>Other Sheep</option><option>Anointed</option></select></label>
              {([['isElder','Elder'],['isMS','Ministerial servant'],['isRP','Regular pioneer'],['isSP','Special pioneer'],['isFM','Field missionary'],['isSFTS',t('sfts.name')]] as const).map(([key,label])=><label className="check" key={key}><input type="checkbox" checked={Boolean(editing[key])} onChange={e=>{setEditing(p=>p?{...p,[key]:e.target.checked}:p);setDirty(true);}}/>{label}</label>)}<p>{t('sfts.derived')}</p>
            </div>:<p>Ask your administrator to apply the extended publisher database update, then reopen this record.</p>}</details>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <div className="actions">
              <button type="submit" className="primary" disabled={busy}>
                Save publisher & email
              </button>
              <DialogCancel>Cancel</DialogCancel>
            </div>
          </form>
        )}
      </Dialog>
);}
