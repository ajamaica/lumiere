import { ScrollViewStyleReset } from 'expo-router/html'
import React from 'react'

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
@font-face {
  font-family: 'Ionicons';
  src: url('/fonts/Ionicons.ttf') format('truetype');
  font-display: swap;
}
`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
