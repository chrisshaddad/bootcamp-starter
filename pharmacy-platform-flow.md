# Project Domain: Pharmacy Inquiry & Stock Management Platform

This project is a pharmacy management platform that allows pharmacies to manage medicines, stock, inquiries, and employees while allowing clients to search and communicate with pharmacies regarding medicine availability.

## Core Business Flow

### Platform Administration

The platform contains a global Admin role.

The Admin can:

- Create pharmacies
- Manage pharmacies
- View platform-wide data
- Monitor system activity

The Admin is not attached to any pharmacy.

---

### Pharmacy Structure

A Pharmacy may have:

- One branch
- Multiple branches

Even if a pharmacy only has one physical location, a branch record should still be created.

Example:

Pharmacy
└── Main Branch

All stock, inquiries, and employees are attached to branches.

---

### Pharmacy Administration

Each pharmacy has a Pharmacy Admin.

The Pharmacy Admin can:

- Manage pharmacy branches
- Create employee accounts
- Assign employee roles
- Manage pharmacy settings
- View pharmacy audit logs

The Pharmacy Admin belongs to a pharmacy but is not required to belong to a specific branch.

---

### Employee Roles

Employees belong to a pharmacy and usually to a branch.

Available roles:

#### PHARMACY_MANAGER

Responsible for:

- Overseeing branch operations
- Managing branch-level settings
- Viewing branch reports and activity

#### PHARMACY_EMPLOYEE

Responsible for:

- General branch-level tasks
- Supporting stock and inquiry operations

#### STOCK_MANAGER

Responsible for:

- Managing medicine stock
- Adding stock batches
- Updating quantities
- Managing expiry dates
- Viewing stock information

#### INQUIRY_OFFICER

Responsible for:

- Viewing inquiries
- Replying to clients
- Managing inquiry conversations
- Updating inquiry statuses

---

### Clients

Clients are regular users of the platform.

Clients can:

- Search medicines
- Submit inquiries
- Chat with pharmacies
- View inquiry history

Clients do not belong to pharmacies or branches.

---

## Authentication

The platform supports two authentication methods:

### Magic Link (Primary)

1. User enters their email address.
2. A unique one-time token is generated and stored in the MagicLink table.
3. An email is sent via BullMQ + Mailpit (local) containing the magic link.
4. User clicks the link — token is validated, marked as used, and a session is created.
5. Session is stored in the Session table and a cookie is set.

### Password (Secondary)

1. User submits email + password.
2. Password is verified against the hashed value stored on the User record.
3. On success, a session is created and a cookie is set.

### Notes

- `password` is nullable on the User model — users who only use magic link do not need a password.
- Sessions are stored in the Session table with an expiry date.
- Both flows produce the same session cookie (`bootcamp_starter_session`, HttpOnly, 30-day TTL).
- Magic link tokens are single-use and expire after a set duration.

---

## Medicine Management

Medicines are shared globally.

A medicine may contain:

- Brand name
- Barcode
- Form
- Dosage
- Price
- Ingredients

When a barcode is scanned:

1. Search for the medicine.
2. If found, use the existing medicine record.
3. If not found, create a new medicine record.
4. Add stock to a branch.

---

## Stock Management

Stock is managed using StockBatch records.

There is no separate Stock table.

Each StockBatch contains:

- Branch
- Medicine
- Batch Number
- Quantity
- Expiry Date

Example:

Panadol
├── Batch A
├── Batch B
└── Batch C

Total stock is calculated from all batches.

---

## Inquiry Flow

Client
→ Creates Inquiry
→ Selects Medicine
→ Selects Pharmacy / Branch

Inquiry Officer
→ Views Inquiry
→ Replies

Conversation messages are stored in InquiryMessage.

Each Inquiry can contain multiple messages.

---

## Audit Logging

Every action performed by authenticated users should be logged.

Examples:

- Create Medicine
- Update Medicine
- Add Stock Batch
- Update Stock Batch
- Delete Stock Batch
- Create Employee
- Reply to Inquiry

AuditLog is generic and not tied to a specific table.

AuditLog stores:

- User
- Action
- Entity
- EntityId
- Details
- Timestamp

---

## Database Design

Main Entities:

- User
- Session
- MagicLink
- Pharmacy
- PharmacyBranch
- Medicine
- Ingredient
- MedicineIngredient
- StockBatch
- Inquiry
- InquiryMessage
- AuditLog

Enums:

### UserRole

- SUPER_ADMIN
- PHARMACY_ADMIN
- PHARMACY_MANAGER
- PHARMACY_EMPLOYEE
- STOCK_MANAGER
- INQUIRY_OFFICER
- CLIENT

### UserStatus

- ACTIVE
- INACTIVE
- SUSPENDED
- PENDING

### InquiryStatus

- PENDING
- IN_PROGRESS
- ANSWERED
- CLOSED

### SenderType

- CLIENT
- EMPLOYEE

## Development Rules

- All Prisma models belong to the public schema.
- Every mutable model should contain createdAt and updatedAt.
- Immutable records (AuditLog, InquiryMessage, MagicLink, Session) only have createdAt.
- Use UUID primary keys except where auto-increment is explicitly required (Medicine uses Int auto-increment).
- All API request and response contracts must be defined inside packages/contracts.
- Database access must go through DatabaseService.
- Controllers should remain thin and delegate logic to services.
- Business authorization should be enforced using roles and guards.
- Audit logs should be created for important write operations.
