import { produce } from "immer";
import { DIFactory } from "./factory";
import { DIToken } from "./token";

/**
 * Represents the state of a DI container.
 * This is a record mapping DI tokens to their corresponding implementations.
 * @template T - Array type containing the dependencies
 */
export type DIContainerState<T = unknown[]> = {
  [K in keyof T]: K extends DIToken<infer U, string> ? U : never;
};

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
 * Core interface for a Dependency Injection (DI) container.
 * A DI container is responsible for managing and resolving dependencies at runtime.
 *
 * @template State - The type representing the container's state
 * @template D - The type of dependencies managed by the container
 */
export interface DIContainer<State extends DIContainerState<D>, D = unknown> {
  /**
   * Resolves a dependency or factory from the container.
   * For simple values, returns the registered value.
   * For factories, resolves all dependencies and returns the factory result.
   *
   * @throws Error if the token is not registered or if any factory dependency is missing
   * @param token - The DI token to resolve
   * @returns The resolved dependency of type T
   *
   * @example
   * ```typescript
   * // Resolve a simple value
   * const api = container.resolve(ApiServiceToken);
   *
   * // Resolve a factory (automatically resolves dependencies)
   * const useCase = container.resolve(UseCaseToken);
   * ```
   */
  resolve<T, Key extends string>(
    token: DIToken<T, Key>
  ): DIToken<T, Key> extends keyof State ? T : never;

  /**
   * Retrieves the current state of the container.
   * Useful for merging containers or inspecting the container state.
   *
   * @returns The complete DIContainerState
   * @example
   * ```typescript
   * const state = container.getState();
   * const newContainer = buildDIContainer().merge(state);
   * ```
   */
  getState(): State;
}

/**
 * Builder interface for creating a strictly-typed DI container.
 * Provides compile-time validation of dependency registration and resolution.
 *
 * The strict builder ensures:
 * - No duplicate registrations
 * - All factory dependencies exist
 * - Type-safe dependency resolution
 *
 * @template DIState - The current state type of the container
 * @template D - The type of dependencies managed by the container
 *
 * @example
 * ```typescript
 * const container = buildStrictDIContainer()
 *   // Type error if ApiServiceToken is already registered
 *   .register(ApiServiceToken, new HttpApiService())
 *
 *   // Type error if dependencies are not registered
 *   .registerFactory({
 *     token: UseCaseToken,
 *     dependencies: [ApiServiceToken],
 *     factory: UseCaseFactory
 *   })
 *   .getResult();
 * ```
 */
export interface StrictDIContainerBuilder<
  DIState extends DIContainerState<D>,
  D = unknown
