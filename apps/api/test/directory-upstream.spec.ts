import { fetchDirectoryPeople, rewriteSearchPeople } from '../src/network/directory-upstream';

describe('directory upstream assembly', () => {
  it('merges skill searches and drops empty Playwright-style rows', async () => {
    const fetchImpl = (async (url: string | URL | Request) => {
      const href = String(url);
      if (href.includes('q=Angular')) {
        return new Response(
          JSON.stringify([
            { id: 'alex', name: 'Alex Rivera', headline: 'Angular engineer', openToWork: true, skills: [{ slug: 'angular' }] },
            { id: 'pw', name: 'Playwright Candidate', headline: '', openToWork: false, skills: [] },
          ]),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify([]), { status: 200 });
    }) as typeof fetch;
    const people = await fetchDirectoryPeople(fetchImpl, 'https://hirestack-api.vercel.app');
    expect(people.map((row) => row.id)).toEqual(['alex']);
  });

  it('filters search-bundle people the same way', () => {
    const rewritten = rewriteSearchPeople({
      jobs: [{ id: 'job-1' }],
      people: [
        { id: 'alex', headline: 'Angular', skills: [{ slug: 'angular' }] },
        { id: 'pw', headline: '', skills: [] },
      ],
    });
    expect(rewritten.people.map((row) => (row as { id: string }).id)).toEqual(['alex']);
    expect(rewritten.jobs).toEqual([{ id: 'job-1' }]);
  });
});
