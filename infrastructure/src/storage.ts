import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import type { InfrastructureConfig } from './config';
import { hostName } from './config';

export interface MediaStorage {
  bucket: aws.s3.Bucket;
  distribution: aws.cloudfront.Distribution;
  publicUrl: pulumi.Output<string>;
}

const CLOUDFRONT_HOSTED_ZONE_ID = 'Z2FDTNDATAQYW2';

export function createMediaStorage(config: InfrastructureConfig): MediaStorage {
  const bucket = new aws.s3.Bucket(
    'media-bucket',
    {
      forceDestroy: config.forceDestroy,
      tags: { Name: `${config.prefix}-media` },
    },
    { protect: config.protectData },
  );

  new aws.s3.BucketPublicAccessBlock('media-public-access-block', {
    bucket: bucket.id,
    blockPublicAcls: true,
    blockPublicPolicy: true,
    ignorePublicAcls: true,
    restrictPublicBuckets: true,
  });

  new aws.s3.BucketOwnershipControls('media-ownership', {
    bucket: bucket.id,
    rule: { objectOwnership: 'BucketOwnerEnforced' },
  });

  new aws.s3.BucketServerSideEncryptionConfiguration('media-encryption', {
    bucket: bucket.id,
    rules: [
      {
        applyServerSideEncryptionByDefault: { sseAlgorithm: 'AES256' },
        bucketKeyEnabled: false,
      },
    ],
  });

  new aws.s3.BucketLifecycleConfiguration('media-lifecycle', {
    bucket: bucket.id,
    rules: [
      {
        id: 'abort-incomplete-multipart-uploads',
        status: 'Enabled',
        filter: { prefix: '' },
        abortIncompleteMultipartUpload: { daysAfterInitiation: 7 },
      },
    ],
  });

  const originAccessControl = new aws.cloudfront.OriginAccessControl(
    'media-origin-access-control',
    {
      name: `${config.prefix}-media`,
      description: 'Signed CloudFront access to the private media bucket',
      originAccessControlOriginType: 's3',
      signingBehavior: 'always',
      signingProtocol: 'sigv4',
    },
  );

  let certificateValidation: aws.acm.CertificateValidation | undefined;
  let aliases: string[] = [];
  let viewerCertificate: aws.types.input.cloudfront.DistributionViewerCertificate =
    {
      cloudfrontDefaultCertificate: true,
    };

  if (config.domainName && config.hostedZoneId) {
    const mediaDomain = hostName(config.mediaSubdomain, config.domainName);
    const usEast1 = new aws.Provider('us-east-1', { region: 'us-east-1' });
    const certificate = new aws.acm.Certificate(
      'media-certificate',
      {
        domainName: mediaDomain,
        validationMethod: 'DNS',
        tags: { Name: `${config.prefix}-media` },
      },
      { provider: usEast1 },
    );

    const validationRecord = new aws.route53.Record(
      'media-certificate-validation-record',
      {
        zoneId: config.hostedZoneId,
        name: certificate.domainValidationOptions[0].resourceRecordName,
        type: certificate.domainValidationOptions[0].resourceRecordType,
        records: [certificate.domainValidationOptions[0].resourceRecordValue],
        ttl: 60,
        allowOverwrite: true,
      },
    );

    certificateValidation = new aws.acm.CertificateValidation(
      'media-certificate-validation',
      {
        certificateArn: certificate.arn,
        validationRecordFqdns: [validationRecord.fqdn],
      },
      { provider: usEast1 },
    );

    aliases = [mediaDomain];
    viewerCertificate = {
      acmCertificateArn: certificateValidation.certificateArn,
      sslSupportMethod: 'sni-only',
      minimumProtocolVersion: 'TLSv1.2_2021',
    };
  }

  const cachePolicy = aws.cloudfront.getCachePolicyOutput({
    name: 'Managed-CachingOptimized',
  });
  const originId = 'private-media-s3-origin';
  const distribution = new aws.cloudfront.Distribution(
    'media-distribution',
    {
      enabled: true,
      isIpv6Enabled: true,
      comment: `${config.prefix} user-uploaded media`,
      priceClass: 'PriceClass_100',
      aliases,
      origins: [
        {
          domainName: bucket.bucketRegionalDomainName,
          originId,
          originAccessControlId: originAccessControl.id,
        },
      ],
      defaultCacheBehavior: {
        targetOriginId: originId,
        viewerProtocolPolicy: 'redirect-to-https',
        allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
        cachedMethods: ['GET', 'HEAD', 'OPTIONS'],
        compress: true,
        cachePolicyId: cachePolicy.id,
      },
      restrictions: {
        geoRestriction: { restrictionType: 'none' },
      },
      viewerCertificate,
      tags: { Name: `${config.prefix}-media` },
    },
    { dependsOn: certificateValidation ? [certificateValidation] : [] },
  );

  new aws.s3.BucketPolicy('media-bucket-policy', {
    bucket: bucket.id,
    policy: pulumi
      .all([bucket.arn, distribution.arn])
      .apply(([bucketArn, distributionArn]) =>
        JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Sid: 'DenyInsecureTransport',
              Effect: 'Deny',
              Principal: '*',
              Action: 's3:*',
              Resource: [bucketArn, `${bucketArn}/*`],
              Condition: {
                Bool: { 'aws:SecureTransport': 'false' },
              },
            },
            {
              Sid: 'AllowCloudFrontReadOnly',
              Effect: 'Allow',
              Principal: { Service: 'cloudfront.amazonaws.com' },
              Action: 's3:GetObject',
              Resource: `${bucketArn}/*`,
              Condition: {
                StringEquals: {
                  'AWS:SourceArn': distributionArn,
                },
              },
            },
          ],
        }),
      ),
  });

  if (config.domainName && config.hostedZoneId) {
    const mediaDomain = hostName(config.mediaSubdomain, config.domainName);
    for (const type of ['A', 'AAAA'] as const) {
      new aws.route53.Record(`media-${type.toLowerCase()}-record`, {
        zoneId: config.hostedZoneId,
        name: mediaDomain,
        type,
        aliases: [
          {
            name: distribution.domainName,
            zoneId: CLOUDFRONT_HOSTED_ZONE_ID,
            evaluateTargetHealth: false,
          },
        ],
      });
    }
  }

  const publicUrl = config.domainName
    ? pulumi.output(
        `https://${hostName(config.mediaSubdomain, config.domainName)}`,
      )
    : pulumi.interpolate`https://${distribution.domainName}`;

  return { bucket, distribution, publicUrl };
}
