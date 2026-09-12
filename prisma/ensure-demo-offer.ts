import { PrismaClient } from '@prisma/client';

const OFFER_JOB_TITLE = 'Freelance Design Systems';
const ALEX_EMAIL = 'candidate.alex@hirestack.dev';
const NORA_EMAIL = 'employer.northwind@hirestack.dev';

export async function ensureDemoOffer(prisma: PrismaClient) {
  const candidate = await prisma.user.findUnique({
    where: { email: ALEX_EMAIL },
    include: { resumes: { orderBy: { createdAt: 'desc' } } },
  });
  if (!candidate) {
    throw new Error('Alex Rivera is missing');
  }
  const existing = await prisma.application.findFirst({
    where: { candidateId: candidate.id, status: 'OFFER', deletedAt: null },
  });
  if (existing) {
    return existing;
  }
  const resume = candidate.resumes.find((row) => row.isCurrent) ?? candidate.resumes[0];
  if (!resume) {
    throw new Error('Alex Rivera has no resume');
  }
  const applied = await prisma.application.findMany({
    where: { candidateId: candidate.id, deletedAt: null },
    select: { jobId: true },
  });
  const taken = applied.map((row) => row.jobId);
  const job =
    (await prisma.job.findFirst({
      where: {
        title: OFFER_JOB_TITLE,
        deletedAt: null,
        status: 'PUBLISHED',
        ...(taken.length ? { id: { notIn: taken } } : {}),
      },
    })) ??
    (await prisma.job.findFirst({
      where: {
        deletedAt: null,
        status: 'PUBLISHED',
        company: { owner: { email: NORA_EMAIL } },
        ...(taken.length ? { id: { notIn: taken } } : {}),
      },
    }));
  if (!job) {
    throw new Error('No open job left for the Alex Rivera demo offer');
  }
  const employer = await prisma.user.findUnique({ where: { email: NORA_EMAIL } });
  if (!employer) {
    throw new Error('Nora Chen is missing');
  }

  const application = await prisma.application.create({
    data: {
      jobId: job.id,
      candidateId: candidate.id,
      resumeId: resume.id,
      coverLetter: `Glad to take Freelance Design Systems into an offer. Seeded so the candidate desk can accept or decline.`,
      status: 'OFFER',
      events: {
        create: [
          {
            fromStatus: null,
            toStatus: 'SUBMITTED',
            actorId: candidate.id,
            note: 'Application submitted',
            isPublic: true,
          },
          {
            fromStatus: 'SUBMITTED',
            toStatus: 'OFFER',
            actorId: employer.id,
            note: 'Northwind extended an offer. Accept or decline from Applications.',
            isPublic: true,
          },
        ],
      },
    },
  });

  await prisma.notification.create({
    data: {
      userId: candidate.id,
      type: 'APPLICATION_UPDATE',
      title: `${job.title} is now OFFER`,
      body: 'Northwind Labs extended an offer. Accept or decline from Applications.',
      href: '/applications',
    },
  });

  return application;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const row = await ensureDemoOffer(prisma);
    process.stdout.write(`${row.id} ${row.status} ${row.jobId}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.includes('ensure-demo-offer')) {
  void main();
}
