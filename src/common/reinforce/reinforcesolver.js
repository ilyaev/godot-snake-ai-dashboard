'use strict';

var UTILS = require('./reinforceutils.js');

var Solver = function Solver() {
  this.decayRate = 0.999;
  this.smoothEps = 1e-8;
  this.stepCache = {};
};

Solver.prototype = {
  step: function step(model, stepSize, regc, clipval) {
    // perform parameter update
    var solverStats = {};
    var numClipped = 0;
    var numTot = 0;
    for (var k in model) {
      if (model.hasOwnProperty(k)) {
        var m = model[k]; // mat ref
        if (!(k in this.stepCache)) {
          this.stepCache[k] = new UTILS.Mat(m.n, m.d);
        }
        var s = this.stepCache[k];
        for (var i = 0, n = m.w.length; i < n; i++) {

          // rmsprop adaptive learning rate
          var mdwi = m.dw[i];
          s.w[i] = s.w[i] * this.decayRate + (1.0 - this.decayRate) * mdwi * mdwi;

          // gradient clip
          if (mdwi > clipval) {
            mdwi = clipval;
            numClipped++;
          }
          if (mdwi < -clipval) {
            mdwi = -clipval;
            numClipped++;
          }
          numTot++;

          // update (and regularize)
          m.w[i] += -stepSize * mdwi / Math.sqrt(s.w[i] + this.smoothEps) - regc * m.w[i];
          m.dw[i] = 0; // reset gradients for next iteration
        }
      }
    }
    solverStats.ratioClipped = numClipped * 1.0 / numTot;
    return solverStats;
  }
};

module.exports = Solver;
