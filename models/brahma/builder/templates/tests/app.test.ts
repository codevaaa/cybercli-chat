import { describe, expect, it } from 'vitest';
import { healthPayload } from '../server/routes';

describe('generated full-stack app', () => {
  it('exposes a healthy backend response contract', () => {
    expect(healthPayload()).toMatchObject({ status: 'ok' });
  });
});
