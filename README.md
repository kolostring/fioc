# FIOC

FIOC (Functional Inversion Of Control) is a lightweight dependency injection library for JS/TS applications. It simplifies the management of dependencies by providing a flexible and **type-safe** way to define, register, and resolve dependencies, without the need of reflection or decorators.

## Features

- 🪶 **Lightweight**: Zero dependencies except for Immer, designed to integrate seamlessly into your existing projects
- 🔒 **Type-safe by design**: Get compile-time validation of your dependency tree
- 🎯 **No Type Casting**: Dependencies are automatically resolved to their correct types
- 🛡️ **Compile-time Validation**: Catch dependency registration errors before running your app
- 🏗️ **Builder Pattern**: Fluent API for registering and managing dependencies
- 🔄 **Immutable**: Container state is immutable for safe concurrent usage
- 🔌 **Universal**: Works in both front-end and back-end environments
- 🎮 **Flexible Factory System**: Support for value registration, factory functions, and class constructors
- 🧩 **Modular Design**: Merge containers and switch between different configurations easily

[Jump to Basic Usage →](#basic-usage)

## Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
  - [Creating Tokens](#creating-tokens)
  - [Registering & Resolving](#registering--resolving)
- [Advanced Usage](#advanced-usage)
  - [Factories](#factories)
  - [Class Factories](#class-factories)
  - [Type-Safe Container Features](#type-safe-container-features)
  - [Container Manager](#container-manager)

## Installation

Install the library using npm, pnpm or yarn:

```bash
npm install fioc
```

```bash
pnpm install fioc
```

```bash
yarn add fioc
```

## Basic Usage

### Creating Tokens

First, create tokens for your dependencies using the `createDIToken` function. The token is a type-safe identifier for your dependency:

```ts
import { createDIToken } from "fioc";

interface ApiService {
  getData: () => string;
}

const ApiServiceToken = createDIToken<ApiService>().as("ApiService");
```

### Registering & Resolving

Register your implementations using the container builder and resolve them when needed:

```ts
import { buildDIContainer } from "fioc";
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

Factories are functions that construct values based on other dependencies. Common use cases include creating use cases that depend on services or repositories:

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

// Register the factory with its dependencies
container.registerFactory({
  dependencies: [ApiServiceToken],
  token: getDataUseCaseToken,
  factory: getDataUseCaseFactory,
});

// Resolve and use the factory
const getDataUseCase = container.resolve(getDataUseCaseToken); // Type infers as (ids: string[]) => Promise<string>
getDataUseCase(); // Calls apiService.getData()
```

### Class Factories

You can also use classes with FIOC. The `constructorToFactory` helper converts class constructors to factory functions:

```ts
import { constructorToFactory } from "fioc";

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

### Type-Safe Container Features

For enhanced type safety, use `buildStrictDIContainer`. It provides compile-time validation of your dependency tree:

```ts
import { buildStrictDIContainer } from "fioc";

const container = buildStrictDIContainer()
  // Error if token already registered
  .register(ApiServiceToken, HttpApiService)

  // Error if dependencies not registered
  .registerFactory({
    dependencies: [ApiServiceToken],
    token: useCaseToken,
    factory: myFactory,
  })

  // Safe replacement of existing registrations
  .replace(ApiServiceToken, newImplementation)
  .replaceFactory({
    dependencies: [NewApiServiceToken],
    token: useCaseToken,
    factory: newFactory,
  })
  .getResult();
```

### Container Manager

The Container Manager allows you to manage multiple containers - useful for different environments or testing:

```ts
import { buildDIManager } from "fioc";

const manager = buildDIManager()
  .registerContainer(productionContainer, "prod")
  .registerContainer(testContainer, "test")
  .getResult()
  .setDefaultContainer("prod");

// Get the active container
const container = manager.getContainer();

// Switch containers
manager.setActiveContainer("test");
```

Use cases for Container Manager:

- Managing different environments (production vs development)
- Switching between online/offline implementations
- Testing with mock implementations

[Back to Top ↑](#fioc)

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests on [GitHub](https://github.com/kolostring/fioc).

## License

This library is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.
