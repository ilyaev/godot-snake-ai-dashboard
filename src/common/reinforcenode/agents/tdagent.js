'use strict';
const UTILS = require('../reinforceutils.js');
// QAgent uses TD (Q-Learning, SARSA)
// - does not require environment model :)
// - learns from experience :)
let TDAgent = function (env, opt) {
  this.update = UTILS.getopt(opt, 'update', 'qlearn'); // qlearn | sarsa
  this.gamma = UTILS.getopt(opt, 'gamma', 0.75); // future reward discount factor
  this.epsilon = UTILS.getopt(opt, 'epsilon', 0.1); // for epsilon-greedy policy
  this.alpha = UTILS.getopt(opt, 'alpha', 0.01); // value function learning rate
  // class allows non-deterministic policy, and smoothly regressing towards the optimal policy based on Q
  this.smoothPolicyUpdate = UTILS.getopt(opt, 'smoothPolicyUpdate', false);
  this.beta = UTILS.getopt(opt, 'beta', 0.01); // learning rate for policy, if smooth updates are on
  // eligibility traces
  this.lambda = UTILS.getopt(opt, 'lambda', 0); // eligibility trace decay. 0 = no eligibility traces used
  this.replacingTraces = UTILS.getopt(opt, 'replacingTraces', true);
  // optional optimistic initial values
  this.qInitVal = UTILS.getopt(opt, 'qInitVal', 0);
  this.planN = UTILS.getopt(opt, 'planN', 0); // number of planning steps per learning iteration (0 = no planning)
  this.Q = null; // state action value function
  this.P = null; // policy distribution \pi(s,a)
  this.e = null; // eligibility trace
  this.envModelS = null; // environment model (s,a) -> (s',r)
  this.envModelR = null; // environment model (s,a) -> (s',r)
  this.env = env; // store pointer to environment
  this.reset();
};
TDAgent.prototype = {
  reset: function () {
    // reset the agent's policy and value function
    this.ns = this.env.getNumStates();
    this.na = this.env.getMaxNumActions();
    this.Q = UTILS.zeros(this.ns * this.na);
    if (this.qInitVal !== 0) {
      UTILS.setConst(this.Q, this.qInitVal);
    }
    this.P = UTILS.zeros(this.ns * this.na);
    this.e = UTILS.zeros(this.ns * this.na);
    // model/planning lets
    this.envModelS = UTILS.zeros(this.ns * this.na);
    UTILS.setConst(this.envModelS, -1); // init to -1 so we can test if we saw the state before
    this.envModelR = UTILS.zeros(this.ns * this.na);
    this.saSeen = [];
    this.pq = UTILS.zeros(this.ns * this.na);
    // initialize uniform random policy
    for (let s = 0; s < this.ns; s++) {
      let poss = this.env.allowedActions(s);
      for (let i = 0, n = poss.length; i < n; i++) {
        this.P[poss[i] * this.ns + s] = 1.0 / poss.length;
      }
    }
    // agent memory, needed for streaming updates
    // (s0,a0,r0,s1,a1,r1,...)
    this.r0 = null;
    this.s0 = null;
    this.s1 = null;
    this.a0 = null;
    this.a1 = null;
  },
  resetEpisode: function () {
    // an episode finished
  },
  act: function (s) {
    // act according to epsilon greedy policy
    let poss = this.env.allowedActions(s);
    let probs = [];
    for (let i = 0, n = poss.length; i < n; i++) {
      probs.push(this.P[poss[i] * this.ns + s]);
    }
    // epsilon greedy policy
    let a;
    if (Math.random() < this.epsilon) {
      a = poss[UTILS.randi(0, poss.length)]; // random available action
      this.explored = true;
    } else {
      a = poss[UTILS.sampleWeighted(probs)];
      this.explored = false;
    }
    // shift state memory
    this.s0 = this.s1;
    this.a0 = this.a1;
    this.s1 = s;
    this.a1 = a;
    return a;
  },
  learn: function (r1) {
    // takes reward for previous action, which came from a call to act()
    if (!(this.r0 == null)) {
      this.learnFromTuple(this.s0, this.a0, this.r0, this.s1, this.a1, this.lambda);
      if (this.planN > 0) {
        this.updateModel(this.s0, this.a0, this.r0, this.s1);
        this.plan();
      }
    }
    this.r0 = r1; // store this for next update
  },
  updateModel: function (s0, a0, r0, s1) {
    // transition (s0,a0) -> (r0,s1) was observed. Update environment model
    let sa = a0 * this.ns + s0;
    if (this.envModelS[sa] === -1) {
      // first time we see this state action
      this.saSeen.push(a0 * this.ns + s0); // add as seen state
    }
    this.envModelS[sa] = s1;
    this.envModelR[sa] = r0;
  },
  plan: function () {
    // order the states based on current priority queue information
    let spq = [];
    for (let i = 0, n = this.saSeen.length; i < n; i++) {
      let sa = this.saSeen[i];
      let sap = this.pq[sa];
      if (sap > 1e-5) { // gain a bit of efficiency
        spq.push({
          sa: sa,
          p: sap
        });
      }
    }
    spq.sort(function (a, b) {
      return a.p < b.p ? 1 : -1;
    });
    // perform the updates
    let nsteps = Math.min(this.planN, spq.length);
    for (let k = 0; k < nsteps; k++) {
      // random exploration
      //let i = UTILS.randi(0, this.saSeen.length); // pick random prev seen state action
      //let s0a0 = this.saSeen[i];
      let s0a0 = spq[k].sa;
      this.pq[s0a0] = 0; // erase priority, since we're backing up this state
      let s0 = s0a0 % this.ns;
      let a0 = Math.floor(s0a0 / this.ns);
      let r0 = this.envModelR[s0a0];
      let s1 = this.envModelS[s0a0];
      let a1 = -1; // not used for Q learning
      if (this.update === 'sarsa') {
        // generate random action?...
        let poss = this.env.allowedActions(s1);
        a1 = poss[UTILS.randi(0, poss.length)];
      }
      this.learnFromTuple(s0, a0, r0, s1, a1, 0); // note lambda = 0 - shouldnt use eligibility trace here
    }
  },
  learnFromTuple: function (s0, a0, r0, s1, a1, lambda) {
    let sa = a0 * this.ns + s0;
    // calculate the target for Q(s,a)
    let target;
    if (this.update === 'qlearn') {
      // Q learning target is Q(s0,a0) = r0 + gamma * max_a Q[s1,a]
      let poss = this.env.allowedActions(s1);
      let qmax = 0;
      for (let i = 0, n = poss.length; i < n; i++) {
        let s1a = poss[i] * this.ns + s1;
        let qval = this.Q[s1a];
        if (i === 0 || qval > qmax) {
          qmax = qval;
        }
      }
      target = r0 + this.gamma * qmax;
    } else if (this.update === 'sarsa') {
      // SARSA target is Q(s0,a0) = r0 + gamma * Q[s1,a1]
      let s1a1 = a1 * this.ns + s1;
      target = r0 + this.gamma * this.Q[s1a1];
    }
    if (lambda > 0) {
      // perform an eligibility trace update
      if (this.replacingTraces) {
        this.e[sa] = 1;
      } else {
        this.e[sa] += 1;
      }
      let edecay = lambda * this.gamma;
      let stateUpdate = UTILS.zeros(this.ns);
      for (let s = 0; s < this.ns; s++) {
        let poss = this.env.allowedActions(s);
        for (let i = 0; i < poss.length; i++) {
          let a = poss[i];
          let saloop = a * this.ns + s;
          let esa = this.e[saloop];
          let update = this.alpha * esa * (target - this.Q[saloop]);
          this.Q[saloop] += update;
          this.updatePriority(s, a, update);
          this.e[saloop] *= edecay;
          let u = Math.abs(update);
          if (u > stateUpdate[s]) {
            stateUpdate[s] = u;
          }
        }
      }
      for (let s = 0; s < this.ns; s++) {
        if (stateUpdate[s] > 1e-5) { // save efficiency here
          this.updatePolicy(s);
        }
      }
      if (this.explored && this.update === 'qlearn') {
        // have to wipe the trace since q learning is off-policy :(
        this.e = UTILS.zeros(this.ns * this.na);
      }
    } else {
      // simpler and faster update without eligibility trace
      // update Q[sa] towards it with some step size
      let update = this.alpha * (target - this.Q[sa]);
      this.Q[sa] += update;
      this.updatePriority(s0, a0, update);
      // update the policy to reflect the change (if appropriate)
      this.updatePolicy(s0);
    }
  },
  updatePriority: function (s, a, u) {
    // used in planning. Invoked when Q[sa] += update
    // we should find all states that lead to (s,a) and upgrade their priority
    // of being update in the next planning step
    u = Math.abs(u);
    if (u < 1e-5) {
      return;
    } // for efficiency skip small updates
    if (this.planN === 0) {
      return;
    } // there is no planning to be done, skip.
    for (let si = 0; si < this.ns; si++) {
      // note we are also iterating over impossible actions at all states,
      // but this should be okay because their envModelS should simply be -1
      // as initialized, so they will never be predicted to point to any state
      // because they will never be observed, and hence never be added to the model
      for (let ai = 0; ai < this.na; ai++) {
        let siai = ai * this.ns + si;
        if (this.envModelS[siai] === s) {
          // this state leads to s, add it to priority queue
          this.pq[siai] += u;
        }
      }
    }
  },
  updatePolicy: function (s) {
    let poss = this.env.allowedActions(s);
    // set policy at s to be the action that achieves max_a Q(s,a)
    // first find the maxy Q values
    let qmax, nmax;
    let qs = [];
    for (let i = 0, n = poss.length; i < n; i++) {
      let a = poss[i];
      let qval = this.Q[a * this.ns + s];
      qs.push(qval);
      if (i === 0 || qval > qmax) {
        qmax = qval;
        nmax = 1;
      } else if (qval === qmax) {
        nmax += 1;
      }
    }
    // now update the policy smoothly towards the argmaxy actions
    let psum = 0.0;
    for (let i = 0, n = poss.length; i < n; i++) {
      let a = poss[i];
      let target = (qs[i] === qmax) ? 1.0 / nmax : 0.0;
      let ix = a * this.ns + s;
      if (this.smoothPolicyUpdate) {
        // slightly hacky :p
        this.P[ix] += this.beta * (target - this.P[ix]);
        psum += this.P[ix];
      } else {
        // set hard target
        this.P[ix] = target;
      }
    }
    if (this.smoothPolicyUpdate) {
      // renomalize P if we're using smooth policy updates
      for (let i = 0, n = poss.length; i < n; i++) {
        let a = poss[i];
        this.P[a * this.ns + s] /= psum;
      }
    }
  }
};
module.exports = TDAgent;
