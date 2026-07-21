interface RouteLabelRule {
  test: RegExp;
  label: string;
}

// Ordered most-specific first — the first match wins.
const ROUTE_LABEL_RULES: RouteLabelRule[] = [
  { test: /^\/dashboard\/?$/, label: 'Dashboard' },
  { test: /^\/explore\/?$/, label: 'Explore' },
  { test: /^\/projects\/new\/?$/, label: 'New Project' },
  { test: /^\/projects\/preview\/[^/]+\/?$/, label: 'Project Preview' },
  { test: /^\/projects\/[^/]+\/edit\/?$/, label: 'Edit Project' },
  { test: /^\/projects\/[^/]+\/?$/, label: 'Project' },
  { test: /^\/projects\/?$/, label: 'Projects' },
  { test: /^\/saved-projects\/?$/, label: 'Saved Projects' },
  { test: /^\/saved-candidates\/?$/, label: 'Saved Candidates' },
  { test: /^\/organizations\/[^/]+\/?$/, label: 'Organization' },
  { test: /^\/organizations\/?$/, label: 'Organizations' },
  { test: /^\/settings\/?$/, label: 'Settings' },
  { test: /^\/profile\/?$/, label: 'Profile' },
  { test: /^\/users\/[^/]+\/?$/, label: 'Developer Profile' },
  { test: /^\/users\/?$/, label: 'Developers' },
  { test: /^\/developers\/[^/]+\/?$/, label: 'Developer Profile' },
  { test: /^\/invitations\/?$/, label: 'Invitations' },
  { test: /^\/admin\/accounts\/?$/, label: 'Accounts' },
  { test: /^\/admin\/logs\/?$/, label: 'Logs' },
  { test: /^\/admin\/projects\/?$/, label: 'Projects' },
  { test: /^\/admin\/?$/, label: 'Admin' },
];

export function getRouteLabel(pathname: string): string {
  return ROUTE_LABEL_RULES.find((rule) => rule.test.test(pathname))?.label ?? 'Previous Page';
}
