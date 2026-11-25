import {database} from '@/lib/atomic';
import {migrationStructure} from '@/lib/migration-structure';
import {env} from 'cloudflare:workers';
export async function GET(){const tables:Record<string,unknown[]>={};for(const table of Object.keys(migrationStructure))tables[table]=(await database().prepare(`SELECT * FROM "${table}" ORDER BY id`).all()).results;
const files:{key:string;size:number}[]=[];let cursor:string|undefined;do{const list=await (env as unknown as {BUCKET:R2Bucket}).BUCKET.list({prefix:'uploads/',cursor});files.push(...list.objects.map(o=>({key:o.key,size:o.size})));cursor=list.truncated?list.cursor:undefined;}while(cursor);
return Response.json({format:'outpost-backup-v1',exportedAt:new Date().toISOString(),tables,files},{headers:{'content-disposition':'attachment; filename="outpost-records-backup.json"','cache-control':'no-store'}});}
