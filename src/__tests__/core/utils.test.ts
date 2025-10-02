import { describe, expect, it } from "vitest";
import { buildDIContainer, createDIToken, constructorToFactory } from "../..";

interface RepoA {
  getFooA: () => string;
}
const RepoA = createDIToken<RepoA>().as("RepoA");

interface RepoB {
  getFooB: () => string;
}
const RepoB = createDIToken<RepoB>().as("RepoB");

describe("Dependency Injection Container", () => {
  it("should resolve implementations correctly", () => {
    const repoAImpl: RepoA = { getFooA: () => "RepoA Result" };
    const repoBImpl: RepoB = { getFooB: () => "RepoB Result" };

    const container = buildDIContainer()
      .overwrite(RepoA, repoAImpl)
      .overwrite(RepoB, repoBImpl)
      .getResult();

    const resolvedA = container.resolve(RepoA).getFooA();
    const resolvedB = container.resolve(RepoB).getFooB();

    expect(resolvedA).toBe("RepoA Result");
    expect(resolvedB).toBe("RepoB Result");
  });

  it("should resolve factories", () => {
    const factoryCFactory = (repoA: RepoA) => () =>
      `Factory C depends on ${repoA.getFooA()}`;

    const factoryC =
      createDIToken<ReturnType<typeof factoryCFactory>>().as("factoryCToken");

    const repoAImpl: RepoA = { getFooA: () => "A" };

    const container = buildDIContainer()
      .overwrite(RepoA, repoAImpl)
      .overwriteFactory({
        token: factoryC,
        factory: factoryCFactory,
        dependencies: [RepoA],
      })
      .getResult();

    const resolvedA = container.resolve(factoryC)();
    expect(resolvedA).toBe("Factory C depends on A");
  });

  it("should overwrite factory classes", () => {
    const repoAImpl: RepoA = { getFooA: () => "A" };

    class FactoryClass {
      constructor(private readonly repoA: RepoA) {}

      fooA() {
        return `From Factory Class ${this.repoA.getFooA()}`;
      }
    }

    const factoryClassToken = createDIToken<FactoryClass>().as("factoryClass");

    const container = buildDIContainer()
      .overwrite(RepoA, repoAImpl)
      .overwriteFactory({
        token: factoryClassToken,
        factory: constructorToFactory(FactoryClass),
        dependencies: [RepoA],
      })
      .getResult();

    const resolvedA = container.resolve(factoryClassToken).fooA();
    expect(resolvedA).toBe("From Factory Class A");
  });

  it("should overwrite factory arrays", () => {
    const repoAImpl: RepoA = { getFooA: () => "A" };

    const factoryCFactory = (repoA: RepoA) => () =>
      `Factory C depends on ${repoA.getFooA()}`;

    const factoryDFactory = (repoA: RepoA) => () =>
      `Factory D depends on ${repoA.getFooA()}`;

    const factoryC =
      createDIToken<ReturnType<typeof factoryCFactory>>().as("factoryCToken");

    const factoryD =
      createDIToken<ReturnType<typeof factoryDFactory>>().as("factoryDToken");

    const container = buildDIContainer()
      .overwrite(RepoA, repoAImpl)
      .overwriteFactoryArray([
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

  it("should overwrite factory arrays with variable function parameters", () => {
    const repoAImpl: RepoA = { getFooA: () => "A" };

    const joinArgs = (args: string[]) => args.join(", ");
    const factoryCFactory = (repoA: RepoA) => (arg1: string, arg2: number) =>
      `Factory C (${arg1}, ${arg2}) depends on ${repoA.getFooA()}`;

    const factoryDFactory = (repoA: RepoA) => (arg: string[]) =>
      `Factory D ([${joinArgs(arg)}]) depends on ${repoA.getFooA()}`;

    const factoryC =
      createDIToken<ReturnType<typeof factoryCFactory>>().as("factoryCToken");

    const factoryD =
      createDIToken<ReturnType<typeof factoryDFactory>>().as("factoryDToken");

    const container = buildDIContainer()
      .overwrite(RepoA, repoAImpl)
      .overwriteFactoryArray([
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

  it("should overwrite factory arrays with more than one dependency", () => {
    const repoAImpl: RepoA = { getFooA: () => "A" };
    const repoBImpl: RepoB = { getFooB: () => "B" };

    const factoryCFactory =
      (repoA: RepoA, repoB: RepoB) => (arg1: string, arg2: number) =>
        `Factory C (${arg1}, ${arg2}) depends on ${repoA.getFooA()} and ${repoB.getFooB()}`;

    const factoryC =
      createDIToken<ReturnType<typeof factoryCFactory>>().as("factoryCToken");

    const container = buildDIContainer()
      .overwrite(RepoA, repoAImpl)
      .overwrite(RepoB, repoBImpl)
      .overwriteFactoryArray([
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
      createDIToken<ReturnType<typeof factoryCFactory>>().as("factoryCToken");

    const factoryD =
      createDIToken<ReturnType<typeof factoryDFactory>>().as("factoryDToken");

    const repoAImpl: RepoA = { getFooA: () => "A" };

    const container = buildDIContainer()
      .overwrite(RepoA, repoAImpl)
      .overwriteFactoryArray([
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

  it("should merge states", () => {
    const factoryCFactory = (repoA: RepoA) => () =>
      `Factory C depends on ${repoA.getFooA()}`;

    const factoryDFactory = (c: ReturnType<typeof factoryCFactory>) => () =>
      `Factory D depends on ${c()}`;

    const factoryC =
      createDIToken<ReturnType<typeof factoryCFactory>>().as("factoryCToken");

    const factoryD =
      createDIToken<ReturnType<typeof factoryDFactory>>().as("factoryDToken");

    const repoAImpl: RepoA = { getFooA: () => "A" };

    const containerA = buildDIContainer()
      .overwrite(RepoA, repoAImpl)
      .getResult();
    const containerC = buildDIContainer()
      .overwrite(RepoA, repoAImpl)
      .overwriteFactory({
        token: factoryC,
        factory: factoryCFactory,
        dependencies: [RepoA],
      })
      .overwriteFactory({
        token: factoryD,
        factory: factoryDFactory,
        dependencies: [factoryC],
      })
      .getResult();

    const container = buildDIContainer()
      .merge(containerA.getState())
      .merge(containerC.getState())
      .getResult();

    const resolvedA = container.resolve(factoryD)();
    expect(resolvedA).toBe("Factory D depends on Factory C depends on A");
  });

  it("should throw an error for missing dependencies", () => {
    const factoryCFactory = (repoA: RepoA) => () => repoA.getFooA();

    const factory =
      createDIToken<ReturnType<typeof factoryCFactory>>().as("factoryCToken");

    const container = buildDIContainer()
      .overwriteFactory({
        token: factory,
        factory: factoryCFactory,
        dependencies: [RepoA],
      })
      .getResult();

    expect(() => container.resolve(factory)).toThrowError(
      "Token Symbol(RepoA) not found"
    );
  });

  it("should throw an error when resolving an unoverwriteed token", () => {
    const UnoverwriteedToken = createDIToken().as("UnoverwriteedToken");

    const container = buildDIContainer().getResult();

    expect(() => container.resolve(UnoverwriteedToken)).toThrowError(
      "Token Symbol(UnoverwriteedToken) not found"
    );
  });

  it("should throw an error on circular dependency", () => {
    const factoryCFactory = (d: () => string) => () => d();

    const factoryDFactory = (c: ReturnType<typeof factoryCFactory>) => () =>
      c();

    const factoryD =
      createDIToken<ReturnType<typeof factoryCFactory>>().as("factoryDToken");

    const factoryC =
      createDIToken<ReturnType<typeof factoryCFactory>>().as("factoryCToken");

    const container = buildDIContainer()
      .overwriteFactory({
        token: factoryC,
        factory: factoryCFactory,
        dependencies: [factoryD],
      })
      .overwriteFactory({
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
