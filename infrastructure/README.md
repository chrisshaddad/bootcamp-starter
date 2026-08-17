# AWS infrastructure with Pulumi

This TypeScript Pulumi project deploys Deployfolio's cost-conscious AWS production environment. It uses the smallest practical single-instance resources and avoids NAT Gateways, replicas, Multi-AZ databases, and always-on observability add-ons.

## Architecture

- A VPC with exactly two public subnets in two Availability Zones and no NAT Gateway.
- AWS Amplify `WEB_COMPUTE` for the Next.js app in `apps/web`. The root `amplify.yml` is used with `appRoot: apps/web`, and only the configured repository and branch trigger automatic deployments.
- An ECS Express Gateway Service for the NestJS API with one Fargate task, 256 CPU units, 512 MiB memory, min/max capacity of one, HTTPS, and port 3001.
- An immutable ECR repository whose lifecycle policy retains the newest 10 images.
- Single-AZ RDS PostgreSQL 18 on `db.t4g.micro` with 20 GiB gp3 storage. Optional administrator access accepts one exact IPv4 `/32` only.
- One encrypted `cache.t4g.micro` Valkey node with no replica. This one service backs sessions, application caching, and BullMQ; there is no separate queue service.
- Secrets Manager JSON-key injection into the ECS task.
- A private S3 media bucket fronted by CloudFront Origin Access Control.
- Optional Route 53 application/media hostnames. CloudFront certificates are created through a dedicated `us-east-1` provider because ACM certificates used by CloudFront must be in that region; the rest of the stack defaults to `us-west-2`.
- Least-privilege task IAM and an optional AWS Budget alert.

`runtimeEnabled=false` removes ECS Express and the disposable Valkey node while preserving protected RDS, S3, ECR, Amplify, and CloudFront resources. Valkey data, sessions, and pending BullMQ jobs are lost when it is removed.

## Prerequisites

- Node.js 24, Docker Desktop, the AWS CLI, and the Pulumi CLI.
- AWS credentials for the target account; an AWS SSO profile is preferable to long-lived keys.
- A Pulumi backend, such as Pulumi Cloud or a deliberately managed self-hosted backend.
- An Amplify GitHub access token/App installation restricted to `https://github.com/AmzBG/Deployfolio`.
- A GitHub OAuth App for application users.
- An OpenAI API key.
- A verified Brevo sender or domain and a Brevo API key. Pulumi consumes these values but does not create or verify the external accounts.

## Configure a production stack

Run these commands from `infrastructure/`:

```bash
npm install
pulumi login
pulumi stack init production
cp .env.infrastructure.example .env.infrastructure
```

The project already defaults to AWS `us-west-2`, repository `https://github.com/AmzBG/Deployfolio`, and branch `main`, so no commands are needed for those defaults.

Populate the ignored `.env.infrastructure` file:

```dotenv
AMPLIFY_GITHUB_ACCESS_TOKEN=
DATABASE_PASSWORD=
DATABASE_ADMIN_CIDR=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_TOKEN=
GITHUB_TOKEN_ENCRYPTION_KEY=
ANALYTICS_HASH_SECRET=
OPENAI_API_KEY=
BREVO_API_KEY=
BREVO_SENDER_EMAIL=
BREVO_SENDER_NAME=Deployfolio
```

Required values are the Amplify token, GitHub OAuth client ID/secret, OpenAI key, Brevo key, and verified Brevo sender email. `DATABASE_PASSWORD`, `GITHUB_TOKEN_ENCRYPTION_KEY`, and `ANALYTICS_HASH_SECRET` may be left empty; Pulumi creates cryptographically random values. `GITHUB_TOKEN` is optional. `DATABASE_ADMIN_CIDR` is optional and, when present, must be your current public IPv4 address followed by `/32`—never `0.0.0.0/0`.

The local `.env.infrastructure` file is plaintext. It is ignored by Git and must never be committed, shared, logged, or copied into an image. Values read from its secret fields are wrapped as Pulumi secrets, so their representations in Pulumi state are encrypted by the stack's secrets provider. State remains sensitive and must still be access-controlled and backed up.

Pulumi stack configuration overrides matching values from `.env.infrastructure`. Encrypted stack secrets are an alternative to the env file, for example:

