/**
 * This module contains token-related type definitions and functions.
 */

/**
 * Represents a Dependency Injection (DI) token.
 * Tokens are unique symbols used to identify dependencies in the DI container that carry a type for casting purposes.
 *
 * @typeParam T - The type of the dependency associated with the token.
 * @typeParam K - The key type for the token.
 */
export type DIToken<T, K extends string> = symbol & {
  __type: T;
  __key: K;
};

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
