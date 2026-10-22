import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {migrateSearchDefaults} from '../services/settings.mjs';

test('old default and cached provider migrate once; explicit choices survive',()=>{
  for(const saved of [{},{'search.provider':false}]) {
    saved['search.cache']={defaultEngine:'google',version:3};
    assert.equal(migrateSearchDefaults(saved),true);
    assert.equal(saved['search.provider'],'ddg');
    assert.equal(saved['search.cache'],undefined);
    saved['search.provider']='bing';saved['search.cache']={version:3};
    assert.equal(migrateSearchDefaults(saved),false);
    assert.equal(saved['search.provider'],'bing');
    assert.deepEqual(saved['search.cache'],{version:3});
  }
  const custom={'search.provider':'google'};
  migrateSearchDefaults(custom);
  assert.equal(custom['search.provider'],'google');
});

test('bundled search config uses DuckDuckGo without a SIM-dependent override',()=>{
  const config=JSON.parse(readFileSync(new URL('../overrides/shared/js/search_providers.json',import.meta.url)));
  assert.equal(config.defaultEngines.defaultEngine,'ddg');
  assert.deepEqual(config.simConfigs,{});
  assert.deepEqual(config.partnerConfig,{});
  const provider=config.search_providers.ddg.search;
  assert.equal(provider.url,'https://duckduckgo.com/');
  assert.deepEqual(provider.params,{q:'{searchTerms}'});
});
