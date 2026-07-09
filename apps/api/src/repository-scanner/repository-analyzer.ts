import type {
  DetectedTechnology,
  DetectionSignal,
  RepositorySnapshot,
  RepositorySnapshotFile,
  TechnologyDefinition,
} from './repository-scanner.types';
import {
  DOCKER_COMPOSE_IMAGE_RULES,
  LANGUAGE_SLUG_OVERRIDES,
  PACKAGE_DEPENDENCY_RULES,
  PACKAGE_SCRIPT_RULES,
  PRISMA_PROVIDER_RULES,
  TECHNOLOGIES,
} from './technology-rules';

const PACKAGE_DEPENDENCY_SECTIONS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
] as const;

export function analyzeRepositorySnapshot(
  snapshot: RepositorySnapshot,
): DetectedTechnology[] {
  // Merge detections by slug so each technology appears once in the response.
  const detections = new Map<string, DetectedTechnology>();

  for (const language of snapshot.languages ?? []) {
    if (language.bytes <= 0 || language.name.trim().length === 0) {
      continue;
    }

    const name = language.name.trim();
    addDetection(detections, createLanguageTechnology(name), {
      evidence: `Detected GitHub language "${name}" (${language.bytes} bytes)`,
      signal: 'github-language',
    });
  }

  for (const file of snapshot.files ?? []) {
    analyzeFile(file, detections);
  }

  return Array.from(detections.values()).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

function analyzeFile(
  file: RepositorySnapshotFile,
  detections: Map<string, DetectedTechnology>,
): void {
  const normalizedPath = normalizePath(file.path);
  const fileName = getFileName(normalizedPath);

  if (fileName === 'package.json') {
    analyzePackageJson(file, detections);
  }

  if (fileName === 'dockerfile') {
    addDetection(detections, TECHNOLOGIES.docker, {
      evidence: 'Detected Dockerfile',
      signal: 'dockerfile',
      sourceFile: file.path,
    });
  }

  if (isDockerComposePath(fileName)) {
    analyzeDockerCompose(file, detections);
  }

  if (isPrismaSchemaPath(normalizedPath)) {
    analyzePrismaSchema(file, detections);
  }

  if (isGithubActionsWorkflowPath(normalizedPath)) {
    addDetection(detections, TECHNOLOGIES.githubActions, {
      evidence: 'Detected GitHub Actions workflow',
      signal: 'github-actions',
      sourceFile: file.path,
    });
  }
}

function analyzePackageJson(
  file: RepositorySnapshotFile,
  detections: Map<string, DetectedTechnology>,
): void {
  const parsedPackageJson = safeParseJson(file.content);
  if (!isRecord(parsedPackageJson)) {
    return;
  }

  const dependencyNames = collectPackageDependencies(parsedPackageJson);
  for (const rule of PACKAGE_DEPENDENCY_RULES) {
    const matchingPackage = rule.packageNames.find((packageName) =>
      dependencyNames.has(packageName),
    );

    if (matchingPackage) {
      addDetection(detections, rule.technology, {
        evidence: `Detected dependency "${matchingPackage}" in package.json`,
        signal: 'package-json',
        sourceFile: file.path,
      });
    }
  }

  const scriptCommands = collectPackageScriptCommands(parsedPackageJson);
  for (const rule of PACKAGE_SCRIPT_RULES) {
    const matchingCommand = scriptCommands.find((command) =>
      rule.commandPattern.test(command),
    );

    if (matchingCommand) {
      addDetection(detections, rule.technology, {
        evidence: `Detected script command "${matchingCommand}" in package.json`,
        signal: 'package-json',
        sourceFile: file.path,
      });
    }
  }
}

function analyzeDockerCompose(
  file: RepositorySnapshotFile,
  detections: Map<string, DetectedTechnology>,
): void {
  addDetection(detections, TECHNOLOGIES.dockerCompose, {
    evidence: 'Detected Docker Compose file',
    signal: 'docker-compose',
    sourceFile: file.path,
  });

  for (const rule of DOCKER_COMPOSE_IMAGE_RULES) {
    if (rule.textPattern.test(file.content)) {
      addDetection(detections, rule.technology, {
        evidence: `Detected ${rule.technology.name} image in Docker Compose file`,
        signal: 'docker-compose',
        sourceFile: file.path,
      });
    }
  }
}

function analyzePrismaSchema(
  file: RepositorySnapshotFile,
  detections: Map<string, DetectedTechnology>,
): void {
  addDetection(detections, TECHNOLOGIES.prisma, {
    evidence: 'Detected Prisma schema',
    signal: 'prisma-schema',
    sourceFile: file.path,
  });

  const providerPattern = /provider\s*=\s*"([^"]+)"/g;
  const matches = file.content.matchAll(providerPattern);

  for (const match of matches) {
    const provider = match[1]?.toLowerCase();
    if (!provider) {
      continue;
    }

    const technology = PRISMA_PROVIDER_RULES[provider];
    if (!technology) {
      continue;
    }

    addDetection(detections, technology, {
      evidence: `Detected Prisma datasource provider "${provider}"`,
      signal: 'prisma-schema',
      sourceFile: file.path,
    });
  }
}

