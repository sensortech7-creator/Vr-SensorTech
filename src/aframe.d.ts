/* eslint-disable @typescript-eslint/no-explicit-any */
import type React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }

  interface Window {
    AFRAME: any;
    speechSynthesis: SpeechSynthesis;
  }
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

export {};
