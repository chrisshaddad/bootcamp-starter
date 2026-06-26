-- ============================================================
-- Drop previous migration tables and schemas
-- ============================================================

DROP TABLE IF EXISTS "Organization" CASCADE;
DROP TABLE IF EXISTS "UserProfile" CASCADE;
DROP TABLE IF EXISTS "private"."MagicLink" CASCADE;
DROP TABLE IF EXISTS "private"."Session" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP TYPE IF EXISTS "UserRole";
DROP TYPE IF EXISTS "OrganizationStatus";
DROP SCHEMA IF EXISTS "private" CASCADE;

-- ============================================================
-- Extensions
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- Create tenant schema
-- ============================================================

CREATE SCHEMA IF NOT EXISTS "tenant";

-- ============================================================
-- Enums — public schema
-- ============================================================

CREATE TYPE "TenantStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'INACTIVE');
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'SUPPORT');

-- ============================================================
-- Enums — tenant schema
-- ============================================================

CREATE TYPE "tenant"."MembershipType" AS ENUM ('BASIC', 'PREMIUM', 'STUDENT', 'SENIOR');
CREATE TYPE "tenant"."MemberStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'EXPIRED');
CREATE TYPE "tenant"."StaffRole" AS ENUM ('LIBRARIAN', 'MANAGER', 'CASHIER');
CREATE TYPE "tenant"."RentalStatus" AS ENUM ('ACTIVE', 'RETURNED', 'OVERDUE', 'LOST');
CREATE TYPE "tenant"."ReservationStatus" AS ENUM ('PENDING', 'FULFILLED', 'CANCELLED', 'EXPIRED');
CREATE TYPE "tenant"."PaymentMethod" AS ENUM ('CASH', 'CARD', 'ONLINE');
CREATE TYPE "tenant"."ChatMessageRole" AS ENUM ('USER', 'ASSISTANT');

-- ============================================================
-- Tables — public schema
-- ============================================================

-- CreateTable: tenants
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "schema_name" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "contact_email" TEXT NOT NULL,
    "logo_url" TEXT,
    "settings" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable: admin_users
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable: audit_log
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "admin_user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "old_data" JSONB,
    "new_data" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- Tables — tenant schema (template, one copy per library)
-- ============================================================

-- CreateTable: tenant.categories
CREATE TABLE "tenant"."categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" INTEGER,
    "description" TEXT,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable: tenant.authors
CREATE TABLE "tenant"."authors" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "bio" TEXT,
    "nationality" TEXT,
    "birth_year" INTEGER,
    "photo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "authors_pkey" PRIMARY KEY ("id")
);

-- CreateTable: tenant.publishers
CREATE TABLE "tenant"."publishers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "contact_email" TEXT,
    "website" TEXT,
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publishers_pkey" PRIMARY KEY ("id")
);

