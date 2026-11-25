import {test} from 'node:test';import assert from 'node:assert/strict';
import {compareDeployment} from './verify-deployment.mjs';
const expected={repository:'ryangleason82/ggilabs-outpost',branch:'master',projectId:'site',commit:'a'.repeat(40),tree:'b'.repeat(40),dirty:false};
test('accepts the exact deployed source',()=>compareDeployment(expected,{...expected}));
for(const field of ['repository','branch','projectId','commit','tree','dirty'])test('rejects deployment mismatch: '+field,()=>assert.throws(()=>compareDeployment(expected,{...expected,[field]:field==='dirty'?true:'different'})));
