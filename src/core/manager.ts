import { produce } from "immer";
import { DIContainer, DIContainerState, buildDIContainer } from "./container";

/**
 * Represents the state of a DI manager.
 * This includes the registered containers and the current container key.
 */
export type DIManagerState = {
  containers: Record<string, DIContainerState>;
  currentContainer: string;
};

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