```bash
pulumi config set --secret githubAccessToken YOUR_AMPLIFY_GITHUB_TOKEN
pulumi config set githubClientId YOUR_GITHUB_OAUTH_CLIENT_ID
pulumi config set --secret githubClientSecret YOUR_GITHUB_OAUTH_CLIENT_SECRET
pulumi config set --secret openaiApiKey YOUR_OPENAI_API_KEY
pulumi config set --secret brevoApiKey YOUR_BREVO_API_KEY
pulumi config set brevoSenderEmail no-reply@example.com
pulumi config set brevoSenderName Deployfolio
```

Never place secret values in `Pulumi.production.yaml`. The committed `Pulumi.production.yaml.example` contains only non-secret examples.

## Preview and deploy

Review a preview before making any AWS changes:

```bash
npm run check-types
npm run format:check
pulumi preview --diff
```

Only after the preview has been reviewed:

```bash
pulumi up
```

`pulumi up` builds `apps/api/Dockerfile` for Linux AMD64, pushes the selected immutable tag to ECR, applies committed Prisma migrations before Nest starts, and waits for ECS Express to become healthy. Docker must be running.

Get the generated endpoints with:

```bash
pulumi stack output frontendUrl
pulumi stack output apiUrl
pulumi stack output mediaUrl
```

Set the GitHub OAuth callback URL to `<frontendUrl>/api/github/callback`. Next.js proxies same-origin `/api/*` requests to the ECS origin through `API_ORIGIN`; this keeps session cookies compatible with both default AWS hostnames and future custom domains.

## Optional settings

To expose RDS temporarily to your current IP:

```bash
pulumi config set databaseAdminCidr 203.0.113.10/32
```

Remove that setting when direct database administration is finished.

For custom domains, the domain must have a public Route 53 hosted zone in the same AWS account:

```bash
pulumi config set domainName example.com
pulumi config set hostedZoneId Z0123456789ABCDEF
pulumi config set appSubdomain app
pulumi config set mediaSubdomain media
```

This produces `https://app.example.com` and `https://media.example.com`. Amplify manages the application certificate; the CloudFront certificate alone uses ACM in `us-east-1`.

For a budget alert:

```bash
pulumi config set monthlyBudgetUsd 15
pulumi config set budgetAlertEmail you@example.com
```

The budget alerts but does not stop resources automatically.

## Deploy new API versions

ECR tags are immutable. Increment the tag whenever API or production-image content changes:

```bash
pulumi config set imageTag v2
pulumi preview --diff
pulumi up
```

The lifecycle policy retains the newest 10 images. Reusing an existing tag with different content fails intentionally. Frontend pushes to the configured `main` branch deploy automatically through Amplify.

## Pause and resume the runtime

To remove ECS Express and Valkey while retaining protected data and static/frontend infrastructure:

```bash
pulumi config set runtimeEnabled false
pulumi preview --diff
pulumi up
pulumi stack output pauseDatabaseCommand
```

Run the printed command separately if you also want to stop RDS compute. RDS still charges for storage/backups and AWS automatically restarts a stopped instance after seven consecutive days.

Resume in this order:

```bash
pulumi stack output resumeDatabaseCommand
# Run the command and wait for RDS to become available.
pulumi config set runtimeEnabled true
pulumi config set imageTag vNEXT
pulumi preview --diff
pulumi up
```

For a permanent teardown, take and verify a manual RDS snapshot first. Data resources are protected by default; changing `protectData` or `forceDestroy` can enable irreversible deletion and must be reviewed separately.

## Existing AWS resources

Pulumi does not automatically adopt resources created in the AWS console. See [IMPORTING_EXISTING_AWS.md](IMPORTING_EXISTING_AWS.md) before doing anything with an existing environment. Never run imports or an update until a complete adoption plan and preview have been reviewed.

## Local validation

```bash
npm run check-types
npm run format:check
docker build -f ../apps/api/Dockerfile -t deployfolio-api:iac-test ..
docker run --rm --entrypoint sh deployfolio-api:iac-test -c "test -f /app/apps/api/dist/main.js && find /app/packages/database/prisma/migrations -name migration.sql | grep -q ."
```

The smoke check overrides the normal command, so it does not contact RDS or Valkey. Do not run `pulumi up`, `pulumi destroy`, or imports until the preview and target account have been reviewed.
