export type ReviewDurationReliability="continuous"|"interrupted";

export interface ReviewDurationEvidence{
 readonly foregroundMs:number;
 readonly recallMs:number;
 readonly postRevealMs:number;
 readonly reliability:ReviewDurationReliability;
}

export interface ReviewDurationTracker{
 readonly cardId:string|null;
 start(cardId:string,nowMs:number,visible:boolean):void;
 reveal(nowMs:number,visible:boolean):void;
 visibility(nowMs:number,visible:boolean):void;
 finish(nowMs:number,visible:boolean):ReviewDurationEvidence;
 reset():void;
}

const validClock=(value:number)=>{
 if(!Number.isFinite(value)||value<0)throw Error("Invalid review timer clock");
 return value;
};

export function validateReviewDurationEvidence(value:unknown):ReviewDurationEvidence{
 if(!value||typeof value!=="object"||Array.isArray(value))
  throw Error("Invalid review duration evidence");
 const raw=value as Partial<ReviewDurationEvidence>;
 if(Object.keys(raw).some(key=>!["foregroundMs","recallMs","postRevealMs","reliability"].includes(key))||
   !Number.isSafeInteger(raw.foregroundMs)||raw.foregroundMs!<0||
   !Number.isSafeInteger(raw.recallMs)||raw.recallMs!<0||
   !Number.isSafeInteger(raw.postRevealMs)||raw.postRevealMs!<0||
   raw.foregroundMs!==raw.recallMs!+raw.postRevealMs!||
   raw.reliability!=="continuous"&&raw.reliability!=="interrupted")
  throw Error("Invalid review duration evidence");
 return {
  foregroundMs:raw.foregroundMs,recallMs:raw.recallMs!,
  postRevealMs:raw.postRevealMs!,reliability:raw.reliability
 };
}

export function createReviewDurationTracker():ReviewDurationTracker{
 let currentCardId:string|null=null,phase:"recall"|"post-reveal"="recall";
 let activeSince:number|null=null,recallMs=0,postRevealMs=0,interrupted=false;

 const accrue=(nowMs:number)=>{
  const now=validClock(nowMs);
  if(activeSince===null)return;
  if(now<activeSince)throw Error("Review timer clock moved backwards");
  const elapsed=now-activeSince;
  if(phase==="recall")recallMs+=elapsed;
  else postRevealMs+=elapsed;
  activeSince=null;
 };
 const setVisible=(nowMs:number,visible:boolean)=>{
  const now=validClock(nowMs);
  if(visible){
   if(activeSince===null)activeSince=now;
  }else{
   accrue(now);
   interrupted=true;
  }
 };
 const reset=()=>{
  currentCardId=null;phase="recall";activeSince=null;
  recallMs=0;postRevealMs=0;interrupted=false;
 };

 return {
  get cardId(){return currentCardId;},
  start(cardId,nowMs,visible){
   if(!cardId)throw Error("Review timer requires a card ID");
   if(currentCardId===cardId)return;
   reset();currentCardId=cardId;
   if(visible)activeSince=validClock(nowMs);
   else{validClock(nowMs);interrupted=true;}
  },
  reveal(nowMs,visible){
   if(currentCardId===null)throw Error("Review timer has not started");
   if(visible)accrue(nowMs);
   else{accrue(nowMs);interrupted=true;}
   phase="post-reveal";
   if(visible)activeSince=validClock(nowMs);
  },
  visibility(nowMs,visible){
   if(currentCardId===null)return;
   setVisible(nowMs,visible);
  },
  finish(nowMs,visible){
   if(currentCardId===null)throw Error("Review timer has not started");
   if(visible)accrue(nowMs);
   else{accrue(nowMs);interrupted=true;}
   const evidence=validateReviewDurationEvidence({
    recallMs:Math.max(0,Math.round(recallMs)),
    postRevealMs:Math.max(0,Math.round(postRevealMs)),
    foregroundMs:Math.max(0,Math.round(recallMs)+Math.round(postRevealMs)),
    reliability:interrupted?"interrupted":"continuous"
   });
   reset();
   return evidence;
  },
  reset
 };
}
