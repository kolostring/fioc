# @fioc/core

**FIoC (Fluid Inversion of Control)** is a lightweight, reflection-free dependency injection (DI) library for **TypeScript** and **JavaScript**.
It simplifies dependency management with **type safety**, **immutability**, and a **fluent builder API** — designed for both frontend and backend projects.

FIoC powers the broader ecosystem, including integrations for **React**, **Next.js**.

> 💡 “Fluid” means your dependency graph is built fluently and safely — no decorators, no reflection metadata, no runtime hacks.

---

## 🚀 Quick Start

Install via npm, yarn, or pnpm:

```bash
npm install @fioc/core

# or

yarn add @fioc/core

# or

pnpm add @fioc/core
```

A minimal “Hello World” example (with inference comments):

```ts
import { buildDIContainer, createDIToken } from "@fioc/core";

interface Logger {
  log(message: string): void;
}

const LoggerToken = createDIToken<Logger>().as("Logger");
// LoggerToken: DIToken<Logger, "Logger">

const container = buildDIContainer()
  .register(LoggerToken, { log: console.log })
  .getResult();

// Resolve — inferred return type is Logger
const logger = container.resolve(LoggerToken); // logger: Logger
logger.log("Hello, FIoC!");
```

---

## ✨ Features

- 🪶 **Lightweight & Tree-Shakeable** — zero reflection, minimal dependencies.
- 🎯 **Type-Safe Resolution** — no casting, all types inferred automatically.
- 🧱 **Fluent Builder Pattern** — chainable, immutable container configuration.
- 🔄 **Immutable by Default** — safe for concurrent or multithreaded use; supports scoped and singleton overrides.
- 🧬 **Generic Type Metadata** — Supports registering and resolving implementations based on interface tokens and their generic arguments (e.g., `Repository<User>`).
- 🔌 **Universal** — works in Node.js, browser, Deno, Bun, and serverless environments.
- 🧩 **Flexible Factory System** — register values, factories, or class constructors.
- ⚙️ **Composable Containers** — merge configurations or swap environments dynamically.
- 🔗 **Ecosystem Foundation** — powers:
    - [`@fioc/react`](https://www.npmjs.com/package/@fioc/react)
    - [`@fioc/next`](https://www.npmjs.com/package/@fioc/next)

---

## 📘 Table of Contents

- [Quick Start](#-quick-start)
- [Creating Tokens](#creating-tokens)
- [Registering & Resolving](#registering--resolving)
- [Factories](#factories)
- [Class Factories](#class-factories)
- [Scopes](#scopes)
- [Advanced: Generic Type Metadata](#advanced-generic-type-metadata)
- [Merge Containers](#merge-containers)
- [Container Manager](#container-manager)
- [Why FIoC?](#why-fioc)
- [FIoC Ecosystem](#fioc-ecosystem)
- [Contributing](#contributing)
- [License](#license)

---

## 🪄 Creating Tokens

Tokens uniquely identify dependencies in the container.

```ts
import { createDIToken } from "@fioc/core";

interface ApiService {
  getData: () => string;
}

const ApiServiceToken = createDIToken<ApiService>().as("ApiService");
// ApiServiceToken: DIToken<ApiService, "ApiService">
```

or

```ts
import { DIToken } from "@fioc/core";

const ApiServiceToken: DIToken<ApiService> = "ApiService";
// ApiServiceToken: DIToken<ApiService>
```

---

## ⚙️ Registering & Resolving

```ts
import { buildDIContainer } from "@fioc/core";
import { ApiServiceToken } from "./tokens";

const HttpApiService: ApiService = { getData: () => "Hello, World!" };

const container = buildDIContainer()
  .register(ApiServiceToken, HttpApiService) // registers ApiService
  .getResult();

const api = container.resolve(ApiServiceToken); // api: ApiService
api.getData(); // "Hello, World!"
```

> Implementation note: FIoC containers are immutable; registering returns a new container builder result. You can merge containers by passing its states into a new container builder.

---

## 🏗️ Factories

Factories let you register logic that depends on other tokens.

### Option 1 — Manual Configuration

> **Note:** The object literal syntax is recommended if you need to keep your factories pure. It is recommended to use the fluent helper `withDependencies` (Option 2) below if you want less boilerplate.

```ts
// ... imports and token definitions

const getDataUseCaseFactory = (apiService: ApiService) => () =>
  apiService.getData();

const GetDataUseCaseToken =
  createFactoryDIToken<typeof getDataUseCaseFactory>().as("GetDataUseCase");

const container = buildDIContainer()
  .register(ApiServiceToken, HttpApiService)
  .registerFactory(GetDataUseCaseToken, {
    dependencies: [ApiServiceToken],
    factory: getDataUseCaseFactory,
  })
  .getResult();

const useCase = container.resolve(GetDataUseCaseToken);
useCase();
```

### Option 2 — With Dependencies Helper (Recommended: Clean & Strongly Typed)

```ts
import {
  withDependencies,
  createFactoryDIToken,
  buildDIContainer,
} from "@fioc/core";

const getDataUseCaseFactory = withDependencies(ApiServiceToken).defineFactory(
  (apiService /* inferred as ApiService */) => () => apiService.getData()
);

const GetDataUseCaseToken =
  createFactoryDIToken<typeof getDataUseCaseFactory>().as("GetDataUseCase");

const container = buildDIContainer()
  .register(ApiServiceToken, HttpApiService)
  .registerFactory(GetDataUseCaseToken, getDataUseCaseFactory)
  .getResult();

const useCase = container.resolve(GetDataUseCaseToken); // useCase: () => string
useCase();
```

---

## 🧱 Class Factories

```ts
import {
  constructorToFactory,
  withDependencies,
  buildDIContainer,
  createDIToken,
} from "@fioc/core";

class GetDataUseCase {
  constructor(private apiService: ApiService) {}
  execute = () => this.apiService.getData();
}

const GetDataUseCaseToken =
  createDIToken<GetDataUseCase>().as("GetDataUseCase");

const container = buildDIContainer()
  .register(ApiServiceToken, HttpApiService)
  .registerFactory(
    GetDataUseCaseToken,
    withDependencies(ApiServiceToken).defineFactory(
      constructorToFactory(GetDataUseCase)
    ) // Will get type error if dependencies don't match with constructor arguments
  )
  .getResult();

// resolve and inferred type is GetDataUseCase
const instance = container.resolve(GetDataUseCaseToken); // instance: GetDataUseCase
instance.execute();
```

---

## 🌀 Scopes

**Clarified semantics and examples — with inference comments.**

**Definitions**

- `transient` (default): a new value/factory result is produced **every** time the token is resolved.
- `singleton`: the first time the token is resolved in a given _container_, its value is created and then cached for all subsequent resolves on that container.
- `scoped`: the token's value is cached **per scope**. Scopes are short-lived resolution contexts created from a container; each scope gets its own cache for scoped tokens.

### Scoped example (Single Function for Sync/Async)

```ts
const container = buildDIContainer()
  .registerFactory(MyToken, myFactory, "scoped")
  .getResult();

let resolvedA;
let resolvedB;

// Use createScope with a synchronous callback (returns immediately)
container.createScope((scopedContainer) => {
  // scopedContainer has the same API as the main container
  resolvedA = scopedContainer.resolve(MyToken); // resolvedA: inferred type
  resolvedB = scopedContainer.resolve(MyToken); // cached inside this scope
  resolvedA === resolvedB; // true (same scope)
});

// Use createScope with an asynchronous callback (waits for resolution)
// If the callback is async, ensure you await createScope
await container.createScope(async (scopedContainer) => {
  await someAsyncOperation();
  const resolvedC = scopedContainer.resolve(MyToken);
  resolvedA === resolvedC; // false (different scope)
});
```

**When to use which**

- Use `singleton` for heavy or long-lived services (database connections, caches).
- Use `transient` for stateless factories or values where fresh instances are required.
- Use `scoped` for per-request or per-job resources that should be reused inside a single operation but isolated across operations.

---

## 🧬 Advanced: Generic Type Metadata

FIoC allows you to register tokens with metadata (`implements` and `generics`) to look up implementations of a generic interface at runtime. This mimics the functionality of runtime reflection **without sacrificing tree-shakeability.**

### Example: Resolving a Repository by Generic Type

```ts
// 1. Define base and generic tokens
interface Repository<T> {
  findOne(): T;
}
const RepositoryToken = createDIToken<Repository<any>>().as("Repository");

interface User {
  id: number;
}
const UserToken = createDIToken<User>().as("User");

// 2. Register the implementation with metadata
const UserRepositoryImpl: Repository<User> = { findOne: () => ({ id: 1 }) };

const UserRepositoryToken = createDIToken<typeof UserRepositoryImpl>().as(
  "UserRepository",
  {
    implements: [RepositoryToken], // Implements Repository
    generics: [UserToken], // Generic type is User
  }
);

const container = buildDIContainer()
  .register(UserRepositoryToken, UserRepositoryImpl)
  .getResult();

// 3. Find and Resolve by Metadata
// resolveByMetadata returns all resolved instances that match the base and generic tokens
const userRepos = container.resolveByMetadata(RepositoryToken, [UserToken]);

// userRepos: Array<Repository<User>>
const user = userRepos[0].findOne(); // user: User
```

| Method                     | Description                                                      |
| :------------------------- | :--------------------------------------------------------------- |
| `findImplementationTokens` | Returns a list of matching **DITokens**.                         |
| `resolveByMetadata`        | Returns a list of **resolved instances** of the matching tokens. |

---

## 🔀 Merge Containers

You can create isolated containers as modules and merge them together into a single container:

```ts
import { buildDIContainer } from "@fioc/core";

const containerA = buildDIContainer()
  .register(ApiServiceToken, HttpApiService)
  .getResult();

const containerB = buildDIContainer()
  .register(ApiServiceToken, HttpApiService)
  .getResult();

const container = buildDIContainer()
  .merge(containerA.getState())
  .merge(containerB.getState())
  .getResult();

container.resolve(ApiServiceToken); // HttpApiService
```

## 🧩 Container Manager

Switch between environments or test setups seamlessly:

```ts
import { buildDIManager } from "@fioc/core";

const manager = buildDIManager()
  .registerContainer(productionContainer, "prod")
  .registerContainer(testContainer, "test")
  .getResult()
  .setDefaultContainer(process.env.APP_ENV || "prod");

const container = manager.getContainer();
```

Use cases:

- Environment-specific containers
- Online/offline or mock/live switching
- Testing without global mutations

---

## 🧩 Why FIoC

### Pros

- **Reflection-free & decorator-free**: Works without reflect-metadata, decorators, or runtime hacks → fully compatible with Deno, Bun, Node, and browsers.
- **Tree-shakeable**: Due to explicit dependency declaration and **no reliance on reflection**, only imported symbols are included in the final bundle → minimal footprint for frontend projects.
- **Immutable container state**: Safe for concurrent applications, serverless functions, and multi-threaded environments.
- **Scoped lifecycles**: Supports transient, singleton, and scoped instances with a single, reliable `createScope` function.
- **Generic Type Metadata**: Unique ability to resolve dependencies based on generic type constraints, replacing a key feature of `reflect-metadata` without the overhead.
- **Strong TypeScript inference**: Minimal boilerplate; dependencies are automatically type-checked and inferred.
- **Fluent builder API**: Chainable, readable syntax for container registration and composition.
- **Modular & composable**: Merge containers or swap configurations easily → ideal for testing or multi-environment setups.

### Cons

- **No automatic decorators**: Users coming from decorator-based DI libraries may need to adjust patterns.
- **Requires explicit token management**: Every dependency needs a DIToken or factory token → slightly more verbose than reflection-based DI.

---

## 🌐 FIoC Ecosystem

The FIoC ecosystem provides specialized libraries for various environments:

- [`@fioc/react`](https://www.npmjs.com/package/@fioc/react): Hooks and context-based DI for React.
- [`@fioc/next`](https://www.npmjs.com/package/@fioc/next): Type-safe DI for Next.js Server Components and Actions.

---

## 🤝 Contributing

Contributions are welcome!
Feel free to open issues or submit pull requests on [GitHub](https://github.com/kolostring/fioc). Please include tests for behavioral changes and keep changes small and focused.

---

## 📜 License

Licensed under the [MIT License](./LICENSE).
