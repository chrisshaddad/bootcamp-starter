import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import type { InfrastructureConfig } from './config';

export interface Network {
  vpc: aws.ec2.Vpc;
  publicSubnets: aws.ec2.Subnet[];
  apiSecurityGroup: aws.ec2.SecurityGroup;
  databaseSecurityGroup: aws.ec2.SecurityGroup;
  cacheSecurityGroup: aws.ec2.SecurityGroup;
}

export function createNetwork(config: InfrastructureConfig): Network {
  const vpc = new aws.ec2.Vpc('vpc', {
    cidrBlock: '10.42.0.0/16',
    enableDnsHostnames: true,
    enableDnsSupport: true,
    tags: { Name: `${config.prefix}-vpc` },
  });

  const internetGateway = new aws.ec2.InternetGateway('internet-gateway', {
    vpcId: vpc.id,
    tags: { Name: `${config.prefix}-igw` },
  });

  const availabilityZones = aws.getAvailabilityZonesOutput({
    state: 'available',
  });

  const publicSubnets = [0, 1].map(
    (index) =>
      new aws.ec2.Subnet(`public-subnet-${index + 1}`, {
        vpcId: vpc.id,
        availabilityZone: availabilityZones.names[index],
        cidrBlock: `10.42.${index}.0/24`,
        mapPublicIpOnLaunch: true,
        tags: { Name: `${config.prefix}-public-${index + 1}` },
      }),
  );

  const routeTable = new aws.ec2.RouteTable('public-route-table', {
    vpcId: vpc.id,
    routes: [
      {
        cidrBlock: '0.0.0.0/0',
        gatewayId: internetGateway.id,
      },
    ],
    tags: { Name: `${config.prefix}-public` },
  });

  publicSubnets.forEach((subnet, index) => {
    new aws.ec2.RouteTableAssociation(`route-table-association-${index + 1}`, {
      subnetId: subnet.id,
      routeTableId: routeTable.id,
    });
  });

  const apiSecurityGroup = new aws.ec2.SecurityGroup('api-security-group', {
    name: `${config.prefix}-api`,
    description: 'ECS Express API tasks',
    vpcId: vpc.id,
    ingress: [
      {
        protocol: 'tcp',
        fromPort: 3001,
        toPort: 3001,
        cidrBlocks: [vpc.cidrBlock],
        description: 'API traffic from the Express Mode load balancer',
      },
    ],
    egress: [
      {
        protocol: '-1',
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ['0.0.0.0/0'],
      },
    ],
    tags: { Name: `${config.prefix}-api` },
  });

  const databaseIngress: aws.types.input.ec2.SecurityGroupIngress[] = [
    {
      protocol: 'tcp',
      fromPort: 5432,
      toPort: 5432,
      securityGroups: [apiSecurityGroup.id],
      description: 'PostgreSQL from the API tasks',
    },
  ];
  if (config.databaseAdminCidr) {
    databaseIngress.push({
      protocol: 'tcp',
      fromPort: 5432,
      toPort: 5432,
      cidrBlocks: [config.databaseAdminCidr],
      description: 'Temporary PostgreSQL administration access',
    });
  }

  const databaseSecurityGroup = new aws.ec2.SecurityGroup(
    'database-security-group',
    {
      name: `${config.prefix}-database`,
      description: 'RDS PostgreSQL access',
      vpcId: vpc.id,
      ingress: databaseIngress,
      egress: [],
      tags: { Name: `${config.prefix}-database` },
    },
  );

  const cacheSecurityGroup = new aws.ec2.SecurityGroup('cache-security-group', {
    name: `${config.prefix}-cache`,
    description: 'Valkey access from the API only',
    vpcId: vpc.id,
    ingress: [
      {
        protocol: 'tcp',
        fromPort: 6379,
        toPort: 6379,
        securityGroups: [apiSecurityGroup.id],
        description: 'Valkey from the API tasks',
      },
    ],
    egress: [],
    tags: { Name: `${config.prefix}-cache` },
  });

  return {
    vpc,
    publicSubnets,
    apiSecurityGroup,
    databaseSecurityGroup,
    cacheSecurityGroup,
  };
}
