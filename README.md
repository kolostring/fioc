# @fioc/core

FIoC (Fluid Inversion of Control) is a lightweight dependency injection library for JavaScript and TypeScript applications. It simplifies dependency management with a flexible, type-safe approach, without requiring reflection. It serves as the foundation for the FIoC ecosystem, including integrations for React and Next.js. For stricter type safety, see [@fioc/strict](#fiocstrict).

## Features

- 🪶 **Lightweight**: Only depends on Immer, integrates seamlessly
- 🎯 **No Type Casting**: Dependencies resolve to correct types automatically
- 🏗️ **Builder Pattern**: Fluent API for dependency registration
- 🔄 **Immutable, unless you need otherwsie**: Immutable container state for safe concurrency with support for scoped dependencies and singletons
- 🔌 **Universal**: Works in front-end and back-end environments
- 🎮 **Flexible Factory System**: Supports value registration, factory functions, and class constructors
- 🧩 **Modular Design**: Merge containers and switch configurations easily
- 🔗 **Ecosystem Foundation**: Powers [@fioc/react](https://www.npmjs.com/package/@fioc/react), [@fioc/next](https://www.npmjs.com/package/@fioc/next), and [@fioc/strict](https://www.npmjs.com/package/@fioc/strict)

[Jump to Basic Usage →](#basic-usage)

## Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
  - [Creating Tokens](#creating-tokens)
  - [Registering & Resolving](#registering--resolving)
- [Advanced Usage](#advanced-usage)
  - [Factories](#factories)
  - [Class Factories](#class-factories)
  - [Scopes](#scopes)
  - [Container Manager](#container-manager)
- [FIOC Ecosystem](#fioc-ecosystem)

## Installation

Install using npm, pnpm, or yarn:

```bash
npm install @fioc/core
```

```bash
pnpm install @fioc/core
```

```bash
yarn add @fioc/core
```

## Basic Usage

### Creating Tokens

Start by defining your interfaces:

```ts
import { createDIToken } from "@fioc/core";

interface ApiService {
  getData: () => string;
}
```

Theres three ways to create tokens:

Create tokens for dependencies using `createDIToken`. Pick this one for maximum compatibility with fioc/strict:

```ts
import { createDIToken } from "@fioc/core";

const ApiServiceToken = createDIToken<ApiService>().as("ApiService");
```

For less verbose, you can also use a casted Symbol. Should be migrated to createDIToken() in fioc/strict:

```ts
import { createDIToken } from "@fioc/core";

const ApiServiceToken: DIToken<ApiService> = Symbol.for("ApiService");
```

### Registering & Resolving

Register and resolve dependencies using the container builder:

```ts
import { buildDIContainer } from "@fioc/core";
import { ApiService, ApiServiceToken } from "./interfaces/ApiService";

// Define the implementation
const HttpApiService: ApiService = {
  getData: () => "Hello, World!",
};

// Register the implementation for each token
const container = buildDIContainer()
  .register(ApiServiceToken, HttpApiService)
  .getResult();

// Will be automatically casted to ApiService
const apiService = container.resolve(ApiServiceToken);
apiService.getData(); // "Hello, World!"
```

## Advanced Usage

### Factories

The main features of FIoC are achieved through factories. These factories recieve dependencies as tokens and return values.

There's two ways to create factories. First is to do the config manually:

```ts
import { ApiServiceToken } from "./interfaces/ApiService";
import { HTTPApiService } from "./infrastructure/HTTPApiService";
import { createFactoryDIToken, buildDIContainer } from "@fioc/core";

// Define a factory
export const getDataUseCaseFactory =
  (apiService: ApiService) => (ids: string[]) =>
    apiService.getData(ids);

export const getDataUseCaseToken =
  createFactoryDIToken<typeof getDataUseCaseFactory>().as("getDataUseCase");

// Register factory with type-safe dependencies
const container = buildDIContainer()
  .register(ApiServiceToken, HttpApiService)
  .registerFactory(getDataUseCaseToken, {
    dependencies: [ApiServiceToken], // Type error if dependencies don't match factory params
    factory: getDataUseCaseFactory,
  })
  .getResult();

// Resolve and use. Type will be automatically casted to (ids: string[]) => Promise<string[]>
const getDataUseCase = container.resolve(getDataUseCaseToken);
getDataUseCase(["id1", "id2"]);
```

Or you can define a FIoC compatible factory thanks to the builder function `withDependencies`.
Pick this one for a cleaner look:

```ts
import { ApiServiceToken } from "./interfaces/ApiService";
import { HTTPApiService } from "./infrastructure/HTTPApiService";
import {
  withDependencies,
  createFactoryDIToken,
  buildDIContainer,
} from "@fioc/core";

// Types of the parameters of the factory will be automatically inferred based on the dependency tokens
export const getDataUseCaseFactory = withDependencies(
  ApiServiceToken
).defineFactory((apiService) => (ids: string[]) => {
  return apiService.getData(ids);
});

export const getDataUseCaseToken =
  createFactoryDIToken<typeof getDataUseCaseFactory>().as("getDataUseCase");

// Cleaner registration
const container = buildDIContainer()
  .register(ApiServiceToken, HTTPApiService)
  .registerFactory(getDataUseCaseToken, getDataUseCaseFactory);

// Resolve and use. Type will be automatically casted to (ids: string[]) => Promise<string[]>
const getDataUseCase = container.resolve(getDataUseCaseToken);
getDataUseCase(["id1", "id2"]);
```

### Class Factories

Use classes with `constructorToFactory`:

```ts
import { ApiServiceToken } from "./interfaces/ApiService";
import { HTTPApiService } from "./infrastructure/HTTPApiService";
import { constructorToFactory, buildDIContainer } from "@fioc/core";

export class GetDataUseCase {
  constructor(private apiService: ApiService) {}
  execute = () => this.apiService.getData();
}

export const getDataUseCaseToken =
  createDIToken<GetDataUseCase>().as("getDataUseCase");

const container = buildDIContainer()
  .register(ApiServiceToken, HTTPApiService)
  .registerFactory(getDataUseCaseToken, {
    dependencies: [ApiServiceToken],
    factory: constructorToFactory(GetDataUseCase),
  });
```

### Scopes

When registering factories, you can specify the scope of the dependency.
Available scopes are `transient`, `singleton`, and `scoped`. The default scope is `transient`.

- `transient`: The dependency is resolved each time the factory is called.
- `singleton`: The dependency is resolved once and reused for the lifetime of the container.
- `scoped`: The dependency is resolved once and reused for the lifetime of the scope.

```ts
// Singleton
const container = buildDIContainer()
  .registerFactory(getDataUseCaseToken, getDataUseCaseFactory, "singleton")
  .getResult();

const resolvedA = container.resolve(getDataUseCaseToken);
const resolvedB = container.resolve(getDataUseCaseToken);
resolvedA === resolvedB; // true
```

```ts
// Transient
const container = buildDIContainer()
  .registerFactory(getDataUseCaseToken, getDataUseCaseFactory)
  .getResult();

const resolvedA = container.resolve(getDataUseCaseToken);
const resolvedB = container.resolve(getDataUseCaseToken);

resolvedA !== resolvedB; // true
```

```ts
// Scoped
const container = buildDIContainer()
  .registerFactory(getDataUseCaseToken, getDataUseCaseFactory, "scoped")
  .getResult();

let resolvedA;
let resolvedB;

container.createScope((resolve) => {
  resolvedA = resolve(getDataUseCaseToken);
  resolvedB = resolve(getDataUseCaseToken);
});

let resolvedC;
container.createScope((resolve) => {
  resolvedC = resolve(getDataUseCaseToken);
});

resolvedA === resolvedB; // true
resolvedC !== resolvedA; // true
```

### Container Manager

Manage multiple containers for different environments or testing:

```ts
import { buildDIManager } from "@fioc/core";

const ENVIRONMENT = process.env.APP_ENV || "development";

const manager = buildDIManager()
  .registerContainer(productionContainer, "prod")
  .registerContainer(testContainer, "development")
  .getResult()
  .setDefaultContainer(ENVIRONMENT);

// Get active container
const container = manager.getContainer();
```

Use cases for Container Manager:

- Managing production vs. development environments
- Switching between online/offline implementations
- Testing with mock implementations

## FIOC Ecosystem

The FIOC ecosystem provides specialized libraries for various use cases:

- [@fioc/strict](https://www.npmjs.com/package/@fioc/strict): Enhanced type safety with compile-time validation, including type errors for unregistered or duplicate dependencies and type `never` when resolving unregistered dependencies.
- [@fioc/react](https://www.npmjs.com/package/@fioc/react): Dependency injection for React applications, with hooks and context providers for seamless integration.
- [@fioc/next](https://www.npmjs.com/package/@fioc/next): Optimized for Next.js, enabling type-safe integration with React Server Components and Server Actions.

[Back to Top ↑](#fioccore)

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests on [GitHub](https://github.com/kolostring/fioc).

## License

This library is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.
