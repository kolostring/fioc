import { produce } from "immer";
import { DIFactory } from "./factory";
import { createDIToken, DIToken } from "./token";

/**
 * Represents the state of a DI container.
 * This is a record mapping DI tokens to their corresponding implementations.
 * @template T - Array type containing the dependencies
 */
export type DIContainerState<T = unknown[]> = {
  [K in keyof T]: K extends DIToken<infer U, string> ? U : never;
};

/**
 * Core interface for a Dependency Injection (DI) container.
 * A DI container is responsible for managing and resolving dependencies at runtime.
 *
 * @template State - The type representing the container's state
 * @template D - The type of dependencies managed by the container
 */
export interface DIContainer<
  State extends DIContainerState<D> = any,
  D = unknown
> {
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

  /**
   * Creates a new scope for the container. All "scoped" dependencies resolved within the scope will be cached.
   * This is useful for creating isolated units of work that can be used across multiple parts of your application.
   *
   * @param callback Scoped code to execute
   */
  createScope<Return>(
    callback: (resolve: <T>(token: DIToken<T>) => T) => Promise<Return>
  ): Promise<Return>;
}

/**
 * DIToken for the DIContainer type.
 * Use this token to inject the DIContainer itself.
 */
export const DIContainer = createDIToken<DIContainer>().as("DIContainer");

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
    token: DIToken<Return, Key>,
    factoryWithDeps: DIFactory<Deps, Return>,
    scope?: "transient" | "singleton" | "scoped"
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
    [K in keyof T]: T[K] extends DIFactory<infer D, infer R> & {
      token: DIToken<unknown, infer Key>;
    }
      ? T[K]
      : T[K] extends {
          token: DIToken<unknown, infer Key>;
          dependencies: unknown[];
          factory: (...args: infer Deps) => infer Res;
        }
      ? { token: DIToken<unknown, Key> } & DIFactory<Deps, Res>
      : { token: DIToken<unknown, string> } & DIFactory;
  }): DIContainerBuilder;

  getResult(): DIContainer<any>;
}

function defineSingleton<
  T extends (...args: Params) => any,
  Params extends any[]
>(fn: T) {
  let instance: ReturnType<T> | undefined;

  return (...args: Params) => {
    instance ??= fn(...args);
    return instance as ReturnType<T>;
  };
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
      if (token === DIContainer) {
        throw new Error("DIContainer cannot be registered");
      }

      const newState = produce(containerState, (draft: any) => {
        draft[token as DIToken<typeof value, string>] = value;
        return draft;
      });

      return buildDIContainer(
        newState as State & { [K in typeof token]: typeof value }
      ) as unknown as ReturnType<DIContainerBuilder["register"]>;
    },
    registerFactory(token, value, scope) {
      if (typeof value !== "object") {
        throw new Error(`Factory must be an object. Got ${value} instead`);
      }

      if (token === DIContainer) {
        throw new Error("DIContainer cannot be registered");
      }

      const newState = produce(containerState, (draft: any) => {
        const val =
          scope === "singleton"
            ? { ...value, factory: defineSingleton(value.factory) }
            : value;

        draft[token] = {
          ...val,
          scope,
        };
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

          if (token === DIContainer) return diContainer as T;

          if (!(token in containerState))
            throw new Error(
              `Could not Resolve: Token Symbol(${Symbol.keyFor(
                token
              )}) not found`
            );
          const state = (containerState as any)[token];

          if (!(state as DIFactory).dependencies) {
            return state as T;
          }

          return (state as DIFactory).factory(
            ...(state as DIFactory).dependencies.map(
              (dep: DIToken<unknown, string>) => diContainer.resolve(dep)
            )
          ) as T;
        },
        async createScope(callback) {
          const instances: { [key: DIToken<any>]: any } = {};
          const scopedResolve: (typeof diContainer)["resolve"] = (
            token: DIToken<any>
          ) => {
            if (token in instances) return instances[token];

            if (token === DIContainer) return diContainer as T;

            let resolved;

            if (!(token in containerState))
              throw new Error(
                `Could not Resolve: Token Symbol(${Symbol.keyFor(
                  token
                )}) not found`
              );

            const state = (containerState as any)[token];

            if (!(state as DIFactory).dependencies) {
              resolved = state as T;
            } else {
              resolved = (state as DIFactory).factory(
                ...(state as DIFactory).dependencies.map(
                  (dep: DIToken<unknown, string>) => scopedResolve(dep)
                )
              );
            }

            if ((diContainer.getState() as any)[token]?.["scope"] === "scoped")
              instances[token] = resolved;

            return resolved;
          };

          return await callback(scopedResolve);
        },
      };

      return diContainer;
    },
  };

  return diContainer;
}
