import { DIToken } from "./token";

/**
 * Represents a factory definition in the DI container.
 * Factories are used to create instances that depend on other registered services.
 *
 * @template Key - The string literal type for the token key
 * @template Deps - Tuple type of the factory's dependencies
 * @template Return - The type that the factory produces
 *
 * @example
 * ```typescript
 * // Simple factory with one dependency
 *
 *  const userServiceFactory: DIFactory<"UserService", [ApiService]> = {
 *   token: UserServiceToken,
 *   dependencies: [ApiServiceToken],
 *   factory: UserServiceFactory
 * };
 *
 * // Factory with multiple dependencies
 * const complexFactory: DIFactory<"Complex", [Logger, Config, Api]> = {
 *   token: ComplexToken,
 *   dependencies: [LoggerToken, ConfigToken, ApiToken],
 *   factory: ComplexFactory
 * };
 * ```
 */
export type DIFactory<
  Deps extends readonly unknown[] = unknown[],
  Return = unknown
> = {
  /**
   * Array of tokens representing the dependencies required by this factory
   * The order must match the parameters of the factory function
   */
  dependencies: { [P in keyof Deps]: DIToken<Deps[P], string> };

  /**
   * The factory function that creates the instance
   * Parameters types must match the types of the dependencies in order
   */
  factory: (...args: Deps) => Return;
};

export type FactoryReturnType<F> = F extends DIFactory<any, infer R>
  ? R
  : never;

export type ReturnTypeOfFactory<F> = F extends DIFactory<any, infer R>
  ? R
  : never;

/**
 * Converts a class constructor into a factory function for use with FIOC.
 * This helper makes it easier to use classes with the DI container.
 *
 * @param constructor - The class constructor to convert
 * @returns A factory function compatible with FIOC's factory system
 *
 * @example
 * ```typescript
 * class UserService {
 *   constructor(private api: ApiService, private logger: Logger) {}
 *
 *   getCurrentUser() {
 *     this.logger.log("Getting user...");
 *     return this.api.getUser();
 *   }
 * }
 *
 * // Register the class using constructorToFactory
 * container.registerFactory({
 *   token: UserServiceToken,
 *   dependencies: [ApiServiceToken, LoggerToken],
 *   factory: constructorToFactory(UserService)
 * });
 * ```
 */
export const constructorToFactory =
  <T extends new (...args: any[]) => any>(constructor: T) =>
  (...args: ConstructorParameters<T>): InstanceType<T> =>
    new constructor(...args);

/**
 * Utility function for creating a DIFactory
 *
 * @param dependencies - Factory's dependencies as tokens
 * @returns A factory builder
 */
export function withDependencies<Deps extends readonly unknown[]>(
  ...dependencies: { [P in keyof Deps]: DIToken<Deps[P], string> }
) {
  return {
    /**
     * Creates a DIFactory with the specified dependencies and factory function.
     *
     * @param factory - The factory function to use
     * @returns A DIFactory with the specified dependencies and factory function
     */
    defineFactory: <Return>(
      factory: (...deps: Deps) => Return
    ): DIFactory<Deps, Return> => ({
      dependencies,
      factory,
    }),
  };
}
