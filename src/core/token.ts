/**
 * This module contains token-related type definitions and functions.
 */

/**
 * DIToken is a type-safe identifier for dependency injection.
 * It uses symbols internally to ensure uniqueness and type safety.
 *
 * @template T - The type of the dependency this token represents
 * @template Key - A string literal type used for the symbol key
 *
 * @example
 * ```typescript
 * interface ApiService {
 *   getData(): Promise<Data>;
 * }
 *
 * // Create a token for the ApiService interface
 * const ApiServiceToken = createDIToken<ApiService>().as("ApiService");
 * ```
 */
export type DIToken<T, Key extends string = string> = symbol & {
  __TYPE__: T;
  __KEY__: Key;
};

/**
 * Creates a new DI token with type safety.
 * The token acts as a unique key in the DI container while preserving type information.
 *
 * @template T - The type that this token will represent
 * @returns A token builder with the type information
 *
 * @example
 * ```typescript
 * // Basic token creation
 * const token = createDIToken<string>().as("configToken");
 *
 * // Interface token creation
 * interface UserService {
 *   getCurrentUser(): User;
 * }
 * const userServiceToken = createDIToken<UserService>().as("UserService");
 * ```
 */
export const createDIToken = <T>() => ({
  /**
   * Finalizes the token creation with a unique key.
   * The key is used for type safety, debugging and serialization.
   *
   * @param key - A unique string identifier for this token
   * @returns A type-safe DI token
   * ```
   */
  as: <Key extends string>(key: Key): DIToken<T, Key> =>
    Symbol.for(key) as DIToken<T, Key>,
});
