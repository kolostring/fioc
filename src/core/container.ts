import { produce } from "immer";
import { DIFactory, DIFactoryDependencies } from "./factory";
import { DIToken } from "./token";

/**
 * Represents the state of a DI container.
 * This is a record mapping DI tokens to their corresponding implementations.
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
 * Represents a Dependency Injection (DI) container.
 * A DI container is responsible for resolving dependencies.
 */
export interface DIContainer<State extends DIContainerState<D>, D = unknown> {
  /**
   * Resolves a dependency or factory from the container.
   *
   * @throws Error if the token is not registered.
   * @param token - The DI token to resolve.
   * @returns The resolved dependency.
   */
  resolve<T, Key extends string>(
    token: DIToken<T, Key>
  ): DIToken<T, Key> extends keyof State ? T : never;

  /**
   * Retrieves the current state of the container. Useful for merging with other containers.
   *
   * @returns The DIContainerState.
   */
  getState(): State;
}

/**
 * Represents a builder for creating a DI container.
 * A DI container builder allows registering dependencies and factories.
 */
export interface DIContainerBuilder<
  DIState extends DIContainerState<D>,
  D = unknown
> {
  merge<MD extends DIContainerState<any>>(
    containerState: MD
  ): DIContainerBuilder<Merge<DIState & MD>>;

  register<T, Key extends string>(
    token: DIToken<T, Key> extends keyof DIState
      ? "this token is already registered"
      : DIToken<T, Key>,
    value: T
  ): DIContainerBuilder<Merge<DIState & Registered<DIToken<T, Key>, T, Key>>>;

  overwrite<T, Key extends string>(
    token: DIToken<T, Key>,
    value: T
  ): DIContainerBuilder<Merge<DIState & Registered<DIToken<T, Key>, T, Key>>>;

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
  ): DIContainerBuilder<
    Merge<DIState & Registered<DIToken<Return, Key>, Return, Key>>
  >;

  overwriteFactory<
    Key extends string,
    const Deps extends DIFactoryDependencies,
    Return = unknown
  >(
    def: DIFactory<Key, Deps, Return>
  ): DIContainerBuilder<
    Merge<DIState & Registered<DIToken<Return, Key>, Return, Key>>
  >;

  overwriteFactoryArray<T extends readonly unknown[]>(values: {
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

  getResult(): DIContainer<DIState>;
}

/**
 * Builder of a Dependency Injection (DI) container.
 * The container allows registering and resolving dependencies.
 *
 * @param containerState - The initial state of the container (optional).
 * @returns A DI container builder for registering dependencies and creating a static container.
 */
export function buildDIContainer<State extends DIContainerState<T>, T>(
  containerState: State = {} as State
): DIContainerBuilder<State> {
  const diContainer: DIContainerBuilder<State> = {
    merge(stateToMerge) {
      return buildDIContainer({ ...containerState, ...stateToMerge }) as any;
    },
    register(token, value) {
      if (token in containerState)
        throw new Error(
          `Token Symbol(${Symbol.keyFor(token as symbol)}) already registered`
        );

      return diContainer.overwrite(
        token as unknown as DIToken<T, string>,
        value as unknown
      );
    },
    overwrite(token, value) {
      const newState = produce(containerState, (draft: any) => {
        draft[token as DIToken<typeof value, string>] = value;
        return draft;
      });

      return buildDIContainer(
        newState as State & { [K in typeof token]: typeof value }
      ) as unknown as ReturnType<DIContainerBuilder<State>["register"]>;
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

      return diContainer.overwriteFactory(value);
    },
    overwriteFactory(value) {
      if (typeof value !== "object") {
        throw new Error(`Factory must be an object. Got ${value} instead`);
      }

      const newState = produce(containerState, (draft: any) => {
        draft[value.token] = value;
        return draft;
      });

      return buildDIContainer(newState) as unknown as any;
    },
    overwriteFactoryArray(values) {
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
