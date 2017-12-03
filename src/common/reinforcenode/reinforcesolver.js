'use strict';

const UTILS = require('./reinforceutils.js');

let Solver = function() {
  this.decayRate = 0.999;
  this.smoothEps = 1e-8;
  this.stepCache = {};
};

Solver.prototype = {
  step: function(model, stepSize, regc, clipval) {
    // perform parameter update
    let solverStats = {};
    let numClipped = 0;
    let numTot = 0;
    for(let k in model) {
      if(model.hasOwnProperty(k)) {
        let m = model[k]; // mat ref
        if(!(k in this.stepCache)) {
          this.stepCache[k] = new UTILS.Mat(m.n, m.d);
        }
        let s = this.stepCache[k];
        for(let i=0,n=m.w.length;i<n;i++) {

          // rmsprop adaptive learning rate
          let mdwi = m.dw[i];
          s.w[i] = s.w[i] * this.decayRate + (1.0 - this.decayRate) * mdwi * mdwi;

          // gradient clip
          if(mdwi > clipval) {
            mdwi = clipval;
            numClipped++;
          }
          if(mdwi < -clipval) {
            mdwi = -clipval;
            numClipped++;
          }
          numTot++;

          // update (and regularize)
          m.w[i] += - stepSize * mdwi / Math.sqrt(s.w[i] + this.smoothEps) - regc * m.w[i];
          m.dw[i] = 0; // reset gradients for next iteration
        }
      }
    }
    solverStats.ratioClipped = numClipped*1.0/numTot;
    return solverStats;
  }
};

module.exports = Solver;
