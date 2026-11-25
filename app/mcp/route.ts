import {prisma} from '@/lib/prisma';
import {runAutoChecks} from '@/lib/checker';
const tools=[
 {name:'list_clients',description:'List Outpost clients without credentials.',inputSchema:{type:'object',properties:{}}},
 {name:'list_articles',description:'Find articles and publishing status in Outpost.',inputSchema:{type:'object',properties:{clientId:{type:'string'},search:{type:'string'},limit:{type:'integer',minimum:1,maximum:100}}}},
 {name:'get_article',description:'Read an Outpost article and its editorial fields.',inputSchema:{type:'object',properties:{id:{type:'string'}},required:['id']}},
 {name:'update_article',description:'Edit article content or review notes. Does not approve or publish.',inputSchema:{type:'object',properties:{id:{type:'string'},fields:{type:'object',additionalProperties:{type:'string'}}},required:['id','fields']}},
 {name:'list_prompts',description:'List prompt templates and version metadata.',inputSchema:{type:'object',properties:{}}},
 {name:'get_prompt_version',description:'Read an exact stored prompt version.',inputSchema:{type:'object',properties:{id:{type:'string'}},required:['id']}}
];
export async function POST(request:Request){const rpc=await request.json() as {id?:string|number;method:string;params?:{name?:string;arguments?:Record<string,unknown>}};let result:unknown;
 if(rpc.method==='server/discover')result={supportedVersions:['2026-07-28'],capabilities:{tools:{}}};
 else if(rpc.method==='initialize')result={protocolVersion:'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'GGILabs Outpost',version:'1.0.0'}};
 else if(rpc.method==='notifications/initialized')return new Response(null,{status:202});
 else if(rpc.method==='tools/list')result={tools};
 else if(rpc.method==='tools/call'){try{const args=rpc.params?.arguments??{};let data:unknown;switch(rpc.params?.name){
 case 'list_clients':data=await prisma.client.findMany({select:{id:true,name:true,wpUrl:true,isDefault:true}});break;
 case 'list_articles':data=await prisma.article.findMany({where:{...(args.clientId?{clientId:String(args.clientId)}:{}),...(args.search?{postTitle:{contains:String(args.search)}}:{})},select:{id:true,clientId:true,postTitle:true,status:true,postName:true,updatedAt:true,publishedUrl:true},take:Math.max(1,Math.min(100,Number(args.limit)||50)),orderBy:{updatedAt:'desc'}});break;
 case 'get_article':data=await prisma.article.findUniqueOrThrow({where:{id:String(args.id)}});break;
 case 'update_article':{const allowed=['postTitle','postName','primaryKeyword','serviceName','locationName','heroEyebrow','heroHeading','heroSubheading','introSummary','section1Heading','section1Body','section2Heading','section2Body','section3Heading','section3Body','faq1Question','faq1Answer','faq2Question','faq2Answer','faq3Question','faq3Answer','ctaHeading','ctaBody','ctaButtonText','ctaButtonUrl','relatedHubUrl','relatedHubAnchor','metaTitle','metaDescription','reviewNotes'];const fields=args.fields as Record<string,unknown>;if(!fields||Object.entries(fields).some(([k,v])=>!allowed.includes(k)||typeof v!=='string'))throw new Error('Use supported article text fields.');
 const existing=await prisma.article.findUniqueOrThrow({where:{id:String(args.id)}});
 if(existing.templateType==='service_detail'&&Object.keys(fields).some(k=>k!=='reviewNotes'))throw new Error('Edit service-detail content in the Site editor to validate its structured payload.');
 const contentChange=Object.keys(fields).some(k=>k!=='reviewNotes');
 const checks=contentChange?runAutoChecks(Object.fromEntries(Object.entries({...existing,...fields}).map(([k,v])=>[k,String(v??'')]))):{};
 data=await prisma.article.update({where:{id:existing.id},data:{...fields,...checks,...(contentChange?{version:{increment:1},status:'uploaded'}:{})}});break;}
 case 'list_prompts':data=await prisma.promptTemplate.findMany({include:{versions:{select:{id:true,versionNumber:true,status:true,createdAt:true}}}});break;
 case 'get_prompt_version':data=await prisma.promptVersion.findUniqueOrThrow({where:{id:String(args.id)}});break;
 default:throw new Error('Unknown tool');}result={content:[{type:'text',text:JSON.stringify(data)}]};}catch(e){result={content:[{type:'text',text:String(e)}],isError:true};}}
 else return Response.json({jsonrpc:'2.0',id:rpc.id??null,error:{code:-32601,message:'Method not found'}});
 return Response.json({jsonrpc:'2.0',id:rpc.id??null,result});}
