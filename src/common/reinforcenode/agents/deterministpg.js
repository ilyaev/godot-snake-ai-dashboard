'use strict';
const UTILS = require('../reinforceutils.js');
let R = require('../reinforce.js');

// Currently buggy implementation, doesnt work
let DeterministPG = function (env, opt) {
  this.gamma = UTILS.getopt(opt, 'gamma', 0.5); // future reward discount factor
  this.epsilon = UTILS.getopt(opt, 'epsilon', 0.5); // for epsilon-greedy policy
  this.alpha = UTILS.getopt(opt, 'alpha', 0.001); // actor net learning rate
  this.beta = UTILS.getopt(opt, 'beta', 0.01); // baseline net learning rate
  this.env = env;
  this.reset();
};

DeterministPG.prototype = {
  reset: function () {
    this.ns = this.env.getNumStates();
    this.na = this.env.getMaxNumActions();
    this.nh = 100; // number of hidden units
    // actor
    this.actorNet = {};
    this.actorNet.W1 = new UTILS.RandMat(this.nh, this.ns, 0, 0.01);
    this.actorNet.b1 = new UTILS.Mat(this.nh, 1, 0, 0.01);
    this.actorNet.W2 = new UTILS.RandMat(this.na, this.ns, 0, 0.1);
    this.actorNet.b2 = new UTILS.Mat(this.na, 1, 0, 0.01);
    this.ntheta = this.na * this.ns + this.na; // number of params in actor
    // critic
    this.criticw = new UTILS.RandMat(1, this.ntheta, 0, 0.01); // row vector
    this.r0 = null;
    this.s0 = null;
    this.s1 = null;
    this.a0 = null;
    this.a1 = null;
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
  act: function (slist) {
    // convert to a Mat column vector
    let s = new UTILS.Mat(this.ns, 1);
    s.setFrom(slist);
    // forward the actor to get action output
    let ans = this.forwardActor(s, false);
    let amat = ans.a;
    //ag is defined but never used!
    let ag = ans.G;
    // sample action from the stochastic gaussian policy
    let a = UTILS.copyMat(amat);
    if (Math.random() < this.epsilon) {
      let gausslet = 0.02;
      a.w[0] = UTILS.randn(0, gausslet);
      a.w[1] = UTILS.randn(0, gausslet);
    }
    let clamp = 0.25;
    if (a.w[0] > clamp) {
      a.w[0] = clamp;
    }
    if (a.w[0] < -clamp) {
      a.w[0] = -clamp;
    }
    if (a.w[1] > clamp) {
      a.w[1] = clamp;
    }
    if (a.w[1] < -clamp) {
      a.w[1] = -clamp;
    }
    // shift state memory
    this.s0 = this.s1;
    this.a0 = this.a1;
    this.s1 = s;
    this.a1 = a;
    return a;
  },
  //s is defined but never used!
  utilJacobianAt: function (s) {
    let ujacobian = new UTILS.Mat(this.ntheta, this.na);
    for (let a = 0; a < this.na; a++) {
      UTILS.netZeroGrads(this.actorNet);
      let ag = this.forwardActor(this.s0, true);
      ag.a.dw[a] = 1.0;
      ag.G.backward();
      let gflat = UTILS.netFlattenGrads(this.actorNet);
      ujacobian.setColumn(gflat, a);
    }
    return ujacobian;
  },
  learn: function (r1) {
    // perform an update on Q function
    //this.rewardHistory.push(r1);
    if (!(this.r0 == null)) {
      let Gtmp = new R.Graph(false);
      // dpg update:
      // first compute the features psi:
      // the jacobian matrix of the actor for s
      let ujacobian0 = this.utilJacobianAt(this.s0);
      // now form the features \psi(s,a)
      let psiSa0 = Gtmp.mul(ujacobian0, this.a0); // should be [this.ntheta x 1] "feature" vector
      let qw0 = Gtmp.mul(this.criticw, psiSa0); // 1x1
      // now do the same thing because we need \psi(s_{t+1}, \mu\_\theta(s\_t{t+1}))
      let ujacobian1 = this.utilJacobianAt(this.s1);
      let ag = this.forwardActor(this.s1, false);
      let psiSa1 = Gtmp.mul(ujacobian1, ag.a);
      let qw1 = Gtmp.mul(this.criticw, psiSa1); // 1x1
      // get the td error finally
      let tderror = this.r0 + this.gamma * qw1.w[0] - qw0.w[0]; // lol
      if (tderror > 0.5) {
        tderror = 0.5; // clamp
      }
      if (tderror < -0.5) {
        tderror = -0.5;
      }
      this.tderror = tderror;
      // update actor policy with natural gradient
      let net = this.actorNet;
      let ix = 0;
      for (let p in net) {
        let mat = net[p];
        if (net.hasOwnProperty(p)) {
          for (let i = 0, n = mat.w.length; i < n; i++) {
            mat.w[i] += this.alpha * this.criticw.w[ix]; // natural gradient update
            ix += 1;
          }
        }
      }
      // update the critic parameters too
      for (let i = 0; i < this.ntheta; i++) {
        let update = this.beta * tderror * psiSa0.w[i];
        this.criticw.w[i] += update;
      }
    }
    this.r0 = r1; // store for next update
  },
};
