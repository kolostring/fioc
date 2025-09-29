import { describe, expect, it } from "vitest";
import {
  buildDIContainer,
  createDIToken,
  constructorToFactory,
} from "../../common/utils";

interface RepoA {
  getFooA: () => string;
}
const RepoA = createDIToken<RepoA>()("RepoA");

interface RepoB {
  getFooB: () => string;
}
const RepoB = createDIToken<RepoB>()("RepoB");

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

  it("should resolve factories", () => {
    const factoryCFactory = (repoA: RepoA) => () =>
      `Factory C depends on ${repoA.getFooA()}`;

    const factoryC =
      createDIToken<ReturnType<typeof factoryCFactory>>()("factoryCToken");

    const repoAImpl: RepoA = { getFooA: () => "A" };

    const container = buildDIContainer({})
      .register(RepoA, repoAImpl)
      .registerFactory({
        token: factoryC,
        factory: factoryCFactory,
        dependencies: [RepoA],
      })
      .getResult();

    const resolvedA = container.resolve(factoryC)();
    expect(resolvedA).toBe("Factory C depends on A");
  });

  it("should register factory classes", () => {
    const repoAImpl: RepoA = { getFooA: () => "A" };

    class FactoryClass {
      constructor(private readonly repoA: RepoA) {}

      fooA() {
        return `From Factory Class ${this.repoA.getFooA()}`;
      }
    }

    const factoryClassToken = createDIToken<FactoryClass>()("factoryClass");

    const container = buildDIContainer({})
      .register(RepoA, repoAImpl)
      .registerFactory({
        token: factoryClassToken,
        factory: constructorToFactory(FactoryClass),
        dependencies: [RepoA],
      })
      .getResult();

    const resolvedA = container.resolve(factoryClassToken).fooA();
    expect(resolvedA).toBe("From Factory Class A");
  });

  it("should register factory arrays", () => {
    const repoAImpl: RepoA = { getFooA: () => "A" };

    const factoryCFactory = (repoA: RepoA) => () =>
      `Factory C depends on ${repoA.getFooA()}`;

    const factoryDFactory = (repoA: RepoA) => () =>
      `Factory D depends on ${repoA.getFooA()}`;

    const factoryC =
      createDIToken<ReturnType<typeof factoryCFactory>>()("factoryCToken");

    const factoryD =
      createDIToken<ReturnType<typeof factoryDFactory>>()("factoryDToken");

    const container = buildDIContainer({})
      .register(RepoA, repoAImpl)
      .registerFactoryArray([
        {
          token: factoryC,
          factory: factoryCFactory,
          dependencies: [RepoA],
        },
        {
          token: factoryD,
          factory: factoryDFactory,
          dependencies: [RepoA],
        },
      ])
      .getResult();

    const resolvedAC = container.resolve(factoryC)();
    expect(resolvedAC).toBe("Factory C depends on A");
    const resolvedAD = container.resolve(factoryD)();
    expect(resolvedAD).toBe("Factory D depends on A");
  });

  it("should register factory arrays with variable function parameters", () => {
    const repoAImpl: RepoA = { getFooA: () => "A" };

    const factoryCFactory = (repoA: RepoA) => (arg1: string, arg2: number) =>
      `Factory C (${arg1}, ${arg2}) depends on ${repoA.getFooA()}`;

    const factoryDFactory = (repoA: RepoA) => (arg: string[]) =>
      `Factory D ([${arg.reduce(
        (acc, cur) => `${acc}, ${cur}`
      )}]) depends on ${repoA.getFooA()}`;

    const factoryC =
      createDIToken<ReturnType<typeof factoryCFactory>>()("factoryCToken");

    const factoryD =
      createDIToken<ReturnType<typeof factoryDFactory>>()("factoryDToken");

    const container = buildDIContainer({})
      .register(RepoA, repoAImpl)
      .registerFactoryArray([
        {
          token: factoryC,
          factory: factoryCFactory,
          dependencies: [RepoA],
        },
        {
          token: factoryD,
          factory: factoryDFactory,
          dependencies: [RepoA],
        },
      ])
      .getResult();

    const resolvedAC = container.resolve(factoryC)("arg1", 1);
    expect(resolvedAC).toBe("Factory C (arg1, 1) depends on A");
    const resolvedAD = container.resolve(factoryD)(["arg1", "arg2"]);
    expect(resolvedAD).toBe("Factory D ([arg1, arg2]) depends on A");
  });

  it("should register factory arrays with more than one dependency", () => {
    const repoAImpl: RepoA = { getFooA: () => "A" };
    const repoBImpl: RepoB = { getFooB: () => "B" };

    const factoryCFactory =
      (repoA: RepoA, repoB: RepoB) => (arg1: string, arg2: number) =>
        `Factory C (${arg1}, ${arg2}) depends on ${repoA.getFooA()} and ${repoB.getFooB()}`;

    const factoryC =
      createDIToken<ReturnType<typeof factoryCFactory>>()("factoryCToken");

    const container = buildDIContainer({})
      .register(RepoA, repoAImpl)
      .register(RepoB, repoBImpl)
      .registerFactoryArray([
        {
          token: factoryC,
          factory: factoryCFactory,
          dependencies: [RepoA, RepoB],
        },
      ])
      .getResult();

    const resolvedAC = container.resolve(factoryC)("arg1", 1);
    expect(resolvedAC).toBe("Factory C (arg1, 1) depends on A and B");
  });

  it("should resolve factories recursively", () => {
    const factoryCFactory = (repoA: RepoA) => () =>
      `Factory C depends on ${repoA.getFooA()}`;

    const factoryDFactory = (c: ReturnType<typeof factoryCFactory>) => () =>
      `Factory D depends on ${c()}`;

    const factoryC =
      createDIToken<ReturnType<typeof factoryCFactory>>()("factoryCToken");

    const factoryD =
      createDIToken<ReturnType<typeof factoryDFactory>>()("factoryDToken");

    const repoAImpl: RepoA = { getFooA: () => "A" };

    const container = buildDIContainer({})
      .register(RepoA, repoAImpl)
      .registerFactoryArray([
        {
          token: factoryC,
          factory: factoryCFactory,
          dependencies: [RepoA],
        },
        {
          token: factoryD,
          factory: factoryDFactory,
          dependencies: [factoryC],
        },
      ])
      .getResult();

    const resolvedA = container.resolve(factoryD)();
    expect(resolvedA).toBe("Factory D depends on Factory C depends on A");
  });

  it("should throw an error for missing dependencies", () => {
    const factoryCFactory = (repoA: RepoA) => () => repoA.getFooA();

    const factory =
      createDIToken<ReturnType<typeof factoryCFactory>>()("factoryCToken");

    const container = buildDIContainer({})
      .registerFactory({
        token: factory,
        factory: factoryCFactory,
        dependencies: [RepoA],
      })
      .getResult();

    expect(() => container.resolve(factory)).toThrowError(
      "Token Symbol(RepoA) not found"
    );
  });

  it("should throw an error when resolving an unregistered token", () => {
    const UnregisteredToken = createDIToken()("UnregisteredToken");

    const container = buildDIContainer({}).getResult();

    expect(() => container.resolve(UnregisteredToken)).toThrowError(
      "Token Symbol(UnregisteredToken) not found"
    );
  });

  it("should throw an error on circular dependency", () => {
    const factoryCFactory = (d: () => string) => () => d();

    const factoryDFactory = (c: ReturnType<typeof factoryCFactory>) => () =>
      c();

    const factoryD =
      createDIToken<ReturnType<typeof factoryCFactory>>()("factoryDToken");

    const factoryC =
      createDIToken<ReturnType<typeof factoryCFactory>>()("factoryCToken");

    const container = buildDIContainer({})
      .registerFactory({
        token: factoryC,
        factory: factoryCFactory,
        dependencies: [factoryD],
      })
      .registerFactory({
        token: factoryD,
        factory: factoryDFactory,
        dependencies: [factoryC],
      })
      .getResult();

    expect(() => container.resolve(factoryD)).toThrowError(
      "Maximum call stack size exceeded"
    );
  });
});
