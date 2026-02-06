declare global {
  interface Window {
    Prism?: {
      highlightElement: (el: Element) => void
      highlight: (code: string, grammar: any, language: string) => string
    }
  }
}

export {}
