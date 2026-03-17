import type {
  ArchitectureComponent,
  ArchitectureContainer,
  ArchitectureDatastore,
  ArchitectureDomainEntity,
  ArchitectureEvidenceRecord,
  EvidenceRecord,
  ArchitectureExternalService,
  ArchitectureFlow,
  ArchitectureRead,
  ArchitectureSourceRead,
  RepositoryInventory,
  RepositorySnapshot,
} from "@/lib/types/code-atlas";

function evidenceFor(path: string, reason: string, direct = true): EvidenceRecord {
  return { filePath: path, reason, direct };
}

function firstPath(paths: string[]): string {
  return paths[0] ?? "README.md";
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const map = new Map<string, T>();

  for (const item of items) {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  }

  return [...map.values()];
}

function buildMonorepoArchitectureRead(
  sourceRead: ArchitectureSourceRead,
  inventory: RepositoryInventory,
): ArchitectureRead {
  const containers: ArchitectureContainer[] = [];
  const components: ArchitectureComponent[] = [];
  const datastores: ArchitectureDatastore[] = [];
  const externalServices: ArchitectureExternalService[] = [];
  const domainEntities: ArchitectureDomainEntity[] = [];
  const flows: ArchitectureFlow[] = [];

  containers.push({
    id: "end-user",
    label: "End User",
    role: "container",
    kind: "end_user",
    tech: [],
    evidence: [
      evidenceFor(
        sourceRead.readme?.path ?? "README.md",
        "End user included because the monorepo contains user-facing apps",
        false,
      ),
    ],
  });

  const packageNameToId = new Map(
    sourceRead.workspacePackages.map((pkg) => [pkg.packageName, pkg.id]),
  );

  for (const pkg of sourceRead.workspacePackages) {
    components.push({
      id: pkg.id,
      label: pkg.label,
      subtitle: pkg.subtitle,
      role: "component",
      kind: "workspace_package",
      section: pkg.section,
      tech: pkg.tech,
      evidence: pkg.evidence,
    });
  }

  const webApp = sourceRead.workspacePackages.find((pkg) => pkg.category === "web_app");
  const apiApp = sourceRead.workspacePackages.find((pkg) => pkg.category === "api_app");
  const dataPkg = sourceRead.workspacePackages.find((pkg) => pkg.category === "data");

  if (webApp) {
    flows.push({ from: "end-user", to: webApp.id, label: "HTTP" });
  }

  if (webApp && apiApp) {
    flows.push({ from: webApp.id, to: apiApp.id, label: "uses" });
  }

  for (const pkg of sourceRead.workspacePackages) {
    for (const internalDep of pkg.internalDeps) {
      const targetId = packageNameToId.get(internalDep);
      if (targetId) {
        flows.push({ from: pkg.id, to: targetId, label: "depends on" });
      }
    }
  }

  if (sourceRead.databaseTech) {
    datastores.push({
      id: sourceRead.databaseTech.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      label: sourceRead.databaseTech,
      role: "datastore",
      kind: "database",
      section: "Data Layer",
      tech: [sourceRead.databaseTech],
      evidence: [
        evidenceFor(
          "prisma/schema.prisma",
          `${sourceRead.databaseTech} inferred from Prisma schema/provider configuration`,
          false,
        ),
      ],
    });
  }

  if (dataPkg && datastores.length > 0) {
    flows.push({ from: dataPkg.id, to: datastores[0].id, label: "queries" });
  }

  if (sourceRead.externalIntegrations.length > 0) {
    externalServices.push({
      id: "external-services",
      label: "External Services",
      role: "external_service",
      kind: "external_api",
      tech: sourceRead.externalIntegrations.filter((name) => name !== "Redis"),
      evidence: [
        evidenceFor(
          "package.json",
          "External service boundary grouped from integration dependencies",
          false,
        ),
      ],
    });
  }

  const likelyExternalCallers = sourceRead.workspacePackages.filter((pkg) =>
    ["web_app", "api_app", "business_core", "app_store"].includes(pkg.category),
  );
  if (externalServices.length > 0) {
    for (const pkg of likelyExternalCallers.slice(0, 4)) {
      flows.push({ from: pkg.id, to: "external-services", label: "API calls" });
    }
  }

  const evidence: ArchitectureEvidenceRecord[] = [
    ...containers.flatMap((item) =>
      item.evidence.map((evidenceItem) => ({ subjectId: item.id, ...evidenceItem })),
    ),
    ...components.flatMap((item) =>
      item.evidence.map((evidenceItem) => ({ subjectId: item.id, ...evidenceItem })),
    ),
    ...datastores.flatMap((item) =>
      item.evidence.map((evidenceItem) => ({ subjectId: item.id, ...evidenceItem })),
    ),
    ...externalServices.flatMap((item) =>
      item.evidence.map((evidenceItem) => ({ subjectId: item.id, ...evidenceItem })),
    ),
  ];

  return {
    systemType: "monorepo-workspace",
    repoContext: {
      appKind: inventory.appKind,
      frameworkFamily: inventory.frameworkFamily,
      repoPattern: inventory.repoPattern,
      confidenceSummary: inventory.confidenceSummary,
      candidateRoots: inventory.candidateRoots,
    },
    containers: uniqueById(containers),
    components: uniqueById(components),
    datastores: uniqueById(datastores),
    externalServices: uniqueById(externalServices),
    domainEntities,
    flows: uniqueById(
      flows.map((flow) => ({
        ...flow,
        id: `${flow.from}:${flow.to}:${flow.label}`,
      })),
    ).map(({ id, ...flow }) => {
      void id;
      return flow;
    }),
    evidence,
    assumptions: [
      "Monorepo mode prioritizes apps and shared packages over schema entities.",
      "Internal package relationships are inferred from workspace package dependencies.",
    ],
  };
}

