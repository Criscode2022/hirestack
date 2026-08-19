import { PasswordService } from '../src/auth/password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes and verifies a password', async () => {
    const hash = await service.hash('HireStack!2026');
    expect(hash).not.toEqual('HireStack!2026');
    await expect(service.verify('HireStack!2026', hash)).resolves.toBe(true);
    await expect(service.verify('wrong-password', hash)).resolves.toBe(false);
  });
});
