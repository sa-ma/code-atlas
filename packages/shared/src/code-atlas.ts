export type ServiceType = "frontend" | "backend" | "worker";

export type DatastoreType = "database" | "cache" | "storage" | "queue";

export type ExternalServiceType = "external_api";

export type GraphNodeKind = ServiceType | DatastoreType | ExternalServiceType;

export type EdgeLabel = "HTTP" | "queries" | "cache" | "jobs" | "storage" | "API calls";

export interface EvidenceRecord {
  filePath: string;
  reason: string;
  direct: boolean;
}

export interface AnalysisWarning {
  code: string;
  message: string;
}

export type RepoPattern = "single-package" | "multi-package" | "monorepo";

export type RepoAppKind =
  | "backend-api"
  | "fullstack-app"
  | "web-app"
  | "worker-service"
  | "library-heavy"
  | "monorepo";

export interface RepositoryInventory {
  appKind: RepoAppKind;
  repoPattern: RepoPattern;
  frameworkFamily: string[];
  candidateRoots: string[];
  confidenceSummary: string;
  warnings: AnalysisWarning[];
}

export interface ArchitectureEvidenceRecord extends EvidenceRecord {
  subjectId: string;
}

export interface ArchitectureNodeBase {
  id: string;
  label: string;
  tech: string[];
  section?: "API" | "Services" | "Data" | "Domain" | "Apps" | "Shared Packages" | "Data Layer";
  evidence: EvidenceRecord[];
}

export interface ArchitectureContainer extends ArchitectureNodeBase {
  role: "container";
  kind: "client" | "web_app" | "api" | "worker" | "static_assets" | "end_user";
}

export interface ArchitectureComponent extends ArchitectureNodeBase {
  role: "component";
  kind:
    | "bootstrap"
    | "routing"
    | "controller"
    | "service"
    | "middleware"
    | "auth"
    | "persistence"
    | "utility"
    | "workspace_package";
  subtitle?: string;
}

export interface ArchitectureDatastore extends ArchitectureNodeBase {
  role: "datastore";
  kind: "database" | "cache" | "storage" | "queue";
}

export interface ArchitectureExternalService extends ArchitectureNodeBase {
  role: "external_service";
  kind: "external_api";
}

export interface ArchitectureDomainEntity {
  id: string;
  label: string;
  role: "domain_entity";
  kind: "entity";
  section?: "Domain";
  evidence: EvidenceRecord[];
}

export interface ArchitectureFlow {
  from: string;
  to: string;
  label:
    | "HTTP"
    | "routes"
    | "uses"
    | "auth"
    | "queries"
    | "API calls"
    | "jobs"
    | "serves"
    | "handles"
    | "stores"
    | "depends on";
}

export interface RepoContext {
  appKind: RepoAppKind;
  frameworkFamily: string[];
  repoPattern: RepoPattern;
  candidateRoots: string[];
  confidenceSummary: string;
}

export interface ArchitectureRead {
  systemType: "container-component" | "monorepo-workspace";
  repoContext: RepoContext;
  containers: ArchitectureContainer[];
  components: ArchitectureComponent[];
  datastores: ArchitectureDatastore[];
  externalServices: ArchitectureExternalService[];
  domainEntities: ArchitectureDomainEntity[];
  flows: ArchitectureFlow[];
  evidence: ArchitectureEvidenceRecord[];
  assumptions: string[];
}

export interface WorkspacePackage {
  id: string;
  root: string;
  packageName: string;
  label: string;
  subtitle?: string;
  section: "Apps" | "Shared Packages" | "Data Layer";
  category:
    | "web_app"
    | "api_app"
    | "shared_ui"
    | "api_layer"
    | "business_core"
    | "platform"
    | "app_store"
    | "embed"
    | "data"
    | "other";
  tech: string[];
  internalDeps: string[];
  evidence: EvidenceRecord[];
}

export interface ArchitectureSourceRead {
  readme?: RepositoryFile;
  dependencies: Set<string>;
  routeFiles: RepositoryFile[];
  serviceFiles: RepositoryFile[];
  authFiles: RepositoryFile[];
  middlewareFiles: RepositoryFile[];
  entryFiles: RepositoryFile[];
  errorFiles: RepositoryFile[];
  staticFiles: RepositoryFile[];
  entityFiles: RepositoryFile[];
  controllerNames: string[];
  serviceNames: string[];
  domainEntities: string[];
  backendRuntime: string | null;
  persistenceTech: string | null;
  databaseTech: string | null;
  hasWebApp: boolean;
  hasApi: boolean;
  hasWorkers: boolean;
  hasStaticAssets: boolean;
  hasAuth: boolean;
  hasHashing: boolean;
  hasJwt: boolean;
  externalIntegrations: string[];
  workspacePackages: WorkspacePackage[];
}

export interface ArchitectureEntity {
  id: string;
  label: string;
  tech: string[];
  confidence?: number;
  evidence: EvidenceRecord[];
}

export interface ServiceFinding extends ArchitectureEntity {
  type: ServiceType;
}

export interface DatastoreFinding extends ArchitectureEntity {
  type: DatastoreType;
}

export interface ExternalServiceFinding extends ArchitectureEntity {
  type: ExternalServiceType;
}

export interface GraphEdge {
  from: string;
  to: string;
  label: EdgeLabel;
  confidence?: number;
}

export interface ArchitectureFindings {
  services: ServiceFinding[];
  datastores: DatastoreFinding[];
  externalServices: ExternalServiceFinding[];
  edges: GraphEdge[];
  confidenceNotes: string[];
  warnings: AnalysisWarning[];
  evidence: EvidenceRecord[];
}

export interface ArchitectureGraphNode {
  id: string;
  label: string;
  kind: GraphNodeKind;
  tech: string[];
}

export interface ArchitectureGraph {
  nodes: ArchitectureGraphNode[];
  edges: GraphEdge[];
}

export interface RepositoryRef {
  owner: string;
  repo: string;
  branch?: string;
  htmlUrl: string;
}

export interface RepositoryMetadata extends RepositoryRef {
  defaultBranch: string;
  description: string | null;
}

export interface RepositoryTreeEntry {
  path: string;
  type: "blob" | "tree";
  size?: number;
}

export interface RepositoryFile {
  path: string;
  content: string;
  size: number;
}

export interface AnalyzeRepositoryRequest {
  repoUrl: string;
}

export interface AnalyzeRepositoryResponse {
  repo: RepositoryMetadata;
  architecture: ArchitectureRead;
  mermaid: string;
  summary?: string;
  warnings: AnalysisWarning[];
}

export interface RepositorySnapshot {
  repo: RepositoryMetadata;
  tree: RepositoryTreeEntry[];
  files: RepositoryFile[];
  warnings: AnalysisWarning[];
}

export interface SaveAnalysisRequest {
  repoUrl: string;
  result: AnalyzeRepositoryResponse;
}

export interface SavedAnalysisSummary {
  id: string;
  repoUrl: string;
  owner: string;
  repo: string;
  branch: string | null;
  title: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedAnalysisRecord extends SavedAnalysisSummary {
  result: AnalyzeRepositoryResponse;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

export interface SessionResponse {
  user: SessionUser | null;
}
