import { describe, expect, it } from "vitest";
import { buildDIContainer, createDIToken, toFactory } from "../../common/utils";

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

    const container = buildDIContainer({
      [RepoA]: repoAImpl,
      [RepoB]: repoBImpl,
    }).getResult();

    const resolvedA = container.resolve(RepoA).getFooA();
    const resolvedB = container.resolve(RepoB).getFooB();

    expect(resolvedA).toBe("RepoA Result");
    expect(resolvedB).toBe("RepoB Result");
  });

  it("should resolve consumers", () => {
    const consumerCFactory = (repoA: RepoA) => () =>
      `Consumer C depends on ${repoA.getFooA()}`;

    const consumerC =
      createDIToken<ReturnType<typeof consumerCFactory>>("consumerCToken");

    const repoAImpl: RepoA = { getFooA: () => "A" };

    const container = buildDIContainer()
      .register(RepoA, repoAImpl)
      .registerConsumer({
        token: consumerC,
        factory: consumerCFactory,
        dependencies: [RepoA],
      })
      .getResult();

    const resolvedA = container.resolve(consumerC)();
    expect(resolvedA).toBe("Consumer C depends on A");
  });

  it("should register consumer classes", () => {
    const repoAImpl: RepoA = { getFooA: () => "A" };

    class ConsumerClass {
      constructor(private readonly repoA: RepoA) {}

      fooA() {
        return `From Consumer Class ${this.repoA.getFooA()}`;
      }
    }

    const consumerClassToken = createDIToken<ConsumerClass>("consumerClass");

    const container = buildDIContainer()
      .register(RepoA, repoAImpl)
      .registerConsumer({
        token: consumerClassToken,
        factory: toFactory(ConsumerClass),
        dependencies: [RepoA],
      })
      .getResult();

    const resolvedA = container.resolve(consumerClassToken).fooA();
    expect(resolvedA).toBe("From Consumer Class A");
  });

  it("should register consumer arrays", () => {
    const repoAImpl: RepoA = { getFooA: () => "A" };

    const consumerCFactory = (repoA: RepoA) => () =>
      `Consumer C depends on ${repoA.getFooA()}`;

    const consumerDFactory = (repoA: RepoA) => () =>
      `Consumer D depends on ${repoA.getFooA()}`;

    const consumerC =
      createDIToken<ReturnType<typeof consumerCFactory>>("consumerCToken");

    const consumerD =
      createDIToken<ReturnType<typeof consumerDFactory>>("consumerDToken");

    const container = buildDIContainer()
      .register(RepoA, repoAImpl)
      .registerConsumerArray([
        {
          token: consumerC,
          factory: consumerCFactory,
          dependencies: [RepoA],
        },
        {
          token: consumerD,
          factory: consumerDFactory,
          dependencies: [RepoA],
        },
      ])
      .getResult();

    const resolvedAC = container.resolve(consumerC)();
    expect(resolvedAC).toBe("Consumer C depends on A");
    const resolvedAD = container.resolve(consumerD)();
    expect(resolvedAD).toBe("Consumer D depends on A");
  });

  it("should register consumer arrays with variable function parameters", () => {
    const repoAImpl: RepoA = { getFooA: () => "A" };

    const consumerCFactory = (repoA: RepoA) => (arg1: string, arg2: number) =>
      `Consumer C (${arg1}, ${arg2}) depends on ${repoA.getFooA()}`;

    const consumerDFactory = (repoA: RepoA) => (arg: string[]) =>
      `Consumer D ([${arg.reduce(
        (acc, cur) => `${acc}, ${cur}`
      )}]) depends on ${repoA.getFooA()}`;

    const consumerC =
      createDIToken<ReturnType<typeof consumerCFactory>>("consumerCToken");

    const consumerD =
      createDIToken<ReturnType<typeof consumerDFactory>>("consumerDToken");

    const container = buildDIContainer()
      .register(RepoA, repoAImpl)
      .registerConsumerArray([
        {
          token: consumerC,
          factory: consumerCFactory,
          dependencies: [RepoA],
        },
        {
          token: consumerD,
          factory: consumerDFactory,
          dependencies: [RepoA],
        },
      ])
      .getResult();

    const resolvedAC = container.resolve(consumerC)("arg1", 1);
    expect(resolvedAC).toBe("Consumer C (arg1, 1) depends on A");
    const resolvedAD = container.resolve(consumerD)(["arg1", "arg2"]);
    expect(resolvedAD).toBe("Consumer D ([arg1, arg2]) depends on A");
  });

  it("should register consumer arrays with more than one dependency", () => {
    const repoAImpl: RepoA = { getFooA: () => "A" };
    const repoBImpl: RepoB = { getFooB: () => "B" };

    const consumerCFactory =
      (repoA: RepoA, repoB: RepoB) => (arg1: string, arg2: number) =>
        `Consumer C (${arg1}, ${arg2}) depends on ${repoA.getFooA()} and ${repoB.getFooB()}`;

    const consumerC =
      createDIToken<ReturnType<typeof consumerCFactory>>("consumerCToken");

    const container = buildDIContainer()
      .register(RepoA, repoAImpl)
      .register(RepoB, repoBImpl)
      .registerConsumerArray([
        {
          token: consumerC,
          factory: consumerCFactory,
          dependencies: [RepoA, RepoB],
        },
      ])
      .getResult();

    const resolvedAC = container.resolve(consumerC)("arg1", 1);
    expect(resolvedAC).toBe("Consumer C (arg1, 1) depends on A and B");
  });

  it("should resolve consumers recursively", () => {
    const consumerCFactory = (repoA: RepoA) => () =>
      `Consumer C depends on ${repoA.getFooA()}`;

    const consumerDFactory = (c: ReturnType<typeof consumerCFactory>) => () =>
      `Consumer D depends on ${c()}`;

    const consumerC =
      createDIToken<ReturnType<typeof consumerCFactory>>("consumerCToken");

    const consumerD =
      createDIToken<ReturnType<typeof consumerDFactory>>("consumerDToken");

    const repoAImpl: RepoA = { getFooA: () => "A" };

    const container = buildDIContainer()
      .register(RepoA, repoAImpl)
      .registerConsumerArray([
        {
          token: consumerC,
          factory: consumerCFactory,
          dependencies: [RepoA],
        },
        {
          token: consumerD,
          factory: consumerDFactory,
          dependencies: [consumerC],
        },
      ])
      .getResult();

    const resolvedA = container.resolve(consumerD)();
    expect(resolvedA).toBe("Consumer D depends on Consumer C depends on A");
  });

  it("should throw an error for missing dependencies", () => {
    const consumerCFactory = (repoA: RepoA) => () => repoA.getFooA();

    const consumer =
      createDIToken<ReturnType<typeof consumerCFactory>>("consumerCToken");

    const container = buildDIContainer()
      .registerConsumer({
        token: consumer,
        factory: consumerCFactory,
        dependencies: [RepoA],
      })
      .getResult();

    expect(() => container.resolve(consumer)).toThrowError(
      "Token Symbol(RepoA) not found"
    );
  });

  it("should throw an error when resolving an unregistered token", () => {
    const UnregisteredToken = createDIToken("UnregisteredToken");

    const container = buildDIContainer().getResult();

    expect(() => container.resolve(UnregisteredToken)).toThrowError(
      "Token Symbol(UnregisteredToken) not found"
    );
  });

  it("should throw an error on circular dependency", () => {
    const consumerCFactory = (d: () => string) => () => d();

    const consumerDFactory = (c: ReturnType<typeof consumerCFactory>) => () =>
      c();

    const consumerD =
      createDIToken<ReturnType<typeof consumerCFactory>>("consumerDToken");

    const consumerC =
      createDIToken<ReturnType<typeof consumerCFactory>>("consumerCToken");

    const container = buildDIContainer()
      .registerConsumer({
        token: consumerC,
        factory: consumerCFactory,
        dependencies: [consumerD],
      })
      .registerConsumer({
        token: consumerD,
        factory: consumerDFactory,
        dependencies: [consumerC],
      })
      .getResult();

    expect(() => container.resolve(consumerD)).toThrowError(
      "Maximum call stack size exceeded"
    );
  });
});
