import { describe, expect, it } from "vitest";
import {
  buildDIContainer,
  createDIToken,
  constructorToFactory,
  withDependencies,
  createFactoryDIToken,
  DIContainer,
} from "../..";

interface RepoA {
  getFooA: () => string;
}
const RepoA = createDIToken<RepoA>().as("RepoA");

interface RepoB {
  getFooB: () => string;
}
const RepoB = createDIToken<RepoB>().as("RepoB");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Dependency Injection Container", () => {
  it("should resolve implementations correctly", () => {
    const repoAImpl: RepoA = { getFooA: () => "RepoA Result" };
    const repoBImpl: RepoB = { getFooB: () => "RepoB Result" };

    const container = buildDIContainer()
      .register(RepoA, repoAImpl)
      .register(RepoB, repoBImpl)
      .getResult();

    const resolvedA = container.resolve(RepoA).getFooA();
    const resolvedB = container.resolve(RepoB).getFooB();

    expect(resolvedA).toBe("RepoA Result");
    expect(resolvedB).toBe("RepoB Result");
  });

  it("should resolve factories", () => {
    const factoryCFactory = withDependencies(RepoA).defineFactory((repoA) => {
      return () => `Factory C depends on ${repoA.getFooA()}`;
    });

    const factoryC =
      createFactoryDIToken<typeof factoryCFactory>().as("factoryCToken");

    const repoAImpl: RepoA = { getFooA: () => "A" };

    const container = buildDIContainer()
      .register(RepoA, repoAImpl)
      .registerFactory(factoryC, factoryCFactory)
      .getResult();

    const resolvedA = container.resolve(factoryC)();
    expect(resolvedA).toBe("Factory C depends on A");
  });

  it("should resolve singleton factories correctly", () => {
    const factoryCFactory = withDependencies(RepoA).defineFactory((repoA) => {
      return () => `Factory C depends on ${repoA.getFooA()}`;
    });

    const factoryC =
      createFactoryDIToken<typeof factoryCFactory>().as("factoryCToken");

    const repoAImpl: RepoA = { getFooA: () => "A" };

    const container = buildDIContainer()
      .register(RepoA, repoAImpl)
      .registerFactory(factoryC, factoryCFactory, "singleton")
      .getResult();

    const resolvedA = container.resolve(factoryC);
    const resolvedB = container.resolve(factoryC);
    expect(resolvedA === resolvedB).toBeTruthy();
  });

  it("should resolve itself correctly as dependency", () => {
    const repoAImpl: RepoA = { getFooA: () => "A" };

    const containerWrapper = withDependencies(DIContainer).defineFactory(
      (diContainer) => {
        return () => diContainer.resolve(RepoA);
      }
    );

    const containerWrapperToken =
      createFactoryDIToken<typeof containerWrapper>().as("containerWrapper");

    const container = buildDIContainer()
      .register(RepoA, repoAImpl)
      .registerFactory(containerWrapperToken, containerWrapper)
      .getResult();

    const resolvedA = container.resolve(containerWrapperToken)();
    expect(resolvedA).toBe(repoAImpl);
  });

  it("should resolve transient factories correctly", () => {
    const factoryCFactory = withDependencies(RepoA).defineFactory((repoA) => {
      return () => `Factory C depends on ${repoA.getFooA()}`;
    });

    const factoryC =
      createFactoryDIToken<typeof factoryCFactory>().as("factoryCToken");

    const repoAImpl: RepoA = { getFooA: () => "A" };

    const container = buildDIContainer()
      .register(RepoA, repoAImpl)
      .registerFactory(factoryC, factoryCFactory)
      .getResult();

    const resolvedA = container.resolve(factoryC);
    const resolvedB = container.resolve(factoryC);
    expect(resolvedA !== resolvedB).toBeTruthy();
  });

  it("should resolve scoped factories correctly", async () => {
    const factoryCFactory = withDependencies(RepoA).defineFactory((repoA) => {
      return () => `Factory C depends on ${repoA.getFooA()}`;
    });

    const factoryC =
      createFactoryDIToken<typeof factoryCFactory>().as("factoryCToken");

    const factoryDFactory = withDependencies(factoryC).defineFactory((c) => {
      return c;
    });

    const factoryD =
      createFactoryDIToken<typeof factoryDFactory>().as("factoryDToken");

    const repoAImpl: RepoA = { getFooA: () => "A" };

    const container = buildDIContainer()
      .register(RepoA, repoAImpl)
      .registerFactory(factoryC, factoryCFactory, "scoped")
      .registerFactory(factoryD, factoryDFactory)
      .getResult();

    let resolvedA;
    let resolvedB;
    let resolvedD;

    await container.createScope(async (resolve) => {
      await sleep(100);
      resolvedD = resolve(factoryD);
      resolvedA = resolve(factoryC);
      resolvedB = resolve(factoryC);
    });

    let resolvedC;
    await container.createScope(async (resolve) => {
      await sleep(100);
      resolvedC = resolve(factoryC);
    });

    expect(resolvedA === resolvedB).toBeTruthy();
    expect(resolvedC !== resolvedA).toBeTruthy();
    expect(resolvedD === resolvedA).toBeTruthy();
  });

  it("should resolve transient factory classes", () => {
    const repoAImpl: RepoA = { getFooA: () => "A" };

    class FactoryClass {
      constructor(private readonly repoA: RepoA) {}

      fooA() {
        return `From Factory Class ${this.repoA.getFooA()}`;
      }
    }

    const factoryClassToken = createDIToken<FactoryClass>().as("factoryClass");

    const container = buildDIContainer()
      .register(RepoA, repoAImpl)
      .registerFactory(
        factoryClassToken,
        withDependencies(RepoA).defineFactory(
          constructorToFactory(FactoryClass)
        )
      )
      .getResult();

    const resolvedA = container.resolve(factoryClassToken).fooA();
    expect(resolvedA).toBe("From Factory Class A");
  });

  it("should resolve singleton factory classes", () => {
    const repoAImpl: RepoA = { getFooA: () => "A" };

    class FactoryClass {
      constructor(private readonly repoA: RepoA) {}

      fooA() {
        return `From Factory Class ${this.repoA.getFooA()}`;
      }
    }

    const factoryClassToken = createDIToken<FactoryClass>().as("factoryClass");

    const container = buildDIContainer()
      .register(RepoA, repoAImpl)
      .registerFactory(
        factoryClassToken,
        withDependencies(RepoA).defineFactory(
          constructorToFactory(FactoryClass)
        ),
        "singleton"
      )
      .getResult();

    const resolvedA = container.resolve(factoryClassToken);
    const resolvedB = container.resolve(factoryClassToken);
    expect(resolvedA === resolvedB).toBeTruthy();
    expect(resolvedA.fooA()).toBe("From Factory Class A");
  });

  it("should resolve singleton factory classes", () => {
    const repoAImpl: RepoA = { getFooA: () => "A" };

    class FactoryClass {
      constructor(private readonly repoA: RepoA) {}

      fooA() {
        return `From Factory Class ${this.repoA.getFooA()}`;
      }
    }

    const factoryClassToken = createDIToken<FactoryClass>().as("factoryClass");

    const container = buildDIContainer()
      .register(RepoA, repoAImpl)
      .registerFactory(
        factoryClassToken,
        withDependencies(RepoA).defineFactory(
          constructorToFactory(FactoryClass)
        ),
        "scoped"
      )
      .getResult();

    let resolvedA;
    let resolvedB;

    container.createScope(async (resolve) => {
      resolvedA = resolve(factoryClassToken);
      resolvedB = resolve(factoryClassToken);
    });

    let resolvedC;
    container.createScope(async (resolve) => {
      resolvedC = resolve(factoryClassToken);
    });

    expect(resolvedA === resolvedB).toBeTruthy();
    expect(resolvedC !== resolvedA).toBeTruthy();
  });

  it("should register factory arrays", () => {
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

    const factoryCFactory = withDependencies(RepoA, RepoB).defineFactory(
      (repoA, repoB) => (arg1: string, arg2: number) =>
        `Factory C (${arg1}, ${arg2}) depends on ${repoA.getFooA()} and ${repoB.getFooB()}`
    );

    const factoryC =
      createFactoryDIToken<typeof factoryCFactory>().as("factoryCToken");

    const container = buildDIContainer()
      .register(RepoA, repoAImpl)
      .register(RepoB, repoBImpl)
      .registerFactory(factoryC, factoryCFactory)
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
      .register(RepoA, repoAImpl)
      .getResult();
    const containerC = buildDIContainer()
      .register(RepoA, repoAImpl)
      .registerFactory(factoryC, {
        factory: factoryCFactory,
        dependencies: [RepoA],
      })
      .registerFactory(factoryD, {
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
      .registerFactory(factory, {
        factory: factoryCFactory,
        dependencies: [RepoA],
      })
      .getResult();

    expect(() => container.resolve(factory)).toThrowError(
      "Token Symbol(RepoA) not found"
    );
  });

  it("should throw an error when resolving an unregistered token", () => {
    const UnregisteredToken = createDIToken().as("UnregisteredToken");

    const container = buildDIContainer().getResult();

    expect(() => container.resolve(UnregisteredToken)).toThrowError(
      "Token Symbol(UnregisteredToken) not found"
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
      .registerFactory(factoryC, {
        factory: factoryCFactory,
        dependencies: [factoryD],
      })
      .registerFactory(factoryD, {
        factory: factoryDFactory,
        dependencies: [factoryC],
      })
      .getResult();

    expect(() => container.resolve(factoryD)).toThrowError(
      "Maximum call stack size exceeded"
    );
  });
});

describe("Container Type Differences", () => {
  interface ServiceA {
    getA: () => string;
  }
  const ServiceA = createDIToken<ServiceA>().as("ServiceA");

  interface ServiceB {
    getB: () => string;
  }
  const ServiceB = createDIToken<ServiceB>().as("ServiceB");

  it("should allow runtime dependency validation with DIContainer", () => {
    const serviceFactory = (a: ServiceA) => () => a.getA();
    const FactoryToken =
      createDIToken<ReturnType<typeof serviceFactory>>().as("Factory");

    // DIContainer allows registration of factories with missing dependencies
    const container = buildDIContainer()
      .registerFactory(FactoryToken, {
        factory: serviceFactory,
        dependencies: [ServiceA],
      })
      .getResult();

    // But fails at runtime when resolving
    expect(() => container.resolve(FactoryToken)).toThrowError(
      "Token Symbol(ServiceA) not found"
    );
  });

  it("should allow re-registration with DIContainer", () => {
    const serviceAImpl: ServiceA = { getA: () => "A1" };
    const serviceAImpl2: ServiceA = { getA: () => "A2" };

    // DIContainer allows re-registration of the same token
    const container = buildDIContainer()
      .register(ServiceA, serviceAImpl)
      .register(ServiceA, serviceAImpl2) // This is allowed
      .getResult();

    expect(container.resolve(ServiceA).getA()).toBe("A2");
  });

  it("should validate dependencies at compile time with StrictDIContainer", () => {
    const serviceFactory = (a: ServiceA) => () => a.getA();
    const FactoryToken =
      createDIToken<ReturnType<typeof serviceFactory>>().as("Factory");

    const serviceAImpl: ServiceA = { getA: () => "A" };

    // StrictDIContainer requires all dependencies to be registered first
    const container = buildDIContainer()
      .register(ServiceA, serviceAImpl)
      .registerFactory(FactoryToken, {
        factory: serviceFactory,
        dependencies: [ServiceA],
      })
      .getResult();

    expect(container.resolve(FactoryToken)()).toBe("A");
  });

  it("should handle complex dependency chains differently", () => {
    const serviceAImpl: ServiceA = { getA: () => "A" };
    const serviceBImpl: ServiceB = { getB: () => "B" };

    const factoryC = (a: ServiceA, b: ServiceB) => () =>
      `${a.getA()}${b.getB()}`;
    const FactoryC =
      createDIToken<ReturnType<typeof factoryC>>().as("FactoryC");

    const factoryD = (c: ReturnType<typeof factoryC>) => () => `D:${c()}`;
    const FactoryD =
      createDIToken<ReturnType<typeof factoryD>>().as("FactoryD");

    const container1 = buildDIContainer()
      .register(ServiceA, serviceAImpl)
      .register(ServiceB, serviceBImpl)
      .registerFactory(FactoryC, {
        factory: factoryC,
        dependencies: [ServiceA, ServiceB],
      })
      .registerFactory(FactoryD, {
        factory: factoryD,
        dependencies: [FactoryC],
      })
      .getResult();

    // StrictDIContainer requires dependencies to be registered before use
    const container2 = buildDIContainer()
      .register(ServiceA, serviceAImpl)
      .register(ServiceB, serviceBImpl)
      .registerFactory(FactoryC, {
        factory: factoryC,
        dependencies: [ServiceA, ServiceB],
      })
      .registerFactory(FactoryD, {
        factory: factoryD,
        dependencies: [FactoryC],
      })
      .getResult();

    expect(container1.resolve(FactoryD)()).toBe("D:AB");
    expect(container2.resolve(FactoryD)()).toBe("D:AB");
  });
});
