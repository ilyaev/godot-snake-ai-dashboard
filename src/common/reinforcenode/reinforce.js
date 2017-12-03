'use strict';
const UTILS = require('./reinforceutils.js');

let Graph = require('./reinforcegraph.js');
let Solver = require('./reinforcesolver.js');
let DQNAgent = require('./agents/dqnagent.js');

let initLSTM = (inputSize, hiddenSizes, outputSize) => {
  // hidden size should be a list
  let model = {};
  for (let d = 0; d < hiddenSizes.length; d++) { // loop over depths
    let prevSize = d === 0 ? inputSize : hiddenSizes[d - 1];
    let hiddenSize = hiddenSizes[d];
    // gates parameters
    model['Wix' + d] = new UTILS.RandMat(hiddenSize, prevSize, 0, 0.08);
    model['Wih' + d] = new UTILS.RandMat(hiddenSize, hiddenSize, 0, 0.08);
    model['bi' + d] = new UTILS.Mat(hiddenSize, 1);
    model['Wfx' + d] = new UTILS.RandMat(hiddenSize, prevSize, 0, 0.08);
    model['Wfh' + d] = new UTILS.RandMat(hiddenSize, hiddenSize, 0, 0.08);
    model['bf' + d] = new UTILS.Mat(hiddenSize, 1);
    model['Wox' + d] = new UTILS.RandMat(hiddenSize, prevSize, 0, 0.08);
    model['Woh' + d] = new UTILS.RandMat(hiddenSize, hiddenSize, 0, 0.08);
    model['bo' + d] = new UTILS.Mat(hiddenSize, 1);
    // cell write params
    model['Wcx' + d] = new UTILS.RandMat(hiddenSize, prevSize, 0, 0.08);
    model['Wch' + d] = new UTILS.RandMat(hiddenSize, hiddenSize, 0, 0.08);
    model['bc' + d] = new UTILS.Mat(hiddenSize, 1);
  }
  // decoder params
  model['Whd'] = new UTILS.RandMat(outputSize, hiddenSize, 0, 0.08);
  model['bd'] = new UTILS.Mat(outputSize, 1);
  return model;
};

let forwardLSTM = function (G, model, hiddenSizes, x, prev) {
  // forward prop for a single tick of LSTM
  // G is graph to append ops to
  // model contains LSTM parameters
  // x is 1D column vector with observation
  // prev is a struct containing hidden and cell
  // from previous iteration
  let hiddenPrevs = [];
  let cellPrevs = [];
  if (prev == null || typeof prev.h === 'undefined') {
    for (let d = 0; d < hiddenSizes.length; d++) {
      hiddenPrevs.push(new UTILS.Mat(hiddenSizes[d], 1));
      cellPrevs.push(new UTILS.Mat(hiddenSizes[d], 1));
    }
  } else {
    hiddenPrevs = prev.h;
    cellPrevs = prev.c;
  }
  let hidden = [];
  let cell = [];
  for (let d = 0; d < hiddenSizes.length; d++) {
    let inputVector = d === 0 ? x : hidden[d - 1];
    let hiddenPrev = hiddenPrevs[d];
    let cellPrev = cellPrevs[d];
    // input gate
    let h0 = G.mul(model['Wix' + d], inputVector);
    let h1 = G.mul(model['Wih' + d], hiddenPrev);
    let inputGate = G.sigmoid(G.add(G.add(h0, h1), model['bi' + d]));
    // forget gate
    let h2 = G.mul(model['Wfx' + d], inputVector);
    let h3 = G.mul(model['Wfh' + d], hiddenPrev);
    let forgetGate = G.sigmoid(G.add(G.add(h2, h3), model['bf' + d]));
    // output gate
    let h4 = G.mul(model['Wox' + d], inputVector);
    let h5 = G.mul(model['Woh' + d], hiddenPrev);
    let outputGate = G.sigmoid(G.add(G.add(h4, h5), model['bo' + d]));
    // write operation on cells
    let h6 = G.mul(model['Wcx' + d], inputVector);
    let h7 = G.mul(model['Wch' + d], hiddenPrev);
    let cellWrite = G.tanh(G.add(G.add(h6, h7), model['bc' + d]));
    // compute new cell activation
    let retainCell = G.eltmul(forgetGate, cellPrev); // what do we keep from cell
    let writeCell = G.eltmul(inputGate, cellWrite); // what do we write to cell
    let cellD = G.add(retainCell, writeCell); // new cell contents
    // compute hidden state as gated, saturated cell activations
    let hiddenD = G.eltmul(outputGate, G.tanh(cellD));
    hidden.push(hiddenD);
    cell.push(cellD);
  }
  // one decoder to outputs at end
  let output = G.add(G.mul(model['Whd'], hidden[hidden.length - 1]), model['bd']);
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
