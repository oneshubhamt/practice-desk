export interface ScheduledMockRecord {
  readonly recordType:"calendar-scheduled-mock";
  readonly saveRevision:number;
  readonly id:string;
  readonly packageRevisionId:string;
  readonly examId:string;
  readonly paperId:string;
  readonly title:string;
  readonly start:string;
  readonly durationMinutes:number;
  readonly createdAt:string;
  readonly updatedAt:string;
}

const validText=(value:unknown,max:number):value is string=>
  typeof value==="string"&&Boolean(value.trim())&&value.length<=max&&
  !/[\u0000-\u001f\u007f]/u.test(value);
const validIso=(value:unknown):value is string=>
  typeof value==="string"&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;

export function isScheduledMock(value:unknown):value is ScheduledMockRecord {
  return Boolean(value)&&typeof value==="object"&&
    (value as {recordType?:unknown}).recordType==="calendar-scheduled-mock";
}

export function validateScheduledMock(value:unknown):ScheduledMockRecord {
  if(!isScheduledMock(value))throw Error("Invalid scheduled mock");
  const raw=value as ScheduledMockRecord;
  const fields=["recordType","saveRevision","id","packageRevisionId","examId","paperId",
    "title","start","durationMinutes","createdAt","updatedAt"];
  if(Object.keys(raw).some(key=>!fields.includes(key))||
    !Number.isSafeInteger(raw.saveRevision)||raw.saveRevision<0||
    !validText(raw.id,240)||!raw.id.startsWith("calendar-scheduled-mock:")||
    !validText(raw.packageRevisionId,600)||!validText(raw.examId,300)||
    !validText(raw.paperId,300)||!validText(raw.title,240)||
    !validIso(raw.start)||!validIso(raw.createdAt)||!validIso(raw.updatedAt)||
    Date.parse(raw.updatedAt)<Date.parse(raw.createdAt)||
    !Number.isSafeInteger(raw.durationMinutes)||raw.durationMinutes<1||raw.durationMinutes>24*60)
    throw Error("Invalid scheduled mock fields");
  return raw;
}

export function createScheduledMock(input:Omit<ScheduledMockRecord,
  "recordType"|"saveRevision"|"id"|"createdAt"|"updatedAt">,now:string,id:string):ScheduledMockRecord {
  return validateScheduledMock({
    recordType:"calendar-scheduled-mock",saveRevision:0,id:"calendar-scheduled-mock:"+id,
    ...input,createdAt:now,updatedAt:now
  });
}
