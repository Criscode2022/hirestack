import { PrismaClient } from '@prisma/client';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const EMPLOYER_PROFILES = [
  {
    email: 'employer.northwind@hirestack.dev',
    bio: 'Head of Talent at Northwind Labs. I hire operators who can ship a guarded pipeline, not a spreadsheet. Talk to me about Angular, design systems, and people who review PRs like they mean it.',
    experience: {
      title: 'Head of Talent',
      companyName: 'Northwind Labs',
      location: 'Austin, TX',
      startDate: new Date('2021-03-01'),
      isCurrent: true,
      description: 'Own recruiting for product and platform. Northwind runs HireStack as the hiring desk of record.',
    },
    education: {
      school: 'University of Texas at Austin',
      degree: 'B.A.',
      field: 'Psychology',
      startYear: 2008,
      endYear: 2012,
    },
    project: {
      title: 'Northwind hiring OS',
      description: 'Moved Northwind off a shared spreadsheet and onto a legal application pipeline.',
    },
    skills: ['Product Management', 'Figma'],
  },
  {
    email: 'employer.atlas@hirestack.dev',
    bio: 'Founder at Atlas Freight. I hire people who can keep freight moving without turning ops into theater.',
    experience: {
      title: 'Founder',
      companyName: 'Atlas Freight',
      location: 'Chicago, IL',
      startDate: new Date('2016-04-01'),
      isCurrent: true,
      description: 'Built a mid-market freight network. Hiring is the bottleneck I still own.',
    },
    education: {
      school: 'Northwestern University',
      degree: 'B.S.',
      field: 'Industrial Engineering',
      startYear: 2006,
      endYear: 2010,
    },
    project: {
      title: 'Atlas operator desk',
      description: 'Stood up a hiring desk so ops and engineering share one pipeline.',
    },
    skills: ['Product Management', 'SQL'],
  },
  {
    email: 'employer.lumen@hirestack.dev',
    bio: 'COO at Lumen Studio. I hire design-systems people who can work in regulated product without slowing the craft.',
    experience: {
      title: 'Chief Operating Officer',
      companyName: 'Lumen Studio',
      location: 'London, UK',
      startDate: new Date('2019-06-01'),
      isCurrent: true,
      description: 'Run delivery and hiring for regulated product design.',
    },
    education: {
      school: 'University College London',
      degree: 'B.A.',
      field: 'Graphic Communication',
      startYear: 2007,
      endYear: 2010,
    },
    project: {
      title: 'Lumen design-systems hiring',
      description: 'Opened a public pipeline so candidates can see the same stages we do.',
    },
    skills: ['Figma', 'Product Management'],
  },
] as const;

async function skillId(prisma: PrismaClient, name: string) {
  const slug = slugify(name);
  const row = await prisma.skill.upsert({
    where: { slug },
    update: { name },
    create: { name, slug },
  });
  return row.id;
}

export async function ensureDemoProfiles(prisma: PrismaClient) {
  for (const profile of EMPLOYER_PROFILES) {
    const user = await prisma.user.findUnique({
      where: { email: profile.email },
      include: { company: true, experiences: true, education: true, projects: true, userSkills: true },
    });
    if (!user) {
      continue;
    }
    if (!user.bio?.trim()) {
      await prisma.user.update({ where: { id: user.id }, data: { bio: profile.bio } });
    }
    if (!user.experiences.some((row) => row.companyName === profile.experience.companyName)) {
      await prisma.experience.create({
        data: { userId: user.id, ...profile.experience },
      });
    }
    if (!user.education.some((row) => row.school === profile.education.school)) {
      await prisma.education.create({
        data: { userId: user.id, ...profile.education },
      });
    }
    if (!user.projects.some((row) => row.title === profile.project.title)) {
      await prisma.project.create({
        data: { userId: user.id, ...profile.project },
      });
    }
    for (const skillName of profile.skills) {
      const id = await skillId(prisma, skillName);
      await prisma.userSkill.upsert({
        where: { userId_skillId: { userId: user.id, skillId: id } },
        update: {},
        create: { userId: user.id, skillId: id },
      });
    }
  }
}

async function main() {
  const prisma = new PrismaClient();
  try {
    await ensureDemoProfiles(prisma);
    process.stdout.write('demo hiring-lead profiles ready\n');
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.includes('ensure-demo-profiles')) {
  void main();
}