function inferContainers(
  sourceRead: ArchitectureSourceRead,
  snapshot: RepositorySnapshot,
): ArchitectureContainer[] {
  const containers: ArchitectureContainer[] = [];

  if (sourceRead.hasWebApp) {
    containers.push({
      id: "web-app",
      label: "Web app",
      role: "container",
      kind: "web_app",
      tech: sourceRead.backendRuntime === "Next.js API Routes" ? ["Next.js", "React"] : ["Next.js", "React"].filter(Boolean),
      section: undefined,
      evidence: [
        evidenceFor(
          firstPath(snapshot.files.filter((file) => /(next\.config|app\/|pages\/|src\/app\/)/i.test(file.path)).map((file) => file.path)),
          "Frontend app inferred from Next.js/React structure",
          false,
        ),
      ],
    });
  }

  if (sourceRead.hasApi) {
    containers.push({
      id: "api",
      label: "API",
      role: "container",
      kind: "api",
      tech: ["Node.js", sourceRead.backendRuntime].filter(Boolean) as string[],
      section: "API",
      evidence: [
        evidenceFor(
          firstPath(sourceRead.entryFiles.map((file) => file.path).concat(sourceRead.routeFiles.map((file) => file.path))),
          "API container inferred from entrypoints, routers, and backend framework conventions",
          false,
        ),
      ],
    });
  }

  if (!sourceRead.hasWebApp && sourceRead.hasApi) {
    containers.unshift({
      id: "client",
      label: "Client / Frontend / API Consumer",
      role: "container",
      kind: "client",
      tech: [],
      evidence: [
        evidenceFor(
          sourceRead.readme?.path ?? snapshot.repo.htmlUrl,
          "External API consumer inferred because the repo exposes an HTTP API without an internal web frontend",
          false,
        ),
      ],
    });
  }

  if (sourceRead.hasWorkers) {
    containers.push({
      id: "worker",
      label: "Worker",
      role: "container",
      kind: "worker",
      tech: ["Node.js", "Jobs"],
      section: "Services",
      evidence: [
        evidenceFor(
          firstPath(snapshot.files.filter((file) => /(worker|queue|job)/i.test(file.path)).map((file) => file.path)),
          "Worker runtime inferred from worker and queue sources",
          false,
        ),
      ],
    });
  }

  if (sourceRead.hasStaticAssets) {
    containers.push({
      id: "static-assets",
      label: "Static Asset Serving",
      role: "container",
      kind: "static_assets",
      tech: ["Assets"],
      section: "API",
      evidence: [
        evidenceFor(
          firstPath(sourceRead.staticFiles.map((file) => file.path)),
          "Static asset serving inferred from asset directories",
          false,
        ),
      ],
    });
  }

  return uniqueById(containers);
}

