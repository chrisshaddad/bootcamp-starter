import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import * as random from '@pulumi/random';
import type { InfrastructureConfig } from './config';
import type { Network } from './network';

export interface DataLayer {
  database: aws.rds.Instance;
  databasePassword: pulumi.Output<string>;
  databaseUrl: pulumi.Output<string>;
  cache?: aws.elasticache.ReplicationGroup;
  redisUrl: pulumi.Output<string>;
}

export function createDataLayer(
  config: InfrastructureConfig,
  network: Network,
): DataLayer {
  const generatedDatabasePassword = config.databasePassword
    ? undefined
    : new random.RandomPassword('database-password', {
        length: 32,
        special: false,
      });
  const databasePassword =
    config.databasePassword ?? generatedDatabasePassword!.result;

  const databaseSubnetGroup = new aws.rds.SubnetGroup('database-subnet-group', {
    name: `${config.prefix}-database`,
    subnetIds: network.publicSubnets.map((subnet) => subnet.id),
    tags: { Name: `${config.prefix}-database` },
  });

  const database = new aws.rds.Instance(
    'database',
    {
      identifier: `${config.prefix}-postgres`,
      engine: 'postgres',
      engineVersion: config.rdsEngineVersion,
      instanceClass: config.rdsInstanceClass,
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      storageType: 'gp3',
      storageEncrypted: true,
      dbName: config.databaseName,
      username: config.databaseUsername,
      password: databasePassword,
      port: 5432,
      dbSubnetGroupName: databaseSubnetGroup.name,
      vpcSecurityGroupIds: [network.databaseSecurityGroup.id],
      publiclyAccessible: Boolean(config.databaseAdminCidr),
      multiAz: false,
      backupRetentionPeriod: 1,
      copyTagsToSnapshot: true,
      deletionProtection: config.protectData,
      skipFinalSnapshot: true,
      autoMinorVersionUpgrade: true,
      applyImmediately: true,
      performanceInsightsEnabled: false,
      monitoringInterval: 0,
      tags: { Name: `${config.prefix}-postgres` },
    },
    { protect: config.protectData },
  );

  const encodedDatabasePassword = databasePassword.apply((value) =>
    encodeURIComponent(value),
  );
  const databaseUrl = pulumi.secret(
    pulumi.interpolate`postgresql://${config.databaseUsername}:${encodedDatabasePassword}@${database.address}:5432/${config.databaseName}?sslmode=require`,
  );

  let cache: aws.elasticache.ReplicationGroup | undefined;
  let redisUrl: pulumi.Output<string> = pulumi.secret(
    'rediss://disabled.invalid:6379',
  );

  if (config.runtimeEnabled) {
    const cacheSubnetGroup = new aws.elasticache.SubnetGroup(
      'cache-subnet-group',
      {
        name: `${config.prefix}-cache`,
        subnetIds: network.publicSubnets.map((subnet) => subnet.id),
      },
    );

    cache = new aws.elasticache.ReplicationGroup('cache', {
      replicationGroupId: `${config.prefix}-cache`.slice(0, 40),
      description: 'Single-node Valkey for sessions, caching, and BullMQ',
      engine: 'valkey',
      engineVersion: config.valkeyEngineVersion,
      nodeType: config.cacheNodeType,
      numCacheClusters: 1,
      port: 6379,
      subnetGroupName: cacheSubnetGroup.name,
      securityGroupIds: [network.cacheSecurityGroup.id],
      automaticFailoverEnabled: false,
      multiAzEnabled: false,
      atRestEncryptionEnabled: true,
      transitEncryptionEnabled: true,
      snapshotRetentionLimit: 0,
      applyImmediately: true,
      tags: { Name: `${config.prefix}-cache` },
    });
    redisUrl = pulumi.secret(
      pulumi.interpolate`rediss://${cache.primaryEndpointAddress}:6379`,
    );
  }

  return { database, databasePassword, databaseUrl, cache, redisUrl };
}
