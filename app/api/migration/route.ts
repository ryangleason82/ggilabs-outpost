import {env} from 'cloudflare:workers';
import {database,insertStatement} from '@/lib/atomic';
import {migrationStructure} from '@/lib/migration-structure';
const hash=async(bytes:ArrayBuffer)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');
type Manifest={dataHash:string;files:{key:string;sha256:string;bytes:number}[]};
async function state(){return database().prepare('SELECT * FROM "OutpostMigration" WHERE id=?').bind('initial-import').first<{state:string;manifestJson:string}>();}
export async function GET(){const s=await state();return Response.json({state:s?.state??'empty',counts:await Promise.all(Object.keys(migrationStructure).map(async table=>({table,...await database().prepare(`SELECT count(*) count FROM "${table}"`).first()})))});}
export async function POST(request:Request){
 const payload=await request.json() as {tables:Record<string,Record<string,unknown>[]>;manifest:Manifest};
 const s=await state();if(s)return Response.json({error:'Initial import already exists',state:s.state},{status:409});
 if(Object.keys(payload.tables).length!==Object.keys(migrationStructure).length)return Response.json({error:'Incomplete table set'},{status:422});
 const statements:D1PreparedStatement[]=[];
 for(const [table,columns] of Object.entries(migrationStructure)){
  const count=await database().prepare(`SELECT count(*) n FROM "${table}"`).first<{n:number}>();if(count?.n)return Response.json({error:'Destination is not empty'},{status:409});
  const rows=payload.tables[table];if(!Array.isArray(rows))return Response.json({error:'Missing table'},{status:422});
  for(const row of rows){if(Object.keys(row).length!==columns.length||Object.keys(row).some(k=>!(columns as readonly string[]).includes(k)))return Response.json({error:'Column mismatch'},{status:422});statements.push(insertStatement(table,row));}
 }
 const dataHash=await hash(new TextEncoder().encode(JSON.stringify(payload.tables)).buffer);if(dataHash!==payload.manifest.dataHash)return Response.json({error:'Data checksum mismatch'},{status:422});
 statements.push(insertStatement('OutpostMigration',{id:'initial-import',state:'files-pending',manifestJson:JSON.stringify(payload.manifest)}));
 await database().batch(statements);return Response.json({imported:true});
}
export async function PUT(request:Request){const s=await state();if(!s||s.state!=='files-pending')return Response.json({error:'File import unavailable'},{status:409});const key=new URL(request.url).searchParams.get('key');const manifest=JSON.parse(s.manifestJson) as Manifest;const expected=manifest.files.find(f=>f.key===key);if(!expected)return Response.json({error:'Unknown file'},{status:422});const bytes=await request.arrayBuffer();if(bytes.byteLength!==expected.bytes||await hash(bytes)!==expected.sha256)return Response.json({error:'File checksum mismatch'},{status:422});await (env as unknown as {BUCKET:R2Bucket}).BUCKET.put(expected.key,bytes,{httpMetadata:{contentType:request.headers.get('content-type')??'application/octet-stream'},customMetadata:{sha256:expected.sha256}});return Response.json({stored:true});}
export async function PATCH(){const s=await state();if(!s)return Response.json({error:'No import'},{status:409});const manifest=JSON.parse(s.manifestJson) as Manifest;const tables:Record<string,unknown[]>= {};for(const table of Object.keys(migrationStructure))tables[table]=(await database().prepare(`SELECT * FROM "${table}" ORDER BY id`).all()).results;const dataHash=await hash(new TextEncoder().encode(JSON.stringify(tables)).buffer);if(dataHash!==manifest.dataHash)return Response.json({error:'Record verification failed'},{status:409});for(const file of manifest.files){const object=await (env as unknown as {BUCKET:R2Bucket}).BUCKET.get(file.key);if(!object||object.size!==file.bytes||await hash(await object.arrayBuffer())!==file.sha256)return Response.json({error:'File verification failed',key:file.key},{status:409});}await database().prepare('UPDATE "OutpostMigration" SET state=? WHERE id=?').bind('verified','initial-import').run();return Response.json({verified:true,dataHash,files:manifest.files.length});}
