'use strict';
const UTILS = require('../reinforceutils.js');
let Graph = require('../reinforcegraph.js');
let DQNAgent = function (env, opt) {
  this.gamma = UTILS.getopt(opt, 'gamma', 0.75); // future reward discount factor
  this.epsilon = UTILS.getopt(opt, 'epsilon', 0.1); // for epsilon-greedy policy
  this.alpha = UTILS.getopt(opt, 'alpha', 0.01); // value function learning rate
  this.experienceAddEvery = UTILS.getopt(opt, 'experienceAddEvery', 25); // number of time steps before we add another experience to replay memory
  this.experienceSize = UTILS.getopt(opt, 'experienceSize', 5000); // size of experience replay
  this.learningStepsPerIteration = UTILS.getopt(opt, 'learningStepsPerIteration', 10);
  this.tderrorClamp = UTILS.getopt(opt, 'tderrorClamp', 1.0);
  this.numHiddenUnits = UTILS.getopt(opt, 'numHiddenUnits', 100);
  this.env = env;
  this.reset();
};

DQNAgent.prototype = {
  reset: function () {
    this.nh = this.numHiddenUnits; // number of hidden units
    this.ns = this.env.getNumStates();
    this.na = this.env.getMaxNumActions();
    // nets are hardcoded for now as key (str) -> Mat
    // not proud of this. better solution is to have a whole Net object
    // on top of Mats, but for now sticking with this
    this.net = {};
    this.net.W1 = new UTILS.RandMat(this.nh, this.ns, 0, 0.01);
    this.net.b1 = new UTILS.Mat(this.nh, 1, 0, 0.01);
    this.net.W2 = new UTILS.RandMat(this.na, this.nh, 0, 0.01);
    this.net.b2 = new UTILS.Mat(this.na, 1, 0, 0.01);
    this.exp = []; // experience
    this.expi = 0; // where to insert
    this.t = 0;
    this.r0 = null;
    this.s0 = null;
    this.s1 = null;
    this.a0 = null;
    this.a1 = null;
    this.tderror = 0; // for visualization only...
  },
  toJSON: function () {
    // save function
    let j = {};
    j.nh = this.nh;
    j.ns = this.ns;
    j.na = this.na;
    j.net = UTILS.netToJSON(this.net);
    return j;
  },
  fromJSON: function (j) {
    // load function
    this.nh = j.nh;
    this.ns = j.ns;
    this.na = j.na;
    this.net = UTILS.netFromJSON(j.net);
  },
  forwardQ: function (net, s, needsBackprop) {
    let G = new Graph(needsBackprop);
    let a1mat = G.add(G.mul(net.W1, s), net.b1);
    let h1mat = G.tanh(a1mat);
    let a2mat = G.add(G.mul(net.W2, h1mat), net.b2);
    this.lastG = G; // back this up. Kind of hacky isn't it
    return a2mat;
  },
  act: function (slist) {
    // convert to a Mat column vector
    let s = new UTILS.Mat(this.ns, 1);
    s.setFrom(slist);
    // epsilon greedy policy
    let a;
    if (Math.random() < this.epsilon) {
      a = UTILS.randi(0, this.na);
    } else {
      // greedy wrt Q function
      let amat = this.forwardQ(this.net, s, false);
      a = UTILS.maxi(amat.w); // returns index of argmax action
    }
    // shift state memory
    this.s0 = this.s1;
    this.a0 = this.a1;
    this.s1 = s;
    this.a1 = a;
    return a;
  },
  learn: function (r1) {
    // perform an update on Q function
    if (!(this.r0 == null) && this.alpha > 0) {
      // learn from this tuple to get a sense of how "surprising" it is to the agent
      let tderror = this.learnFromTuple(this.s0, this.a0, this.r0, this.s1, this.a1);
      this.tderror = tderror; // a measure of surprise
      // decide if we should keep this experience in the replay
      if (this.t % this.experienceAddEvery === 0) {
        this.exp[this.expi] = [this.s0, this.a0, this.r0, this.s1, this.a1];
        this.expi += 1;
        if (this.expi > this.experienceSize) {
          this.expi = 0;
        } // roll over when we run out
      }
      this.t += 1;
      // sample some additional experience from replay memory and learn from it
      for (let k = 0; k < this.learningStepsPerIteration; k++) {
        let ri = UTILS.randi(0, this.exp.length); // todo: priority sweeps?
        let e = this.exp[ri];
        this.learnFromTuple(e[0], e[1], e[2], e[3], e[4]);
      }
    }
    this.r0 = r1; // store for next update
  },
  // a1 is never used!
  learnFromTuple: function (s0, a0, r0, s1, a1) {
    // want: Q(s,a) = r + gamma * max_a' Q(s',a')
    // compute the target Q value
    let tmat = this.forwardQ(this.net, s1, false);
    let qmax = r0 + this.gamma * tmat.w[UTILS.maxi(tmat.w)];
    // now predict
    let pred = this.forwardQ(this.net, s0, true);
    let tderror = pred.w[a0] - qmax;
    let clamp = this.tderrorClamp;
    if (Math.abs(tderror) > clamp) { // huber loss to robustify
      if (tderror > clamp) {
        tderror = clamp;
      }
      if (tderror < -clamp) {
        tderror = -clamp;
      }
    }
    pred.dw[a0] = tderror;
    this.lastG.backward(); // compute gradients on net params
    // update net
    UTILS.updateNet(this.net, this.alpha);
    return tderror;
  }
};

module.exports = DQNAgent;
