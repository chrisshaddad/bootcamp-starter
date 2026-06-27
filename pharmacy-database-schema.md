we will be doing the models, tables and everything in this order :

0. enums
1. medicine + ingredient
2. pharmacy + user
3. session + magic_link + pharmacy_branch
4. audit_log + stock_batch
5. medicine_ingredient + inquiry
6. inquiry_message

each numbered step above is its own isolated migration:

- one migration per step (related models grouped as shown; enums are step 0)
- each migration has its own seeder
- each migration has its own test
- each migration is its own PR

down are the tables with all the things — check them and make sure we work step by step as mentioned above
to have a clear vision.

The tables :

// ============================================================
// ENUMS (migration 0 — defined before any model)
// ============================================================

enum UserRole {
SUPER_ADMIN
PHARMACY_ADMIN
PHARMACY_MANAGER
PHARMACY_EMPLOYEE
STOCK_MANAGER
INQUIRY_OFFICER
CLIENT
}

enum UserStatus {
ACTIVE
INACTIVE
SUSPENDED
PENDING
}

enum InquiryStatus {
PENDING
IN_PROGRESS
ANSWERED
CLOSED
}

enum SenderType {
CLIENT
EMPLOYEE
}

// ============================================================
// 1. MEDICINE
// ============================================================

model Medicine {
id String @id @default(uuid())

mophId String? @db.VarChar(100)
atcCode String? @db.VarChar(20)

brandName String @db.VarChar(200)

type String? @db.VarChar(20)
dosage String? @db.VarChar(100)
form String? @db.VarChar(50)

ingredients String? @db.Text

barcode String? @unique

priceLbp Decimal? @db.Decimal(12,2)

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

stockBatches StockBatch[]
inquiries Inquiry[]
medicineIngredients MedicineIngredient[]

@@index([brandName], name: "idx_medicine_name")
@@map("medicines")
@@schema("public")
}

// ============================================================
// 2. INGREDIENT
// ============================================================

model Ingredient {
id String @id @default(uuid())

name String @unique @db.VarChar(200)

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

medicineIngredients MedicineIngredient[]

@@map("ingredients")
@@schema("public")
}

// ============================================================
// 3. PHARMACY
// ============================================================

model Pharmacy {
id String @id @default(uuid())

name String @unique @db.VarChar(150)

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

users User[]
branches PharmacyBranch[]
inquiries Inquiry[]

@@map("pharmacies")
@@schema("public")
}

// ============================================================
// 4. USER
// ============================================================

model User {
id String @id @default(uuid())

firstName String @db.VarChar(100)
lastName String @db.VarChar(100)

email String @unique @db.VarChar(255)
password String? @db.VarChar(255) // nullable — magic link users may not have a password

phoneNumber String? @db.VarChar(20)

role UserRole
status UserStatus @default(ACTIVE)

pharmacyId String?
branchId String?

dateOfBirth DateTime? @db.Date

address String? @db.Text

latitude Decimal? @db.Decimal(9,6)
longitude Decimal? @db.Decimal(9,6)

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

pharmacy Pharmacy? @relation(fields: [pharmacyId], references: [id], onDelete: Restrict)
branch PharmacyBranch? @relation(fields: [pharmacyId, branchId], references: [pharmacyId, id], onDelete: Restrict)

sessions Session[]
magicLinks MagicLink[]
inquiries Inquiry[]
messages InquiryMessage[]
auditLogs AuditLog[]

@@index([role])
@@index([status])
@@index([pharmacyId])
@@index([branchId])

@@map("users")
@@schema("public")
}

// ============================================================
// 5. SESSION
// ============================================================

model Session {
id String @id

userId String

expiresAt DateTime

createdAt DateTime @default(now())

user User @relation(fields: [userId], references: [id], onDelete: Cascade)

@@index([userId])

@@map("sessions")
@@schema("public")
}

// ============================================================
// 6. MAGIC_LINK
// ============================================================

