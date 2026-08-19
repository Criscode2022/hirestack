import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const PASSWORD = 'HireStack!2026';

const SKILL_NAMES = [
  'TypeScript',
  'Angular',
  'NestJS',
  'Postgres',
  'Prisma',
  'Tailwind',
  'RxJS',
  'Node.js',
  'Python',
  'Go',
  'Kubernetes',
  'AWS',
  'Docker',
  'GraphQL',
  'Redis',
  'React',
  'Vue',
  'Java',
  'Kotlin',
  'Swift',
  'Figma',
  'Product Management',
  'SQL',
  'Terraform',
  'CI/CD',
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function main() {
  await prisma.applicationEvent.deleteMany();
  await prisma.application.deleteMany();
  await prisma.savedJob.deleteMany();
  await prisma.savedSearch.deleteMany();
  await prisma.jobReport.deleteMany();
  await prisma.jobSkill.deleteMany();
  await prisma.userSkill.deleteMany();
  await prisma.resume.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.job.deleteMany();
  await prisma.company.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const skills = await Promise.all(
    SKILL_NAMES.map((name) =>
      prisma.skill.create({
        data: { name, slug: slugify(name) },
      }),
    ),
  );
  const skillByName = Object.fromEntries(skills.map((s) => [s.name, s]));

  const admin = await prisma.user.create({
    data: {
      email: 'admin@hirestack.dev',
      passwordHash,
      role: 'ADMIN',
      name: 'Avery Admin',
      headline: 'Marketplace steward',
      location: 'Remote',
      status: 'ACTIVE',
    },
  });

  const employers = await Promise.all(
    [
      {
        email: 'employer.northwind@hirestack.dev',
        name: 'Nora Chen',
        headline: 'Head of Talent at Northwind Labs',
        location: 'Austin, TX',
        company: {
          name: 'Northwind Labs',
          slug: 'northwind-labs',
          website: 'https://northwind.example',
          description:
            'Applied ML studio shipping production models for logistics and climate tech.',
        },
      },
      {
        email: 'employer.atlas@hirestack.dev',
        name: 'Marcus Hale',
        headline: 'Founder, Atlas Freight',
        location: 'Chicago, IL',
        company: {
          name: 'Atlas Freight',
          slug: 'atlas-freight',
          website: 'https://atlasfreight.example',
          description: 'Modern freight network for mid-market shippers across North America.',
        },
      },
      {
        email: 'employer.lumen@hirestack.dev',
        name: 'Priya Shah',
        headline: 'COO, Lumen Studio',
        location: 'London, UK',
        company: {
          name: 'Lumen Studio',
          slug: 'lumen-studio',
          website: 'https://lumen.example',
          description: 'Product design and frontend engineering for regulated industries.',
        },
      },
    ].map((row) =>
      prisma.user.create({
        data: {
          email: row.email,
          passwordHash,
          role: 'EMPLOYER',
          name: row.name,
          headline: row.headline,
          location: row.location,
          company: { create: row.company },
        },
        include: { company: true },
      }),
    ),
  );

  const candidateSeeds = [
    ['candidate.alex@hirestack.dev', 'Alex Rivera', 'Angular engineer', 'Denver, CO', ['TypeScript', 'Angular', 'RxJS', 'Tailwind']],
    ['candidate.jamie@hirestack.dev', 'Jamie Ortiz', 'NestJS backend', 'Miami, FL', ['TypeScript', 'NestJS', 'Postgres', 'Prisma']],
    ['candidate.sam@hirestack.dev', 'Sam Okonkwo', 'Full-stack contractor', 'Remote', ['TypeScript', 'Angular', 'NestJS', 'Docker']],
    ['candidate.riley@hirestack.dev', 'Riley Cho', 'Staff frontend', 'Seattle, WA', ['Angular', 'TypeScript', 'RxJS', 'Figma']],
    ['candidate.morgan@hirestack.dev', 'Morgan Ellis', 'Platform engineer', 'Boston, MA', ['Go', 'Kubernetes', 'AWS', 'Terraform']],
    ['candidate.casey@hirestack.dev', 'Casey Nguyen', 'Data + SQL', 'Toronto, CA', ['Python', 'SQL', 'Postgres', 'Redis']],
    ['candidate.drew@hirestack.dev', 'Drew Patel', 'Mobile + API', 'Austin, TX', ['Kotlin', 'Swift', 'Node.js', 'GraphQL']],
    ['candidate.quinn@hirestack.dev', 'Quinn Adler', 'Product-minded engineer', 'Berlin, DE', ['React', 'Vue', 'TypeScript', 'Product Management']],
  ] as const;

  const candidates = [];
  for (const [email, name, headline, location, skillNames] of candidateSeeds) {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'CANDIDATE',
        name,
        headline,
        location,
        bio: `${name} is looking for high-ownership roles. Seeded HireStack profile.`,
        desiredSalaryMin: 90000,
        desiredSalaryMax: 180000,
        workAuthorization: 'US_CITIZEN',
        userSkills: {
          create: skillNames.map((skillName) => ({
            skillId: skillByName[skillName]!.id,
          })),
        },
        resumes: {
          create: {
            fileUrl: 'https://blob.vercel-storage.com/seed/resume.pdf',
            fileName: `${slugify(name)}-resume.pdf`,
            mimeType: 'application/pdf',
            sizeBytes: 120_000,
            isCurrent: true,
          },
        },
      },
      include: { resumes: true },
    });
    candidates.push(user);
  }

  const companies = employers.map((e) => e.company!);
  const [northwind, atlas, lumen] = companies;

  const jobDefs: Array<{
    companyId: string;
    title: string;
    employmentType: Prisma.JobCreateInput['employmentType'];
    workplace: Prisma.JobCreateInput['workplace'];
    location: string | null;
    seniority: Prisma.JobCreateInput['seniority'];
    salaryMin: number;
    salaryMax: number;
    skills: string[];
    daysAgo: number;
  }> = [
    { companyId: northwind.id, title: 'Senior Angular Engineer', employmentType: 'FULL_TIME', workplace: 'HYBRID', location: 'Austin, TX', seniority: 'SENIOR', salaryMin: 160000, salaryMax: 200000, skills: ['Angular', 'TypeScript', 'RxJS'], daysAgo: 2 },
    { companyId: northwind.id, title: 'NestJS Platform Engineer', employmentType: 'FULL_TIME', workplace: 'REMOTE', location: null, seniority: 'MID', salaryMin: 140000, salaryMax: 175000, skills: ['NestJS', 'Postgres', 'Prisma'], daysAgo: 5 },
    { companyId: northwind.id, title: 'ML Infra Contractor', employmentType: 'CONTRACT', workplace: 'REMOTE', location: null, seniority: 'STAFF', salaryMin: 120, salaryMax: 180, skills: ['Python', 'AWS', 'Kubernetes'], daysAgo: 8 },
    { companyId: northwind.id, title: 'Frontend Intern', employmentType: 'PART_TIME', workplace: 'ONSITE', location: 'Austin, TX', seniority: 'INTERN', salaryMin: 30, salaryMax: 40, skills: ['TypeScript', 'Angular', 'Tailwind'], daysAgo: 1 },
    { companyId: northwind.id, title: 'Freelance Design Systems', employmentType: 'FREELANCE', workplace: 'REMOTE', location: null, seniority: 'SENIOR', salaryMin: 90, salaryMax: 140, skills: ['Figma', 'Angular', 'Tailwind'], daysAgo: 12 },
    { companyId: northwind.id, title: 'Junior TypeScript Developer', employmentType: 'FULL_TIME', workplace: 'HYBRID', location: 'Austin, TX', seniority: 'JUNIOR', salaryMin: 95000, salaryMax: 120000, skills: ['TypeScript', 'Node.js', 'SQL'], daysAgo: 4 },
    { companyId: atlas.id, title: 'Go Logistics Engineer', employmentType: 'FULL_TIME', workplace: 'ONSITE', location: 'Chicago, IL', seniority: 'MID', salaryMin: 135000, salaryMax: 165000, skills: ['Go', 'Postgres', 'Redis'], daysAgo: 3 },
    { companyId: atlas.id, title: 'Staff Platform Engineer', employmentType: 'FULL_TIME', workplace: 'HYBRID', location: 'Chicago, IL', seniority: 'STAFF', salaryMin: 190000, salaryMax: 230000, skills: ['Kubernetes', 'AWS', 'Terraform'], daysAgo: 9 },
    { companyId: atlas.id, title: 'Contract Data Engineer', employmentType: 'CONTRACT', workplace: 'REMOTE', location: null, seniority: 'SENIOR', salaryMin: 100, salaryMax: 150, skills: ['Python', 'SQL', 'AWS'], daysAgo: 6 },
    { companyId: atlas.id, title: 'Freelance Integrations', employmentType: 'FREELANCE', workplace: 'REMOTE', location: null, seniority: 'MID', salaryMin: 70, salaryMax: 110, skills: ['Node.js', 'GraphQL', 'Postgres'], daysAgo: 15 },
    { companyId: atlas.id, title: 'Junior Operations Analyst', employmentType: 'FULL_TIME', workplace: 'ONSITE', location: 'Chicago, IL', seniority: 'JUNIOR', salaryMin: 70000, salaryMax: 90000, skills: ['SQL', 'Python', 'Product Management'], daysAgo: 7 },
    { companyId: atlas.id, title: 'DevOps Contractor', employmentType: 'CONTRACT', workplace: 'HYBRID', location: 'Chicago, IL', seniority: 'SENIOR', salaryMin: 110, salaryMax: 160, skills: ['Docker', 'CI/CD', 'Terraform'], daysAgo: 11 },
    { companyId: lumen.id, title: 'Senior Product Designer', employmentType: 'FULL_TIME', workplace: 'HYBRID', location: 'London, UK', seniority: 'SENIOR', salaryMin: 95000, salaryMax: 125000, skills: ['Figma', 'Product Management', 'Angular'], daysAgo: 2 },
    { companyId: lumen.id, title: 'Angular Design Engineer', employmentType: 'FULL_TIME', workplace: 'REMOTE', location: null, seniority: 'MID', salaryMin: 110000, salaryMax: 140000, skills: ['Angular', 'Tailwind', 'TypeScript'], daysAgo: 4 },
    { companyId: lumen.id, title: 'Freelance Vue Specialist', employmentType: 'FREELANCE', workplace: 'REMOTE', location: null, seniority: 'SENIOR', salaryMin: 85, salaryMax: 130, skills: ['Vue', 'TypeScript', 'Tailwind'], daysAgo: 10 },
    { companyId: lumen.id, title: 'React Migration Contractor', employmentType: 'CONTRACT', workplace: 'HYBRID', location: 'London, UK', seniority: 'MID', salaryMin: 80, salaryMax: 120, skills: ['React', 'TypeScript', 'CI/CD'], daysAgo: 13 },
    { companyId: lumen.id, title: 'iOS Engineer', employmentType: 'FULL_TIME', workplace: 'ONSITE', location: 'London, UK', seniority: 'SENIOR', salaryMin: 100000, salaryMax: 135000, skills: ['Swift', 'GraphQL', 'CI/CD'], daysAgo: 6 },
    { companyId: lumen.id, title: 'Android Engineer', employmentType: 'FULL_TIME', workplace: 'HYBRID', location: 'London, UK', seniority: 'MID', salaryMin: 85000, salaryMax: 115000, skills: ['Kotlin', 'GraphQL', 'Java'], daysAgo: 8 },
    { companyId: lumen.id, title: 'Junior Frontend', employmentType: 'PART_TIME', workplace: 'REMOTE', location: null, seniority: 'JUNIOR', salaryMin: 40000, salaryMax: 55000, skills: ['TypeScript', 'Angular', 'Tailwind'], daysAgo: 1 },
    { companyId: northwind.id, title: 'Postgres Reliability Engineer', employmentType: 'FULL_TIME', workplace: 'REMOTE', location: null, seniority: 'STAFF', salaryMin: 185000, salaryMax: 220000, skills: ['Postgres', 'SQL', 'Kubernetes'], daysAgo: 3 },
  ];

  const jobs = [];
  for (const def of jobDefs) {
    const publishedAt = new Date();
    publishedAt.setDate(publishedAt.getDate() - def.daysAgo);
    const job = await prisma.job.create({
      data: {
        companyId: def.companyId,
        title: def.title,
        slug: `${slugify(def.title)}-${def.companyId.slice(-4)}`,
        descriptionMd: [
          `## About the role`,
          ``,
          `We are hiring a **${def.title}** to join a high-ownership team.`,
          ``,
          `### What you will do`,
          `- Ship production features weekly`,
          `- Pair with design and backend`,
          `- Raise the quality bar for code review`,
          ``,
          `### Stack`,
          def.skills.map((s) => `- ${s}`).join('\n'),
        ].join('\n'),
        employmentType: def.employmentType,
        workplace: def.workplace,
        location: def.location,
        salaryMin: def.salaryMin,
        salaryMax: def.salaryMax,
        seniority: def.seniority,
        status: 'PUBLISHED',
        publishedAt,
        skills: {
          create: def.skills.map((name, index) => ({
            skillId: skillByName[name]!.id,
            weight: index === 0 ? 'REQUIRED' : 'NICE_TO_HAVE',
          })),
        },
      },
    });
    jobs.push(job);
  }

  const statuses = [
    'SUBMITTED',
    'REVIEWING',
    'INTERVIEW',
    'OFFER',
    'HIRED',
    'REJECTED',
    'WITHDRAWN',
    'SUBMITTED',
    'REVIEWING',
    'INTERVIEW',
    'SUBMITTED',
    'REVIEWING',
    'REJECTED',
    'OFFER',
    'SUBMITTED',
    'REVIEWING',
    'INTERVIEW',
    'SUBMITTED',
  ] as const;

  for (let i = 0; i < statuses.length; i += 1) {
    const candidate = candidates[i % candidates.length]!;
    const job = jobs[i % jobs.length]!;
    const resume = candidate.resumes[0]!;
    const status = statuses[i]!;
    try {
      const application = await prisma.application.create({
        data: {
          jobId: job.id,
          candidateId: candidate.id,
          resumeId: resume.id,
          coverLetter: `Excited to apply for ${job.title}. Seeded application ${i + 1}.`,
          status,
          withdrawnAt: status === 'WITHDRAWN' ? new Date() : null,
          events: {
            create: {
              fromStatus: null,
              toStatus: 'SUBMITTED',
              actorId: candidate.id,
              note: 'Application submitted',
              isPublic: true,
            },
          },
        },
      });
      if (status !== 'SUBMITTED') {
        await prisma.applicationEvent.create({
          data: {
            applicationId: application.id,
            fromStatus: 'SUBMITTED',
            toStatus: status,
            actorId: status === 'WITHDRAWN' ? candidate.id : employers[0]!.id,
            note: status === 'REJECTED' ? 'Not a fit for this cycle' : 'Pipeline update',
            isPublic: status === 'REJECTED' || status === 'WITHDRAWN',
          },
        });
      }
    } catch {
      // unique (job, candidate) collisions are fine for seed density
    }
  }

  await prisma.savedJob.create({
    data: { userId: candidates[0]!.id, jobId: jobs[0]!.id },
  });
  await prisma.savedSearch.create({
    data: {
      userId: candidates[0]!.id,
      name: 'Remote Angular',
      queryJson: { q: 'Angular', workplace: 'REMOTE', sort: 'newest' },
    },
  });
  await prisma.jobReport.create({
    data: {
      jobId: jobs[2]!.id,
      reporterId: candidates[1]!.id,
      reason: 'Salary looks like hourly but listed as full-time.',
      status: 'OPEN',
    },
  });

  const counts = {
    users: await prisma.user.count(),
    companies: await prisma.company.count(),
    jobs: await prisma.job.count(),
    applications: await prisma.application.count(),
    skills: await prisma.skill.count(),
    admin: admin.email,
  };
  process.stdout.write(`Seeded ${JSON.stringify(counts)}\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