function addDetection(
  detections: Map<string, DetectedTechnology>,
  technology: TechnologyDefinition,
  details: {
    evidence: string;
    signal: DetectionSignal;
    sourceFile?: string;
  },
): void {
  const existing = detections.get(technology.slug);

  if (!existing) {
    detections.set(technology.slug, {
      ...technology,
      evidence: [details.evidence],
      sourceFiles: details.sourceFile ? [details.sourceFile] : [],
      signals: [details.signal],
    });
    return;
  }

  // Keep distinct evidence and source details for the response audit trail.
  if (!existing.evidence.includes(details.evidence)) {
    existing.evidence.push(details.evidence);
  }

  if (
    details.sourceFile &&
    !existing.sourceFiles.includes(details.sourceFile)
  ) {
    existing.sourceFiles.push(details.sourceFile);
  }

  if (!existing.signals.includes(details.signal)) {
    existing.signals.push(details.signal);
  }
}

function collectPackageDependencies(
  packageJson: Record<string, unknown>,
): Set<string> {
  const dependencyNames = new Set<string>();

  for (const section of PACKAGE_DEPENDENCY_SECTIONS) {
    const dependencies = packageJson[section];
    if (!isRecord(dependencies)) {
      continue;
    }

    for (const dependencyName of Object.keys(dependencies)) {
      dependencyNames.add(dependencyName);
    }
  }

  return dependencyNames;
}

function collectPackageScriptCommands(
  packageJson: Record<string, unknown>,
): string[] {
  const scripts = packageJson.scripts;
  if (!isRecord(scripts)) {
    return [];
  }

  return Object.values(scripts).filter(
    (script): script is string => typeof script === 'string',
  );
}

function createLanguageTechnology(languageName: string): TechnologyDefinition {
  const lowerName = languageName.toLowerCase();

  return {
    name: languageName,
    slug: LANGUAGE_SLUG_OVERRIDES[lowerName] ?? slugify(languageName),
    category: 'LANGUAGE',
  };
}

function safeParseJson(content: string): unknown {
  try {
    return JSON.parse(content) as unknown;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase();
}

function getFileName(path: string): string {
  return path.split('/').at(-1) ?? path;
}

function isDockerComposePath(fileName: string): boolean {
  return [
    'docker-compose.yml',
    'docker-compose.yaml',
    'compose.yml',
    'compose.yaml',
  ].includes(fileName);
}

function isPrismaSchemaPath(normalizedPath: string): boolean {
  return (
    normalizedPath === 'prisma/schema.prisma' ||
    normalizedPath.endsWith('/prisma/schema.prisma')
  );
}

function isGithubActionsWorkflowPath(normalizedPath: string): boolean {
  return (
    normalizedPath.startsWith('.github/workflows/') &&
    (normalizedPath.endsWith('.yml') || normalizedPath.endsWith('.yaml'))
  );
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
