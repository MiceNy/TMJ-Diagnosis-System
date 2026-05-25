/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Doctor` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Patient` table. All the data in the column will be lost.
  - Added the required column `accessCode` to the `Patient` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "HospitalAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Doctor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hospitalId" TEXT,
    CONSTRAINT "Doctor_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "HospitalAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Doctor" ("id", "name", "password", "username") SELECT "id", "name", "password", "username" FROM "Doctor";
DROP TABLE "Doctor";
ALTER TABLE "new_Doctor" RENAME TO "Doctor";
CREATE UNIQUE INDEX "Doctor_username_key" ON "Doctor"("username");
CREATE TABLE "new_Patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" TEXT NOT NULL,
    "accessCode" TEXT NOT NULL,
    "doctorId" TEXT,
    CONSTRAINT "Patient_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Patient" ("age", "doctorId", "gender", "id", "name") SELECT "age", "doctorId", "gender", "id", "name" FROM "Patient";
DROP TABLE "Patient";
ALTER TABLE "new_Patient" RENAME TO "Patient";
CREATE TABLE "new_Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "sensorData" TEXT NOT NULL,
    "aiStatus" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER NOT NULL,
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "doctorNotes" TEXT,
    "aiNormal" INTEGER NOT NULL DEFAULT 0,
    "aiArthritis" INTEGER NOT NULL DEFAULT 0,
    "aiDegeneration" INTEGER NOT NULL DEFAULT 0,
    "imageFront" TEXT,
    "imageRight" TEXT,
    "imageLeft" TEXT,
    CONSTRAINT "Session_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Session" ("duration", "id", "patientId", "sensorData", "startTime") SELECT "duration", "id", "patientId", "sensorData", "startTime" FROM "Session";
DROP TABLE "Session";
ALTER TABLE "new_Session" RENAME TO "Session";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "HospitalAccount_email_key" ON "HospitalAccount"("email");
