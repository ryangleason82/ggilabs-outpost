import { env } from 'cloudflare:workers';
export const database = () => (env as unknown as {DB:D1Database}).DB;
export function insertStatement(table:string, record:Record<string,unknown>) {
 const entries=Object.entries(record).filter(([,v])=>v!==undefined);
 return database().prepare(`INSERT INTO "${table}" (${entries.map(([k])=>'"'+k+'"').join(',')}) VALUES (${entries.map(()=>'?').join(',')})`).bind(...entries.map(([,v])=>v instanceof Date?v.getTime():typeof v==='boolean'?Number(v):v));
}
export async function createPromptAtomically(data:Record<string,unknown>,version:Record<string,unknown>){
 const id=crypto.randomUUID(), now=Date.now();
 await database().batch([
 insertStatement('PromptTemplate',{id,createdAt:now,updatedAt:now,status:'draft',createdBy:'local-operator',usageCount:0,description:'',...data}),
 insertStatement('PromptVersion',{id:crypto.randomUUID(),createdAt:now,promptTemplateId:id,versionNumber:1,status:'draft',createdBy:'local-operator',...version})]);
 return id;
}
