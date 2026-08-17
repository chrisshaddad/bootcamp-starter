import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import * as pulumi from '@pulumi/pulumi';

export interface InfrastructureConfig {
  name: string;
  prefix: string;
  awsRegion: string;
  awsProfile?: string;
  branchName: string;
  githubRepositoryUrl: string;
  githubAccessToken: pulumi.Output<string>;
  runtimeEnabled: boolean;
  imageTag: string;
  databaseName: string;
  databaseUsername: string;
  databasePassword?: pulumi.Output<string>;
  databaseAdminCidr?: string;
  rdsInstanceClass: string;
  rdsEngineVersion: string;
  cacheNodeType: string;
  valkeyEngineVersion: string;
  apiCpu: string;
  apiMemory: string;
  githubClientId?: string;
  githubClientSecret?: pulumi.Output<string>;
  githubToken?: pulumi.Output<string>;
  githubTokenEncryptionKey?: pulumi.Output<string>;
  analyticsHashSecret?: pulumi.Output<string>;
  openaiApiKey?: pulumi.Output<string>;
  brevoApiKey?: pulumi.Output<string>;
  brevoSenderEmail?: string;
  brevoSenderName: string;
  domainName?: string;
  hostedZoneId?: string;
  appSubdomain: string;
  mediaSubdomain: string;
  budgetAlertEmail?: string;
  monthlyBudgetUsd: number;
  forceDestroy: boolean;
  protectData: boolean;
}

const environmentFile = resolve(__dirname, '..', '.env.infrastructure');
if (existsSync(environmentFile)) {
  process.loadEnvFile(environmentFile);
}

function cleanName(value: string, maxLength = 32): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, maxLength);
}

