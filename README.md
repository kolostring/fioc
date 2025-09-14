# FIOC

FIOC (Functional Inversion Of Control) is a lightweight dependency injection library for JS/TS applications. It simplifies the management of dependencies in your functional environments by providing a flexible and type-safe way to define, register, and resolve dependencies, without the need of reflection, decorators.

Now also with class support!

## Features

- **Type-Safe Dependency Injection**: Define and resolve dependencies with full TypeScript support. No need to cast.
- **Non String Tokens**: Define and resolve dependencies with non-string tokens.
- **Lightweight**: Minimal overhead, designed to integrate seamlessly into your existing projects.
- **As Complex as You Want**: Going from just registering implementations of interfaces to registering consumers/use cases with recursive dependencies resolution.

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

## Getting Started

For the sake of simplicity, we'll start by just registering implementations of interfaces into the container.

### 1. Create DIToken

Use the `createDIToken` function to define tokens for your types/interfaces. These will be used by the container to locate the related implementation:

```ts
import { createDIToken } from "fioc";

interface ApiService {
  getData: () => string;
}

const ApiServiceToken = createDIToken<ApiService>("ApiService");
```

### 2. Register Implementations

Use the `buildDIContainer` function to build a Dependency Injection Container and register your implementations. You can chain the `register` method to register multiple implementations. When you're done , call the `getResult` method to create a read-only container:

```ts
import { ApiService, ApiServiceToken } from "./interfaces/ApiService";
import { buildDIContainer } from "fioc";

const HttpApiService: ApiService = {
  getData: () => "Hello, World!",
};

const onlineContainer = buildDIContainer()
  .register(ApiServiceToken, HttpApiService)
  .getResult();
```

### 3. Configuring the Container Manager

Use the `buildDIManager` function to create a Container Manager. It allows you to register multiple containers and switch between them. Really useful when having multiple environments (like fetching from an API when "online" or fetching from local storage when "offline"). Also realy useful for mocking interfaces.

You can set the default container by calling the `setDefaultContainer` method. If no key is provided for a container, it will be set as the default container.

```ts
import { buildDIManager } from "fioc";
import { onlineContainer, offlineContainer } from "./containers";

export const DIManager = buildDIManager()
  .registerContainer(onlineContainer, "online")
  .registerContainer(offlineContainer, "offline")
  .getResult()
  .setDefaultContainer("online");
```

### 5. Resolve Dependencies

Use `getContainer` function to get the default container and the `resolve` function to resolve dependencies:

```ts
import { DIManager } from "./dimanager";
import { ApiServiceToken } from "./interfaces/ApiService";

const service = DIManager.getContainer().resolve(ApiServiceToken);
```

## Consumers/Use Cases/Services

Let's call **Consumers** to all functions, classes or values that have dependencies to interfaces or other consumers. The most common use is for **Use Cases** in business logic. For example, a use case might be to get some data from a repository.

To build a consumer:

- Start by defining a factory.
- the token with the return type of the factory.
- Register the consumer with its dependencies into the container.

```ts
import { ApiServiceToken } from "./interfaces/ApiService";

export const getDataUseCaseFactory = (apiService: ApiService) => () =>
  apiService.getData();

export const getDataUseCaseToken =
  defineDIToken<ReturnType<typeof getDataUseCaseFactory>>("getDataUseCase");
```

```ts
import { ApiService, ApiServiceToken } from "./interfaces/ApiService";
import { buildDIManager, buildDIContainer } from "fioc";
import {
  getDataUseCaseToken,
  getDataUseCaseFactory,
} from "./useCases/getDataUseCase";

const ApiServiceImpl: ApiService = {
  getData: () => "Hello, World!",
};

const DIManager = buildDIManager().registerContainer(
  buildDIContainer()
    .register(ApiServiceToken, ApiServiceImpl)
    .registerConsumer({
      dependencies: [ApiServiceToken], // if dependencies types doesn't match with your factory params (including the order), you will get a type error
      token: getDataUseCaseToken,
      factory: getDataUseCaseFactory,
    })
    .getResult()
);
```

To resolve a consumer, just use regular `resolve` method. Tho keep in mind any time you resolve a consumer, the dependencies will be resolved recursively **every time**. You can implement yourself a cache to avoid this.

## Consumer Classes

Consumers can also be classes. You can use the function `constructorToFactory` to convert a class constructor to a factory function.

```ts
import { ApiService, ApiServiceToken } from "./interfaces/ApiService";
import { buildDIManager, buildDIContainer, constructorToFactory } from "fioc";

const ApiServiceImpl: ApiService = {
  getData: () => "Hello, World!",
};

export class GetDataUseCase {
  constructor(private apiService: ApiService) {}
  execute = () => this.apiService.getData();
}

export const getDataUseCaseToken =
  defineDIToken<GetDataUseCase>("getDataUseCase");

const ApiServiceImpl: ApiService = {
  getData: () => "Hello, World!",
};

const DIManager = buildDIManager().registerContainer(
  buildDIContainer()
    .register(ApiServiceToken, ApiServiceImpl)
    .registerConsumer({
      dependencies: [ApiServiceToken], // if dependencies types doesn't match with your factory params (including the order), you will get a type error
      token: getDataUseCaseToken,
      factory: constructorToFactory(GetDataUseCase),
    })
    .getResult()
);
```

## License

This library is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests on [GitHub](https://github.com/kolostring/fioc).

## Acknowledgments

Special thanks to the open-source community for inspiring this project.
