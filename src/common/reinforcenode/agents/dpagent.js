'use strict'

const UTILS = require('../reinforceutils.js');
let R = require('../reinforce.js');

// DPAgent performs Value Iteration
// - can also be used for Policy Iteration if you really wanted to
// - requires model of the environment :(
// - does not learn from experience :(
// - assumes finite MDP :(
let DPAgent = function (env, opt) {
  this.V = null; // state value function
  this.P = null; // policy distribution \pi(s,a)
  this.env = env; // store pointer to environment
  this.gamma = UTILS.getopt(opt, 'gamma', 0.75); // future reward discount factor
  this.reset();
};
DPAgent.prototype = {
  reset: function () {
    // reset the agent's policy and value function
    this.ns = this.env.getNumStates();
    this.na = this.env.getMaxNumActions();UTILS.
    this.V = UTILS.zeros(this.ns);
    this.P = UTILS.zeros(this.ns * this.na);
    // initialize uniform random policy
    for (let s = 0; s < this.ns; s++) {
      let poss = this.env.allowedActions(s);
      for (let i = 0, n = poss.length; i < n; i++) {
        this.P[poss[i] * this.ns + s] = 1.0 / poss.length;
      }
    }
  },
  act: function (s) {
    // behave according to the learned policy
    let poss = this.env.allowedActions(s);
    let ps = [];
    for (let i = 0, n = poss.length; i < n; i++) {
      let a = poss[i];
      let prob = this.P[a * this.ns + s];
      ps.push(prob);
    }
    let maxi = UTILS.sampleWeighted(ps);
    return poss[maxi];
  },
  learn: function () {
    // perform a single round of value iteration
    this.evaluatePolicy(); // writes this.V
    this.updatePolicy(); // writes this.P
  },
  evaluatePolicy: function () {
    // perform a synchronous update of the value function
    let Vnew = UTILS.zeros(this.ns);
    for (let s = 0; s < this.ns; s++) {
      // integrate over actions in a stochastic policy
      // note that we assume that policy probability mass over allowed actions sums to one
      let v = 0.0;
      let poss = this.env.allowedActions(s);
      for (let i = 0, n = poss.length; i < n; i++) {
        let a = poss[i];
        let prob = this.P[a * this.ns + s]; // probability of taking action under policy
        if (prob === 0) {
          continue;
        } // no contribution, skip for speed
        let ns = this.env.nextStateDistribution(s, a);
        let rs = this.env.reward(s, a, ns); // reward for s->a->ns transition
        v += prob * (rs + this.gamma * this.V[ns]);
      }
      Vnew[s] = v;
    }
    this.V = Vnew; // swap
  },
  updatePolicy: function () {
    // update policy to be greedy w.UTILS.t. learned Value function
    for (let s = 0; s < this.ns; s++) {
      let poss = this.env.allowedActions(s);
      // compute value of taking each allowed action
      let vmax, nmax;
      let vs = [];
      for (let i = 0, n = poss.length; i < n; i++) {
        let a = poss[i];
        let ns = this.env.nextStateDistribution(s, a);
        let rs = this.env.reward(s, a, ns);
        let v = rs + this.gamma * this.V[ns];
        vs.push(v);
        if (i === 0 || v > vmax) {
          vmax = v;
          nmax = 1;
        } else if (v === vmax) {
          nmax += 1;
        }
      }
      // update policy smoothly across all argmaxy actions
      for (let i = 0, n = poss.length; i < n; i++) {
        let a = poss[i];
        this.P[a * this.ns + s] = (vs[i] === vmax) ? 1.0 / nmax : 0.0;
      }
    }
  },
};

module.exports = DPAgent;
