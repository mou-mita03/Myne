-- Add database-controlled account status for authentication and authorization.
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'DISABLED');

ALTER TABLE "User"
ADD COLUMN "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE';
