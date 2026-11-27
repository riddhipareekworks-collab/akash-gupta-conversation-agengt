import test from 'node:test';
import assert from 'node:assert/strict';
import {createAuth} from '../server/auth.mjs';
import {config} from './helpers.mjs';

test('Public admin accepts visitors without a cookie and replaces incoming identity headers',async()=>{
  const auth=createAuth({...config,ADMIN_ACCESS:'public'},null);
  for(const path of ['/admin','/admin/sessions','/api/admin/sessions','/api/admin/settings']){
    const result=await auth(new Request(config.APP_ORIGIN+path,{headers:{'oai-authenticated-user-email':'spoof@example.com'}}));
    assert.equal(result.response,undefined);
    assert.equal(result.request.headers.get('oai-authenticated-user-email'),config.ADMIN_OWNER_EMAIL);
  }
  const login=await auth(new Request(config.APP_ORIGIN+'/login?next=%2Fadmin%2Fsessions'));
  assert.equal(login.response.status,303);assert.equal(login.response.headers.get('Location'),'/admin/sessions');
  const external=await auth(new Request(config.APP_ORIGIN+'/login?next=https://other.example'));
  assert.equal(external.response.headers.get('Location'),'/');
});
