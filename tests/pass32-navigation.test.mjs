import test from "node:test";
import assert from "node:assert/strict";
import {parseAppRoute,routeHref,sameDocumentPath} from "../src/app/navigation.ts";
const file="file:///tmp/Practice_Desk_Offline_Mock_Tests.html";
test("native-only query codec round-trips every routable screen on file URL",()=>{
  const cases=[
   {screen:"library"},{screen:"history"},{screen:"learning"},
   {screen:"exam",attemptId:"attempt-1"},
   {screen:"result",attemptId:"attempt-1",tab:"overview"},
   {screen:"result",attemptId:"imported:é/& +",tab:"review"},
   {screen:"result",attemptId:"a".repeat(256),tab:"timing"}
  ];
  for(const r of cases){
    const href=routeHref(file,r);
    assert.equal(new URL(href).pathname,new URL(file).pathname);
    assert.equal(new URL(href).hash,"");
    assert.deepEqual(parseAppRoute(href),r);
    assert(sameDocumentPath(file,href),"query navigation must keep same file path");
  }
});
test("native codec rejects ambiguous, malformed or answer-bearing route schema",()=>{
 const bad=[
  "?pd=bogus","?pd=exam","?pd=result","?pd=exam&attempt=",
  "?pd=exam&attempt=x&attempt=y","?pd=result&attempt=x&tab=bogus",
  "?pd=result&attempt=x&tab=review&tab=timing",
  "?pd=library&attempt=wrong","?pd=learning&tab=review",
  "?pd=exam&attempt="+encodeURIComponent("\u0001"),
  "?pd=exam&attempt="+"a".repeat(257),
  "?pd=history&pd=exam"
 ];
 for(const query of bad)assert.equal(parseAppRoute(file+query),null,query);
 assert.equal(parseAppRoute(file),null);
 assert.equal(parseAppRoute("not a url"),null);
});
test("routeHref clears old route parameters without destroying unrelated query",()=>{
 const href=routeHref(file+"?foo=one&pd=exam&attempt=a&tab=review",
  {screen:"result",attemptId:"next",tab:"timing"});
 const u=new URL(href);
 assert.equal(u.searchParams.get("foo"),"one");
 assert.deepEqual(u.searchParams.getAll("pd"),["result"]);
 assert.deepEqual(u.searchParams.getAll("attempt"),["next"]);
 assert.deepEqual(u.searchParams.getAll("tab"),["timing"]);
 assert.equal(sameDocumentPath(file,file+"?pd=history"),true);
 assert.equal(sameDocumentPath(file,"file:///tmp/other.html?pd=history"),false);
 assert.equal(sameDocumentPath(file,"https://example.com/test?pd=history"),false);
});
