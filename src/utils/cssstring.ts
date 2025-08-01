/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { type CSSProperties } from 'react';

export function cssstring(string: string): CSSProperties {
  if (string.startsWith('{') && string.endsWith('}')) {
    string = string.substring(1, string.length - 1);
  }

  const json = `{"${string.replace(/; /g, '", "').replace(/: /g, '": "').replace(';', '')}"}`;

  try {
    const obj = JSON.parse(json);

    const keyValues = Object.keys(obj).map((key) => {
      const camelCased = key.replace(/-[a-z]/g, (g) => g[1]!.toUpperCase());
      return { [camelCased]: obj[key] };
    });

    return Object.assign({}, ...keyValues);
  } catch {
    console.warn(`Invalid CSS string: ${string}`);
    return {};
  }
}
