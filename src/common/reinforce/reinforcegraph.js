'use strict';

var UTILS = require('./reinforceutils.js');

// Transformer definitions
var Graph = function Graph(needsBackprop) {
  if (typeof needsBackprop === 'undefined') {
    needsBackprop = true;
  }
  this.needsBackprop = needsBackprop;

  // this will store a list of functions that perform backprop,
  // in their forward pass order. So in backprop we will go
  // backwards and evoke each one
  this.backprop = [];
};

Graph.prototype = {
  backward: function backward() {
    for (var i = this.backprop.length - 1; i >= 0; i--) {
      this.backprop[i](); // tick!
    }
  },

  rowPluck: function rowPluck(m, ix) {
    // pluck a row of m with index ix and return it as col vector
    UTILS.assert(ix >= 0 && ix < m.n);
    var d = m.d;
    var out = new UTILS.Mat(d, 1);
    // copy over the data
    for (var i = 0, n = d; i < n; i++) {
      out.w[i] = m.w[d * ix + i];
    }

    if (this.needsBackprop) {
      var backward = function backward() {
        for (var _i = 0, _n = d; _i < _n; _i++) {
          m.dw[d * ix + _i] += out.dw[_i];
        }
      };
      this.backprop.push(backward);
    }
    return out;
  },

  tanh: function tanh(m) {
    // tanh nonlinearity
    var out = new UTILS.Mat(m.n, m.d);
    var n = m.w.length;
    for (var i = 0; i < n; i++) {
      out.w[i] = Math.tanh(m.w[i]);
    }

    if (this.needsBackprop) {
      var backward = function backward() {
        for (var _i2 = 0; _i2 < n; _i2++) {
          // grad for z = tanh(x) is (1 - z^2)
          var mwi = out.w[_i2];
          m.dw[_i2] += (1.0 - mwi * mwi) * out.dw[_i2];
        }
      };

      this.backprop.push(backward);
    }
    return out;
  },

  sigmoid: function sigmoid(m) {
    // sigmoid nonlinearity
    var out = new UTILS.Mat(m.n, m.d);
    var n = m.w.length;
    for (var i = 0; i < n; i++) {
      out.w[i] = UTILS.sig(m.w[i]);
    }

    if (this.needsBackprop) {
      var backward = function backward() {
        for (var _i3 = 0; _i3 < n; _i3++) {
          // grad for z = tanh(x) is (1 - z^2)
          var mwi = out.w[_i3];
          m.dw[_i3] += mwi * (1.0 - mwi) * out.dw[_i3];
        }
      };
      this.backprop.push(backward);
    }
    return out;
  },

  relu: function relu(m) {
    var out = new UTILS.Mat(m.n, m.d);
    var n = m.w.length;
    for (var i = 0; i < n; i++) {
      out.w[i] = Math.max(0, m.w[i]); // relu
    }
    if (this.needsBackprop) {
      var backward = function backward() {
        for (var _i4 = 0; _i4 < n; _i4++) {
          m.dw[_i4] += m.w[_i4] > 0 ? out.dw[_i4] : 0.0;
        }
      };
      this.backprop.push(backward);
    }
    return out;
  },

  mul: function mul(m1, m2) {
    // multiply matrices m1 * m2
    UTILS.assert(m1.d === m2.n, 'matmul dimensions misaligned');

    var n = m1.n;
    var d = m2.d;
    var out = new UTILS.Mat(n, d);
    for (var i = 0; i < m1.n; i++) {
      // loop over rows of m1
      for (var j = 0; j < m2.d; j++) {
        // loop over cols of m2
        var dot = 0.0;
        for (var k = 0; k < m1.d; k++) {
          // dot product loop
          dot += m1.w[m1.d * i + k] * m2.w[m2.d * k + j];
        }
        out.w[d * i + j] = dot;
      }
    }

    if (this.needsBackprop) {
      var backward = function backward() {
        for (var _i5 = 0; _i5 < m1.n; _i5++) {
          // loop over rows of m1
          for (var _j = 0; _j < m2.d; _j++) {
            // loop over cols of m2
            for (var _k = 0; _k < m1.d; _k++) {
              // dot product loop
              var b = out.dw[d * _i5 + _j];
              m1.dw[m1.d * _i5 + _k] += m2.w[m2.d * _k + _j] * b;
              m2.dw[m2.d * _k + _j] += m1.w[m1.d * _i5 + _k] * b;
            }
          }
        }
      };
      this.backprop.push(backward);
    }
    return out;
  },

  add: function add(m1, m2) {
    UTILS.assert(m1.w.length === m2.w.length);

    var out = new UTILS.Mat(m1.n, m1.d);
    for (var i = 0, n = m1.w.length; i < n; i++) {
      out.w[i] = m1.w[i] + m2.w[i];
    }
    if (this.needsBackprop) {
      var backward = function backward() {
        for (var _i6 = 0, _n2 = m1.w.length; _i6 < _n2; _i6++) {
          m1.dw[_i6] += out.dw[_i6];
          m2.dw[_i6] += out.dw[_i6];
        }
      };
      this.backprop.push(backward);
    }
    return out;
  },

  dot: function dot(m1, m2) {
    // m1 m2 are both column vectors
    UTILS.assert(m1.w.length === m2.w.length);
    var out = new UTILS.Mat(1, 1);
    var dot = 0.0;
    for (var i = 0, n = m1.w.length; i < n; i++) {
      dot += m1.w[i] * m2.w[i];
    }
    out.w[0] = dot;
    if (this.needsBackprop) {
      var backward = function backward() {
        for (var _i7 = 0, _n3 = m1.w.length; _i7 < _n3; _i7++) {
          m1.dw[_i7] += m2.w[_i7] * out.dw[0];
          m2.dw[_i7] += m1.w[_i7] * out.dw[0];
        }
      };
      this.backprop.push(backward);
    }
    return out;
  },

  eltmul: function eltmul(m1, m2) {
    UTILS.assert(m1.w.length === m2.w.length);

    var out = new UTILS.Mat(m1.n, m1.d);
    for (var i = 0, n = m1.w.length; i < n; i++) {
      out.w[i] = m1.w[i] * m2.w[i];
    }
    if (this.needsBackprop) {
      var backward = function backward() {
        for (var _i8 = 0, _n4 = m1.w.length; _i8 < _n4; _i8++) {
          m1.dw[_i8] += m2.w[_i8] * out.dw[_i8];
          m2.dw[_i8] += m1.w[_i8] * out.dw[_i8];
        }
      };
      this.backprop.push(backward);
    }
    return out;
  }
};

module.exports = Graph;