function inferComponents(sourceRead: ArchitectureSourceRead): ArchitectureComponent[] {
  const components: ArchitectureComponent[] = [];

  if (sourceRead.routeFiles.length > 0) {
    components.push({
      id: "routing",
      label:
        sourceRead.controllerNames.length > 1
          ? "Route / Controller Layer"
          : "/api router",
      subtitle:
        sourceRead.controllerNames.length > 1
          ? "Routing, controllers, and transport"
          : "Routes and transport layer",
      role: "component",
      kind: "routing",
      section: "API",
      tech: [],
      evidence: [
        evidenceFor(
          firstPath(sourceRead.routeFiles.map((file) => file.path)),
          "Routing layer inferred from controller and route files",
        ),
      ],
    });
  }

  if (sourceRead.controllerNames.length === 1) {
    const controllerName = sourceRead.controllerNames[0];
    components.push({
      id: controllerName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      label: controllerName,
      role: "component",
      kind: "controller",
      section: "API",
      tech: [],
      evidence: [
        evidenceFor(
          firstPath(
            sourceRead.routeFiles
              .filter((file) =>
                file.path.toLowerCase().includes(controllerName.split(" ")[0].toLowerCase()),
              )
              .map((file) => file.path),
          ),
          "Controller inferred from route/controller naming",
          false,
        ),
      ],
    });
  }

  if (sourceRead.serviceNames.length === 0 && sourceRead.routeFiles.length > 0) {
    components.push({
      id: "business-logic",
      label: "Business Logic Layer",
      role: "component",
      kind: "service",
      section: "Services",
      tech: [],
      evidence: [
        evidenceFor(
          firstPath(sourceRead.routeFiles.map((file) => file.path)),
          "Service layer inferred from controller-driven backend structure",
          false,
        ),
      ],
    });
  } else if (sourceRead.serviceNames.length > 1) {
    components.push({
      id: "business-logic",
      label: "Business Logic Layer",
      subtitle: sourceRead.serviceNames.slice(0, 3).join(" · "),
      role: "component",
      kind: "service",
      section: "Services",
      tech: [],
      evidence: [
        evidenceFor(
          firstPath(sourceRead.serviceFiles.map((file) => file.path)),
          "Business logic layer grouped from multiple service or use-case sources",
        ),
      ],
    });
  } else {
    for (const serviceName of sourceRead.serviceNames) {
      components.push({
        id: serviceName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        label: serviceName,
        role: "component",
        kind: "service",
        section: "Services",
        tech: [],
        evidence: [
          evidenceFor(
            firstPath(
              sourceRead.serviceFiles
                .filter((file) =>
                  file.path.toLowerCase().includes(serviceName.split(" ")[0].toLowerCase()),
                )
                .map((file) => file.path),
            ),
            "Business service inferred from service or use-case source",
          ),
        ],
      });
    }
  }

  if (sourceRead.hasAuth) {
    components.push({
      id: "auth",
      label: sourceRead.hasJwt ? "JWT Auth Middleware" : "Auth Layer",
      subtitle: sourceRead.hasJwt ? "required / optional" : undefined,
      role: "component",
      kind: "auth",
      section: "API",
      tech: sourceRead.hasJwt ? ["JWT"] : [],
      evidence: [
        evidenceFor(
          firstPath(sourceRead.authFiles.map((file) => file.path)),
          "Auth layer inferred from auth utilities, middleware, or auth dependencies",
          false,
        ),
      ],
    });
  }

  if (sourceRead.middlewareFiles.length > 0 && !sourceRead.hasAuth) {
    components.push({
      id: "middleware",
      label: "Middleware Layer",
      role: "component",
      kind: "middleware",
      section: "API",
      tech: [],
      evidence: [
        evidenceFor(
          firstPath(sourceRead.middlewareFiles.map((file) => file.path)),
          "Middleware concerns inferred from middleware files",
        ),
      ],
    });
  }

  if (sourceRead.errorFiles.length > 0) {
    components.push({
      id: "error-handler",
      label: "Global Error Handler",
      role: "component",
      kind: "middleware",
      section: "API",
      tech: [],
      evidence: [
        evidenceFor(
          firstPath(sourceRead.errorFiles.map((file) => file.path)),
          "Error handling component inferred from handler files",
        ),
      ],
    });
  }

  if (sourceRead.persistenceTech) {
    components.push({
      id: sourceRead.persistenceTech.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      label: sourceRead.persistenceTech === "Prisma" ? "Prisma Client" : sourceRead.persistenceTech,
      role: "component",
      kind: "persistence",
      section: "Data",
      tech: [sourceRead.persistenceTech],
      evidence: [
        evidenceFor(
          firstPath(
            sourceRead.entryFiles
              .concat(sourceRead.serviceFiles)
              .concat(sourceRead.routeFiles)
              .filter((file) =>
                new RegExp(sourceRead.persistenceTech ?? "", "i").test(file.content) ||
                /schema\.prisma$/.test(file.path),
              )
              .map((file) => file.path),
          ),
          "Persistence layer inferred from ORM usage",
          false,
        ),
      ],
    });
  }

  if (sourceRead.hasJwt) {
    components.push({
      id: "token-utils",
      label: "JWT Token Utils",
      role: "component",
      kind: "utility",
      section: "Services",
      tech: ["JWT"],
      evidence: [
        evidenceFor(
          firstPath(sourceRead.authFiles.map((file) => file.path)),
          "Token utility inferred from JWT usage",
          false,
        ),
      ],
    });
  }

  if (sourceRead.hasHashing) {
    components.push({
      id: "password-hashing",
      label: "Password Hashing",
      role: "component",
      kind: "utility",
      section: "Services",
      tech: ["bcrypt"],
      evidence: [
        evidenceFor(
          firstPath(sourceRead.authFiles.map((file) => file.path)),
          "Password hashing inferred from auth implementation",
          false,
        ),
      ],
    });
  }

  return uniqueById(components);
}

