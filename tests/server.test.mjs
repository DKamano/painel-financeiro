import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash,randomUUID} from 'node:crypto';
function service(){
 const cache=new Map(),rows=[];let locked=false;
 const sheet={getRange(row,col,height=1,width=1){const range={getValues:()=>Array.from({length:height},(_,r)=>Array.from({length:width},(_,c)=>rows[row+r-1]?.[col+c-1]??'')),setValues(values){values.forEach((line,r)=>line.forEach((value,c)=>{rows[row+r-1]??=[];rows[row+r-1][col+c-1]=value}));return range}};for(const name of ['setFontWeight','setBackground','setFontColor','setNumberFormat'])range[name]=()=>range;return range;},getLastRow:()=>rows.length,setFrozenRows(){},setColumnWidths(){},setColumnWidth(){}};
 let exists=false;
 const context=vm.createContext({ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({setMimeType:()=>JSON.parse(text)})},Utilities:{DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_,text)=>[...createHash('sha256').update(text).digest()],getUuid:randomUUID},PropertiesService:{getScriptProperties:()=>({getProperty:()=> 'test-secret'})},CacheService:{getScriptCache:()=>({get:key=>cache.get(key),put:(key,value)=>cache.set(key,value),remove:key=>cache.delete(key)})},LockService:{getScriptLock:()=>({waitLock(){assert.equal(locked,false);locked=true},releaseLock(){locked=false}})},SpreadsheetApp:{openById:()=>({getSheetByName:()=>exists?sheet:null,insertSheet:()=>{exists=true;return sheet}}),flush(){}}});
 vm.runInContext(fs.readFileSync(new URL('../server/Code.gs',import.meta.url),'utf8'),context);
 return {rows,post:body=>context.doPost({postData:{contents:JSON.stringify(body)}})};
}
const entry=()=>({id:randomUUID(),date:'2026-10-28',period:'2026-10',type:'Despesa',owner:'Casa',status:'Pago',payment:'Pix',description:'Teste de validação local',category:'Outros',amount:12.34,note:''});
function login(s){return s.post({action:'login',email:'camanodiogo@gmail.com',password:'test-secret'}).token}
test('rejects unauthenticated operations and incorrect credentials',()=>{const s=service();assert.equal(s.post({action:'append',entry:entry()}).code,'AUTH');assert.equal(s.post({action:'login',email:'unknown@example.com',password:'test-secret'}).ok,false);assert.equal(s.post({action:'login',email:'camanodiogo@gmail.com',password:'wrong'}).ok,false);assert.ok(login(s));});
test('writes once with same identifier and confirms the stored amount',()=>{const s=service(),token=login(s),x=entry();const first=s.post({action:'append',token,entry:x});assert.equal(first.ok,true);assert.equal(s.rows.length,2);assert.equal(s.rows[1][7],12.34);assert.equal(s.post({action:'append',token,entry:x}).duplicate,true);assert.equal(s.rows.length,2);});
test('rejects impossible dates, invalid owners and nonpositive amounts before writes',()=>{for(const change of [{date:'2026-02-30'},{owner:'Outro'},{amount:0}]){const s=service();assert.equal(s.post({action:'append',token:login(s),entry:{...entry(),...change}}).ok,false);assert.equal(s.rows.length,0);}});
test('escapes formula-looking descriptions',()=>{const s=service();assert.equal(s.post({action:'append',token:login(s),entry:{...entry(),description:'=IMPORTXML("bad")'}}).ok,true);assert.equal(s.rows[1][4][0],"'");});
