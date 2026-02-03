declare module 'react-native-syntax-highlighter' {
  import { ComponentType } from 'react'

  interface SyntaxHighlighterProps {
    language?: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    style?: any
    fontFamily?: string
    fontSize?: number
    highlighter?: 'highlightjs' | 'prism'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    PreTag?: ComponentType<any>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    CodeTag?: ComponentType<any>
    children: string
  }

  const SyntaxHighlighter: ComponentType<SyntaxHighlighterProps>
  export default SyntaxHighlighter
}
