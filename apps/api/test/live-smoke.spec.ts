const base = process.env.API_BASE_URL;
const live = base ? describe : describe.skip;

live('live API against Neon', () => {
  jest.setTimeout(30_000);

  it('reports a healthy database', async () => {
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(expect.objectContaining({ ok: true, db: true }));
  });

  it('lists published jobs and a billing catalog', async () => {
    const [jobsRes, plansRes] = await Promise.all([
      fetch(`${base}/jobs?pageSize=3`),
      fetch(`${base}/billing/plans`),
    ]);
    expect(jobsRes.status).toBe(200);
    expect(plansRes.status).toBe(200);
    const jobs = (await jobsRes.json()) as { data: unknown[]; meta: { total: number } };
    const plans = (await plansRes.json()) as { plans: Array<{ id: string }>; checkoutMode: string };
    expect(jobs.data.length).toBeGreaterThan(0);
    expect(jobs.meta.total).toBeGreaterThan(0);
    expect(plans.plans.map((row) => row.id)).toEqual(['FREE', 'STARTER', 'GROWTH']);
  });

  it('signs in the seed employer and returns workspace billing', async () => {
    const login = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'employer.northwind@hirestack.dev',
        password: 'HireStack!2026',
      }),
    });
    expect(login.status).toBe(201);
    const session = (await login.json()) as { accessToken: string; user: { role: string; company?: { plan?: string } } };
    expect(session.user.role).toBe('EMPLOYER');
    const workspace = await fetch(`${base}/billing/workspace`, {
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    expect(workspace.status).toBe(200);
    await expect(workspace.json()).resolves.toEqual(
      expect.objectContaining({
        plan: expect.stringMatching(/FREE|STARTER|GROWTH/),
        canPublish: expect.any(Boolean),
      }),
    );
  });
});