> {
  /**
   * Merges another container's state into this container.
   * Useful for combining multiple container configurations.
   *
   * @param containerState - The state to merge
   * @returns A new builder with the merged state
   *
   * @example
   * ```typescript
   * const combined = baseContainer
   *   .merge(featureContainer.getState())
   *   .getResult();
   * ```
   */
  merge<MD extends DIContainerState<any>>(
    containerState: MD
  ): StrictDIContainerBuilder<Merge<DIState & MD>>;

  /**
   * Registers a new value with strict type checking.
   * Will fail at compile-time if the token is already registered.
   *
   * @param token - The token to register (must not exist in container)
   * @param value - The value to register
   * @returns A new builder with the registered value
   * @throws Compile-time error if token is already registered
   *
   * @example
   * ```typescript
   * container.register(ApiServiceToken, HttpApiService)
   * // Error: Token already registered
   * container.register(ApiServiceToken, MockApiService)
   * ```
   */
  register<T, Key extends string>(
    token: DIToken<T, Key> extends keyof DIState
      ? "this token is already registered"
      : DIToken<T, Key>,
    value: T
  ): StrictDIContainerBuilder<
    Merge<DIState & Registered<DIToken<T, Key>, T, Key>>
  >;

  /**
   * Safely replaces an existing registration.
   * Useful for testing or changing implementations at runtime.
   *
   * @param token - The token to replace
   * @param value - The new value
   * @returns A new builder with the replaced value
   *
   * @example
   * ```typescript
   * container.replace(ApiServiceToken, MockApiService)
   * ```
   */
  replace<T, Key extends string>(
    token: DIToken<T, Key>,
    value: T
  ): StrictDIContainerBuilder<
    Merge<DIState & Registered<DIToken<T, Key>, T, Key>>
  >;

  /**
   * Registers a new factory with strict dependency checking.
   * Validates at compile-time that all dependencies exist.
   *
   * @param def - The factory definition
   * @returns A new builder with the registered factory
   * @throws Compile-time error if token exists or dependencies are missing
   *
   * @example
   * ```typescript
   * container.registerFactory({
   *   token: UseCaseToken,
   *   dependencies: [ApiServiceToken], // Type error if ApiServiceToken not registered or dependencies don't match factory params
   *   factory: UseCaseFactory
   * })
   * ```
   */
  registerFactory<
    Key extends string,
    Deps extends readonly any[],
    Return = unknown
  >(
    def: DIToken<Return, Key> extends keyof DIState
      ? "This token is already registered"
      : Extract<keyof DIState, DIToken<Deps[number], string>> extends never
      ? "One or more dependencies are not registered in the container"
      : DIFactory<Key, Deps, Return>
  ): StrictDIContainerBuilder<
    Merge<DIState & Registered<DIToken<Return, Key>, Return, Key>>
  >;

  /**
   * Replaces an existing factory registration.
   * Useful for testing or changing factory implementations.
   *
   * @param def - The new factory definition
   * @returns A new builder with the replaced factory
   *
   * @example
   * ```typescript
   * container.replaceFactory({
   *   token: UseCaseToken,
   *   dependencies: [MockApiToken],
   *   factory: UseCaseFactory
   * })
   * ```
   */
  replaceFactory<
    Key extends string,
    Deps extends readonly any[],
    Return = unknown
  >(
    def: DIFactory<Key, Deps, Return>
  ): StrictDIContainerBuilder<
    Merge<DIState & Registered<DIToken<Return, Key>, Return, Key>>
  >;

  /**
   * Replaces multiple factories at once.
   * Useful for bulk updates of factory implementations.
   *
   * @param values - Array of factory definitions to replace
   * @returns A new builder with all factories replaced
   *
   * @example
   * ```typescript
   * container.replaceFactoryArray([
   *   {
   *     token: UseCaseToken,
   *     dependencies: [MockApiToken],
   *     factory: UseCaseFactory
   *   },
   *   {
   *     token: OtherUseCaseToken,
   *     dependencies: [MockApiToken],
   *     factory: OtherUseCaseFactory
   *   }
   * ])
   * ```
   */
  replaceFactoryArray<T extends readonly unknown[]>(values: {
    [K in keyof T]: T[K] extends DIFactory<infer Key, infer D, infer R>
      ? T[K]
      : T[K] extends {
          token: DIToken<unknown, infer Key>;
          dependencies: unknown[];
          factory: (...args: infer Deps) => infer Res;
        }
      ? DIFactory<Key, Deps, Res>
      : DIFactory<string>;
  }): StrictDIContainerBuilder<DIState & StateFromFactories<T>>;

  /**
   * Finalizes the builder and returns an immutable container.
   *
   * @returns A DIContainer instance with the registered dependencies
   *
   * @example
   * ```typescript
   * const container = builder.getResult();
   * const api = container.resolve(ApiServiceToken);
   * ```
   */
  getResult(): DIContainer<DIState>;
}

/**
 * Represents a builder for creating an DI container.
 * A DI container builder allows registering dependencies and factories.
 */
