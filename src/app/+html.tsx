import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Static HTML shell for web exports. Runs only at build time; route screens
 * override the title at runtime via Stack.Screen options.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>Video Club — track what you watch</title>
        <meta
          name="description"
          content="Video Club is a social tracker for movies and TV. Log what you watch, rate and review, keep a watchlist, and follow friends."
        />
        <meta name="theme-color" content="#0B0D10" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
