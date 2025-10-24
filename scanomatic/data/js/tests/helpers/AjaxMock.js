import $ from 'jquery'
import mockjaxFactory from "jquery-mockjax";
mockjaxFactory($, window)
$.mockjaxSettings.logging = 0;

expect.extend({
  toHaveMethod(received, expected) {
    const pass = received.method.toUpperCase() === expected.toUpperCase()
    return {
      pass,
      message: () =>
        `expected method ${received.method} to be ${expected}`,
    }
  },
})

export const mostRecentRequest = () => {
  const requests = $.mockjax.mockedAjaxCalls()
  return requests[requests.length - 1];
}

export class ajaxMock {
  _idx
  _options = {
    response: function(settings) {
      this.responseText = this.responseText || { status: this.status }
    },
    status: 200,
    responseTime: 0,
  }

  constructor(options) {
    this.update(options)
  }

  update(options) {
    this._options = {
      ...this._options,
      ...options
    }
    if (this._idx !== undefined) {
      $.mockjax.clear(this._idx)
    }
    this._idx = $.mockjax(this._options)
  }
}

expect.extend({
  toHaveMethod(received, expected) {
    const pass = received.method.toUpperCase() === expected.toUpperCase()
    return {
      pass,
      message: () =>
        `expected method ${received.method} to be ${expected}`,
    }
  },
})