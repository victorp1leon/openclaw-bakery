# C4 Diagram Prompt Template

Status: MVP
Last Updated: 2026-02-26

> Generate a draw.io XML file with C4 architecture diagrams for the following service.
> **Use the example diagram as reference:**
> - `Common/Documentation/C4/Templates/Services/c4-example.drawio` - for Level 1, Level 2, and Level 3 styling

## Service Information

| Field | Value |
|------|------|
| **Service Name** | `[SERVICE NAME]` |
| **Service Type** | `[WebAPI / Console App / Background Service / etc.]` |

## Purpose

`[Brief description of what the service does - 2-3 sentences]`

## Actors/Personas

- **[Actor 1]**: `[How they interact with the system]`
- **[Actor 2]**: `[How they interact]` *(if applicable)*
- **Note**:
  - Actors/Personas are NOT included in backend service diagrams. Only include actors when diagramming frontend/UI applications.

## External Systems (Callers/Consumers)

- **Note**:
  - Only show systems that **directly connect** to this service. If a system goes through another (e.g., UI calls through APIM), only show the intermediate system (APIM) as the direct caller.

- **[System 1]**: `[Brief description of how it interacts]`
- **[System 2]**: `[Brief description]` *(add more as needed)*

## Data Stores

- **[Database/Cache/Storage 1]**: `[What it stores]`
- **[Database/Cache/Storage 2]**: `[What it stores]` *(add more as needed)*

## Azure Services (External)

> Azure services are treated as **external systems** with no boundary grouping. Each is labeled with `[Azure Service]`.
> Position Azure services on the **RIGHT side** of diagrams.

| Service | Purpose | Label |
|---|---|---|
| **Azure App Configuration** | Centralized app settings and feature flags | `[Azure Service]` |
| **Azure Key Vault** | Secrets, keys, and certificate management | `[Azure Service]` |
| **Azure Application Insights** | Monitoring, logging, and diagnostics | `[Azure Service]` |

### Connectors to Azure Services:
- Each service shown as individual external element with `[Azure Service]` label
- Service/API connects directly to each Azure service with individual connectors on all levels

## API Endpoints

> Level 2 shows ONE API container for the service.
> Level 3 breaks this down into component boundaries for each API set, with layered architecture inside each.

### API Sets (listed here, grouped as component boundaries on Level 3)

| API Set | Public/Private | Endpoints | Called by |
|---|---|---|---|
| **[API 1]** | Public/Private | `GET`, `POST`, `PUT` `/api/[resource]` | `[Callers]` |
| **[API 2]** | Public/Private | `GET` `/api/[resource]` | `[Callers]` |
*(Add more as needed)*

## Internal Components (Level 3)

> Level 3 uses a **layered architecture view** with **component boundaries** for each API set.
> The entire diagram is wrapped in a **Container Boundary** (matching the system boundary from Level 2).
> Each API set has its own **Component Boundary** containing **three horizontal layer labels** with components organized within each layer.

### Level 3 Component Boundary Layout Structure:

