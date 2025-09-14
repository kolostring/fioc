/**
 * This module provides utility functions for creating tokens, defining consumers,
 * and building dependency injection containers and managers.
 */
import { produce } from "immer";
import {
  DIContainerBuilder,
  DIContainerState,
  DIManager,
  DIManagerState,
  DIToken,
  DIConsumer,
  DIContainer,
  DIConsumerDependencies,
  DIManagerBuilder,
} from "./types";

/**
 * Creates a Dependency Injection (DI) token.
 * Tokens are unique symbols used to identify dependencies in the DI container carrying a type for casting purposes.
 *
 * @param desc - A description for the token, useful for debugging.
 * @returns A unique symbol representing the DI token carrying a type for casting purposes.
 */
export function createDIToken<T>(desc: string): DIToken<T> {
  return Symbol(desc) as DIToken<T>;
}

/**
 * Converts a class constructor to a factory function.
 * This is useful for creating consumers out of classes.
 *
 * @param Ctor - The class constructor to convert.
 * @returns A factory function that creates instances of the class.
 */
export function toFactory<
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
export function buildDIContainer(
  containerState: DIContainerState = {}
): DIContainerBuilder {
  const diContainer: DIContainerBuilder = {
    register<T>(token: DIToken<T>, value: T): DIContainerBuilder {
      const newState = produce(containerState, (draft) => {
        draft[token] = value;
        return draft;
      });

      return buildDIContainer(newState);
    },
    registerConsumer(value): DIContainerBuilder {
      const newState = produce(containerState, (draft) => {
        draft[value.token] = value;
        return draft;
      });

      return buildDIContainer(newState);
    },
    registerConsumerArray<T extends readonly DIConsumer[]>(
      values: T
    ): DIContainerBuilder {
      const newState = produce(containerState, (draft) => {
        values.forEach((value) => {
          draft[value.token] = value;
        });
        return draft;
      });

      return buildDIContainer(newState);
    },
    getResult(): DIContainer {
      const diContainer: DIContainer = {
        getState: () => containerState,
        resolve: (
          consumer:
            | DIConsumer<DIConsumerDependencies, unknown>
            | DIToken<unknown>
        ) => {
          if (typeof consumer === "symbol") {
            const token = consumer;

            if (!(token in containerState))
              throw new Error(
                `Could not Resolve: Token Symbol(${token.description}) not found`
              );
            const state = containerState[token];

            if (!(state as DIConsumer).dependencies) {
              return state as () => unknown;
            }

            return (state as DIConsumer).factory(
              ...(state as DIConsumer).dependencies.map(
                (dep: DIToken<unknown>) => diContainer.resolve(dep)
              )
            );
          } else {
            return consumer.factory(
              ...consumer.dependencies.map((dep: DIToken<unknown>) =>
                diContainer.resolve(dep)
              )
            );
          }
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
