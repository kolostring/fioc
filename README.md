# FIOC

FIOC (Functional Inversion Of Control) is a lightweight dependency injection library for JS/TS applications. It simplifies the management of dependencies by providing a flexible and **type-safe** way to define, register, and resolve dependencies, without the need of reflection or decorators.

**Now also with class support!**

## Features

- **Type-Safe Dependency Injection**: Define and resolve dependencies with full TypeScript support. No need to cast.
- **Non String Tokens**: Define and resolve dependencies with non-string tokens.
- **Lightweight**: Minimal overhead, designed to integrate seamlessly into your existing projects.
- **As Complex as You Want**: Going from just registering implementations of interfaces to registering factories/use cases (and even classes) with recursive dependencies resolution.

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

### 3. Configuring the Container Manager (Optional)

The Container Manager allows you to register multiple containers and switch between them. Really useful when having multiple environments (like fetching from an API when "online" or fetching from local storage when "offline"). Also realy useful for mocking interfaces.

Use the `buildDIManager` function to create a Container Manager.

You can set the default container by calling the `setDefaultContainer` method. If no key is provided to a container, it will be set as the default container.

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

## Factories

Let's call **Factories** to all functions that based on parameters (dependencies) "constructs" a value, instance or function. The most common use is for **Use Cases** in business logic, a function that depends on Services or repositories.

How to build a compatible factory:

- Start by defining a simple function, which will be the factory.
- the token with the return type of the factory.

```ts
import { ApiServiceToken } from "./interfaces/ApiService";

export const getDataUseCaseFactory = (apiService: ApiService) => () =>
  apiService.getData();

export const getDataUseCaseToken =
  defineDIToken<ReturnType<typeof getDataUseCaseFactory>>("getDataUseCase");
```

Finally, register the factory into the container. You need to define an array of dependencies in form of tokens. This will allow the container to resolve the dependencies recursively.

The container is fully type-safe, so don´t worry about forgetting dependencies or using the wrong type.

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
    .registerFactory({
      dependencies: [ApiServiceToken], // if dependencies types don't match with your factory params (including the order), you will get a type error
      token: getDataUseCaseToken,
      factory: getDataUseCaseFactory,
    })
    .getResult()
);
```

To resolve a factory, just use regular `resolve` method. Tho keep in mind any time you resolve a factory, the dependencies will be resolved recursively **every time**. You can implement yourself a cache to avoid this.

## Classes Factory

Factories can also be classes. You can use the function `constructorToFactory` to convert a class constructor to a factory function, or you can do it yourself.

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
    .registerFactory({
      dependencies: [ApiServiceToken], // if dependencies types don't match with your factory params (including the order), you will get a type error
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
