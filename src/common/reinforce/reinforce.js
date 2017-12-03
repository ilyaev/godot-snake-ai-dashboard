'use strict';

var UTILS = require('./reinforceutils.js');

var Graph = require('./reinforcegraph.js');
var Solver = require('./reinforcesolver.js');
var DQNAgent = require('./agents/dqnagent.js');

var initLSTM = function initLSTM(inputSize, hiddenSizes, outputSize) {
  // hidden size should be a list
  var model = {};
  for (var d = 0; d < hiddenSizes.length; d++) {
    // loop over depths
    var prevSize = d === 0 ? inputSize : hiddenSizes[d - 1];
    var _hiddenSize = hiddenSizes[d];
    // gates parameters
    model['Wix' + d] = new UTILS.RandMat(_hiddenSize, prevSize, 0, 0.08);
    model['Wih' + d] = new UTILS.RandMat(_hiddenSize, _hiddenSize, 0, 0.08);
    model['bi' + d] = new UTILS.Mat(_hiddenSize, 1);
    model['Wfx' + d] = new UTILS.RandMat(_hiddenSize, prevSize, 0, 0.08);
    model['Wfh' + d] = new UTILS.RandMat(_hiddenSize, _hiddenSize, 0, 0.08);
    model['bf' + d] = new UTILS.Mat(_hiddenSize, 1);
    model['Wox' + d] = new UTILS.RandMat(_hiddenSize, prevSize, 0, 0.08);
    model['Woh' + d] = new UTILS.RandMat(_hiddenSize, _hiddenSize, 0, 0.08);
    model['bo' + d] = new UTILS.Mat(_hiddenSize, 1);
    // cell write params
    model['Wcx' + d] = new UTILS.RandMat(_hiddenSize, prevSize, 0, 0.08);
    model['Wch' + d] = new UTILS.RandMat(_hiddenSize, _hiddenSize, 0, 0.08);
    model['bc' + d] = new UTILS.Mat(_hiddenSize, 1);
  }
  // decoder params
  model['Whd'] = new UTILS.RandMat(outputSize, hiddenSize, 0, 0.08);
  model['bd'] = new UTILS.Mat(outputSize, 1);
  return model;
};

var forwardLSTM = function forwardLSTM(G, model, hiddenSizes, x, prev) {
  // forward prop for a single tick of LSTM
  // G is graph to append ops to
  // model contains LSTM parameters
  // x is 1D column vector with observation
  // prev is a struct containing hidden and cell
  // from previous iteration
  var hiddenPrevs = [];
  var cellPrevs = [];
  if (prev == null || typeof prev.h === 'undefined') {
    for (var d = 0; d < hiddenSizes.length; d++) {
      hiddenPrevs.push(new UTILS.Mat(hiddenSizes[d], 1));
      cellPrevs.push(new UTILS.Mat(hiddenSizes[d], 1));
    }
  } else {
    hiddenPrevs = prev.h;
    cellPrevs = prev.c;
  }
  var hidden = [];
  var cell = [];
  for (var _d = 0; _d < hiddenSizes.length; _d++) {
    var inputVector = _d === 0 ? x : hidden[_d - 1];
    var hiddenPrev = hiddenPrevs[_d];
    var cellPrev = cellPrevs[_d];
    // input gate
    var h0 = G.mul(model['Wix' + _d], inputVector);
    var h1 = G.mul(model['Wih' + _d], hiddenPrev);
    var inputGate = G.sigmoid(G.add(G.add(h0, h1), model['bi' + _d]));
    // forget gate
    var h2 = G.mul(model['Wfx' + _d], inputVector);
    var h3 = G.mul(model['Wfh' + _d], hiddenPrev);
    var forgetGate = G.sigmoid(G.add(G.add(h2, h3), model['bf' + _d]));
    // output gate
    var h4 = G.mul(model['Wox' + _d], inputVector);
    var h5 = G.mul(model['Woh' + _d], hiddenPrev);
    var outputGate = G.sigmoid(G.add(G.add(h4, h5), model['bo' + _d]));
    // write operation on cells
    var h6 = G.mul(model['Wcx' + _d], inputVector);
    var h7 = G.mul(model['Wch' + _d], hiddenPrev);
    var cellWrite = G.tanh(G.add(G.add(h6, h7), model['bc' + _d]));
    // compute new cell activation
    var retainCell = G.eltmul(forgetGate, cellPrev); // what do we keep from cell
    var writeCell = G.eltmul(inputGate, cellWrite); // what do we write to cell
    var cellD = G.add(retainCell, writeCell); // new cell contents
    // compute hidden state as gated, saturated cell activations
    var hiddenD = G.eltmul(outputGate, G.tanh(cellD));
    hidden.push(hiddenD);
    cell.push(cellD);
  }
  // one decoder to outputs at end
  var output = G.add(G.mul(model['Whd'], hidden[hidden.length - 1]), model['bd']);
  // return cell memory, hidden representation and output
  return {
    'h': hidden,
    'c': cell,
    'o': output
  };
};

// replaces the former binding to the golbal window object in the browser
module.exports = {
  UTILS: UTILS,
  forwardLSTM: forwardLSTM,
  initLSTM: initLSTM,
  // optimization
  Solver: Solver,
  Graph: Graph,
  //agents for now only one is working
  DQNAgent: DQNAgent
};
// END OF RECURRENTJS