function inferDatastores(sourceRead: ArchitectureSourceRead): ArchitectureDatastore[] {
  const datastores: ArchitectureDatastore[] = [];

  if (sourceRead.databaseTech) {
    datastores.push({
      id: sourceRead.databaseTech.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      label: sourceRead.databaseTech,
      role: "datastore",
      kind: "database",
      section: "Data",
      tech: [sourceRead.databaseTech],
      evidence: [
        evidenceFor(
          "prisma/schema.prisma",
          `${sourceRead.databaseTech} inferred from ORM or schema configuration`,
          false,
        ),
      ],
    });
  }

  if (sourceRead.externalIntegrations.includes("Redis")) {
    datastores.push({
      id: "redis",
      label: "Redis",
      role: "datastore",
      kind: "cache",
      section: "Data",
      tech: ["Redis"],
      evidence: [evidenceFor("package.json", "Redis dependency found in package manifests", false)],
    });
  }

  return datastores;
}

function inferExternalServices(sourceRead: ArchitectureSourceRead): ArchitectureExternalService[] {
  return sourceRead.externalIntegrations
    .filter((name) => name !== "Redis")
    .map((name) => ({
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      label: name,
      role: "external_service" as const,
      kind: "external_api" as const,
      tech: [name],
      evidence: [evidenceFor("package.json", `${name} integration inferred from package manifests`, false)],
    }));
}

function inferDomainEntities(sourceRead: ArchitectureSourceRead): ArchitectureDomainEntity[] {
  return sourceRead.domainEntities.slice(0, 5).map((name) => ({
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    label: name,
    role: "domain_entity" as const,
    kind: "entity" as const,
    section: "Domain",
    evidence: [
      evidenceFor(
        firstPath(
          sourceRead.entityFiles
            .filter((file) => file.path.toLowerCase().includes(name.toLowerCase()))
            .map((file) => file.path),
        ),
        "Domain entity inferred from schemas, models, or standardized app conventions",
        false,
      ),
    ],
  }));
}