export interface DIContainerBuilder {
  /**
   * Merges the current state of the container with the state of another container.
   *
   * @param containerState - The state to merge with the current state.
   * @returns The updated DIContainerBuilder instance.
   * @example
   * ```typescript
   * const combined = baseContainer
   *   .merge(featureContainer.getState())
   *   .getResult();
   * ```
   */
  merge<MD extends DIContainerState<any>>(
    containerState: MD
  ): DIContainerBuilder;

  /**
   * Registers a new value with the specified token. Will replace any existing value for the token.
   *
   * @param token - The token to register the value with.
   * @param value - The value to register.
   * @returns The updated DIContainerBuilder instance.
   * @example
   * ```typescript
   * container.register(ApiServiceToken, HttpApiService)
   * container.register(ApiServiceToken, MockApiService) // Replaces previous registration
   * ```
   */
  register<T, Key extends string>(
    token: DIToken<T, Key>,
    value: T
  ): DIContainerBuilder;

  /**
   * Registers a new factory with the specified token. Will replace any existing factory for the token.
   *
   * @param def - The factory definition to register.
   * @returns The updated DIContainerBuilder instance.
   * @example
   * ```typescript
   * container.registerFactory({
   *   token: UseCaseToken,
   *   dependencies: [ApiServiceToken], // Type error if dependencies don't match factory params
   *   factory: UseCaseFactory
   * })
   * ```
   */
  registerFactory<
    Key extends string,
    Deps extends readonly any[],
    Return = unknown
  >(
    def: DIFactory<Key, Deps, Return>
  ): DIContainerBuilder;

  /**
   * Registers multiple factories with the specified tokens. Will replace any existing factories for the tokens.
   *
   * @param values - The factories to register.
   * @returns The updated DIContainerBuilder instance.
   * @example
   * ```typescript
   * container.registerFactoryArray([
   *   {
   *     token: UseCaseToken,
   *     dependencies: [ApiServiceToken], // Type error if dependencies don't match factory params
   *     factory: UseCaseFactory
   *   },
   *   {
   *     token: OtherUseCaseToken,
   *     dependencies: [ApiServiceToken], // Type error if dependencies don't match factory params
   *     factory: OtherUseCaseFactory
   *   }
   * ])
   * ```
   **/
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
  }): DIContainerBuilder;

  getResult(): DIContainer<any>;
}

/**
 * Builder of a Strict Dependency Injection (DI) container.
 * The container allows registering and resolving dependencies
 * with full and strict typesafe support.
 *
 * @param containerState - The initial state of the container (optional).
 * @returns A DI container builder for registering dependencies and creating a static container.
 */
