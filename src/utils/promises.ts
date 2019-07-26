import pTimeout from 'p-timeout';

export function optionalTimeout<ValueType, ReturnType>(
  input: PromiseLike<ValueType>,
  milliseconds?: number,
  message?: string | Error | (() => ReturnType | Promise<ReturnType>)
) {
  if (Number.isSafeInteger(milliseconds!) && message) {
    // @ts-ignore
    return pTimeout(input, milliseconds, message);
  }
  return input;
}
