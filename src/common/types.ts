/**
 * This module contains type definitions used throughout the library.
 * These types define the structure of tokens, containers, and consumers.
 */

/**
 * Represents a Dependency Injection (DI) token.
 * Tokens are unique symbols used to identify dependencies in the DI container that carry a type for casting purposes.
 *
 * @typeParam T - The type of the dependency associated with the token.
 */
export type DIToken<T> = symbol & { __type: T };

/**
 * Represents the dependencies of a DI consumer.
 * This is an array of DI tokens that the consumer depends on.
 */
export type DIConsumerDependencies = readonly DIToken<unknown>[];

/**
 * Represents the parameters of a DI consumer resolved function.
 */
export type DIConsumerParams = unknown[];

/**
 * Represents the factory parameters for a DI consumer.
 *
 * @typeParam Deps - The dependencies of the DI consumer.
 */
export type DIConsumerFactoryParams<Deps> = {
  [K in keyof Deps]: Deps[K] extends DIToken<infer U>
    ? U extends DIConsumer<infer Deps, infer Params, infer Return>
      ? Deps extends never
        ? never
        : (...args: Params) => Return
      : U
    : never;
};

/**
 * Represents a DI consumer, which is a function factory that depends on interface implementations or other consumers.
 *
 * @typeParam Deps - The dependencies of the consumer.
 * @typeParam Params - The parameters of the consumer resolved function.
 * @typeParam Return - The return type of the consumer resolved function.
 */
export type DIConsumer<
  Deps extends DIConsumerDependencies = DIConsumerDependencies,
  Params extends DIConsumerParams = DIConsumerParams,
  Return = unknown
> = {
  token: DIToken<DIConsumer<Deps, Params, Return>>;
  dependencies: Deps;
  factory: (
    ...args: DIConsumerFactoryParams<Deps>
  ) => (...params: Params) => Return;
};

/**
 * Represents the state of a DI container.
 * This is a record mapping DI tokens to their corresponding implementations.
 */
export type DIContainerState = Record<DIToken<unknown>, unknown>;

/**
 * Represents the state of a DI manager.
 * This includes the registered containers and the current container key.
 */
export type DIManagerState = {
  containers: Record<string, DIContainerState>;
  currentContainer: string;
};

/**
 * Represents a Dependency Injection (DI) container.
 * A DI container is responsible for resolving dependencies.
 */
export interface DIContainer {
  /**
   * Resolves a dependency or consumer from the container.
   *
   * @param consumer - The DI token or consumer to resolve. Consumers dependencies will be resolved recursively.
   * @returns The resolved dependency or consumer function.
   */
  resolve<
    Deps extends DIConsumerDependencies,
    Params extends DIConsumerParams,
    Return = unknown
  >(
    consumer: DIConsumer<Deps, Params, Return>
  ): (...params: Params) => Return;
  resolve<T>(token: DIToken<T>): T;

  /**
   * Retrieves the current state of the container.
   *
   * @returns The DIContainerState.
   */
  getState(): DIContainerState;
}

/**
 * Represents a builder for creating a DI container.
 * A DI container builder allows registering dependencies and consumers.
 */
export interface DIContainerBuilder {
  /**
   * Registers an implementation of an Interface/type in the container.
   *
   * @param token - The DI token representing the dependency.
   * @param value - The implementation or value of the dependency.
   * @returns The updated DIContainerBuilder instance.
   */
  register<T>(token: DIToken<T>, value: T): DIContainerBuilder;

  /**
   * Registers a consumer/use case in the container.
   *
   * @param value - The DI consumer to register.
   * @returns The updated DIContainerBuilder instance.
   */
  registerConsumer<
    Deps extends DIConsumerDependencies,
    Params extends DIConsumerParams
  >(
    value: DIConsumer<Deps, Params>
  ): DIContainerBuilder;

  /**
   * Registers one or more consumers/use cases in the container.
   *
   * @param values - The DI consumer array to register.
   * @returns The updated DIContainerBuilder instance.
   */
  registerConsumerArray<
    Deps extends DIConsumerDependencies,
    Params extends DIConsumerParams
  >(
    values: DIConsumer<Deps, Params>[]
  ): DIContainerBuilder;

  /**
   * Finalizes the container and creates a static DIContainer instance.
   *
   * @returns The finalized DIContainer instance.
   */
  makeStatic(): DIContainer;
}

/**
 * Represents a Dependency Injection (DI) manager.
 * A DI manager is responsible for managing multiple containers.
 */
export interface DIManager {
  /**
   * Retrieves a container by its key or the default container.
   *
   * @param key - The key of the container to retrieve (optional).
   * @returns The DIContainer instance associated with the key.
   */
  getContainer(key?: string): DIContainer;

  /**
   * Registers a new container in the manager.
   *
   * @param container - The DIContainer instance to register.
   * @param key - The key to associate with the container (optional).
   * @returns The updated DIManager instance.
   */
  registerContainer(container: DIContainer, key?: string): DIManager;

  /**
   * Sets the default container for the manager.
   *
   * @param key - The key of the container to set as default.
   * @returns The updated DIManager instance.
   */
  setDefaultContainer(key: string): DIManager;

  /**
   * Retrieves the current state of the manager.
   *
   * @returns The DIManagerState.
   */
  getState(): DIManagerState;
}