export function buildStrictDIContainer<State extends DIContainerState<T>, T>(
  containerState: State = {} as State
): StrictDIContainerBuilder<State> {
  const diContainer: StrictDIContainerBuilder<State> = {
    merge(stateToMerge) {
      return buildStrictDIContainer({
        ...containerState,
        ...stateToMerge,
      }) as any;
    },
    register(token, value) {
      if (token in containerState)
        throw new Error(
          `Token Symbol(${Symbol.keyFor(token as symbol)}) already registered`
        );

      return diContainer.replace(
        token as unknown as DIToken<T, string>,
        value as unknown
      );
    },
    replace(token, value) {
      const newState = produce(containerState, (draft: any) => {
        draft[token as DIToken<typeof value, string>] = value;
        return draft;
      });

      return buildStrictDIContainer(
        newState as State & { [K in typeof token]: typeof value }
      ) as unknown as ReturnType<StrictDIContainerBuilder<State>["register"]>;
    },
    registerFactory(value) {
      if (typeof value !== "object" || !value) {
        throw new Error(`Factory must be an object. Got ${value} instead`);
      }

      const { token, dependencies } = value;

      if (token in containerState) {
        throw new Error(
          `Token Symbol(${Symbol.keyFor(token as symbol)}) already registered`
        );
      }

      // Verify all dependencies are registered
      for (const dep of dependencies) {
        if (!(dep in containerState)) {
          throw new Error(
            `Dependency Symbol(${Symbol.keyFor(dep as symbol)}) not registered`
          );
        }
      }

      return diContainer.replaceFactory(value);
    },
    replaceFactory(value) {
      if (typeof value !== "object") {
        throw new Error(`Factory must be an object. Got ${value} instead`);
      }

      const newState = produce(containerState, (draft: any) => {
        draft[value.token] = value;
        return draft;
      });

      return buildStrictDIContainer(newState) as unknown as any;
    },
    replaceFactoryArray(values) {
      const newState = produce(containerState, (draft: any) => {
        values.forEach((value) => {
          draft[value.token] = value;
        });
        return draft;
      });

      return buildStrictDIContainer(newState) as unknown as any;
    },
    getResult(): DIContainer<State> {
      const diContainer: DIContainer<State> = {
        getState: () => containerState,
        resolve: <T, Key extends string>(toResolve: DIToken<unknown, Key>) => {
          const token = toResolve;

          if (!(token in containerState))
            throw new Error(
              `Could not Resolve: Token Symbol(${Symbol.keyFor(
                token
              )}) not found`
            );
          const state = (containerState as any)[token];

          if (!(state as DIFactory<Key>).dependencies) {
            return state as T;
          }

          return (state as DIFactory<Key>).factory(
            ...(state as DIFactory<Key>).dependencies.map(
              (dep: DIToken<unknown, string>) => diContainer.resolve(dep)
            )
          ) as T;
        },
      };

      return diContainer;
    },
  };

  return diContainer;
}

/**
 * Builder of a Strict Dependency Injection (DI) container.
 * The container allows registering and resolving dependencies
 * with full and strict typesafe support.
 *
 * @param containerState - The initial state of the container (optional).
 * @returns A DI container builder for registering dependencies and creating a static container.
 */
export function buildDIContainer<State extends DIContainerState<T>, T>(
  containerState: State = {} as State
): DIContainerBuilder {
  const diContainer: DIContainerBuilder = {
    merge(stateToMerge) {
      return buildDIContainer({
        ...containerState,
        ...stateToMerge,
      }) as any;
    },
    register(token, value) {
      const newState = produce(containerState, (draft: any) => {
        draft[token as DIToken<typeof value, string>] = value;
        return draft;
      });

      return buildDIContainer(
        newState as State & { [K in typeof token]: typeof value }
      ) as unknown as ReturnType<DIContainerBuilder["register"]>;
    },
    registerFactory(value) {
      if (typeof value !== "object") {
        throw new Error(`Factory must be an object. Got ${value} instead`);
      }

      const newState = produce(containerState, (draft: any) => {
        draft[value.token] = value;
        return draft;
      });

      return buildDIContainer(newState) as unknown as any;
    },
    registerFactoryArray(values) {
      const newState = produce(containerState, (draft: any) => {
        values.forEach((value) => {
          draft[value.token] = value;
        });
        return draft;
      });

      return buildDIContainer(newState) as unknown as any;
    },
    getResult(): DIContainer<State> {
      const diContainer: DIContainer<State> = {
        getState: () => containerState,
        resolve: <T, Key extends string>(toResolve: DIToken<unknown, Key>) => {
          const token = toResolve;

          if (!(token in containerState))
            throw new Error(
              `Could not Resolve: Token Symbol(${Symbol.keyFor(
                token
              )}) not found`
            );
          const state = (containerState as any)[token];

          if (!(state as DIFactory<Key>).dependencies) {
            return state as T;
          }

          return (state as DIFactory<Key>).factory(
            ...(state as DIFactory<Key>).dependencies.map(
              (dep: DIToken<unknown, string>) => diContainer.resolve(dep)
            )
          ) as T;
        },
      };

      return diContainer;
    },
  };

  return diContainer;
}
