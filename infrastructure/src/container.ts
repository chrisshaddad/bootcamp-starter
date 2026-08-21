import { resolve } from 'node:path';
import * as aws from '@pulumi/aws';
import * as awsNative from '@pulumi/aws-native';
import * as dockerBuild from '@pulumi/docker-build';
import * as pulumi from '@pulumi/pulumi';
import * as random from '@pulumi/random';
import type { InfrastructureConfig } from './config';
import type { DataLayer } from './data';
import type { FrontendApp } from './frontend';
import type { Network } from './network';
import type { MediaStorage } from './storage';

export interface ApiService {
  repository: aws.ecr.Repository;
  service?: awsNative.ecs.ExpressGatewayService;
  endpoint: pulumi.Output<string>;
}

function secretKey(
  secret: aws.secretsmanager.Secret,
  key: string,
): pulumi.Output<string> {
  return pulumi.interpolate`${secret.arn}:${key}::`;
}

export function createApiService(
  config: InfrastructureConfig,
  network: Network,
  data: DataLayer,
  media: MediaStorage,
  frontend: FrontendApp,
): ApiService {
  const repository = new aws.ecr.Repository(
    'api-repository',
    {
      name: `${config.prefix}-api`,
      imageTagMutability: 'IMMUTABLE',
      forceDelete: config.forceDestroy,
      imageScanningConfiguration: { scanOnPush: true },
      encryptionConfigurations: [{ encryptionType: 'AES256' }],
      tags: { Name: `${config.prefix}-api` },
    },
    { protect: config.protectData },
  );

  new aws.ecr.LifecyclePolicy('api-repository-lifecycle', {
    repository: repository.name,
    policy: JSON.stringify({
      rules: [
        {
          rulePriority: 1,
          description: 'Keep only the newest 10 API images',
          selection: {
            tagStatus: 'any',
            countType: 'imageCountMoreThan',
            countNumber: 10,
          },
          action: { type: 'expire' },
        },
      ],
    }),
  });

  const encryptionKey =
    config.githubTokenEncryptionKey ??
    new random.RandomPassword('github-token-encryption-key', {
      length: 64,
      special: false,
    }).result;
  const analyticsSecret =
    config.analyticsHashSecret ??
    new random.RandomPassword('analytics-hash-secret', {
      length: 64,
      special: false,
    }).result;
  const currentRegion = aws.getRegionOutput({});
  const stableEndpointValue = `https://${config.prefix}-api.ecs.${config.awsRegion}.on.aws`;
  const stableEndpoint = pulumi.output(stableEndpointValue);

  if (!config.runtimeEnabled) {
    return {
      repository,
      endpoint: stableEndpoint,
    };
  }

  const authorization = aws.ecr.getAuthorizationTokenOutput({});
  const repositoryRoot = resolve(__dirname, '..', '..');
  const image = new dockerBuild.Image('api-image', {
    buildOnPreview: false,
    context: { location: repositoryRoot },
    dockerfile: {
      location: resolve(repositoryRoot, 'apps', 'api', 'Dockerfile'),
    },
    platforms: [dockerBuild.Platform.Linux_amd64],
    exec: true,
    tags: [pulumi.interpolate`${repository.repositoryUrl}:${config.imageTag}`],
    push: true,
    registries: [
      {
        address: authorization.proxyEndpoint,
        username: authorization.userName,
        password: authorization.password,
      },
    ],
  });

  const applicationSecret = new aws.secretsmanager.Secret(
    'application-secret',
    {
      name: `${config.prefix}/api`,
      description: 'Runtime secrets injected into the ECS Express task',
      recoveryWindowInDays: 0,
      tags: { Name: `${config.prefix}-api` },
    },
  );

  const applicationSecretVersion = new aws.secretsmanager.SecretVersion(
    'application-secret-version',
    {
      secretId: applicationSecret.id,
      secretString: pulumi.jsonStringify({
        DATABASE_URL: data.databaseUrl,
        REDIS_URL: data.redisUrl,
        GITHUB_CLIENT_SECRET: config.githubClientSecret!,
        GITHUB_TOKEN: config.githubToken ?? '',
        GITHUB_TOKEN_ENCRYPTION_KEY: encryptionKey,
        ANALYTICS_HASH_SECRET: analyticsSecret,
        OPENAI_API_KEY: config.openaiApiKey!,
        BREVO_API_KEY: config.brevoApiKey!,
        BREVO_SENDER_EMAIL: config.brevoSenderEmail!,
      }),
    },
  );

  const taskExecutionRole = new aws.iam.Role('api-execution-role', {
    name: `${config.prefix}-api-execution`,
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
      Service: 'ecs-tasks.amazonaws.com',
    }),
    tags: { Name: `${config.prefix}-api-execution` },
  });
  const executionPolicyAttachment = new aws.iam.RolePolicyAttachment(
    'api-execution-policy-attachment',
    {
      role: taskExecutionRole.name,
      policyArn:
        'arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy',
    },
  );
  const secretReadPolicy = new aws.iam.RolePolicy('api-secret-read-policy', {
    role: taskExecutionRole.id,
    policy: applicationSecret.arn.apply((secretArn) =>
      JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: ['secretsmanager:GetSecretValue'],
            Resource: secretArn,
          },
        ],
      }),
    ),
  });

  const taskRole = new aws.iam.Role('api-task-role', {
    name: `${config.prefix}-api-task`,
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
      Service: 'ecs-tasks.amazonaws.com',
    }),
    tags: { Name: `${config.prefix}-api-task` },
  });
  const mediaPolicy = new aws.iam.RolePolicy('api-media-policy', {
    role: taskRole.id,
    policy: media.bucket.arn.apply((bucketArn) =>
      JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
            Resource: `${bucketArn}/*`,
          },
        ],
      }),
    ),
  });

  const infrastructureRole = new aws.iam.Role('ecs-infrastructure-role', {
    name: `${config.prefix}-ecs-infrastructure`,
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
      Service: 'ecs.amazonaws.com',
    }),
    tags: { Name: `${config.prefix}-ecs-infrastructure` },
  });
  const infrastructurePolicyAttachment = new aws.iam.RolePolicyAttachment(
    'ecs-infrastructure-policy-attachment',
    {
      role: infrastructureRole.name,
      policyArn:
        'arn:aws:iam::aws:policy/service-role/AmazonECSInfrastructureRoleforExpressGatewayServices',
    },
  );

  const logGroup = new aws.cloudwatch.LogGroup('api-log-group', {
    name: `/ecs/${config.prefix}-api`,
    retentionInDays: 7,
    tags: { Name: `${config.prefix}-api` },
  });
  const cluster = new aws.ecs.Cluster('api-cluster', {
    name: `${config.prefix}-api`,
    settings: [{ name: 'containerInsights', value: 'disabled' }],
    tags: { Name: `${config.prefix}-api` },
  });

  const awsNativeProvider = new awsNative.Provider('aws-native-provider', {
    region: config.awsRegion as awsNative.Region,
    profile: config.awsProfile,
  });

  const service = new awsNative.ecs.ExpressGatewayService(
    'api-service',
    {
      serviceName: `${config.prefix}-api`,
      cluster: cluster.arn,
      cpu: config.apiCpu,
      memory: config.apiMemory,
      executionRoleArn: taskExecutionRole.arn,
      infrastructureRoleArn: infrastructureRole.arn,
      taskRoleArn: taskRole.arn,
      healthCheckPath: '/',
      networkConfiguration: {
        subnets: network.publicSubnets.map((subnet) => subnet.id),
        securityGroups: [network.apiSecurityGroup.id],
      },
      scalingTarget: {
        minTaskCount: 1,
        maxTaskCount: 1,
        autoScalingMetric: 'AVERAGE_CPU',
        autoScalingTargetValue: 70,
      },
      primaryContainer: {
        image: image.ref,
        containerPort: 3001,
        awsLogsConfiguration: {
          logGroup: logGroup.name,
          logStreamPrefix: 'api',
        },
        environment: [
          { name: 'NODE_ENV', value: 'production' },
          { name: 'EMAIL_PROVIDER', value: 'brevo' },
          { name: 'APP_URL', value: frontend.appUrl },
          {
            name: 'API_URL',
            value: pulumi.interpolate`${frontend.appUrl}/api`,
          },
          { name: 'GITHUB_CLIENT_ID', value: config.githubClientId! },
          { name: 'OBJECT_STORAGE_REGION', value: currentRegion.name },
          { name: 'OBJECT_STORAGE_BUCKET', value: media.bucket.bucket },
          { name: 'OBJECT_STORAGE_PUBLIC_URL', value: media.publicUrl },
          { name: 'OBJECT_STORAGE_FORCE_PATH_STYLE', value: 'false' },
          { name: 'BREVO_SENDER_NAME', value: config.brevoSenderName },
        ],
        secrets: [
          {
            name: 'DATABASE_URL',
            valueFrom: secretKey(applicationSecret, 'DATABASE_URL'),
          },
          {
            name: 'REDIS_URL',
            valueFrom: secretKey(applicationSecret, 'REDIS_URL'),
          },
          {
            name: 'GITHUB_CLIENT_SECRET',
            valueFrom: secretKey(applicationSecret, 'GITHUB_CLIENT_SECRET'),
          },
          {
            name: 'GITHUB_TOKEN',
            valueFrom: secretKey(applicationSecret, 'GITHUB_TOKEN'),
          },
          {
            name: 'GITHUB_TOKEN_ENCRYPTION_KEY',
            valueFrom: secretKey(
              applicationSecret,
              'GITHUB_TOKEN_ENCRYPTION_KEY',
            ),
          },
          {
            name: 'ANALYTICS_HASH_SECRET',
            valueFrom: secretKey(applicationSecret, 'ANALYTICS_HASH_SECRET'),
          },
          {
            name: 'OPENAI_API_KEY',
            valueFrom: secretKey(applicationSecret, 'OPENAI_API_KEY'),
          },
          {
            name: 'BREVO_API_KEY',
            valueFrom: secretKey(applicationSecret, 'BREVO_API_KEY'),
          },
          {
            name: 'BREVO_SENDER_EMAIL',
            valueFrom: secretKey(applicationSecret, 'BREVO_SENDER_EMAIL'),
          },
        ],
      },
      tags: [{ key: 'Name', value: `${config.prefix}-api` }],
    },
    {
      dependsOn: [
        executionPolicyAttachment,
        secretReadPolicy,
        mediaPolicy,
        infrastructurePolicyAttachment,
        applicationSecretVersion,
        data.database,
        ...(data.cache ? [data.cache] : []),
      ],
      customTimeouts: { create: '30m', update: '30m', delete: '30m' },
      provider: awsNativeProvider,
    },
  );

  const endpoint = service.endpoint.apply((value) => {
    if (!value) return stableEndpointValue;
    return value.startsWith('http') ? value : `https://${value}`;
  });

  return { repository, service, endpoint };
}
