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

// Image module declarations
declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

declare module '*.webp' {
  const content: string;
  export default content;
}
