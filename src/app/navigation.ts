/**
 * Native Navigation API router for the single-file Practice Desk document.
 *
 * All internal destinations retain the identical pathname (including file://)
 * and vary only query parameters. The Navigation API alone owns history.
 * No History API, hash router or legacy-browser fallback is installed.
 */
export type AppRoute =
  | {readonly screen:"library"}
  | {readonly screen:"history"}
  | {readonly screen:"learning"}
  | {readonly screen:"exam";readonly attemptId:string}
  | {readonly screen:"result";readonly attemptId:string;readonly tab:"overview"|"review"|"timing"};

export type RouteContext={
  readonly kind:"initial"|"push"|"replace"|"traverse";
  readonly signal:AbortSignal|undefined;
  readonly generation:number;
};
type NativeNavigateResult={readonly committed:Promise<unknown>;readonly finished:Promise<unknown>};
type NativeNavigation={
  addEventListener(type:"navigate",listener:EventListener):void;
  removeEventListener(type:"navigate",listener:EventListener):void;
  navigate(url:string,options?:{history?:"push"|"replace"}):NativeNavigateResult;
  readonly currentEntry?:{readonly url:string|null};
  readonly canGoBack:boolean;
  readonly canGoForward:boolean;
  back():NativeNavigateResult;
  forward():NativeNavigateResult;
};
type NativeNavigateEvent=Event&{
  readonly canIntercept:boolean;
  readonly navigationType:"push"|"replace"|"reload"|"traverse"|null;
  readonly destination:{readonly url:string};
  readonly downloadRequest:string|null;
  readonly signal:AbortSignal;
  intercept(options:{
    focusReset:"manual";
    scroll:"manual";
    handler:()=>void|Promise<void>;
  }):void;
};
const SCREENS=new Set(["library","history","learning","exam","result"]);
const TABS=new Set(["overview","review","timing"]);
const ATTEMPT_MAX=256;
const isAttemptId=(s:string|null):s is string=>
  typeof s==="string"&&s.length>0&&s.length<=ATTEMPT_MAX&&
  !/[\u0000-\u001f\u007f]/.test(s);

/** Invalid user-edited routes cannot inject elements, answers or keys. */
export function parseAppRoute(url:string):AppRoute|null{
  let parsed:URL;
  try{parsed=new URL(url);}catch{return null;}
  const params=parsed.searchParams;
  const screens=params.getAll("pd");
  if(screens.length!==1||!SCREENS.has(screens[0]??""))return null;
  const screen=screens[0];
  if(screen==="library"||screen==="history"||screen==="learning"){
    if(params.has("attempt")||params.has("tab"))return null;
    return {screen};
  }
  const ids=params.getAll("attempt");
  if(ids.length!==1||!isAttemptId(ids[0]??null))return null;
  const attemptId=ids[0]!;
  if(screen==="exam"){
    if(params.has("tab"))return null;
    return {screen:"exam",attemptId};
  }
  const tabs=params.getAll("tab");
  if(tabs.length>1||!TABS.has(tabs[0]??"overview"))return null;
  return {screen:"result",attemptId,tab:(tabs[0]??"overview") as "overview"|"review"|"timing"};
}

export function routeHref(baseHref:string,route:AppRoute):string{
  const url=new URL(baseHref);
  url.hash="";
  url.searchParams.delete("pd");
  url.searchParams.delete("attempt");
  url.searchParams.delete("tab");
  url.searchParams.set("pd",route.screen);
  if(route.screen==="exam"||route.screen==="result")
    url.searchParams.set("attempt",route.attemptId);
  if(route.screen==="result")url.searchParams.set("tab",route.tab);
  return url.href;
}

/** Route changes must remain inside this single HTML pathname. */
export function sameDocumentPath(currentHref:string,targetHref:string):boolean{
  try{
    const a=new URL(currentHref),b=new URL(targetHref);
    return a.protocol===b.protocol&&a.host===b.host&&a.pathname===b.pathname&&
      a.username===b.username&&a.password===b.password;
  }catch{return false;}
}
export interface NativeRouter{
  navigate(route:AppRoute,history?:"push"|"replace"):Promise<void>;
  back():Promise<void>;
  forward():Promise<void>;
  /** Initialize after persistent records are loaded; first load emits no navigate event. */
  start():Promise<void>;
  readonly canGoBack:boolean;
  readonly canGoForward:boolean;
  dispose():void;
}

export function createNativeRouter(
  onRoute:(route:AppRoute,ctx:RouteContext)=>Promise<void>|void,
  options?:{readonly window?:Window}
):NativeRouter{
  const win=options?.window??window;
  const nav=(win as Window&{readonly navigation?:NativeNavigation}).navigation;
  if(!nav||typeof nav.navigate!=="function"||typeof nav.addEventListener!=="function"){
    throw new Error("Practice Desk requires the modern browser Navigation API.");
  }
  let disposed=false,generation=0,started=false;
  const listener:EventListener=(raw:Event)=>{
    if(disposed)return;
    const event=raw as NativeNavigateEvent;
    if(!event.canIntercept||event.navigationType==="reload"||
      event.downloadRequest!==null)return;
    if(!sameDocumentPath(win.location.href,event.destination.url))return;
    // Intercept only internal application destinations. External navigations
    // are never swallowed by our SPA controller.
    if(!new URL(event.destination.url).searchParams.has("pd"))return;
    const destination=parseAppRoute(event.destination.url)??{screen:"library"} as const;
    event.intercept({
      focusReset:"manual",scroll:"manual",
      handler:async()=>{
        const current=++generation;
        await onRoute(destination,{
          kind:event.navigationType==="traverse"?"traverse":
               event.navigationType==="replace"?"replace":"push",
          signal:event.signal,generation:current
        });
      }
    });
  };
  nav.addEventListener("navigate",listener);
  async function navigate(route:AppRoute,history:"push"|"replace"="push"):Promise<void>{
    if(disposed)throw Error("Navigation controller disposed");
    const href=routeHref(win.location.href,route);
    if(href===win.location.href)return;
    await nav.navigate(href,{history}).finished;
  }
  return {
    navigate,
    back:async()=>{if(nav.canGoBack)await nav.back().finished;},
    forward:async()=>{if(nav.canGoForward)await nav.forward().finished;},
    get canGoBack(){return nav.canGoBack;},
    get canGoForward(){return nav.canGoForward;},
    async start(){
      if(started||disposed)return;
      started=true;
      const initial=parseAppRoute(win.location.href);
      if(initial){
        await onRoute(initial,{kind:"initial",signal:undefined,generation:++generation});
      }else{
        await navigate({screen:"library"},"replace");
      }
    },
    dispose(){if(disposed)return;disposed=true;nav.removeEventListener("navigate",listener);}
  };
}