function environmentValue(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function configOrEnvironment(
  config: pulumi.Config,
  key: string,
  environmentName: string,
): string | undefined {
  return config.get(key) ?? environmentValue(environmentName);
}

function secretConfigOrEnvironment(
  config: pulumi.Config,
  key: string,
  environmentName: string,
): pulumi.Output<string> | undefined {
  const configuredValue = config.getSecret(key);
  if (configuredValue) return configuredValue;

  const environmentFallback = environmentValue(environmentName);
  return environmentFallback ? pulumi.secret(environmentFallback) : undefined;
}

function requiredValue(
  config: pulumi.Config,
  key: string,
  environmentName: string,
): string {
  const value = configOrEnvironment(config, key, environmentName);
  if (!value) {
    throw new pulumi.RunError(
      `${key} must be set in Pulumi stack config or ${environmentName}.`,
    );
  }
  return value;
}

function requiredSecret(
  config: pulumi.Config,
  key: string,
  environmentName: string,
): pulumi.Output<string> {
  const value = secretConfigOrEnvironment(config, key, environmentName);
  if (!value) {
    throw new pulumi.RunError(
      `${key} must be set in Pulumi stack config or ${environmentName}.`,
    );
  }
  return value;
}

function requiredWhenRuntime(
  config: pulumi.Config,
  key: string,
  environmentName: string,
  runtimeEnabled: boolean,
): string | undefined {
  return runtimeEnabled
    ? requiredValue(config, key, environmentName)
    : configOrEnvironment(config, key, environmentName);
}

function requiredSecretWhenRuntime(
  config: pulumi.Config,
  key: string,
  environmentName: string,
  runtimeEnabled: boolean,
): pulumi.Output<string> | undefined {
  return runtimeEnabled
    ? requiredSecret(config, key, environmentName)
    : secretConfigOrEnvironment(config, key, environmentName);
}

function validateAdminCidr(value: string | undefined): string | undefined {
  if (!value) return undefined;

  const [address, prefix, extra] = value.split('/');
  const octets = address?.split('.').map(Number) ?? [];
  const isExactIpv4Host =
    extra === undefined &&
    prefix === '32' &&
    octets.length === 4 &&
    octets.every(
      (octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255,
    );

  if (!isExactIpv4Host) {
    throw new pulumi.RunError(
      'databaseAdminCidr must be one exact IPv4 /32 address, never a broad network.',
    );
  }
  return value;
}

export function loadConfig(): InfrastructureConfig {
  const config = new pulumi.Config();
  const awsConfig = new pulumi.Config('aws');
  const stack = pulumi.getStack();
  const name = cleanName(config.get('name') ?? 'deployfolio');
  const prefix = cleanName(`${name}-${stack}`);
  const runtimeEnabled = config.getBoolean('runtimeEnabled') ?? true;
  const githubRepositoryUrl =
    config.get('githubRepositoryUrl') ?? 'https://github.com/AmzBG/Deployfolio';

  if (
    !/^https:\/\/github\.com\/[^/]+\/[^/]+(?:\.git)?$/.test(githubRepositoryUrl)
  ) {
    throw new pulumi.RunError(
      'githubRepositoryUrl must look like https://github.com/owner/repository',
    );
  }

  const domainName = config.get('domainName')?.replace(/^https?:\/\//, '');
  const hostedZoneId = config.get('hostedZoneId');
  if (domainName && !hostedZoneId) {
    throw new pulumi.RunError(
      'hostedZoneId is required when domainName is configured.',
    );
  }

  return {
    name,
    prefix,
    awsRegion: awsConfig.get('region') ?? 'us-west-2',
    awsProfile: awsConfig.get('profile'),
    branchName: config.get('branchName') ?? 'main',
    githubRepositoryUrl,
    githubAccessToken: requiredSecret(
      config,
      'githubAccessToken',
      'AMPLIFY_GITHUB_ACCESS_TOKEN',
    ),
    runtimeEnabled,
    imageTag: config.get('imageTag') ?? 'v1',
    databaseName: config.get('databaseName') ?? 'deployfolio',
    databaseUsername: config.get('databaseUsername') ?? 'deployfolio_admin',
    databasePassword: secretConfigOrEnvironment(
      config,
      'databasePassword',
      'DATABASE_PASSWORD',
    ),
    databaseAdminCidr: validateAdminCidr(
      configOrEnvironment(config, 'databaseAdminCidr', 'DATABASE_ADMIN_CIDR'),
    ),
    rdsInstanceClass: config.get('rdsInstanceClass') ?? 'db.t4g.micro',
    rdsEngineVersion: config.get('rdsEngineVersion') ?? '18',
    cacheNodeType: config.get('cacheNodeType') ?? 'cache.t4g.micro',
    valkeyEngineVersion: config.get('valkeyEngineVersion') ?? '8.2',
    apiCpu: config.get('apiCpu') ?? '256',
    apiMemory: config.get('apiMemory') ?? '512',
    githubClientId: requiredWhenRuntime(
      config,
      'githubClientId',
      'GITHUB_CLIENT_ID',
      runtimeEnabled,
    ),
    githubClientSecret: requiredSecretWhenRuntime(
      config,
      'githubClientSecret',
      'GITHUB_CLIENT_SECRET',
      runtimeEnabled,
    ),
    githubToken: secretConfigOrEnvironment(
      config,
      'githubToken',
      'GITHUB_TOKEN',
    ),
    githubTokenEncryptionKey: secretConfigOrEnvironment(
      config,
      'githubTokenEncryptionKey',
      'GITHUB_TOKEN_ENCRYPTION_KEY',
    ),
    analyticsHashSecret: secretConfigOrEnvironment(
      config,
      'analyticsHashSecret',
      'ANALYTICS_HASH_SECRET',
    ),
    openaiApiKey: requiredSecretWhenRuntime(
      config,
      'openaiApiKey',
      'OPENAI_API_KEY',
      runtimeEnabled,
    ),
    brevoApiKey: requiredSecretWhenRuntime(
      config,
      'brevoApiKey',
      'BREVO_API_KEY',
      runtimeEnabled,
    ),
    brevoSenderEmail: requiredWhenRuntime(
      config,
      'brevoSenderEmail',
      'BREVO_SENDER_EMAIL',
      runtimeEnabled,
    ),
    brevoSenderName:
      configOrEnvironment(config, 'brevoSenderName', 'BREVO_SENDER_NAME') ??
      'Deployfolio',
    domainName,
    hostedZoneId,
    appSubdomain: config.get('appSubdomain') ?? 'app',
    mediaSubdomain: config.get('mediaSubdomain') ?? 'media',
    budgetAlertEmail: config.get('budgetAlertEmail'),
    monthlyBudgetUsd: config.getNumber('monthlyBudgetUsd') ?? 15,
    forceDestroy: config.getBoolean('forceDestroy') ?? false,
    protectData: config.getBoolean('protectData') ?? true,
  };
}

export function hostName(subdomain: string, domainName: string): string {
  return subdomain ? `${subdomain}.${domainName}` : domainName;
}
