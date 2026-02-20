/// <reference types="@figma/plugin-typings" />

declare const __html__: string;

// CSS module declarations
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

// SVG module declarations
declare module '*.svg' {
  const content: string;
  export default content;
}
