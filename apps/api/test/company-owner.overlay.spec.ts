import {
  attachCompanyJobMatches,
  attachCompanyOwner,
  overlayCompanyDetail,
  overlayCompanyOwner,
  shouldOverlayCompanyOwnerPath,
} from '../src/companies/company-owner.overlay';

describe('company owner overlay', () => {
  it('matches public company detail paths only', () => {
    expect(shouldOverlayCompanyOwnerPath('/api/companies/northwind-labs')).toBe(true);
    expect(shouldOverlayCompanyOwnerPath('/api/companies')).toBe(false);
    expect(shouldOverlayCompanyOwnerPath('/api/companies/northwind-labs/following')).toBe(false);
    expect(shouldOverlayCompanyOwnerPath('/api/companies/cmt1/follow')).toBe(false);
  });

  it('attaches a hiring lead from a public profile payload', () => {
    expect(
      attachCompanyOwner(
        { slug: 'northwind-labs', ownerId: 'own-1', name: 'Northwind Labs' },
        { id: 'own-1', name: 'Nora Chen', headline: 'Head of Talent at Northwind Labs' },
      ),
    ).toEqual({
      slug: 'northwind-labs',
      ownerId: 'own-1',
      name: 'Northwind Labs',
      owner: {
        id: 'own-1',
        name: 'Nora Chen',
        headline: 'Head of Talent at Northwind Labs',
      },
    });
  });

  it('leaves an existing owner object in place', () => {
    const company = {
      slug: 'northwind-labs',
      ownerId: 'own-1',
      owner: { id: 'own-1', name: 'Nora Chen', headline: 'Head of Talent' },
    };
    expect(attachCompanyOwner(company, { id: 'own-1', name: 'Other' })).toBe(company);
  });

  it('fetches the hiring lead from /api/people/:id', async () => {
    const fetchImpl: typeof fetch = async (url) => {
      expect(String(url)).toBe('https://hirestack-api.vercel.app/api/people/own-1');
      return new Response(JSON.stringify({ id: 'own-1', name: 'Nora Chen', headline: 'Head of Talent' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };
    const overlaid = (await overlayCompanyOwner(
      { slug: 'northwind-labs', ownerId: 'own-1' },
      fetchImpl,
      'https://hirestack-api.vercel.app',
    )) as { owner?: { name?: string } };
    expect(overlaid.owner?.name).toBe('Nora Chen');
  });

  it('attaches skill match onto company jobs', () => {
    const overlaid = attachCompanyJobMatches(
      {
        slug: 'northwind-labs',
        jobs: [
          {
            id: 'job_angular',
            skills: [{ slug: 'angular' }, { slug: 'rxjs' }],
          },
        ],
      },
      ['angular', 'rxjs', 'tailwind'],
    ) as { jobs: Array<{ matchPercent?: number }> };
    expect(overlaid.jobs[0]?.matchPercent).toBe(100);
  });

  it('loads the hiring lead and viewer skill match together', async () => {
    const fetchImpl: typeof fetch = async (url) => {
      const href = String(url);
      if (href.endsWith('/api/auth/me')) {
        return new Response(JSON.stringify({ id: 'cand-1' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (href.endsWith('/api/people/cand-1')) {
        return new Response(JSON.stringify({ id: 'cand-1', userSkills: [{ skill: { slug: 'angular' } }] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (href.endsWith('/api/people/own-1')) {
        return new Response(JSON.stringify({ id: 'own-1', name: 'Nora Chen', headline: 'Head of Talent' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      throw new Error(`unexpected ${href}`);
    };
    const overlaid = (await overlayCompanyDetail(
      {
        slug: 'northwind-labs',
        ownerId: 'own-1',
        jobs: [{ id: 'job_fe', skills: [{ slug: 'angular' }, { slug: 'react' }] }],
      },
      fetchImpl,
      'https://hirestack-api.vercel.app',
      'Bearer test',
    )) as { owner?: { name?: string }; jobs: Array<{ matchPercent?: number }> };
    expect(overlaid.owner?.name).toBe('Nora Chen');
    expect(overlaid.jobs[0]?.matchPercent).toBe(50);
  });
});