function inferFlows(read: ArchitectureRead): ArchitectureFlow[] {
  const flows: ArchitectureFlow[] = [];
  const has = (id: string) =>
    read.containers.some((item) => item.id === id) ||
    read.components.some((item) => item.id === id) ||
    read.datastores.some((item) => item.id === id) ||
    read.externalServices.some((item) => item.id === id) ||
    read.domainEntities.some((item) => item.id === id);

  if (has("client") && has("api")) flows.push({ from: "client", to: "api", label: "HTTP" });
  if (has("web-app") && has("api")) flows.push({ from: "web-app", to: "api", label: "HTTP" });
  if (has("api") && has("routing")) flows.push({ from: "api", to: "routing", label: "routes" });
  if (has("api") && has("static-assets")) flows.push({ from: "api", to: "static-assets", label: "serves" });
  if (has("api") && has("error-handler")) flows.push({ from: "api", to: "error-handler", label: "handles" });

  for (const component of read.components.filter((item) => item.kind === "controller")) {
    if (has("routing")) flows.push({ from: "routing", to: component.id, label: "routes" });
    if (has("auth")) flows.push({ from: component.id, to: "auth", label: "auth" });
  }

  const serviceTargets = read.components.filter((item) => item.kind === "service");
  const controllers = read.components.filter((item) => item.kind === "controller");
  const primaryService =
    serviceTargets.find((item) => item.id === "business-logic") ?? serviceTargets[0];

  if (has("routing") && primaryService) {
    flows.push({ from: "routing", to: primaryService.id, label: "uses" });
  }

  if (serviceTargets.length === 1 && controllers.length > 0) {
    for (const controller of controllers) {
      flows.push({ from: controller.id, to: serviceTargets[0].id, label: "uses" });
    }
  } else {
    for (const controller of controllers) {
      const matchingService = serviceTargets.find((service) =>
        service.label.split(" ")[0] === controller.label.split(" ")[0],
      );
      if (matchingService) {
        flows.push({ from: controller.id, to: matchingService.id, label: "uses" });
      }
    }
  }

  const persistence = read.components.find((item) => item.kind === "persistence");
  if (primaryService && persistence) {
    flows.push({ from: primaryService.id, to: persistence.id, label: "queries" });
  }
  if (primaryService && has("token-utils")) {
    flows.push({ from: primaryService.id, to: "token-utils", label: "uses" });
  }
  if (primaryService && has("password-hashing")) {
    flows.push({ from: primaryService.id, to: "password-hashing", label: "uses" });
  }
  if (primaryService && has("auth")) {
    flows.push({ from: "routing", to: "auth", label: "auth" });
  }
  if (primaryService) {
    for (const integration of read.externalServices) {
      flows.push({ from: primaryService.id, to: integration.id, label: "API calls" });
    }
  }

  for (const datastore of read.datastores) {
    if (persistence) {
      flows.push({ from: persistence.id, to: datastore.id, label: "queries" });
    }

    if (datastore.kind === "database") {
      for (const entity of read.domainEntities) {
        flows.push({ from: datastore.id, to: entity.id, label: "stores" });
      }
    }
  }

  if (has("worker") && has("redis")) {
    flows.push({ from: "worker", to: "redis", label: "jobs" });
  }

  return uniqueById(
    flows.map((flow) => ({
      ...flow,
      id: `${flow.from}:${flow.to}:${flow.label}`,
    })),
  ).map(({ id, ...flow }) => {
    void id;
    return flow;
  });
}

export function buildArchitectureRead(
  sourceRead: ArchitectureSourceRead,
  inventory: RepositoryInventory,
  snapshot: RepositorySnapshot,
): ArchitectureRead {
  if (inventory.repoPattern === "monorepo" && sourceRead.workspacePackages.length > 0) {
    return buildMonorepoArchitectureRead(sourceRead, inventory);
  }

  const containers = inferContainers(sourceRead, snapshot);
  const components = inferComponents(sourceRead);
  const datastores = inferDatastores(sourceRead);
  const externalServices = inferExternalServices(sourceRead);
  const domainEntities = inferDomainEntities(sourceRead);

  const assumptions: string[] = [];
  if (!sourceRead.serviceFiles.length && sourceRead.routeFiles.length > 0) {
    assumptions.push("Business logic layer inferred from controller-driven backend structure.");
  }
  if (!sourceRead.entityFiles.length && sourceRead.domainEntities.length > 0) {
    assumptions.push("Domain entities inferred from ORM schemas, README context, or standardized app patterns.");
  }
  if (!sourceRead.hasWebApp && sourceRead.hasApi) {
    assumptions.push("Client/API consumer shown because the repository exposes an API but does not include its own frontend.");
  }

  const evidence = [
    ...containers.flatMap((item) => item.evidence.map((evidenceItem) => ({ subjectId: item.id, ...evidenceItem }))),
    ...components.flatMap((item) => item.evidence.map((evidenceItem) => ({ subjectId: item.id, ...evidenceItem }))),
    ...datastores.flatMap((item) => item.evidence.map((evidenceItem) => ({ subjectId: item.id, ...evidenceItem }))),
    ...externalServices.flatMap((item) => item.evidence.map((evidenceItem) => ({ subjectId: item.id, ...evidenceItem }))),
    ...domainEntities.flatMap((item) => item.evidence.map((evidenceItem) => ({ subjectId: item.id, ...evidenceItem }))),
  ];

  const architecture: ArchitectureRead = {
    systemType: "container-component",
    repoContext: {
      appKind: inventory.appKind,
      frameworkFamily: inventory.frameworkFamily,
      repoPattern: inventory.repoPattern,
      confidenceSummary: inventory.confidenceSummary,
      candidateRoots: inventory.candidateRoots,
    },
    containers,
    components,
    datastores,
    externalServices,
    domainEntities,
    flows: [],
    evidence,
    assumptions,
  };

  architecture.flows = inferFlows(architecture);

  return architecture;
}
