# @fioc/core

**FIoC (Fluid Inversion of Control)** is a lightweight, reflection-free dependency injection (DI) library for **TypeScript** and **JavaScript**.  
It simplifies dependency management with **type safety**, **immutability**, and a **fluent builder API** — designed for both frontend and backend projects.

FIoC powers the broader ecosystem, including integrations for **React**, **Next.js**, and stricter compile-time validation with **@fioc/strict**.

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

- 🪶 **Lightweight** — zero reflection, minimal dependencies (only depends on [Immer](https://immerjs.github.io/immer/)).
- 🎯 **Type-Safe Resolution** — no casting, all types inferred automatically.
- 🧱 **Fluent Builder Pattern** — chainable, immutable container configuration.
- 🔄 **Immutable by Default** — safe for concurrent or multithreaded use; supports scoped and singleton overrides.
- 🔌 **Universal** — works in Node.js, browser, Deno, Bun, and serverless environments.
- 🧩 **Flexible Factory System** — register values, factories, or class constructors.
- ⚙️ **Composable Containers** — merge configurations or swap environments dynamically.
- 🔗 **Ecosystem Foundation** — powers:
  - [`@fioc/react`](https://www.npmjs.com/package/@fioc/react)
  - [`@fioc/next`](https://www.npmjs.com/package/@fioc/next)
  - [`@fioc/strict`](https://www.npmjs.com/package/@fioc/strict)

---

## 📘 Table of Contents

- [Quick Start](#-quick-start)
- [Creating Tokens](#creating-tokens)
- [Registering & Resolving](#registering--resolving)
- [Factories](#factories)
- [Class Factories](#class-factories)
- [Scopes](#scopes)
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

Alternatively, you can use a manually casted `Symbol` (not compatible with `@fioc/strict`):

```ts
import { DIToken } from "@fioc/core";

const ApiServiceToken: DIToken<ApiService> = Symbol.for("ApiService");
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

### Option 1 — Manual Configuration (with inference comments)

```ts
import { createFactoryDIToken, buildDIContainer } from "@fioc/core";
import { ApiServiceToken } from "./tokens";

const getDataUseCaseFactory = (apiService: ApiService) => () =>
  apiService.getData();

const GetDataUseCaseToken =
  createFactoryDIToken<typeof getDataUseCaseFactory>().as("GetDataUseCase");
// GetDataUseCaseToken: FactoryDIToken<() => string, "GetDataUseCase">

const container = buildDIContainer()
  .register(ApiServiceToken, HttpApiService)
  .registerFactory(GetDataUseCaseToken, {
    dependencies: [ApiServiceToken], // Will get type error if doesn't match types and orders of factory's parameters
    factory: getDataUseCaseFactory,
  })
  .getResult();

const useCase = container.resolve(GetDataUseCaseToken); // useCase: () => string
useCase();
```

### Option 2 — With Dependencies Helper (clean & strongly typed)

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
  .registerFactory(GetDataUseCaseToken, getDataUseCaseFactory);

const useCase = container.resolve(GetDataUseCaseToken); // useCase: () => string
useCase();
```

---

## 🧱 Class Factories

```ts
import {
  constructorToFactory,
  buildDIContainer,
  createDIToken,
} from "@fioc/core";

class GetDataUseCase {
  constructor(private apiService: ApiService) {}
  execute = () => this.apiService.getData();
}

const GetDataUseCaseToken =
  createDIToken<GetDataUseCase>().as("GetDataUseCase");
// GetDataUseCaseToken: DIToken<GetDataUseCase, "GetDataUseCase">

const container = buildDIContainer()
  .register(ApiServiceToken, HttpApiService)
  .registerFactory(GetDataUseCaseToken, {
    dependencies: [ApiServiceToken],
    factory: constructorToFactory(GetDataUseCase),
  });

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

> Implementation note: FIoC containers are immutable; registering returns a new container builder result. Scopes are lightweight resolution contexts that reuse container registration metadata but keep separate caches for `scoped` instances.

### Singleton example

```ts
const container = buildDIContainer()
  .registerFactory(MyToken, myFactory, "singleton")
  .getResult();

const a = container.resolve(MyToken); // a: Inferred type of MyToken
const b = container.resolve(MyToken); // same cached instance
a === b; // true
```

### Transient example

```ts
const container = buildDIContainer()
  .registerFactory(MyToken, myFactory, "transient") // or omit scope (default)
  .getResult();

const a = container.resolve(MyToken); // new instance/value
const b = container.resolve(MyToken); // another new instance/value
a === b; // false
```

### Scoped example (callback-style)

```ts
const container = buildDIContainer()
  .registerFactory(MyToken, myFactory, "scoped")
  .getResult();

let resolvedA: ReturnType<typeof container.resolve>;
let resolvedB: ReturnType<typeof container.resolve>;

container.createScope((resolve) => {
  // `resolve` has the same inference as container.resolve
  resolvedA = resolve(MyToken); // resolvedA: inferred type
  resolvedB = resolve(MyToken); // cached inside this scope
  resolvedA === resolvedB; // true (same scope)
});

// different scope -> different instance
container.createScope((resolve) => {
  const resolvedC = resolve(MyToken);
  resolvedA === resolvedC; // false
});
```

**When to use which**

- Use `singleton` for heavy or long-lived services (database connections, caches).
- Use `transient` for stateless factories or values where fresh instances are required.
- Use `scoped` for per-request or per-job resources that should be reused inside a single operation but isolated across operations.

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

- **Immutable container state**: Safe for concurrent applications, serverless functions, and multi-threaded environments.

- **Scoped lifecycles**: Supports transient, singleton, and scoped instances → flexible per-request, per-job, or long-lived resources.

- **Strong TypeScript inference**: Minimal boilerplate; dependencies are automatically type-checked and inferred.

- **Fluent builder API**: Chainable, readable syntax for container registration and composition.

- **Modular & composable**: Merge containers or swap configurations easily → ideal for testing or multi-environment setups.

- **Tree-shakeable**: Only imported symbols are included in the final bundle → minimal footprint for frontend projects.

- **Ecosystem ready**: Integrates with React (@fioc/react), Next.js (@fioc/next), and stricter type-checking (@fioc/strict).

### Cons

- **No automatic decorators**: Users coming from decorator-based DI libraries may need to adjust patterns.

- **Requires explicit token management**: Every dependency needs a DIToken or factory token → slightly more verbose than reflection-based DI.

---

## 🌐 FIoC Ecosystem

The FIoC ecosystem provides specialized libraries for various environments:

- [`@fioc/strict`](https://www.npmjs.com/package/@fioc/strict): Enhanced type safety and compile-time validation.
- [`@fioc/react`](https://www.npmjs.com/package/@fioc/react): Hooks and context-based DI for React.
- [`@fioc/next`](https://www.npmjs.com/package/@fioc/next): Type-safe DI for Next.js Server Components and Actions.

---

## 🤝 Contributing

Contributions are welcome!  
Feel free to open issues or submit pull requests on [GitHub](https://github.com/kolostring/fioc). Please include tests for behavioral changes and keep changes small and focused.

---

## 📜 License

Licensed under the [MIT License](./LICENSE).
