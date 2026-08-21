import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import type { InfrastructureConfig } from './config';
import { hostName } from './config';

export interface FrontendApp {
  app: aws.amplify.App;
  appUrl: pulumi.Output<string>;
}

export function createFrontendApp(config: InfrastructureConfig): FrontendApp {
  const buildSpec = readFileSync(
    resolve(__dirname, '..', '..', 'amplify.yml'),
    'utf8',
  );

  const app = new aws.amplify.App('frontend-app', {
    name: `${config.prefix}-web`,
    description: 'Next.js frontend from apps/web in the monorepo',
    repository: config.githubRepositoryUrl,
    accessToken: config.githubAccessToken,
    platform: 'WEB_COMPUTE',
    buildSpec,
    enableBranchAutoBuild: true,
    enableBranchAutoDeletion: true,
    environmentVariables: {
      AMPLIFY_MONOREPO_APP_ROOT: 'apps/web',
    },
    tags: { Name: `${config.prefix}-web` },
  });

  const appUrl = config.domainName
    ? pulumi.output(
        `https://${hostName(config.appSubdomain, config.domainName)}`,
      )
    : pulumi.interpolate`https://${config.branchName}.${app.defaultDomain}`;

  return { app, appUrl };
}

export function createFrontendBranch(
  config: InfrastructureConfig,
  frontend: FrontendApp,
  apiOrigin: pulumi.Input<string>,
): aws.amplify.Branch {
  const branch = new aws.amplify.Branch('frontend-branch', {
    appId: frontend.app.id,
    branchName: config.branchName,
    description: 'Production branch',
    enableAutoBuild: true,
    framework: 'Next.js - SSR',
    stage: 'PRODUCTION',
    environmentVariables: {
      NEXT_PUBLIC_API_URL: '/api',
      API_URL: apiOrigin,
      API_ORIGIN: apiOrigin,
    },
  });

  if (config.domainName) {
    new aws.amplify.DomainAssociation('frontend-domain', {
      appId: frontend.app.id,
      domainName: config.domainName,
      certificateSettings: { type: 'AMPLIFY_MANAGED' },
      subDomains: [
        {
          branchName: branch.branchName,
          prefix: config.appSubdomain,
        },
      ],
      waitForVerification: true,
    });
  }

  return branch;
}
