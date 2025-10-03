# FIOC

FIOC (Functional Inversion Of Control) is a lightweight dependency injection library for JS/TS applications. It simplifies dependency management with a flexible, type-safe approach, without requiring reflection or decorators. For stricter type safety, see [@fioc/strict](#fiocstrict).

## Features

- 🪶 **Lightweight**: Zero dependencies except for Immer, integrates seamlessly
- 🎯 **No Type Casting**: Dependencies resolve to correct types automatically, without the need of casting
- 🏗️ **Builder Pattern**: Fluent API for dependency registration
- 🔄 **Immutable**: Immutable container state for safe concurrency
- 🔌 **Universal**: Works in front-end and back-end environments
- 🎮 **Flexible Factory System**: Supports value registration, factory functions, and class constructors
- 🧩 **Modular Design**: Merge containers and switch configurations easily
- 🔗 **Enhanced Type Safety**: See [@fioc/strict](#fiocstrict) for strict compile-time validation

[Jump to Basic Usage →](#basic-usage)

## Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
  - [Creating Tokens](#creating-tokens)
  - [Registering & Resolving](#registering--resolving)
- [Advanced Usage](#advanced-usage)
  - [Factories](#factories)
  - [Class Factories](#class-factories)
  - [Container Manager](#container-manager)
- [@fioc/strict](#fiocstrict)

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

Create tokens for dependencies using `createDIToken`:

```ts
import { createDIToken } from "@fioc/core";

interface ApiService {
  getData: () => string;
}

const ApiServiceToken = createDIToken<ApiService>().as("ApiService");
```

### Registering & Resolving

Register and resolve dependencies using the container builder:

```ts
import { buildDIContainer } from "@fioc/core";
import { ApiService, ApiServiceToken } from "./interfaces/ApiService";

const HttpApiService: ApiService = {
  getData: () => "Hello, World!",
};

// Register dependencies
const container = buildDIContainer()
  .register(ApiServiceToken, HttpApiService)
  .getResult();

// Resolve dependencies
const apiService = container.resolve(ApiServiceToken);
apiService.getData(); // "Hello, World!"
```

## Advanced Usage

### Factories

Factories create values based on dependencies, with type-safe dependency arrays:

```ts
import { ApiServiceToken } from "./interfaces/ApiService";

// Define a factory and its token
export const getDataUseCaseFactory =
  (apiService: ApiService) => (ids: string[]) =>
    apiService.getData(ids);

export const getDataUseCaseToken =
  createDIToken<ReturnType<typeof getDataUseCaseFactory>>().as(
    "getDataUseCase"
  );

// Register factory with type-safe dependencies
container.registerFactory({
  dependencies: [ApiServiceToken], // Get type error if dependencies don't match factory params
  token: getDataUseCaseToken,
  factory: getDataUseCaseFactory,
});

// Resolve and use
const getDataUseCase = container.resolve(getDataUseCaseToken);
getDataUseCase(["id1", "id2"]);
```

### Class Factories

Use classes with `constructorToFactory`:

```ts
import { constructorToFactory } from "@fioc/core";

export class GetDataUseCase {
  constructor(private apiService: ApiService) {}
  execute = () => this.apiService.getData();
}

export const getDataUseCaseToken =
  createDIToken<GetDataUseCase>().as("getDataUseCase");

container.registerFactory({
  dependencies: [ApiServiceToken],
  token: getDataUseCaseToken,
  factory: constructorToFactory(GetDataUseCase),
});
```

### Container Manager

Manage multiple containers for different environments or testing:

```ts
import { buildDIManager } from "@fioc/core";

const manager = buildDIManager()
  .registerContainer(productionContainer, "prod")
  .registerContainer(testContainer, "test")
  .getResult()
  .setDefaultContainer("prod");

// Get active container
const container = manager.getContainer();

// Switch containers
manager.setActiveContainer("test");
```

Use cases for Container Manager:

- Managing production vs. development environments
- Switching between online/offline implementations
- Testing with mock implementations

## @fioc/strict

For enhanced type safety with compile-time validation, use [@fioc/strict](https://www.npmjs.com/package/@fioc/strict). It provides:

- Type errors for unregistered or duplicate dependencies
- Type `never` for resolving unregistered dependencies
- Safe replacement of registrations
- Type-safe container merging

[Back to Top ↑](#fioc)

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests on [GitHub](https://github.com/kolostring/fioc).

## License

This library is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.
