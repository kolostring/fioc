/**
 * This module contains type definitions used throughout the library.
 * These types define the structure of tokens, containers, and factories.
 */

/**
 * Represents a Dependency Injection (DI) token.
 * Tokens are unique symbols used to identify dependencies in the DI container that carry a type for casting purposes.
 *
 * @typeParam T - The type of the dependency associated with the token.
 */
export type DIToken<T, K extends string> = symbol & {
  __type: T;
  __key: K;
};

/**
 * Represents the dependencies of a DI factory.
 * This is an array of DI tokens that the factory depends on.
 */
export type DIFactoryDependencies = readonly unknown[];

/**
 * Represents the factory parameters for a DI factory.
 *
 * @typeParam Deps - The dependencies of the DI factory.
 */
export type DIFactoryFactoryTokenParams<
  Deps extends readonly unknown[],
  Key extends string
> = {
  [K in keyof Deps]: DIToken<Deps[K], Key>;
};

/**
 * Represents a DI factory, which is a function factory that depends on interface implementations or other factories.
 *
 * @typeParam Deps - The dependencies of the factory.
 * @typeParam Return - The return type of the factory resolved function.
 */
export type DIFactory<
  Key extends string,
  Deps extends readonly unknown[] = unknown[],
  Return = unknown
> = {
  token: DIToken<Return, Key>;
  dependencies: DIFactoryFactoryTokenParams<Deps, string>;
  factory: (...args: Deps) => Return;
};

/**
 * Represents the state of a DI container.
 * This is a record mapping DI tokens to their corresponding implementations.
 */
export type DIContainerState = {
  [token: symbol]: unknown;
};

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
export interface DIContainer<State extends DIContainerState> {
  /**
   * Resolves a dependency or factory from the container.
   *
   * @param factory - The DI token or factory to resolve. Factories dependencies will be resolved recursively.
   * @returns The resolved dependency or factory function.
   */
  // resolve<Deps extends DIFactoryDependencies, Return = unknown>(
  //   factory: DIFactory<Deps, Return>
  // ): Return;
  resolve<T, Key extends string>(
    token: DIToken<T, Key>
  ): DIToken<T, Key> extends keyof State ? T : never;

  /**
   * Retrieves the current state of the container.
   *
   * @returns The DIContainerState.
   */
  getState(): DIContainerState;
}

type Merge<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
type Registered<Token extends DIToken<T, Key>, T, Key extends string> = {
  [K in Token]: T;
};

type UnionToIntersection<U> = (U extends any ? (x: U) => any : never) extends (
  x: infer I
) => any
  ? I
  : never;

type StateFromFactories<T extends readonly unknown[]> = Merge<
  UnionToIntersection<
    {
      [K in keyof T]: T[K] extends DIFactory<infer Key, any, infer R>
        ? Registered<DIToken<R, Key>, R, Key>
        : never;
    }[number]
  >
>;

/**
 * Represents a builder for creating a DI container.
 * A DI container builder allows registering dependencies and factories.
 */
export interface DIContainerBuilder<DIState extends DIContainerState> {
  /**
   * Registers an implementation of an Interface/type in the container.
   *
   * @param token - The DI token representing the dependency.
   * @param value - The implementation or value of the dependency.
   * @returns The updated DIContainerBuilder instance.
   */
  register<T, Key extends string>(
    token: DIToken<T, Key> extends keyof DIState
      ? "this token is already registered"
      : DIToken<T, Key>,
    value: T
  ): DIContainerBuilder<Merge<DIState & Registered<DIToken<T, Key>, T, Key>>>;

  /**
   * Registers a factory/use case in the container.
   *
   * @param value - The DI factory to register.
   * @returns The updated DIContainerBuilder instance.
   */
  registerFactory<
    Key extends string,
    const Deps extends DIFactoryDependencies,
    Return = unknown
  >(
    def: DIToken<Return, Key> extends keyof DIState
      ? "this token is already registered"
      : DIFactory<Key, Deps, Return>
  ): DIContainerBuilder<
    Merge<DIState & Registered<DIToken<Return, Key>, Return, Key>>
  >;

  /**
   * Registers one or more factories/use cases in the container.
   *
   * @param values - The DI factory array to register.
   * @returns The updated DIContainerBuilder instance.
   */
  registerFactoryArray<T extends readonly unknown[]>(values: {
    [K in keyof T]: T[K] extends DIFactory<infer Key, infer D, infer R>
      ? T[K]
      : T[K] extends {
          token: DIToken<unknown, infer Key>;
          dependencies: unknown[];
          factory: (...args: infer Deps) => infer Res;
        }
      ? DIFactory<Key, Deps, Res>
      : DIFactory<string>;
  }): DIContainerBuilder<DIState & StateFromFactories<T>>;

  /**
   * Finalizes the container and creates a static DIContainer instance.
   *
   * @returns The finalized DIContainer instance.
   */
  getResult(): DIContainer<DIState>;
}

/**
 * Represents a builder for creating a DI manager.
 * A DI manager builder allows registering containers.
 */
export interface DIManagerBuilder {
  /**
   * Registers a new container in the manager.
   *
   * @param container - The DIContainer instance to register.
   * @param key - The key to associate with the container (optional).
   * @returns The updated DIManagerBuilder instance.
   */
  registerContainer(
    container: DIContainer<any>,
    key?: string
  ): DIManagerBuilder;

  /**
   * Finalizes the manager and creates a static DIManager instance.
   * @returns The finalized DIManager instance.
   */
  getResult(): DIManager;
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
  getContainer(key?: string): DIContainer<any>;

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
