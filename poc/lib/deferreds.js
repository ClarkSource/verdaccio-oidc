const pDefer = require('p-defer');

class Deferreds {
  constructor(defaultTimeout = Infinity) {
    this.deferreds = new Map();
    this.defaultTimeout = defaultTimeout;
  }

  waitFor(token, timeout = this.defaultTimeout) {
    if (!this.deferreds.has(token)) {
      this.deferreds.set(token, pDefer());
    }

    const deferred = this.deferreds.get(token);

    if (Number.isSafeInteger(timeout) && timeout > 0) {
      deferred.timeout = setTimeout(() => {
        if (this.deferreds.has(token)) {
          this.reject(
            token,
            new Error(`The timeout of ${timeout} ms elapsed.`)
          );
        }
      }, timeout);
    }

    return this.deferreds.get(token).promise;
  }

  resolve(token, value) {
    this.assertToken(token);
    this.deferreds.get(token).resolve(value);
    this.clearDeferred(token);
  }

  reject(token, error) {
    this.assertToken(token);
    this.deferreds.get(token).reject(error);
    this.clearDeferred(token);
  }

  assertToken(token) {
    if (!this.deferreds.has(token)) {
      throw new TypeError(`'${token}' is an unknown deferred.`);
    }
  }

  clearDeferred(token) {
    const deferred = this.deferreds.get(token);
    if (deferred) {
      if (deferred.timeout) clearTimeout(deferred.timeout);
      this.deferreds.delete(token);
    }
  }
}

module.exports = Deferreds;
