/**
 * Offline-safe route controller for the single-file Practice Desk document.
 * Use the native Navigation API when supported. Older Safari and file://
 * environments that cannot navigate with it use same-document fragment
 * entries (#pd=...), with hashchange for real browser Back/Forward.
 * Neither route mode reloads the HTML or affects exam persistence/scoring.
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

/** Fragment encoding avoids Safari file:// history.pushState restrictions.
 * Preserve the existing file pathname and any non-router query parameters.
 */
export function fragmentRouteHref(baseHref:string,route:AppRoute):string{
  const base=new URL(baseHref);
  const routed=new URL(routeHref(baseHref,route));
  base.hash="#"+routed.searchParams.toString();
  return base.href;
}
export function parseFragmentRoute(href:string):AppRoute|null{
  let url:URL;
  try{url=new URL(href);}catch{return null;}
  if(!url.hash.startsWith("#pd="))return null;
  const fromHash=new URL(url.href);
  fromHash.hash="";
  fromHash.searchParams.delete("pd");
  fromHash.searchParams.delete("attempt");
  fromHash.searchParams.delete("tab");
  for(const [key,value] of new URLSearchParams(url.hash.slice(1)))
    fromHash.searchParams.append(key,value);
  return parseAppRoute(fromHash.href);
}
function createFragmentRouter(
  onRoute:(route:AppRoute,ctx:RouteContext)=>Promise<void>|void,
  win:Window
):NativeRouter{
  let disposed=false,started=false,generation=0,lastDeliveredHref=win.location.href;
  const current=()=>parseFragmentRoute(win.location.href)??parseAppRoute(win.location.href)??{screen:"library"} as const;
  async function deliver(route:AppRoute,kind:RouteContext["kind"]):Promise<void>{
    if(disposed)return;
    await onRoute(route,{kind,signal:undefined,generation:++generation});
  }
  const onHash=()=>{
    if(disposed||lastDeliveredHref===win.location.href)return;
    lastDeliveredHref=win.location.href;
    void deliver(current(),"traverse").catch(error=>{
      // Do not silently swallow a failed actual browser Back/Forward route.
      win.dispatchEvent(new CustomEvent("practice-desk:route-error",{detail:String(error)}));
    });
  };
  win.addEventListener("hashchange",onHash);
  return {
    async start(){
      if(started||disposed)return;started=true;
      lastDeliveredHref=win.location.href;
      await deliver(current(),"initial");
    },
    async navigate(route,history="push"){
      if(disposed)throw Error("Navigation controller disposed");
      const target=fragmentRouteHref(win.location.href,route);
      if(target===win.location.href)return;
      if(history==="replace")win.location.replace(target);
      else win.location.hash=new URL(target).hash;
      if(win.location.href!==target)throw Error("Browser prevented same-document fragment routing");
      lastDeliveredHref=target;
      await deliver(route,history);
    },
    back:async()=>{if(win.history.length>1)win.history.back();},
    forward:async()=>{win.history.forward();},
    get canGoBack(){return win.history.length>1;},
    get canGoForward(){return false;}, // History API cannot reliably expose this state.
    dispose(){if(disposed)return;disposed=true;win.removeEventListener("hashchange",onHash);}
  };
}

export function createNativeRouter(
  onRoute:(route:AppRoute,ctx:RouteContext)=>Promise<void>|void,
  options?:{readonly window?:Window}
):NativeRouter{
  const win=options?.window??window;
  const nav=(win as Window&{readonly navigation?:NativeNavigation}).navigation;
  if(!nav||typeof nav.navigate!=="function"||typeof nav.addEventListener!=="function")
    return createFragmentRouter(onRoute,win);
  let disposed=false,generation=0,started=false;
  let compat:NativeRouter|null=null;
  const listener:EventListener=(raw:Event)=>{
    if(disposed)return;
    const event=raw as NativeNavigateEvent;
    if(!event.canIntercept||event.navigationType==="reload"||
      event.downloadRequest!==null)return;
    if(!sameDocumentPath(win.location.href,event.destination.url))return;
    // The initial Library entry has no routing query. Back to that entry
    // must remain same-document and activate Library; never reload the HTML.
    // Unrelated external/download/cross-file navigations remain untouched.
    const incoming=new URL(event.destination.url),current=new URL(win.location.href);
    if(!incoming.searchParams.has("pd")&&!current.searchParams.has("pd"))return;
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
    if(compat){await compat.navigate(route,history);return;}
    try{
      await nav.navigate(href,{history}).finished;
    }catch(error){
      // Safari can expose a partial Navigation API but reject file://
      // transitions. Degrade for this document, never for external URLs.
      if(win.location.protocol!=="file:")throw error;
      nav.removeEventListener("navigate",listener);
      compat=createFragmentRouter(onRoute,win);
      await compat.navigate(route,history);
    }
  }
  return {
    navigate,
    back:async()=>{if(compat)await compat.back();else if(nav.canGoBack)await nav.back().finished;},
    forward:async()=>{if(compat)await compat.forward();else if(nav.canGoForward)await nav.forward().finished;},
    get canGoBack(){return compat?.canGoBack??nav.canGoBack;},
    get canGoForward(){return compat?.canGoForward??nav.canGoForward;},
    async start(){
      if(started||disposed)return;
      started=true;
      // The Navigation API emits no navigate event on the first load. Render
      // directly without racing an unnecessary replace against a Start click.
      // This is still native-only: every subsequent transition is intercepted.
      const initial=parseFragmentRoute(win.location.href)??parseAppRoute(win.location.href)??{screen:"library"} as const;
      await onRoute(initial,{kind:"initial",signal:undefined,generation:++generation});
    },
    dispose(){if(disposed)return;disposed=true;nav.removeEventListener("navigate",listener);compat?.dispose();}
  };
}
