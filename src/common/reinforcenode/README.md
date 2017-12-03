this is a try to modularize the original code from:
## [REINFORCE.js](http://cs.stanford.edu/people/karpathy/reinforcejs/ "REINFORCE.js Demo Page")
### see also: [Original Github Repo](https://github.com/karpathy/reinforcejs "Github Repo")

### Installation
    npm install reinforcenode

### Usage

  ```javascript
  let reinforce = require('reinforcenode');
  let Agent = reinforce.DQNAgent;
  // create an environment object
  let env = {};
  env.getNumStates = function() { return 8; }
  env.getMaxNumActions = function() { return 4; }

  // create the DQN agent
  let spec = { alpha: 0.01 } // see full options on DQN page
  agent = new Agent(env, spec);

  setInterval(function(){ // start the learning loop
    let action = agent.act(s); // s is an array of length 8
    //... execute action in environment and get the reward
    agent.learn(reward); // the agent improves its Q,policy,model, etc. reward is a float
  }, 0);
  ```
  
### Alpha
for now the module exports one Object
  
   ```javascript
  // replaces the former binding to the golbal window object in the browser
  module.exports = {
    maxi: maxi,
    samplei: samplei,
    softmax: softmax,
    UTILS: UTILS,
    forwardLSTM: forwardLSTM,
    initLSTM: initLSTM,
  
    // optimization
    Solver: Solver,
    Graph: Graph,
    //agents for now only one is working
    DQNAgent: DQNAgent
  
  };
  ```
notice the UTILS which in turn exports the bundled helper functions:
  
  ```javascript
  // a module for all the util functions
  module.exports = {
    Mat: Mat,
    RandMat: RandMat,
    assert: assert,
    sig: sig,
    updateMat: updateMat,
    updateNet: updateNet,
    copyNet: copyNet,
    copyMat: copyMat,
    netToJSON: netToJSON,
    netFromJSON: netFromJSON,
    netZeroGrads: netZeroGrads,
    netFlattenGrads: netFlattenGrads,
    getopt: getopt,
    setConst: setConst,
    sampleWeighted: sampleWeighted,
    randi: randi
  };
  ```
