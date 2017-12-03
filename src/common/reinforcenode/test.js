'use strict';
let Agent = require('./agents/dqnagent.js');
// create an environment object
let env = {};
env.getNumStates = function () {
  return 3; // bid, ask, diff
};
env.getMaxNumActions = function () {
  return 3; // buy, sell, stay
};
// create the DQN agent
let spec = {
    alpha: 0.01
  } // see full options on DQN page
let agent = new Agent(env, spec);
let rewardCount = 0;
let getState = () => {
  let bid = 2 + Math.random();
  let ask = 1 + Math.random();
  let diff = bid - ask;
  return [bid, ask, diff];
};
let getReward = (action) => {
  switch (action) {
  case 0:
    return -1;
  case 1:
    return 0;
  case 2:
    return 1;
  default:
    return 0;
  }
};
setInterval(function () { // start the learning loop
  let state = getState();
  let action = agent.act(state); // s is an array of length 3
  //execute action in environment and get the reward
  let reward = getReward(action);
  rewardCount += reward;
  agent.learn(reward); // the agent improves its Q,policy,model, etc. reward is a float
  console.log(rewardCount);
}, 10);
