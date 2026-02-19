module.exports = {
  // deprecated
  isShareableRef: jest.fn(() => false),
  makeShareable: jest.fn((value) => value),
  makeShareableCloneOnUIRecursive: jest.fn((value) => value),
  makeShareableCloneRecursive: jest.fn((value) => value),
  shareableMappingCache: { get: jest.fn(), set: jest.fn() },

  // featureFlags
  getDynamicFeatureFlag: jest.fn(),
  getStaticFeatureFlag: jest.fn(),
  setDynamicFeatureFlag: jest.fn(),

  // memory
  isSynchronizable: jest.fn(() => false),
  createSerializable: jest.fn((value) => ({ __serializable: true, value })),
  isSerializableRef: jest.fn(() => false),
  registerCustomSerializable: jest.fn(),
  serializableMappingCache: { get: jest.fn(), set: jest.fn() },
  createSynchronizable: jest.fn((value) => ({ __synchronizable: true, value })),

  // runtimeKind
  getRuntimeKind: jest.fn(() => 'RN'),
  RuntimeKind: { RN: 'RN', UI: 'UI' },

  // runtimes
  createWorkletRuntime: jest.fn(),
  runOnRuntime: jest.fn(),
  scheduleOnRuntime: jest.fn(),

  // threads
  callMicrotasks: jest.fn(),
  executeOnUIRuntimeSync: jest.fn((fn) => fn),
  runOnJS: jest.fn((fn) => fn),
  runOnUI: jest.fn((fn) => fn),
  runOnUIAsync: jest.fn((fn) => Promise.resolve(fn)),
  runOnUISync: jest.fn((fn) => fn),
  scheduleOnRN: jest.fn(),
  scheduleOnUI: jest.fn(),
  unstable_eventLoopTask: jest.fn(),

  // workletFunction
  isWorkletFunction: jest.fn(() => false),

  // WorkletsModule
  WorkletsModule: {},
}
