import { DIToken } from "./token";

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
 */
export type DIFactory<
  Key extends string,
  Deps extends readonly any[] = any[],
  Return = unknown
> = {
  token: DIToken<Return, Key>;
  dependencies: { [P in keyof Deps]: DIToken<Deps[P], string> };
  factory: (...args: Deps) => Return;
};

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
