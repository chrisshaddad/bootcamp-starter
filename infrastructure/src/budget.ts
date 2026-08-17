import * as aws from '@pulumi/aws';
import type { InfrastructureConfig } from './config';

export function createBudget(config: InfrastructureConfig): void {
  if (!config.budgetAlertEmail) return;

  new aws.budgets.Budget('monthly-budget', {
    name: `${config.prefix}-monthly-cost`,
    budgetType: 'COST',
    limitAmount: config.monthlyBudgetUsd.toString(),
    limitUnit: 'USD',
    timeUnit: 'MONTHLY',
    notifications: [
      {
        comparisonOperator: 'GREATER_THAN',
        threshold: 80,
        thresholdType: 'PERCENTAGE',
        notificationType: 'FORECASTED',
        subscriberEmailAddresses: [config.budgetAlertEmail],
      },
      {
        comparisonOperator: 'GREATER_THAN',
        threshold: 100,
        thresholdType: 'PERCENTAGE',
        notificationType: 'ACTUAL',
        subscriberEmailAddresses: [config.budgetAlertEmail],
      },
    ],
  });
}