-- CreateTable: tenant.books
CREATE TABLE "tenant"."books" (
    "id" SERIAL NOT NULL,
    "isbn" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author_id" INTEGER NOT NULL,
    "publisher_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "description" TEXT,
    "published_year" INTEGER,
    "language" TEXT,
    "page_count" INTEGER,
    "cover_url" TEXT,
    "total_copies" INTEGER NOT NULL DEFAULT 1,
    "available_copies" INTEGER NOT NULL DEFAULT 1,
    "sale_price" DECIMAL(10,2),
    "daily_rent_rate" DECIMAL(10,2),
    "is_rentable" BOOLEAN NOT NULL DEFAULT false,
    "is_purchasable" BOOLEAN NOT NULL DEFAULT true,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable: tenant.book_embeddings
CREATE TABLE "tenant"."book_embeddings" (
    "book_id" INTEGER NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "embedded_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_embeddings_pkey" PRIMARY KEY ("book_id")
);

-- CreateTable: tenant.members
CREATE TABLE "tenant"."members" (
    "id" SERIAL NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "membership_type" "tenant"."MembershipType" NOT NULL,
    "membership_start" TIMESTAMP(3) NOT NULL,
    "membership_end" TIMESTAMP(3),
    "status" "tenant"."MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "password_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable: tenant.staff
CREATE TABLE "tenant"."staff" (
    "id" SERIAL NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "tenant"."StaffRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable: tenant.rentals
CREATE TABLE "tenant"."rentals" (
    "id" SERIAL NOT NULL,
    "book_id" INTEGER NOT NULL,
    "member_id" INTEGER NOT NULL,
    "staff_id" INTEGER NOT NULL,
    "rented_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3) NOT NULL,
    "returned_at" TIMESTAMP(3),
    "status" "tenant"."RentalStatus" NOT NULL DEFAULT 'ACTIVE',
    "daily_rate" DECIMAL(10,2) NOT NULL,
    "fine_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "fine_paid" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "rentals_pkey" PRIMARY KEY ("id")
);

-- CreateTable: tenant.sales
CREATE TABLE "tenant"."sales" (
    "id" SERIAL NOT NULL,
    "book_id" INTEGER NOT NULL,
    "member_id" INTEGER,
    "staff_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "total_price" DECIMAL(10,2) NOT NULL,
    "payment_method" "tenant"."PaymentMethod" NOT NULL,
    "transaction_ref" TEXT,
    "sold_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable: tenant.reservations
CREATE TABLE "tenant"."reservations" (
    "id" SERIAL NOT NULL,
    "book_id" INTEGER NOT NULL,
    "member_id" INTEGER NOT NULL,
    "reserved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "status" "tenant"."ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "notified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: tenant.ai_chat_sessions
CREATE TABLE "tenant"."ai_chat_sessions" (
    "id" SERIAL NOT NULL,
    "member_id" INTEGER,
    "title" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: tenant.ai_chat_messages
CREATE TABLE "tenant"."ai_chat_messages" (
    "id" SERIAL NOT NULL,
    "session_id" INTEGER NOT NULL,
    "role" "tenant"."ChatMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "recommended_book_ids" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_chat_messages_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- Indexes — public schema
-- ============================================================

CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");
CREATE UNIQUE INDEX "tenants_schema_name_key" ON "tenants"("schema_name");
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");
CREATE INDEX "audit_log_tenant_id_idx" ON "audit_log"("tenant_id");
CREATE INDEX "audit_log_admin_user_id_idx" ON "audit_log"("admin_user_id");

-- ============================================================
-- Indexes — tenant schema
-- ============================================================

CREATE UNIQUE INDEX "books_isbn_key" ON "tenant"."books"("isbn");
CREATE UNIQUE INDEX "members_email_key" ON "tenant"."members"("email");
CREATE UNIQUE INDEX "staff_email_key" ON "tenant"."staff"("email");
CREATE INDEX "rentals_book_id_idx" ON "tenant"."rentals"("book_id");
CREATE INDEX "rentals_member_id_idx" ON "tenant"."rentals"("member_id");
CREATE INDEX "rentals_status_idx" ON "tenant"."rentals"("status");
CREATE INDEX "reservations_book_id_idx" ON "tenant"."reservations"("book_id");
CREATE INDEX "reservations_member_id_idx" ON "tenant"."reservations"("member_id");
CREATE INDEX "reservations_status_idx" ON "tenant"."reservations"("status");
CREATE INDEX "ai_chat_sessions_member_id_idx" ON "tenant"."ai_chat_sessions"("member_id");
CREATE INDEX "ai_chat_messages_session_id_idx" ON "tenant"."ai_chat_messages"("session_id");

-- ============================================================
-- Foreign Keys — public schema
-- ============================================================

ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_admin_user_id_fkey"
    FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- Foreign Keys — tenant schema
-- ============================================================

ALTER TABLE "tenant"."categories" ADD CONSTRAINT "categories_parent_id_fkey"
    FOREIGN KEY ("parent_id") REFERENCES "tenant"."categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tenant"."books" ADD CONSTRAINT "books_author_id_fkey"
    FOREIGN KEY ("author_id") REFERENCES "tenant"."authors"("id") ON UPDATE CASCADE;

ALTER TABLE "tenant"."books" ADD CONSTRAINT "books_publisher_id_fkey"
    FOREIGN KEY ("publisher_id") REFERENCES "tenant"."publishers"("id") ON UPDATE CASCADE;

ALTER TABLE "tenant"."books" ADD CONSTRAINT "books_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "tenant"."categories"("id") ON UPDATE CASCADE;

ALTER TABLE "tenant"."book_embeddings" ADD CONSTRAINT "book_embeddings_book_id_fkey"
    FOREIGN KEY ("book_id") REFERENCES "tenant"."books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant"."rentals" ADD CONSTRAINT "rentals_book_id_fkey"
    FOREIGN KEY ("book_id") REFERENCES "tenant"."books"("id") ON UPDATE CASCADE;

ALTER TABLE "tenant"."rentals" ADD CONSTRAINT "rentals_member_id_fkey"
    FOREIGN KEY ("member_id") REFERENCES "tenant"."members"("id") ON UPDATE CASCADE;

ALTER TABLE "tenant"."rentals" ADD CONSTRAINT "rentals_staff_id_fkey"
    FOREIGN KEY ("staff_id") REFERENCES "tenant"."staff"("id") ON UPDATE CASCADE;

ALTER TABLE "tenant"."sales" ADD CONSTRAINT "sales_book_id_fkey"
    FOREIGN KEY ("book_id") REFERENCES "tenant"."books"("id") ON UPDATE CASCADE;

ALTER TABLE "tenant"."sales" ADD CONSTRAINT "sales_member_id_fkey"
    FOREIGN KEY ("member_id") REFERENCES "tenant"."members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tenant"."sales" ADD CONSTRAINT "sales_staff_id_fkey"
    FOREIGN KEY ("staff_id") REFERENCES "tenant"."staff"("id") ON UPDATE CASCADE;

ALTER TABLE "tenant"."reservations" ADD CONSTRAINT "reservations_book_id_fkey"
    FOREIGN KEY ("book_id") REFERENCES "tenant"."books"("id") ON UPDATE CASCADE;

ALTER TABLE "tenant"."reservations" ADD CONSTRAINT "reservations_member_id_fkey"
    FOREIGN KEY ("member_id") REFERENCES "tenant"."members"("id") ON UPDATE CASCADE;

ALTER TABLE "tenant"."ai_chat_sessions" ADD CONSTRAINT "ai_chat_sessions_member_id_fkey"
    FOREIGN KEY ("member_id") REFERENCES "tenant"."members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tenant"."ai_chat_messages" ADD CONSTRAINT "ai_chat_messages_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "tenant"."ai_chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
