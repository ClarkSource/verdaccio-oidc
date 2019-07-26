export * from './authentication-store';

import * as adapters from './adapters';
// export const adapters = _adapters;

import pascalCase from 'pascal-case';
import { StoreAdapter } from './store-adapter';
import { Class } from 'type-fest';

/**
 * Takes in a kebab-case adapter name, without the `-adapter` suffix and returns
 * the corresponding `StoreAdapter` class.
 *
 * @param adapterName The kebab-case adapter name as it would be found in the
 *   config `.yml` file.
 */
export function getAdapter(adapterName: string): Class<StoreAdapter> {
  const className = `${pascalCase(adapterName)}Adapter`;
  const Adapter = ((adapters as unknown) as Record<
    string,
    Class<StoreAdapter> | undefined
  >)[className];

  if (!Adapter) {
    throw new TypeError(
      `The adapter '${adapterName}' (resolved as '${className}') is unknown.`
    );
  }
  return Adapter;
}
