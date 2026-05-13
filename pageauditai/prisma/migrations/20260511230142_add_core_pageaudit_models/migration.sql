-- CreateTable
CREATE TABLE "domains" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keywords" (
    "id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "current_rank" INTEGER,
    "previous_rank" INTEGER,
    "search_volume" INTEGER,
    "keyword_difficulty" INTEGER,
    "opportunity_score" INTEGER,
    "last_refreshed_at" TIMESTAMP(3),
    "next_refresh_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keyword_history" (
    "id" TEXT NOT NULL,
    "keyword_id" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "keyword_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_limits" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "max_domains" INTEGER NOT NULL,
    "max_keywords" INTEGER NOT NULL,
    "monthly_opportunity_credits" INTEGER NOT NULL,
    "used_opportunity_credits" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "plan_limits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "domains_user_id_idx" ON "domains"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "domains_user_id_name_key" ON "domains"("user_id", "name");

-- CreateIndex
CREATE INDEX "keywords_domain_id_idx" ON "keywords"("domain_id");

-- CreateIndex
CREATE INDEX "keywords_next_refresh_at_idx" ON "keywords"("next_refresh_at");

-- CreateIndex
CREATE UNIQUE INDEX "keywords_domain_id_term_key" ON "keywords"("domain_id", "term");

-- CreateIndex
CREATE INDEX "keyword_history_keyword_id_captured_at_idx" ON "keyword_history"("keyword_id", "captured_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "plan_limits_user_id_key" ON "plan_limits"("user_id");

-- AddForeignKey
ALTER TABLE "domains" ADD CONSTRAINT "domains_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keywords" ADD CONSTRAINT "keywords_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keyword_history" ADD CONSTRAINT "keyword_history_keyword_id_fkey" FOREIGN KEY ("keyword_id") REFERENCES "keywords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_limits" ADD CONSTRAINT "plan_limits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
