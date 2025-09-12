import { describe, expect, it } from "vitest";
import {
  buildContainer,
  createDIToken,
  defineDIConsumer,
} from "../../common/utils";

interface RepoA {
  getFooA: () => string;
}
const RepoA = createDIToken<RepoA>("RepoA");

interface RepoB {
  getFooB: () => string;
}
const RepoB = createDIToken<RepoB>("RepoB");

describe("Dependency Injection Container", () => {
  it("should resolve implementations correctly", () => {
    const repoAImpl: RepoA = { getFooA: () => "RepoA Result" };
    const repoBImpl: RepoB = { getFooB: () => "RepoB Result" };

    const container = buildContainer({
      [RepoA]: repoAImpl,
      [RepoB]: repoBImpl,
    }).makeStatic();

    const resolvedA = container.resolve(RepoA).getFooA();
    const resolvedB = container.resolve(RepoB).getFooB();

    expect(resolvedA).toBe("RepoA Result");
    expect(resolvedB).toBe("RepoB Result");
  });

  it("should resolve consumers", () => {
    const consumerC = defineDIConsumer({
      dependencies: [RepoA],
      factory: (repoA) => () => `Consumer C depends on ${repoA.getFooA()}`,
      description: "consumerC",
    });

    const repoAImpl: RepoA = { getFooA: () => "A" };

    const container = buildContainer()
      .register(RepoA, repoAImpl)
      .registerConsumer(consumerC)
      .makeStatic();

    const resolvedA = container.resolve(consumerC)();
    expect(resolvedA).toBe("Consumer C depends on A");
  });

  it("should resolve consumers arrays", () => {
    const repoAImpl: RepoA = { getFooA: () => "A" };

    const consumerC = defineDIConsumer({
      dependencies: [RepoA],
      factory: (repoA) => () => `Consumer C depends on ${repoA.getFooA()}`,
      description: "consumerC",
    });

    const consumerD = defineDIConsumer({
      dependencies: [RepoA],
      factory: (repoA) => () => `Consumer D depends on ${repoA.getFooA()}`,
      description: "consumerD",
    });

    const container = buildContainer()
      .register(RepoA, repoAImpl)
      .registerConsumerArray([consumerC, consumerD])
      .makeStatic();

    const resolvedAC = container.resolve(consumerC)();
    expect(resolvedAC).toBe("Consumer C depends on A");
    const resolvedAD = container.resolve(consumerD)();
    expect(resolvedAD).toBe("Consumer D depends on A");
  });

  it("should resolve consumers recursively", () => {
    const consumerC = defineDIConsumer({
      dependencies: [RepoA],
      factory: (repoA) => () => `Consumer C depends on ${repoA.getFooA()}`,
      description: "consumerC",
    });

    const consumerD = defineDIConsumer({
      dependencies: [consumerC.token],
      factory: (c) => () => `Consumer D depends on ${c()}`,
      description: "consumerD",
    });

    const repoAImpl: RepoA = { getFooA: () => "A" };

    const container = buildContainer()
      .register(RepoA, repoAImpl)
      .registerConsumer(consumerD)
      .registerConsumer(consumerC)
      .makeStatic();

    const resolvedA = container.resolve(consumerD)();
    expect(resolvedA).toBe("Consumer D depends on Consumer C depends on A");
  });

  it("should throw an error for missing dependencies", () => {
    const consumer = defineDIConsumer({
      dependencies: [RepoA],
      factory: (repoA: RepoA) => () => repoA.getFooA(),
      description: "Consumer",
    });

    const container = buildContainer().makeStatic();

    expect(() => container.resolve(consumer)).toThrowError(
      "Token Symbol(RepoA) not found"
    );
  });

  it("should throw an error when resolving an unregistered token", () => {
    const UnregisteredToken = createDIToken("UnregisteredToken");

    const container = buildContainer().makeStatic();

    expect(() => container.resolve(UnregisteredToken)).toThrowError(
      "Token Symbol(UnregisteredToken) not found"
    );
  });
});
