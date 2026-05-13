-- CreateTable
CREATE TABLE "opportunity_unlocks" (
    "id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opportunity_unlocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "opportunity_unlocks_domain_id_idx" ON "opportunity_unlocks"("domain_id");

-- CreateIndex
CREATE UNIQUE INDEX "opportunity_unlocks_domain_id_email_key" ON "opportunity_unlocks"("domain_id", "email");

-- AddForeignKey
ALTER TABLE "opportunity_unlocks" ADD CONSTRAINT "opportunity_unlocks_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;
