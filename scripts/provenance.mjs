import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
export const root=fileURLToPath(new URL('../',import.meta.url));
export const deployment=JSON.parse(readFileSync(new URL('../.openai/deployment.json',import.meta.url),'utf8'));
export const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
export function buildProvenance(command){
 if(command!=='build')return {repository:deployment.repository,branch:deployment.branch,commit:'development',tree:null,dirty:true,builtAt:null};
 if(git('status','--porcelain'))throw new Error('Build requires a clean committed checkout. Commit changes first; use npm run dev for uncommitted work.');
 return {repository:deployment.repository,branch:deployment.branch,projectId:deployment.projectId,commit:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}'),dirty:false,builtAt:new Date().toISOString()};
}
export function verifyReleaseSource(){
 const p=buildProvenance('build');
 const url='https://github.com/'+deployment.repository+'.git';
 const head=git('ls-remote',url,'refs/heads/'+deployment.branch).split(/\s+/)[0];
 if(p.commit!==head)throw new Error(`Release blocked: HEAD ${p.commit} is not GitHub ${deployment.branch} ${head}. Pull master and build again.`);
 return p;
}
