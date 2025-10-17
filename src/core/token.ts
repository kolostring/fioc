/**
 * This module contains token-related type definitions and functions.
 */

import { DIFactory } from "./factory";

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
export type DIToken<T, Key extends string = string> = {
  key: Key;
  metadata?: DITokenMetadata<T>;
  __TYPE__: T;
};

/**
 * Represents the metadata associated with a DIToken.
 *
 * @template T - The type of the token
 */
export type DITokenMetadata<T> = {
  implements?: T extends DIFactory
    ? DIToken<ReturnType<T["factory"]>>[]
    : DIToken<T>[];
  generics?: DIToken<any>[];
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
  as: <Key extends string>(
    key: Key,
    metadata?: DITokenMetadata<T>
  ): DIToken<T, Key> =>
    ({
      key,
      metadata,
    } as DIToken<T, Key>),
});

/**
 * Creates a new DI token with type safety for a factory.
 * The token acts as a unique key in the DI container while preserving type information.
 *
 * @template T - The factory type that this token will represent
 * @returns A token builder with the type information
 *
 * @example
 * ```typescript
 * // Basic token creation
 * const token = createDIToken<DIFactory<string>>().as("configToken");
 * ```
 */
export const createFactoryDIToken = <T>() => ({
  /**
   * Finalizes the token creation with a unique key.
   * The key is used for type safety, debugging and serialization.
   *
   * @param key - A unique string identifier for this token
   * @returns A type-safe DI token
   * ```
   */
  as: <Key extends string>(key: Key, metadata?: DITokenMetadata<T>) =>
    ({ key, metadata } as DIToken<
      T extends DIFactory<any, infer R> ? R : never,
      Key
    >),
});
