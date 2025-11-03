// Mock react-native-reanimated for Expo Go compatibility
// This allows NativeWind v4 to work without the actual native module

const React = require('react');
const ReactNative = require('react-native');

const createMockAnimatedValue = () => ({
  setValue: () => {},
  addListener: () => {},
  removeListener: () => {},
  removeAllListeners: () => {},
  stopAnimation: () => {},
  resetAnimation: () => {},
  interpolate: () => createMockAnimatedValue(),
  setOffset: () => {},
  flattenOffset: () => {},
  extractOffset: () => {},
});

const createMockWorklet = (fn) => fn;

// Make sure makeMutable is available and returns an object with a value property
const makeMutable = (value) => {
  const mutable = {
    value: value,
    _value: value,
    setValue: (newValue) => { mutable.value = newValue; mutable._value = newValue; },
  };
  return mutable;
};

module.exports = {
  default: {
    Value: () => createMockAnimatedValue(),
    Clock: () => createMockAnimatedValue(),
    Node: () => createMockAnimatedValue(),
    event: () => [],
    add: () => createMockAnimatedValue(),
    sub: () => createMockAnimatedValue(),
    multiply: () => createMockAnimatedValue(),
    divide: () => createMockAnimatedValue(),
    pow: () => createMockAnimatedValue(),
    modulo: () => createMockAnimatedValue(),
    sqrt: () => createMockAnimatedValue(),
    sin: () => createMockAnimatedValue(),
    cos: () => createMockAnimatedValue(),
    exp: () => createMockAnimatedValue(),
    round: () => createMockAnimatedValue(),
    floor: () => createMockAnimatedValue(),
    ceil: () => createMockAnimatedValue(),
    min: () => createMockAnimatedValue(),
    max: () => createMockAnimatedValue(),
    abs: () => createMockAnimatedValue(),
    acc: () => createMockAnimatedValue(),
    diff: () => createMockAnimatedValue(),
    diffClamp: () => createMockAnimatedValue(),
    interpolate: () => createMockAnimatedValue(),
    interpolateNode: () => createMockAnimatedValue(),
    Extrapolate: {
      EXTEND: 'extend',
      CLAMP: 'clamp',
      IDENTITY: 'identity',
    },
    createAnimatedComponent: (Component) => Component,
    useAnimatedStyle: () => ({}),
    useAnimatedProps: () => ({}),
    useAnimatedReaction: () => {},
    useAnimatedGestureHandler: () => ({}),
    useAnimatedScrollHandler: () => () => {},
    useSharedValue: (init) => ({ value: init }),
    useAnimatedRef: () => ({ current: null }),
    useDerivedValue: () => createMockAnimatedValue(),
    useFrameCallback: () => {},
    cancelAnimation: () => {},
    withTiming: (toValue) => toValue,
    withSpring: (toValue) => toValue,
    withDecay: (config) => config.velocity || 0,
    withRepeat: (animation) => animation,
    withSequence: (...animations) => animations[animations.length - 1],
    withDelay: (delay, animation) => animation,
  runOnJS: (fn) => fn,
  runOnUI: createMockWorklet,
  makeMutable: makeMutable,
  makeShareable: (value) => value,
    Easing: {
      linear: (t) => t,
      ease: (t) => t,
      quad: (t) => t * t,
      cubic: (t) => t * t * t,
      poly: (n) => (t) => Math.pow(t, n),
      sin: (t) => 1 - Math.cos((t * Math.PI) / 2),
      circle: (t) => 1 - Math.sqrt(1 - t * t),
      exp: (t) => Math.pow(2, 10 * (t - 1)),
      elastic: (bounciness) => (t) => {
        const p = bounciness * Math.PI;
        return 1 - Math.pow(Math.cos((t * Math.PI) / 2), 3) * Math.cos(t * p);
      },
      back: (s) => (t) => Math.pow(t, 2) * ((s + 1) * t - s),
      bounce: (t) => {
        if (t < 1 / 2.75) {
          return 7.5625 * t * t;
        } else if (t < 2 / 2.75) {
          return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
        } else if (t < 2.5 / 2.75) {
          return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
        }
        return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
      },
      bezier: () => (t) => t,
      in: (easing) => easing,
      out: (easing) => easing,
      inOut: (easing) => easing,
    },
    enableScreens: () => {},
    Transition: {
      Together: 'Together',
      Sequential: 'Sequential',
    },
    Transitioning: {
      View: require('react').View || require('react-native').View,
    },
    TransitioningView: require('react-native').View,
  },
  Value: () => createMockAnimatedValue(),
  Clock: () => createMockAnimatedValue(),
  Node: () => createMockAnimatedValue(),
  event: () => [],
  add: () => createMockAnimatedValue(),
  sub: () => createMockAnimatedValue(),
  multiply: () => createMockAnimatedValue(),
  divide: () => createMockAnimatedValue(),
  pow: () => createMockAnimatedValue(),
  modulo: () => createMockAnimatedValue(),
  sqrt: () => createMockAnimatedValue(),
  sin: () => createMockAnimatedValue(),
  cos: () => createMockAnimatedValue(),
  exp: () => createMockAnimatedValue(),
  round: () => createMockAnimatedValue(),
  floor: () => createMockAnimatedValue(),
  ceil: () => createMockAnimatedValue(),
  min: () => createMockAnimatedValue(),
  max: () => createMockAnimatedValue(),
  abs: () => createMockAnimatedValue(),
  acc: () => createMockAnimatedValue(),
  diff: () => createMockAnimatedValue(),
  diffClamp: () => createMockAnimatedValue(),
  interpolate: () => createMockAnimatedValue(),
  interpolateNode: () => createMockAnimatedValue(),
  Extrapolate: {
    EXTEND: 'extend',
    CLAMP: 'clamp',
    IDENTITY: 'identity',
  },
  createAnimatedComponent: (Component) => Component,
  useAnimatedStyle: () => ({}),
  useAnimatedProps: () => ({}),
  useAnimatedReaction: () => {},
  useAnimatedGestureHandler: () => ({}),
  useAnimatedScrollHandler: () => () => {},
  useSharedValue: (init) => ({ value: init }),
  useAnimatedRef: () => ({ current: null }),
  useDerivedValue: () => createMockAnimatedValue(),
  useFrameCallback: () => {},
  cancelAnimation: () => {},
  withTiming: (toValue) => toValue,
  withSpring: (toValue) => toValue,
  withDecay: (config) => config.velocity || 0,
  withRepeat: (animation) => animation,
  withSequence: (...animations) => animations[animations.length - 1],
  withDelay: (delay, animation) => animation,
  runOnJS: (fn) => fn,
  runOnUI: createMockWorklet,
  makeMutable: makeMutable,
  makeShareable: (value) => value,
  Easing: {
    linear: (t) => t,
    ease: (t) => t,
    quad: (t) => t * t,
    cubic: (t) => t * t * t,
    poly: (n) => (t) => Math.pow(t, n),
    sin: (t) => 1 - Math.cos((t * Math.PI) / 2),
    circle: (t) => 1 - Math.sqrt(1 - t * t),
    exp: (t) => Math.pow(2, 10 * (t - 1)),
    elastic: (bounciness) => (t) => {
      const p = bounciness * Math.PI;
      return 1 - Math.pow(Math.cos((t * Math.PI) / 2), 3) * Math.cos(t * p);
    },
    back: (s) => (t) => Math.pow(t, 2) * ((s + 1) * t - s),
    bounce: (t) => {
      if (t < 1 / 2.75) {
        return 7.5625 * t * t;
      } else if (t < 2 / 2.75) {
        return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
      } else if (t < 2.5 / 2.75) {
        return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
      }
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    },
    bezier: () => (t) => t,
    in: (easing) => easing,
    out: (easing) => easing,
    inOut: (easing) => easing,
  },
  enableScreens: () => {},
  Transition: {
    Together: 'Together',
    Sequential: 'Sequential',
  },
  Transitioning: {
    View: require('react').View || require('react-native').View,
  },
  TransitioningView: require('react-native').View,
};

