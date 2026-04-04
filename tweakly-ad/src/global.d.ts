/// <reference types="@motion-canvas/core/types" />

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '@motion-canvas/core/jsx-runtime' {
  export function jsx(type: any, props: any, key?: any): any;
  export function jsxs(type: any, props: any, key?: any): any;
  export function Fragment(props: {children?: any}): any;
}

declare module '@motion-canvas/2d' {
  type SignalProp = any;

  export class Rect {
    constructor(props: any);
    add(child: any): void;
    opacity: SignalProp;
    scale: SignalProp;
    position: SignalProp;
    x: SignalProp;
    y: SignalProp;
    width: SignalProp;
    height: SignalProp;
    fill: SignalProp;
    radius: SignalProp;
  }

  export class Circle {
    constructor(props: any);
    opacity: SignalProp;
    scale: SignalProp;
    position: SignalProp;
    size: SignalProp;
    fill: SignalProp;
    x: SignalProp;
    y: SignalProp;
  }

  export class Txt {
    constructor(props: any);
    opacity: SignalProp;
    scale: SignalProp;
    text: SignalProp;
    fontSize: SignalProp;
    fontFamily: SignalProp;
    fontWeight: SignalProp;
    fill: SignalProp;
    x: SignalProp;
    y: SignalProp;
  }

  export class View {
    add(child: any): void;
    spawn(task: any): void;
  }

  export class Img {
    constructor(props: any);
    opacity: SignalProp;
    scale: SignalProp;
    src: SignalProp;
    width: SignalProp;
    height: SignalProp;
    x: SignalProp;
    y: SignalProp;
  }

  export function makeScene2D(fn: (view: View) => ThreadGenerator): any;
}

declare module '@motion-canvas/core' {
  export type ThreadGenerator = Generator<any, any, any>;

  export interface Reference<T> {
    (): T;
  }

  export type SignalValue<T> = {
    (): T;
    (value: T): void;
    (value: T, duration: number, easing?: EasingFunction): ThreadGenerator;
  };

  export type EasingFunction = (t: number) => number;

  export function createRef<T>(): Reference<T>;

  export function createSignal<T>(initial: T): SignalValue<T>;

  export function waitFor(duration: number): ThreadGenerator;

  export function all(...tasks: ThreadGenerator[]): ThreadGenerator;

  export function loop(count: number, task: () => ThreadGenerator): ThreadGenerator;

  export function easeInOutCubic(t: number): number;
  export function easeOutCubic(t: number): number;
  export function linear(t: number): number;

  export function makeProject(config: {scenes: any[]}): any;
}
