/// <reference types="@figma/plugin-typings" />

declare const __html__: string;

// CSS module declarations
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}
