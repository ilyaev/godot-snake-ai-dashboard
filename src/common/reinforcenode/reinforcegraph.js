'use strict';

const UTILS = require('./reinforceutils.js');

// Transformer definitions
let Graph = function(needsBackprop) {
  if(typeof needsBackprop === 'undefined') { needsBackprop = true; }
  this.needsBackprop = needsBackprop;

  // this will store a list of functions that perform backprop,
  // in their forward pass order. So in backprop we will go
  // backwards and evoke each one
  this.backprop = [];
};

Graph.prototype = {
  backward: function() {
    for(let i=this.backprop.length-1;i>=0;i--) {
      this.backprop[i](); // tick!
    }
  },

  rowPluck: function(m, ix) {
    // pluck a row of m with index ix and return it as col vector
    UTILS.assert(ix >= 0 && ix < m.n);
    let d = m.d;
    let out = new UTILS.Mat(d, 1);
    // copy over the data
    for(let i=0,n=d;i<n;i++){
       out.w[i] = m.w[d * ix + i];
    }

    if(this.needsBackprop) {
      let backward = () => {
        for(let i=0,n=d;i<n;i++){
          m.dw[d * ix + i] += out.dw[i];
         }
      };
      this.backprop.push(backward);
    }
    return out;
  },

  tanh: function(m) {
    // tanh nonlinearity
    let out = new UTILS.Mat(m.n, m.d);
    let n = m.w.length;
    for(let i=0;i<n;i++) {
      out.w[i] = Math.tanh(m.w[i]);
    }

    if(this.needsBackprop) {
      let backward = function() {
        for(let i=0;i<n;i++) {
          // grad for z = tanh(x) is (1 - z^2)
          let mwi = out.w[i];
          m.dw[i] += (1.0 - mwi * mwi) * out.dw[i];
        }
      };

      this.backprop.push(backward);
    }
    return out;
  },

  sigmoid: function(m) {
    // sigmoid nonlinearity
    let out = new UTILS.Mat(m.n, m.d);
    let n = m.w.length;
    for(let i=0;i<n;i++) {
      out.w[i] = UTILS.sig(m.w[i]);
    }

    if(this.needsBackprop) {
      let backward = function() {
        for(let i=0;i<n;i++) {
          // grad for z = tanh(x) is (1 - z^2)
          let mwi = out.w[i];
          m.dw[i] += mwi * (1.0 - mwi) * out.dw[i];
        }
      };
      this.backprop.push(backward);
    }
    return out;
  },

  relu: function(m) {
    let out = new UTILS.Mat(m.n, m.d);
    let n = m.w.length;
    for(let i=0;i<n;i++) {
      out.w[i] = Math.max(0, m.w[i]); // relu
    }
    if(this.needsBackprop) {
      let backward = function() {
        for(let i=0;i<n;i++) {
          m.dw[i] += m.w[i] > 0 ? out.dw[i] : 0.0;
        }
      };
      this.backprop.push(backward);
    }
    return out;
  },

  mul: function(m1, m2) {
    // multiply matrices m1 * m2
    UTILS.assert(m1.d === m2.n, 'matmul dimensions misaligned');

    let n = m1.n;
    let d = m2.d;
    let out = new UTILS.Mat(n,d);
    for(let i=0;i<m1.n;i++) { // loop over rows of m1
      for(let j=0;j<m2.d;j++) { // loop over cols of m2
        let dot = 0.0;
        for(let k=0;k<m1.d;k++) { // dot product loop
          dot += m1.w[m1.d*i+k] * m2.w[m2.d*k+j];
        }
        out.w[d*i+j] = dot;
      }
    }

    if(this.needsBackprop) {
      let backward = function() {
        for(let i=0;i<m1.n;i++) { // loop over rows of m1
          for(let j=0;j<m2.d;j++) { // loop over cols of m2
            for(let k=0;k<m1.d;k++) { // dot product loop
              let b = out.dw[d*i+j];
              m1.dw[m1.d*i+k] += m2.w[m2.d*k+j] * b;
              m2.dw[m2.d*k+j] += m1.w[m1.d*i+k] * b;
            }
          }
        }
      };
      this.backprop.push(backward);
    }
    return out;
  },

  add: function(m1, m2) {
    UTILS.assert(m1.w.length === m2.w.length);

    let out = new UTILS.Mat(m1.n, m1.d);
    for(let i=0,n=m1.w.length;i<n;i++) {
      out.w[i] = m1.w[i] + m2.w[i];
    }
    if(this.needsBackprop) {
      let backward = function() {
        for(let i=0,n=m1.w.length;i<n;i++) {
          m1.dw[i] += out.dw[i];
          m2.dw[i] += out.dw[i];
        }
      };
      this.backprop.push(backward);
    }
    return out;
  },

  dot: function(m1, m2) {
    // m1 m2 are both column vectors
    UTILS.assert(m1.w.length === m2.w.length);
    let out = new UTILS.Mat(1,1);
    let dot = 0.0;
    for(let i=0,n=m1.w.length;i<n;i++) {
      dot += m1.w[i] * m2.w[i];
    }
    out.w[0] = dot;
    if(this.needsBackprop) {
      let backward = function() {
        for(let i=0,n=m1.w.length;i<n;i++) {
          m1.dw[i] += m2.w[i] * out.dw[0];
          m2.dw[i] += m1.w[i] * out.dw[0];
        }
      };
      this.backprop.push(backward);
    }
    return out;
  },

  eltmul: function(m1, m2) {
    UTILS.assert(m1.w.length === m2.w.length);

    let out = new UTILS.Mat(m1.n, m1.d);
    for(let i=0,n=m1.w.length;i<n;i++) {
      out.w[i] = m1.w[i] * m2.w[i];
    }
    if(this.needsBackprop) {
      let backward = function() {
        for(let i=0,n=m1.w.length;i<n;i++) {
          m1.dw[i] += m2.w[i] * out.dw[i];
          m2.dw[i] += m1.w[i] * out.dw[i];
        }
      };
      this.backprop.push(backward);
    }
    return out;
  }
};

module.exports = Graph;