model MagicLink {
id String @id @default(uuid())

userId String

token String @unique // securely generated random token, not a UUID

expiresAt DateTime

usedAt DateTime?

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

user User @relation(fields: [userId], references: [id], onDelete: Cascade)

@@index([userId])

@@map("magic_links")
@@schema("public")
}

// ============================================================
// 7. PHARMACY_BRANCH
// ============================================================

model PharmacyBranch {
id String @id @default(uuid())

pharmacyId String

name String @db.VarChar(150)

phoneNumber String? @db.VarChar(20)

address String @db.Text

latitude Decimal @db.Decimal(9,6)
longitude Decimal @db.Decimal(9,6)

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

pharmacy Pharmacy @relation(fields: [pharmacyId], references: [id], onDelete: Cascade)

users User[]
stockBatches StockBatch[]
inquiries Inquiry[]

@@unique([pharmacyId, id])
@@index([pharmacyId])
@@index([latitude, longitude], name: "idx_branch_location")

@@map("pharmacy_branches")
@@schema("public")
}

// ============================================================
// 8. AUDIT_LOG
// ============================================================

model AuditLog {
id String @id @default(uuid())

userId String

action String @db.VarChar(100)

entity String @db.VarChar(100)

entityId String?

details Json?

createdAt DateTime @default(now())
// no updatedAt — audit logs are immutable

user User @relation(fields: [userId], references: [id], onDelete: Cascade)

@@index([userId])

@@map("audit_logs")
@@schema("public")
}

// ============================================================
// 9. STOCK_BATCH
// ============================================================

model StockBatch {
id String @id @default(uuid())

branchId String

medicineId String

batchNumber String? @db.VarChar(100)

quantity Int @default(0)

expiryDate DateTime @db.Date

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

branch PharmacyBranch @relation(fields: [branchId], references: [id], onDelete: Cascade)

medicine Medicine @relation(fields: [medicineId], references: [id], onDelete: Cascade)

@@index([branchId])
@@index([medicineId])

@@map("stock_batches")
@@schema("public")
}

// ============================================================
// 10. MEDICINE_INGREDIENT
// ============================================================

model MedicineIngredient {
medicineId String
ingredientId String

medicine Medicine @relation(fields: [medicineId], references: [id], onDelete: Cascade)

ingredient Ingredient @relation(fields: [ingredientId], references: [id], onDelete: Cascade)

@@id([medicineId, ingredientId])

@@map("medicine_ingredients")
@@schema("public")
// no createdAt/updatedAt — junction table, immutable link
}

// ============================================================
// 11. INQUIRY
// ============================================================

model Inquiry {
id String @id @default(uuid())

clientId String

pharmacyId String

branchId String

medicineId String

status InquiryStatus @default(PENDING)

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

client User @relation(fields: [clientId], references: [id], onDelete: Cascade)

pharmacy Pharmacy @relation(fields: [pharmacyId], references: [id], onDelete: Cascade)

branch PharmacyBranch @relation(fields: [branchId], references: [id], onDelete: Cascade)

medicine Medicine @relation(fields: [medicineId], references: [id], onDelete: Cascade)

messages InquiryMessage[]

@@index([clientId])
@@index([pharmacyId])
@@index([branchId])
@@index([medicineId])

@@map("inquiries")
@@schema("public")
}

// ============================================================
// 12. INQUIRY_MESSAGE
// ============================================================

model InquiryMessage {
id String @id @default(uuid())

inquiryId String

senderId String

senderType SenderType

message String @db.Text

createdAt DateTime @default(now())
// no updatedAt — messages are immutable

inquiry Inquiry @relation(fields: [inquiryId], references: [id], onDelete: Cascade)

sender User @relation(fields: [senderId], references: [id], onDelete: Cascade)

@@index([inquiryId])
@@index([senderId])

@@map("inquiry_messages")
@@schema("public")
}
