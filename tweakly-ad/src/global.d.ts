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
  interface Tweenable<T = number> {
    (value: T, duration?: number, easing?: any): any;
  }
  
  export class Rect {
    constructor(props: any);
    add(child: any): void;
    get children(): any[];
    get opacity(): number;
    set opacity(v: number);
    opacity: Tweenable;
    get scale(): number;
    set scale(v: number);
    scale: Tweenable;
    get position(): {x: number; y: number};
    position: any;
    get x(): number;
    set x(v: number);
    x: Tweenable;
    get y(): number;
    set y(v: number);
    y: Tweenable;
    width: any;
    height: any;
    fill: any;
    radius: any;
  }
  export class Circle {
    constructor(props: any);
    get opacity(): number;
    set opacity(v: number);
    opacity: Tweenable;
    get scale(): number;
    set scale(v: number);
    scale: Tweenable;
    size: any;
    fill: any;
    x: any;
    y: any;
  }
  export class Txt {
    constructor(props: any);
    get opacity(): number;
    set opacity(v: number);
    opacity: Tweenable;
    text: any;
    fontSize: any;
    fontFamily: any;
    fontWeight: any;
    fill: any;
    x: any;
    y: any;
  }
  export class View {
    add(child: any): void;
  }
  export class Img {
    constructor(props: any);
    get opacity(): number;
    set opacity(v: number);
    opacity: Tweenable;
    src: any;
    width: any;
    height: any;
    x: any;
    y: any;
  }
  export function makeScene2D(fn: (view: View) => Generator<any>): any;
}
