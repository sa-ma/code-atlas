import type {
  ArchitectureComponent,
  ArchitectureContainer,
  ArchitectureDatastore,
  ArchitectureDomainEntity,
  ArchitectureExternalService,
  ArchitectureRead,
} from "@/lib/types/code-atlas";

type DiagramNode =
  | ArchitectureContainer
  | ArchitectureComponent
  | ArchitectureDatastore
  | ArchitectureExternalService
  | ArchitectureDomainEntity;

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, "_");
}

function formatLabel(node: DiagramNode): string {
  const tech = "tech" in node && node.tech.length > 0 ? `<br/><span style='font-size:11px'>${node.tech.join(" · ")}</span>` : "";
  const subtitle =
    "subtitle" in node && node.subtitle ? `<br/><span style='font-size:11px'>${node.subtitle}</span>` : "";

  return `${node.label}${subtitle}${tech}`;
}

function pushNode(lines: string[], node: DiagramNode, className: string) {
  const id = sanitizeId(node.id);
  lines.push(`    ${id}["${formatLabel(node)}"]`);
  lines.push(`    class ${id} ${className}`);
}

function pushSection(lines: string[], title: string, nodes: DiagramNode[], className: string) {
  if (nodes.length === 0) {
    return;
  }

  lines.push(`  subgraph ${sanitizeId(title)}["${title}"]`);
  for (const node of nodes) {
    pushNode(lines, node, className);
  }
  lines.push("  end");
}

function pushSectionWithoutClass(lines: string[], title: string, nodes: DiagramNode[], className: string) {
  if (nodes.length === 0) {
    return;
  }

  lines.push(`    subgraph ${sanitizeId(title)}["${title}"]`);
  for (const node of nodes) {
    pushNode(lines, node, className);
  }
  lines.push("    end");
}

function sectionSortOrder(node: DiagramNode): number {
  const kind = "kind" in node ? node.kind : "";

  switch (kind) {
    case "api":
      return 0;
    case "routing":
      return 1;
    case "controller":
      return 2;
    case "auth":
      return 3;
    case "middleware":
      return 4;
    case "static_assets":
      return 5;
    case "service":
      return 6;
    case "utility":
      return 7;
    case "worker":
      return 8;
    case "persistence":
      return 9;
    case "database":
      return 10;
    case "cache":
      return 11;
    default:
      return 99;
  }
}

export function generateArchitectureMermaid(architecture: ArchitectureRead): string {
  const lines: string[] = [
    "flowchart LR",
    "classDef container fill:#ffffff,stroke:#111111,color:#111111,stroke-width:2.4px;",
    "classDef component fill:#ffffff,stroke:#111111,color:#111111,stroke-width:2px;",
    "classDef datastore fill:#ffffff,stroke:#111111,color:#111111,stroke-width:2.4px;",
    "classDef external fill:#ffffff,stroke:#111111,color:#111111,stroke-width:2.4px;",
    "classDef domain fill:#ffffff,stroke:#111111,color:#111111,stroke-width:2px;",
  ];

  if (architecture.systemType === "monorepo-workspace") {
    const endUser = architecture.containers.filter((node) => node.kind === "end_user");
    const apps = architecture.components.filter((node) => node.section === "Apps");
    const shared = architecture.components.filter((node) => node.section === "Shared Packages");
    const dataLayer = [
      ...architecture.components.filter((node) => node.section === "Data Layer"),
      ...architecture.datastores,
    ];

    for (const node of endUser) {
      pushNode(lines, node, "container");
    }

    lines.push('  subgraph Monorepo["Workspace"]');
    pushSectionWithoutClass(lines, "Apps", apps, "component");
    pushSectionWithoutClass(lines, "Shared Packages", shared, "component");
    pushSectionWithoutClass(lines, "Data Layer", dataLayer, "datastore");
    lines.push("  end");

    for (const external of architecture.externalServices) {
      pushNode(lines, external, "external");
    }

    for (const flow of architecture.flows) {
      lines.push(
        `  ${sanitizeId(flow.from)} -->|${flow.label}| ${sanitizeId(flow.to)}`,
      );
    }

    return lines.join("\n");
  }

  const standaloneContainers = architecture.containers.filter((node) => !node.section);
  for (const node of standaloneContainers) {
    pushNode(lines, node, "container");
  }

  const apiNodes = [
    ...architecture.containers.filter((node) => node.section === "API"),
    ...architecture.components.filter((node) => node.section === "API"),
  ].sort((left, right) => sectionSortOrder(left) - sectionSortOrder(right));

  pushSection(
    lines,
    "API",
    apiNodes,
    "component",
  );

  const serviceNodes = [
    ...architecture.containers.filter((node) => node.section === "Services"),
    ...architecture.components.filter((node) => node.section === "Services"),
  ].sort((left, right) => sectionSortOrder(left) - sectionSortOrder(right));

  pushSection(
    lines,
    "Services",
    serviceNodes,
    "component",
  );

  const dataNodes = [
    ...architecture.components.filter((node) => node.section === "Data"),
    ...architecture.datastores,
  ].sort((left, right) => sectionSortOrder(left) - sectionSortOrder(right));

  pushSection(
    lines,
    "Data",
    dataNodes,
    "datastore",
  );

  pushSection(lines, "Domain", architecture.domainEntities, "domain");

  for (const external of architecture.externalServices) {
    pushNode(lines, external, "external");
  }

  for (const flow of architecture.flows) {
    lines.push(
      `  ${sanitizeId(flow.from)} -->|${flow.label}| ${sanitizeId(flow.to)}`,
    );
  }

  return lines.join("\n");
}
