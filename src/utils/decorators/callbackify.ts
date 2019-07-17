import { Class } from 'type-fest';
import assert from 'assert';
import { callbackify as _callbackify } from 'util';

export function callbackify<
  T extends Class<any> | InstanceType<Class<any>>,
  K extends keyof T,
  M extends (...args: any[]) => Promise<any> = T[K]
>(target: T, key: K, descriptor: TypedPropertyDescriptor<M>) {
  assert(
    typeof descriptor.value === 'function',
    `'${key}' on '${target}' is not a method.`
  );

  return {
    ...descriptor,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    value: _callbackify(descriptor.value!) as M
  };
}
