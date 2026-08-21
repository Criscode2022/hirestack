-- CreateEnum
CREATE TYPE "AnnouncementStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "location" TEXT,
    "workplace" "Workplace",
    "status" "AnnouncementStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnouncementApplication" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Announcement_status_createdAt_idx" ON "Announcement"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Announcement_authorId_idx" ON "Announcement"("authorId");

-- CreateIndex
CREATE INDEX "AnnouncementApplication_announcementId_createdAt_idx" ON "AnnouncementApplication"("announcementId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AnnouncementApplication_announcementId_userId_key" ON "AnnouncementApplication"("announcementId", "userId");

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementApplication" ADD CONSTRAINT "AnnouncementApplication_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementApplication" ADD CONSTRAINT "AnnouncementApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
