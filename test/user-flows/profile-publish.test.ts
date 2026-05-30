import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { profilePath } from '../../src/lib/api/endpoints.ts';

describe('profile content pipeline', () => {
  it('builds profile API paths', () => {
    assert.equal(profilePath('system_user'), '/api/profile/system_user');
    assert.equal(profilePath('system_user', 'publish'), '/api/profile/system_user/publish');
    assert.equal(profilePath('system_user', 'sections'), '/api/profile/system_user/sections');
  });
});
