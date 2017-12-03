'use strict';
const UTILS = require('../reinforceutils.js');
let R = require('../reinforce.js');
// buggy implementation, doesnt work...
let SimpleReinforceAgent = function (env, opt) {
  this.gamma = UTILS.getopt(opt, 'gamma', 0.5); // future reward discount factor
  this.epsilon = UTILS.getopt(opt, 'epsilon', 0.75); // for epsilon-greedy policy
  this.alpha = UTILS.getopt(opt, 'alpha', 0.001); // actor net learning rate
  this.beta = UTILS.getopt(opt, 'beta', 0.01); // baseline net learning rate
  this.env = env;
  this.reset();
};
SimpleReinforceAgent.prototype = {
  reset: function () {
    this.ns = this.env.getNumStates();
    this.na = this.env.getMaxNumActions();
    this.nh = 100; // number of hidden units
    this.nhb = 100; // and also in the baseline lstm
    this.actorNet = {};
    this.actorNet.W1 = new UTILS.RandMat(this.nh, this.ns, 0, 0.01);
    this.actorNet.b1 = new UTILS.Mat(this.nh, 1, 0, 0.01);
    this.actorNet.W2 = new UTILS.RandMat(this.na, this.nh, 0, 0.1);
    this.actorNet.b2 = new UTILS.Mat(this.na, 1, 0, 0.01);
    this.actorOutputs = [];
    this.actorGraphs = [];
    this.actorActions = []; // sampled ones
    this.rewardHistory = [];
    this.baselineNet = {};
    this.baselineNet.W1 = new UTILS.RandMat(this.nhb, this.ns, 0, 0.01);
    this.baselineNet.b1 = new UTILS.Mat(this.nhb, 1, 0, 0.01);
    this.baselineNet.W2 = new UTILS.RandMat(this.na, this.nhb, 0, 0.01);
    this.baselineNet.b2 = new UTILS.Mat(this.na, 1, 0, 0.01);
    this.baselineOutputs = [];
    this.baselineGraphs = [];
    this.t = 0;
  },
  forwardActor: function (s, needsBackprop) {
    let net = this.actorNet;
    let G = new R.Graph(needsBackprop);
    let a1mat = G.add(G.mul(net.W1, s), net.b1);
    let h1mat = G.tanh(a1mat);
    let a2mat = G.add(G.mul(net.W2, h1mat), net.b2);
    return {
      'a': a2mat,
      'G': G
    };
  },
  forwardValue: function (s, needsBackprop) {
    let net = this.baselineNet;
    let G = new R.Graph(needsBackprop);
    let a1mat = G.add(G.mul(net.W1, s), net.b1);
    let h1mat = G.tanh(a1mat);
    let a2mat = G.add(G.mul(net.W2, h1mat), net.b2);
    return {
      'a': a2mat,
      'G': G
    };
  },
  act: function (slist) {
    // convert to a Mat column vector
    let s = new UTILS.Mat(this.ns, 1);
    s.setFrom(slist);
    // forward the actor to get action output
    let ans = this.forwardActor(s, true);
    let amat = ans.a;
    let ag = ans.G;
    this.actorOutputs.push(amat);
    this.actorGraphs.push(ag);
    // forward the baseline estimator
    let vmat = ans.a;
    let vg = ans.G;
    this.baselineOutputs.push(vmat);
    this.baselineGraphs.push(vg);
    // sample action from the stochastic gaussian policy
    let a = UTILS.copyMat(amat);
    let gausslet = 0.02;
    a.w[0] = UTILS.randn(0, gausslet);
    a.w[1] = UTILS.randn(0, gausslet);
    this.actorActions.push(a);
    // shift state memory
    this.s0 = this.s1;
    this.a0 = this.a1;
    this.s1 = s;
    this.a1 = a;
    return a;
  },
  learn: function (r1) {
    // perform an update on Q function
    this.rewardHistory.push(r1);
    let n = this.rewardHistory.length;
    let baselineMSE = 0.0;
    let nup = 100; // what chunk of experience to take
    let nuse = 80; // what chunk to update from
    if (n >= nup) {
      // lets learn and flush
      // first: compute the sample values at all points
      let vs = [];
      for (let t = 0; t < nuse; t++) {
        let mul = 1;
        // compute the actual discounted reward for this time step
        let V = 0;
        for (let t2 = t; t2 < n; t2++) {
          V += mul * this.rewardHistory[t2];
          mul *= this.gamma;
          if (mul < 1e-5) {
            break;
          } // efficiency savings
        }
        // get the predicted baseline at this time step
        let b = this.baselineOutputs[t].w[0];
        for (let i = 0; i < this.na; i++) {
          // [the action delta] * [the desirebility]
          let update = -(V - b) * (this.actorActions[t].w[i] - this.actorOutputs[t].w[i]);
          if (update > 0.1) {
            update = 0.1;
          }
          if (update < -0.1) {
            update = -0.1;
          }
          this.actorOutputs[t].dw[i] += update;
        }
        let update = -(V - b);
        if (update > 0.1) {
          update = 0.1;
        }
        if (update < 0.1) {
          update = -0.1;
        }
        this.baselineOutputs[t].dw[0] += update;
        baselineMSE += (V - b) * (V - b);
        vs.push(V);
      }
      baselineMSE /= nuse;
      // backprop all the things
      for (let t = 0; t < nuse; t++) {
        this.actorGraphs[t].backward();
        this.baselineGraphs[t].backward();
      }
      UTILS.updateNet(this.actorNet, this.alpha); // update actor network
      UTILS.updateNet(this.baselineNet, this.beta); // update baseline network
      // flush
      this.actorOutputs = [];
      this.rewardHistory = [];
      this.actorActions = [];
      this.baselineOutputs = [];
      this.actorGraphs = [];
      this.baselineGraphs = [];
      this.tderror = baselineMSE;
    }
    this.t += 1;
    this.r0 = r1; // store for next update
  },
};
module.exports = SimpleReinforceAgent;
