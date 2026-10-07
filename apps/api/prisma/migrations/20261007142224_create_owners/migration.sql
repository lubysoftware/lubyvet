-- CreateTable
CREATE TABLE "owners" (
    "id" SERIAL NOT NULL,
    "first_name" VARCHAR(30) NOT NULL,
    "last_name" VARCHAR(30) NOT NULL,
    "address" VARCHAR(255) NOT NULL,
    "city" VARCHAR(80) NOT NULL,
    "telephone" VARCHAR(14) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "owners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "owners_last_name_idx" ON "owners"("last_name");