```text
[Service Name] Container Boundary
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                                       │
│  ┌──────────────────────────────┐   ┌──────────────────────────────┐   ┌──────────────────────────────┐
│  │ API 1 Component Boundary     │   │ API 2 Component Boundary     │   │ API 3 Component Boundary     │
│  │                              │   │                              │   │                              │
│  │  ┌────────────────────────┐  │   │  ┌────────────────────────┐  │   │  ┌────────────────────────┐  │
│  │  │        API Layer        │  │   │  │        API Layer        │  │   │  │        API Layer        │  │
│  │  └────────────────────────┘  │   │  └────────────────────────┘  │   │  └────────────────────────┘  │
│  │          ConfigController    │   │        SecurityController    │   │         FilterController     │
│  │            [Controller]      │   │          [Controller]        │   │           [Controller]       │
│  │                              │   │                              │   │                              │
│  │  ┌────────────────────────┐  │   │  ┌────────────────────────┐  │   │  ┌────────────────────────┐  │
│  │  │      Service Layer      │  │   │  │      Service Layer      │  │   │  │      Service Layer      │  │
│  │  └────────────────────────┘  │   │  └────────────────────────┘  │   │  └────────────────────────┘  │
│  │   Service1  Service2  ...    │   │            Service            │   │            Service           │
│  │    [Svc]     [Svc]           │   │           [Service]           │   │           [Service]          │
│  │                              │   │                              │   │                              │
│  │  ┌────────────────────────┐  │   │  ┌────────────────────────┐  │   │  ┌────────────────────────┐  │
│  │  │  Infrastructure Layer   │  │   │  │  Infrastructure Layer   │  │   │  │  Infrastructure Layer   │  │
│  │  └────────────────────────┘  │   │  └────────────────────────┘  │   │  └────────────────────────┘  │
│  │   Repository  BlobStorageSvc │   │   Repo  BlobSvc  PushSvc     │   │        BlobStorageSvc        │
│  │    [Infra]       [Infra]     │   │  [Infra] [Infra]  [Infra]    │   │        [Infrastructure]      │
│  └──────────────────────────────┘   └──────────────────────────────┘   └──────────────────────────────┘
│                                                                                                       │
└───────────────────────────────────────────────────────────────────────────────────────────────────────┘

        ↓                                  ↓                                  ↓

  SQL Database [External]           Blob Storage [External]              Ext Service [External]  <- External
```

## Layer Definitions

**API Layer** (top layer inside each component boundary):

| Component Type | Label | Description |
|---|---|---|
| **Controllers** | `[Controller]` | HTTP endpoint handlers - one per API container from Level 2 |

**Service Layer** (middle layer inside each component boundary):

| Component Type | Label | Description |
|---|---|---|
| **Services** | `[Service]` | Business logic components - orchestrate operations |
| **Validators** | `[Service]` | Validation components (schema validation, provider validation) |
| **Integrators** | `[Service]` | Components that call external services |

**Service Layer** (continued - data access services at the bottom of service layer):

| Component Type | Label | Description |
|---|---|---|
| **[API]DataService** | `[Service]` | Unified data access layer; other services read/write through this instead of directly accessing Repository/BlobStorageService. Name should be prefixed with the API name (e.g., `ConfigDataService`, `SecurityRolesDataService`) |

> **Protocol Labels**: All connectors from external systems to controllers (and from internal components to external systems) MUST include the protocol in the label format:
>
> - Action description  
> - `[PROTOCOL/FORMAT]`
>
> Examples:
> - `GET configs<br>[HTTP/JSON]` - HTTP call with JSON payload
> - `Routes requests<br>[HTTP/JSON]` - API gateway routing
> - `Validates<br>[HTTP/JSON]` - Service-to-service validation call
> - `Pushes roles<br>[HTTP/JSON]` - Outbound data push
> - `Streams data<br>[gRPC]` - gRPC streaming (if applicable)
>
> **Note**: When using a DataService pattern, place it at the bottom of the Service layer to allow easy connector routing to Infrastructure layer components.

**Infrastructure Layer** (bottom layer inside each component boundary):

| Component Type | Label | Description |
|---|---|---|
| **Repository** | `[Infrastructure]` | Data access / database index management |
| **Blob Storage Service** | `[Infrastructure]` | File storage operations (configs, results, etc.) |
| **Cache Service** | `[Infrastructure]` | Caching layer (if applicable) |
| **Push Services** | `[Infrastructure]` | Components that push data to external services |

### Layer Label Styling

Each layer within a component boundary has a **full-width horizontal bar** as a label:
- Background: Light blue (`#E8E4FD`)
- Text color: Blue (`#1168BD`)
- Font: Bold, 10pt
- Height: 20px
- Width: Full width of the component boundary (minus padding)

### Element Labeling
- Each element shows its **name** on the first line
- The **type label** (e.g., `[Controller]`, `[Service]`, `[Repository]`) appears below the name

