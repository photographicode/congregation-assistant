import React from 'react';
import {createRoot} from 'react-dom/client';
import {IconButton,ProgressRing,StatTile,ListRow,Chip,Switch,Select,Stepper,WeekPicker,Toast,Banner,EmptyState,Skeleton,QRCode,CopyField,Wizard,Tabs,DataTable,Row,Section,Field,Page,PageHeader,Stack,Inline,Grid,Split,Toolbar,FormRow,TableShell,Dialog,BottomSheet,Button} from '../../packages/ui/components';
import type {Column} from '../../packages/ui/components';
import '../../apps/web/src/features/styles.css';
import '../../packages/ui/v3-dialog-layer.css';
import './ui-kit-fixture.css';
const columns:Column<{id:string;name:string}>[]=[{id:'name',label:'Publisher',cell:row=>row.name,sort:row=>row.name}];
function Fixture(){
 const [result,setResult]=React.useState('Ready'),[checked,setChecked]=React.useState(false),[option,setOption]=React.useState(''),[hours,setHours]=React.useState(0),[week,setWeek]=React.useState('2026-10-19'),[step,setStep]=React.useState(0),[tab,setTab]=React.useState('one'),[toast,setToast]=React.useState(false),[dialog,setDialog]=React.useState(false),[sheet,setSheet]=React.useState(false);
 return <Page><PageHeader title="Component contracts" description="Fictional UI fixtures"/><Stack>
 <output aria-label="Action result">{result}</output>
 <Section title="Actions"><Toolbar label="Fixture actions"><IconButton label="Icon action" onClick={()=>setResult('Icon worked')}>+</IconButton><StatTile label="Reports" value={12} detail="Received reports" trend={[3,8,12]} onClick={()=>setResult('Stat worked')}/><Button type="button" onClick={()=>setDialog(true)}>Open dialog</Button><Button type="button" onClick={()=>setSheet(true)}>Open sheet</Button></Toolbar></Section>
 <Section title="Status"><Inline><ProgressRing label="Received" value={50}/><Chip tone="warn">Needs review</Chip></Inline><Banner>Draft preserved</Banner><Banner tone="error">Please retry</Banner><Skeleton label="Loading records"/><EmptyState title="No assignments" description="Assign after review." illustration={<span aria-hidden="true"/>} action={<Button type="button" onClick={()=>setResult('Started')}>Start</Button>}/><Button type="button" onClick={()=>setToast(true)}>Show toast</Button>{toast&&<Toast message="Report saved" onUndo={()=>setResult('Undo worked')} onClose={()=>setToast(false)}/>}</Section>
 <Section title="Inputs"><Grid><Switch label="Reminders" checked={checked} onChange={setChecked}/><Select label="Fixture option" value={option} onChange={setOption} options={['First','Second','Third','Fourth','Fifth','Sixth'].map(label=>({value:label,label}))}/><Stepper label="Hours" value={hours} min={0} max={10} step={.25} onChange={setHours}/><WeekPicker label="Week beginning" value={week} onChange={setWeek}/><FormRow><Field label="Fixture name" hint="Use a fictional name">{props=><input {...props} defaultValue="Example"/>}</Field></FormRow></Grid></Section>
 <Split><Section title="Links"><CopyField label="Report link" value="https://localhost/fictional-report"/><QRCode value="https://localhost/fictional-report" label="Report QR"/></Section><Section title="Rows"><ListRow actions={<Button type="button" onClick={()=>setResult('Row worked')}>Row action</Button>}>Fictional publisher</ListRow><Row>Aligned figures</Row></Section></Split>
 <Section title="Steps" data-contract="wizard"><Wizard steps={['People','Reports']} step={step} onStep={setStep}><p>{step===0?'People step':'Reports step'}</p></Wizard></Section>
 <Section title="Tabs"><Tabs label="Fixture tabs" value={tab} onChange={setTab} tabs={[{value:'one',label:'First tab',content:'First panel'},{value:'two',label:'Second tab',content:'Second panel'}]}/></Section>
 <TableShell label="Publisher list"><DataTable label="Fixture publishers" columns={columns} rows={[{id:'z',name:'Zoe Example'},{id:'a',name:'Ana Example'}]}/></TableShell>
 </Stack><Dialog title="Fixture dialog" open={dialog} onClose={()=>setDialog(false)}><p>Opaque dialog content</p></Dialog><BottomSheet title="Fixture sheet" open={sheet} onClose={()=>setSheet(false)}><p>Sheet content</p></BottomSheet></Page>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
