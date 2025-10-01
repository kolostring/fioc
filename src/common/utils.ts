/**
 * This module provides utility functions for creating tokens, defining factories,
 * and building dependency injection containers and managers.
 */
import { produce } from "immer";
import {
  DIContainerBuilder,
  DIContainerState,
  DIManager,
  DIManagerState,
  DIToken,
  DIFactory,
  DIContainer,
  DIManagerBuilder,
} from "./types";

/**
 * Creates a Dependency Injection (DI) token.
 * Tokens are unique symbols used to identify dependencies in the DI container carrying a type for casting purposes.
 *
 * @param key - unique key for the token. Useful for debugging and serialization.
 * @returns A unique symbol representing the DI token carrying a type for casting purposes.
 */
export function createDIToken<T>() {
  return {
    as: <K extends string>(key: K): DIToken<T, K> => {
      return Symbol.for(key) as DIToken<T, K>;
    },
  };
}

/**
 * Converts a class constructor to a factory function.
 * This is useful for creating factories out of classes.
 *
 * @param Ctor - The class constructor to convert.
 * @returns A factory function that creates instances of the class.
 */
export function constructorToFactory<
  Args extends any[],
  C extends new (...args: Args) => any
>(Ctor: C): (...args: ConstructorParameters<C>) => InstanceType<C> {
  return (...args) => new Ctor(...args);
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
    register(token, value) {
      if (token in containerState)
        throw new Error(
          `Token ${Symbol.keyFor(token as symbol)} already registered`
        );

      const newState = produce(containerState, (draft: any) => {
        draft[token as DIToken<typeof value, string>] = value;
        return draft;
      });

      return buildDIContainer(
        newState as State & { [K in typeof token]: typeof value }
      ) as unknown as ReturnType<DIContainerBuilder<State>["register"]>;
    },
    registerFactory(value) {
      if (typeof value !== "object") {
        throw new Error(`Factory must be an object. Got ${value} instead`);
      }

      if (value.token in containerState)
        throw new Error(
          `Token ${Symbol.keyFor(value.token as symbol)} already registered`
        );

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

/**
 * Builds a Dependency Injection (DI) container manager.
 * The manager allows managing multiple containers and switching between them.
 *
 * @param containerManagerState - The initial state of the manager (optional).
 * @returns A DI manager for managing containers and their states.
 */
export function buildDIContainerManager(
  containerManagerState: DIManagerState = {
    containers: {},
    currentContainer: "default",
  }
): DIManagerBuilder {
  const { containers, currentContainer } = containerManagerState;

  const diManagerBuilder: DIManagerBuilder = {
    registerContainer(container, key: string = "default") {
      if (containers[key]) throw new Error(`Container ${key} already exists`);
      const newContainersState = produce(containers, (draft) => {
        draft[key] = container.getState();
        return draft;
      });
      return buildDIContainerManager({
        containers: newContainersState,
        currentContainer,
      });
    },
    getResult(): DIManager {
      const diManager: DIManager = {
        getContainer(key: string | undefined) {
          if (!containers[key ?? currentContainer])
            throw new Error("Container not found");
          return buildDIContainer(
            containers[key ?? currentContainer]
          ).getResult();
        },
        setDefaultContainer(key: string) {
          if (!(key in containers)) {
            throw new Error(`Container ${key} not found`);
          }

          return buildDIContainerManager({
            ...containerManagerState,
            currentContainer: key,
          }).getResult();
        },
        getState() {
          return containerManagerState;
        },
      };

      return diManager;
    },
  };

  return diManagerBuilder;
}
