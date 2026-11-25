import assert from 'node:assert/strict';
import {appendFileSync} from 'node:fs';
import {deployment,verifyReleaseSource} from './provenance.mjs';
export function compareDeployment(expected,actual){
 assert.equal(actual.repository,expected.repository,'Deployed repository differs');
 assert.equal(actual.branch,expected.branch,'Deployed branch differs');
 assert.equal(actual.projectId,expected.projectId,'Deployed Site differs');
 assert.equal(actual.dirty,false,'Deployed build was dirty');
 assert.equal(actual.commit,expected.commit,'Deployed commit differs from GitHub master');
 assert.equal(actual.tree,expected.tree,'Deployed source files differ from GitHub master');
}
export async function verifyDeployment(){
 const expected=verifyReleaseSource();
 const token=process.env.OUTPOST_SITE_ACCESS_TOKEN;
 if(!token)throw new Error('Set the GitHub Actions secret OUTPOST_SITE_ACCESS_TOKEN. Verification cannot pass without authenticated live readback.');
 const url=new URL('/api/deployment',deployment.siteUrl);
 const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(30000),headers:{'OAI-Sites-Authorization':'Bearer '+token,'Cache-Control':'no-cache'}});
 if(!response.ok)throw new Error('Live deployment metadata returned HTTP '+response.status);
 const actual=await response.json();compareDeployment(expected,actual);
 // A push during verification must not produce a green check for stale master.
 compareDeployment(verifyReleaseSource(),actual);
 const message=`Verified production: ${deployment.siteUrl}\n\nGitHub commit: ${actual.commit}\n\nGit tree: ${actual.tree}\n`;
 console.log(message);if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,message);
 return actual;
}
if(process.argv[1]&&import.meta.url===new URL('file:///'+process.argv[1].replaceAll('\\','/').replace(/^\//,'')).href)verifyDeployment().catch(error=>{console.error(error.message);process.exitCode=1;});
