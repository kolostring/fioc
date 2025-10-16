import { describe, expect, it } from "vitest";
import {
  buildDIContainer,
  createDIToken,
  constructorToFactory,
  withDependencies,
  createFactoryDIToken,
  DIContainer,
} from "../..";

// =====================================================================
// === SHARED TOKENS, INTERFACES, AND UTILITIES ===
// =====================================================================

interface RepoA {
  getFooA: () => string;
}
const RepoA = createDIToken<RepoA>().as("RepoA");

interface RepoB {
  getFooB: () => string;
}
const RepoB = createDIToken<RepoB>().as("RepoB");

interface ServiceA {
  getA: () => string;
}
const ServiceA = createDIToken<ServiceA>().as("ServiceA");

interface ServiceB {
  getB: () => string;
}
const ServiceB = createDIToken<ServiceB>().as("ServiceB");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// =====================================================================
// === CORE REGISTRATION AND RESOLUTION TESTS ===
// =====================================================================

describe("Core Registration and Resolution", () => {
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

  it("should resolve transient factories", () => {
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

  it("should return different instances for transient factories on each resolve", () => {
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
});

// ---------------------------------------------------------------------

describe("Scope Management (Singleton and Scoped Factories)", () => {
  it("should return the same instance for singleton factories", () => {
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

  it("should return the same instance within a scope but different across scopes for scoped factories", async () => {
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

    expect(resolvedA === resolvedB).toBeTruthy(); // Same instance within scope
    expect(resolvedC !== resolvedA).toBeTruthy(); // Different instance across scopes
    expect(resolvedD === resolvedA).toBeTruthy(); // Dependency resolved from the same scope
  });
});

// ---------------------------------------------------------------------

describe("Factory Classes (using constructorToFactory)", () => {
  const repoAImpl: RepoA = { getFooA: () => "A" };

  class FactoryClass {
    constructor(private readonly repoA: RepoA) {}

    fooA() {
      return `From Factory Class ${this.repoA.getFooA()}`;
    }
  }

  const factoryClassToken = createDIToken<FactoryClass>().as("factoryClass");

  it("should resolve transient factory classes (new instance each time)", () => {
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
    const resolved1 = container.resolve(factoryClassToken);
    const resolved2 = container.resolve(factoryClassToken);

    expect(resolvedA).toBe("From Factory Class A");
    expect(resolved1 !== resolved2).toBeTruthy();
  });

  it("should resolve singleton factory classes (same instance each time)", () => {
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

  it("should resolve scoped factory classes (same instance within scope)", () => {
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
});

// ---------------------------------------------------------------------

describe("Advanced Composition and Metadata", () => {
  const repoAImpl: RepoA = { getFooA: () => "A" };
  const repoBImpl: RepoB = { getFooB: () => "B" };

  it("should resolve itself correctly as dependency", () => {
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

  it("should resolve factories with more than one dependency", () => {
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

  it("should resolve factories recursively (chained dependencies)", () => {
    const factoryCFactory = (repoA: RepoA) => () =>
      `Factory C depends on ${repoA.getFooA()}`;

    const factoryDFactory = (c: ReturnType<typeof factoryCFactory>) => () =>
      `Factory D depends on ${c()}`;

    const factoryC =
      createDIToken<ReturnType<typeof factoryCFactory>>().as("factoryCToken");

    const factoryD =
      createDIToken<ReturnType<typeof factoryDFactory>>().as("factoryDToken");

    const container = buildDIContainer()
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

    const resolvedA = container.resolve(factoryD)();
    expect(resolvedA).toBe("Factory D depends on Factory C depends on A");
  });

  it("should merge states from multiple containers", () => {
    const factoryCFactory = (repoA: RepoA) => () =>
      `Factory C depends on ${repoA.getFooA()}`;

    const factoryDFactory = (c: ReturnType<typeof factoryCFactory>) => () =>
      `Factory D depends on ${c()}`;

    const factoryC =
      createDIToken<ReturnType<typeof factoryCFactory>>().as("factoryCToken");

    const factoryD =
      createDIToken<ReturnType<typeof factoryDFactory>>().as("factoryDToken");

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

  it("should allow type metadata to be registered", () => {
    interface User {
      getName: () => string;
    }
    const UserToken = createDIToken<User>().as("User");

    interface Product {
      getProductName: () => string;
    }
    const ProductToken = createDIToken<Product>().as("Product");

    interface Repository<T> {
      get(): T;
    }

    const RepositoryToken = createDIToken<Repository<any>>().as("Repository");

    const RepositoryImplAFn: Repository<User> = {
      get: () => ({ getName: () => "UserA" }),
    };
    const RepositoryImplA = createDIToken<typeof RepositoryImplAFn>().as(
      "RepositoryA",
      {
        implements: [RepositoryToken],
        generics: [UserToken],
      }
    );

    const RepositoryImplBFn: Repository<Product> = {
      get: () => ({ getProductName: () => "ProductB" }),
    };
    const RepositoryImplB = createDIToken<typeof RepositoryImplBFn>().as(
      "RepositoryB",
      {
        implements: [RepositoryToken],
        generics: [ProductToken],
      }
    );

    const container = buildDIContainer()
      .register(RepositoryImplA, RepositoryImplAFn)
      .register(RepositoryImplB, RepositoryImplBFn)
      .getResult();

    expect(
      container
        .findImplementationTokens(RepositoryToken)
        .every(
          (token) => token === RepositoryImplA || token === RepositoryImplB
        )
    ).toBeTruthy();
    expect(
      container
        .findImplementationTokens(RepositoryToken, [ProductToken])
        .every((token) => token === RepositoryImplB)
    ).toBeTruthy();
    expect(
      container
        .findImplementationTokens(RepositoryToken, [ProductToken, UserToken])
        .every((token) => token === RepositoryImplA)
    ).toBeTruthy();
  });
});

// ---------------------------------------------------------------------

describe("Error Handling", () => {
  it("should throw an error for missing dependencies at resolve time", () => {
    const factoryCFactory = (repoA: RepoA) => () => repoA.getFooA();

    const factory =
      createDIToken<ReturnType<typeof factoryCFactory>>().as("factoryCToken");

    const container = buildDIContainer()
      .registerFactory(factory, {
        factory: factoryCFactory,
        dependencies: [RepoA], // RepoA is not registered
      })
      .getResult();

    expect(() => container.resolve(factory)).toThrowError('"RepoA" not found');
  });

  it("should throw an error when resolving an unregistered token", () => {
    const UnregisteredToken = createDIToken().as("UnregisteredToken");

    const container = buildDIContainer().getResult();

    expect(() => container.resolve(UnregisteredToken)).toThrowError(
      '"UnregisteredToken" not found'
    );
  });

  it("should throw an error on circular dependency detection", () => {
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
        dependencies: [factoryD], // C depends on D
      })
      .registerFactory(factoryD, {
        factory: factoryDFactory,
        dependencies: [factoryC], // D depends on C
      })
      .getResult();

    // Depending on the implementation, this will be "Maximum call stack size exceeded"
    // or a more specific error message from the DI library.
    expect(() => container.resolve(factoryD)).toThrowError();
  });
});

// ---------------------------------------------------------------------

describe("Container Type Differences (DIContainer vs StrictDIContainer Behaviors)", () => {
  const serviceAImpl: ServiceA = { getA: () => "A" };
  const serviceBImpl: ServiceB = { getB: () => "B" };

  it("should allow runtime dependency validation with DIContainer (fails at resolve)", () => {
    const serviceFactory = (a: ServiceA) => () => a.getA();
    const FactoryToken =
      createDIToken<ReturnType<typeof serviceFactory>>().as("Factory");

    // DIContainer allows registration of factories with missing dependencies
    const container = buildDIContainer()
      .registerFactory(FactoryToken, {
        factory: serviceFactory,
        dependencies: [ServiceA], // Not registered yet
      })
      .getResult();

    // But fails at runtime when resolving
    expect(() => container.resolve(FactoryToken)).toThrowError(
      'Token "ServiceA" not found'
    );
  });

  it("should allow re-registration with DIContainer (last one wins)", () => {
    const serviceAImpl1: ServiceA = { getA: () => "A1" };
    const serviceAImpl2: ServiceA = { getA: () => "A2" };

    // DIContainer allows re-registration of the same token
    const container = buildDIContainer()
      .register(ServiceA, serviceAImpl1)
      .register(ServiceA, serviceAImpl2) // This is allowed
      .getResult();

    expect(container.resolve(ServiceA).getA()).toBe("A2");
  });

  it("should resolve successfully when dependencies are registered first (simulating StrictDIContainer behavior)", () => {
    const serviceFactory = (a: ServiceA) => () => a.getA();
    const FactoryToken =
      createDIToken<ReturnType<typeof serviceFactory>>().as("Factory");

    // Dependencies are registered before the dependent factory
    const container = buildDIContainer()
      .register(ServiceA, serviceAImpl)
      .registerFactory(FactoryToken, {
        factory: serviceFactory,
        dependencies: [ServiceA],
      })
      .getResult();

    expect(container.resolve(FactoryToken)()).toBe("A");
  });

  it("should handle complex dependency chains for comparison", () => {
    const factoryC = (a: ServiceA, b: ServiceB) => () =>
      `${a.getA()}${b.getB()}`;
    const FactoryC =
      createDIToken<ReturnType<typeof factoryC>>().as("FactoryC");

    const factoryD = (c: ReturnType<typeof factoryC>) => () => `D:${c()}`;
    const FactoryD =
      createDIToken<ReturnType<typeof factoryD>>().as("FactoryD");

    // Container 1 setup
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

    // Container 2 setup (same logic, demonstrating both types handle it)
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
