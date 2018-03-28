'use strict';

var _featureMap;

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var DQNAgent = require('./agent').DQNAgent;
var R = require('./agent').R;

var clone = function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
};
var generateID = function generateID() {
    return Math.round(Math.random() * 100000);
};
var randNum = function randNum(num) {
    return Math.floor(Math.random() * num);
};

var FEATURE_HEAD_COORDINATES = 1;
var FEATURE_CLOSEST_FOOD_DICRECTION = 2;
var FEATURE_TAIL_DIRECTION = 3;
var FEATURE_VISION_CLOSE_RANGE = 4;
var FEATURE_VISION_FAR_RANGE = 5;
var FEATURE_VISION_MID_RANGE = 6;
var FEATURE_TAIL_SIZE = 7;
var FEATURE_HUNGER = 8;
var FEATURE_FULL_MAP_4 = 9;
var FEATURE_FULL_MAP_6 = 10;
var FEATURE_CLOSEST_FOOD_ANGLE = 11;
var FEATURE_FULL_MAP_12 = 12;
var FEATURE_BODY_MASS_DIRECTION = 13;
var academy = require('./levels');

var binmap = [1, 2, 4, 8, 16, 32, 64, 128];

var foodPolicy = {
    initialRadius: 4,
    growSpeed: 200
};

var featureMap = (_featureMap = {}, _defineProperty(_featureMap, FEATURE_HEAD_COORDINATES, {
    inputs: 2
}), _defineProperty(_featureMap, FEATURE_CLOSEST_FOOD_DICRECTION, {
    inputs: 4
}), _defineProperty(_featureMap, FEATURE_BODY_MASS_DIRECTION, {
    inputs: 2
}), _defineProperty(_featureMap, FEATURE_CLOSEST_FOOD_ANGLE, {
    inputs: 1
}), _defineProperty(_featureMap, FEATURE_TAIL_DIRECTION, {
    inputs: 2
}), _defineProperty(_featureMap, FEATURE_VISION_CLOSE_RANGE, {
    inputs: 4
}), _defineProperty(_featureMap, FEATURE_VISION_FAR_RANGE, {
    inputs: 8
}), _defineProperty(_featureMap, FEATURE_VISION_MID_RANGE, {
    inputs: 16
}), _defineProperty(_featureMap, FEATURE_TAIL_SIZE, {
    inputs: 1
}), _defineProperty(_featureMap, FEATURE_HUNGER, {
    inputs: 1
}), _defineProperty(_featureMap, FEATURE_FULL_MAP_4, {
    inputs: 16
}), _defineProperty(_featureMap, FEATURE_FULL_MAP_6, {
    inputs: 36
}), _defineProperty(_featureMap, FEATURE_FULL_MAP_12, {
    inputs: 144
}), _featureMap);

var config = {
    id: 0,
    maxX: 7,
    maxY: 7,
    modelName: '',
    params: {
        numStates: 8,
        numActions: 4,
        maxX: 7,
        maxY: 7,
        homelevel: '',
        features: [FEATURE_HEAD_COORDINATES, FEATURE_CLOSEST_FOOD_DICRECTION, FEATURE_VISION_CLOSE_RANGE]
    },
    spec: {
        alpha: 0.01,
        epsilon: 0.001,
        learningStepsPerIteration: 20,
        experienceSize: 10000,
        gamma: 0.95,
        rivals: 0,
        size: 7,
        experienceAddEvery: 1
    },
    actor: {
        x: 3,
        y: 3,
        averageSteps: 0,
        withoutFood: 0,
        step: 0,
        tail: [{
            x: 2,
            y: 3
        }]
    },
    food: [],
    maxFood: 1,
    level: false,
    pits: [],
    rivals: [],
    target: {
        x: 1,
        y: 1
    },
    result: {
        step: 0,
        wins: 0,
        epoch: 0,
        history: [{
            e: 0,
            p: 0,
            t: 0,
            s: 0
        }],
        tail: {
            size: 0,
            epoch: 0
        }
    },
    qvalues: {},
    history: [],
    agent: null,
    stable: null,
    maxAvg: 0,
    rivalAgent: null
};

var actions = [{
    dx: 0,
    dy: 1
}, {
    dx: 0,
    dy: -1
}, {
    dx: 1,
    dy: 0
}, {
    dx: -1,
    dy: 0
}];

var calculateMaxNumInputs = function calculateMaxNumInputs(features) {
    return features.reduce(function (result, next) {
        return result + featureMap[next].inputs;
    }, 0);
};

var replay = [];
var customWalls = {};

module.exports = {
    instance: function instance() {
        var instanceProps = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        instanceProps = Object.assign({
            mode: 'server',
            debug: true,
            test: false,
            recording: false,
            onProgress: false
        }, instanceProps);

        var scene = clone(config);
        scene.id = generateID();

        var walls = {};
        var foods = {};
        var pits = {};

        var turns = [];
        var maxTurns = 1000;

        var getActiveActors = function getActiveActors() {
            return [scene.actor].concat(scene.rivals).filter(function (one) {
                return typeof one.active === 'undefined' || one.active;
            });
        };

        var getNextRivalPlace = function getNextRivalPlace() {
            var cX = 1 + Math.round(Math.random() * (scene.maxX - 1));
            var cY = 1 + Math.round(Math.random() * (scene.maxY - 1));
            if (scene.pits.length > 0) {
                var place = scene.pits[Math.floor(Math.random() * scene.pits.length)];
                cX = place.x;
                cY = place.y;
            }

            return { cX: cX, cY: cY };
        };

        var initRivals = function initRivals(maxRivals) {
            scene.spec.rivals = maxRivals;
            scene.actor.student = true;
            scene.actor.active = true;
            var shift = 0;
            scene.rivals = [];
            for (var i = 0; i < scene.spec.rivals || 0; i++) {
                var place = getNextRivalPlace();
                var x = place.cX;
                var y = place.cY;
                var rival = {
                    x: x,
                    y: y,
                    active: true,
                    student: false,
                    target: {
                        x: 3,
                        y: 3
                    },
                    step: 0,
                    tail: [{
                        x: x - 1,
                        y: y
                    }]
                };
                respawnFood(rival);
                scene.rivals.push(rival);
            }
        };

        var initScene = function initScene() {
            scene.params.numStates = calculateMaxNumInputs(scene.params.features || []);
            scene.env = {
                getNumStates: function getNumStates() {
                    return scene.params.numStates;
                },
                getMaxNumActions: function getMaxNumActions() {
                    return scene.params.numActions;
                }
            };
            initAgents(scene.env, scene.spec);
            scene.defaultActor = clone(scene.actor);
            scene.defaultActor.student = true;
            scene.defaultActor.active = true;
            scene.defaultResult = clone(scene.result);

            for (var x = 0; x <= scene.maxX; x++) {
                if (!scene.qvalues[x]) {
                    scene.qvalues[x] = [];
                }
                if (!walls[x]) {
                    walls[x] = {};
                    foods[x] = {};
                }
                for (var y = 0; y <= scene.maxY; y++) {
                    scene.qvalues[x][y] = 0;
                    walls[x][y] = false;
                    foods[x][y] = false;
                }
            }

            scene.result.wins = 0;
            scene.result.step = 0;
            scene.result.epoch = 0;
            restartActor(-1, 'init');
        };

        var calculateAverage = function calculateAverage(period) {
            var res = scene.history.slice(-period).reduce(function (result, next) {
                result.sumTail += next.size;
                result.sumSteps += next.step;
                result.epoch = next.epoch;
                result.maxTail = next.size > result.maxTail ? next.size : result.maxTail;
                result.maxSteps = Math.max(next.maxSteps, result.maxSteps);
                return result;
            }, {
                sumTail: 0,
                sumSteps: 0,
                maxTail: 0,
                maxSteps: 0,
                epoch: 0
            });

            if (!scene.result.history) {
                scene.result.history = {};
            }
            if (!scene.result.history[period]) {
                scene.result.history[period] = [];
            }

            var avgScore = res.sumTail / period;

            scene.result.history[period].push({
                e: res.epoch,
                p: period,
                t: res.maxTail,
                a: avgScore,
                s: res.maxSteps
            });

            scene.result.history[period] = scene.result.history[period].splice(-100);

            if (period === 100 && avgScore > scene.maxAvg) {
                scene.stable = scene.agent.toJSON();
                scene.maxAvg = avgScore;
            }
        };

        var restartActor = function restartActor(reward, reason) {
            var historyRecord = {
                size: scene.actor.tail.length,
                step: scene.actor.step,
                epoch: scene.result.epoch
            };

            if (!scene.result.tail) {
                scene.result.tail = {
                    size: 0
                };
            }

            if (historyRecord.size > scene.result.tail.size) {
                scene.result.tail = historyRecord;
                if (instanceProps.onProgress) {
                    var cb = instanceProps.onProgress;
                    cb(Object.assign({}, historyRecord, { e: scene.agent.epsilon }));
                }
            }
            if (reason !== 'restart') {
                scene.history.push(historyRecord);
                scene.history = scene.history.splice(-1000);
            }
            scene.actor = clone(scene.defaultActor);
            var place = getNextRivalPlace();
            var x = place.cX;
            var y = place.cY;
            scene.actor.x = x;
            scene.actor.y = y;
            scene.actor.tail[0].x = x - 1;
            scene.actor.tail[0].y = y - 1;
            if (!scene.result.epoch) {
                scene.result.epoch = 0;
            }
            ;[10, 100, 1000].forEach(function (period) {
                return scene.result.epoch % period === 0 ? calculateAverage(period) : null;
            });
            scene.result.epoch += 1;
            scene.actor.step = 0;
            scene.food = [];
            respawnFood(scene.actor, true);
            scene.actor.target = clone(scene.food[0]);
            scene.target = clone(scene.food[0]);
            replay = [];
            if (instanceProps.onEpoch) {
                var cb = instanceProps.onEpoch;
                cb(scene.result.epoch, ['epoch:' + scene.result.epoch].concat(replay.slice(1)), historyRecord);
            }
        };

        var getNextFood = function getNextFood() {
            var wall = true;
            var x, y;
            var tries = 0;
            while (wall == true) {
                tries++;
                x = Math.round(Math.random() * scene.maxX);
                y = Math.round(Math.random() * scene.maxY);

                if (instanceProps.mode === 'server' && tries < 50) {
                    var range = foodPolicy.initialRadius + Math.round(scene.result.epoch / foodPolicy.growSpeed);
                    x = Math.round(Math.random() * range * 2 - range / 2) + scene.actor.x;
                    y = Math.round(Math.random() * range * 2 - range / 2) + scene.actor.y;
                }

                wall = isWall(x, y);
                if (!wall) {
                    wall = isFood(x, y);
                }
            }
            return { x: x, y: y };
        };

        var removeFood = function removeFood(food) {
            scene.food = scene.food.filter(function (one) {
                return one.x !== food.x || one.y !== food.y;
            });
            while (scene.food.length < scene.maxFood + scene.spec.rivals) {
                respawnFood(false);
            }
        };

        var respawnFood = function respawnFood(actor) {
            var pure = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

            var food = getNextFood();
            if (actor && !pure) {
                if (actor.student) {
                    removeFood(scene.target, actor);
                    scene.target.x = food.x;
                    scene.target.y = food.y;
                    actor.target = scene.target;
                    //console.log('---eaten by player')
                } else {
                    removeFood(actor.target, actor);
                    //console.log('---eaten by rivals')
                    actor.target.x = food.x;
                    actor.target.y = food.y;
                }
            }
            var newFood = { x: food.x, y: food.y };
            food.actor = actor ? actor : false;
            scene.food.push(food);
        };

        var shrinkSnake = function shrinkSnake(actor) {
            if (actor.tail.length > 1) {
                actor.tail = actor.tail.slice(0, -1);
                actor.withoutFood = 0;
                return true;
            } else {
                return false;
            }
        };

        var growSnake = function growSnake(actor) {
            var last = actor.tail[actor.tail.length - 1];
            actor.tail.push({
                x: last.x,
                y: last.y,
                wait: 1
            });
            var target = scene.food[randNum(scene.food.length)];
            actor.target = {
                x: target.x,
                y: target.y
            };
        };

        var clearCustomWalls = function clearCustomWalls() {
            return customWalls = {};
        };

        var setWall = function setWall(x, y, value) {
            if (!customWalls[x]) {
                customWalls[x] = {};
            }
            customWalls[x][y] = value ? true : false;
        };

        var isWall = function isWall(x, y) {
            if (typeof walls[x] === 'undefined' || typeof walls[x][y] === 'undefined') {
                return true;
            }
            return walls[x][y];
        };

        var isFood = function isFood(x, y) {
            if (typeof foods[x] === 'undefined' || typeof foods[x][y] === 'undefined') {
                return false;
            }
            return foods[x][y];
        };

        var isFutureWall = function isFutureWall(action, actor) {
            var d = actions[action];
            return isWall(actor.x + d.dx, actor.y + d.dy) ? 1 : 0;
        };

        var buildWalls = function buildWalls() {
            for (var x = 0; x <= scene.maxX; x++) {
                for (var y = 0; y <= scene.maxY; y++) {
                    walls[x][y] = false;
                    foods[x][y] = false;
                    if (customWalls[x] && customWalls[x][y]) {
                        walls[x][y] = true;
                    }
                }
            }
            if (scene.level) {
                scene.level.walls.forEach(function (wall) {
                    return walls[wall.x][wall.y] = true;
                });
            }
            scene.food.forEach(function (food) {
                if (!foods[food.x]) {
                    foods[food.x] = {};
                }
                foods[food.x][food.y] = true;
            });
            getActiveActors().forEach(function (actor) {
                if (!walls[actor.x]) {
                    walls[actor.x] = {};
                }
                walls[actor.x][actor.y] = true;
                actor.tail.forEach(function (one) {
                    if (!walls[one.x]) {
                        walls[one.x] = {};
                    }
                    walls[one.x][one.y] = true;
                });
            });
        };

        var buildFullMap = function buildFullMap(actor, fullRange) {
            var rows = [];
            var range = Math.round(fullRange / 2);
            for (var dx = -range; dx < range; dx++) {
                for (var dy = -range; dy < range; dy++) {
                    var value = 0;
                    if (isWall(actor.x + dx, actor.y + dy)) {
                        value = -1;
                    }
                    if (isFood(actor.x + dx, actor.y + dy)) {
                        value = 1;
                    }
                    rows.push(value);
                }
            }
            return rows;
        };

        var buildMidRangeVision = function buildMidRangeVision(actor) {
            var rows = [];
            for (var dx = -2; dx < 2; dx++) {
                for (var dy = -2; dy < 2; dy++) {
                    var value = isWall(actor.x + dx, actor.y + dy) ? 1 : 0;
                    rows.push(value);
                }
            }
            return rows;
        };

        var buildFarVision = function buildFarVision(actor) {
            var rows = [];
            for (var dx = -4; dx < 4; dx++) {
                var row = [];
                var sum = 0;
                for (var dy = -4; dy < 4; dy++) {
                    var value = isWall(actor.x + dx, actor.y + dy) ? 1 : 0;
                    row.push(value);
                    if (value) {
                        sum += binmap[row.length - 1];
                    }
                }
                rows.push(sum);
            }
            return rows.map(function (one) {
                return one / 256;
            });
        };

        var limitDistanceToFood = function limitDistanceToFood(dist) {
            var limit = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 8;
            return Math.min(limit, Math.max(dist, -1 * limit));
        };

        var bodyMassPos = function bodyMassPos(actor) {
            var pos = actor.tail.reduce(function (result, next) {
                result.x += next.x;
                result.y += next.y;
                return result;
            }, { x: actor.x, y: actor.y });
            return { x: pos.x / actor.tail.length + 1, y: pos.y / actor.tail.length + 1 };
        };

        var buildState = function buildState(actor) {
            var result = [];
            scene.params.features.map(function (one) {
                return parseInt(one);
            }).forEach(function (feature) {
                switch (feature) {
                    case FEATURE_HEAD_COORDINATES:
                        result.push(actor.x / scene.maxX);
                        result.push(actor.y / scene.maxY);
                        break;
                    case FEATURE_BODY_MASS_DIRECTION:
                        var bmPos = bodyMassPos(actor);
                        result.push(1 - (bmPos.x - actor.x) / scene.maxX);
                        result.push(1 - (bmPos.y - actor.y) / scene.maxY);
                        break;
                    case FEATURE_CLOSEST_FOOD_DICRECTION:
                        if (actor.target) {
                            result.push(1 - limitDistanceToFood(actor.target.x - actor.x) / 8);
                            result.push(1 - limitDistanceToFood(actor.target.y - actor.y) / 8);
                            result.push(1 - (actor.target.x - actor.x) / scene.maxX);
                            result.push(1 - (actor.target.y - actor.y) / scene.maxY);
                        } else {
                            result.push(1 - limitDistanceToFood(scene.target.x - actor.x) / 8);
                            result.push(1 - limitDistanceToFood(scene.target.y - actor.y) / 8);
                            result.push(1 - (scene.target.x - actor.x) / scene.maxX);
                            result.push(1 - (scene.target.y - actor.y) / scene.maxY);
                        }
                        break;
                    case FEATURE_CLOSEST_FOOD_ANGLE:
                        if (!actor.target) {
                            actor.target = scene.target;
                        }
                        var hip = Math.sqrt(Math.pow(actor.target.x - actor.x, 2) + Math.pow(actor.target.y - actor.y, 2));
                        result.push((actor.target.x - actor.x) / hip);
                        break;
                    case FEATURE_VISION_CLOSE_RANGE:
                        ;[0, 1, 2, 3].forEach(function (direction) {
                            return result.push(isFutureWall(direction, actor));
                        });
                        break;
                    case FEATURE_TAIL_DIRECTION:
                        result.push((actor.tail[actor.tail.length - 1].x - actor.x) / scene.maxX);
                        result.push((actor.tail[actor.tail.length - 1].y - actor.y) / scene.maxY);
                        break;
                    case FEATURE_VISION_FAR_RANGE:
                        result = result.concat(buildFarVision(actor));
                        break;
                    case FEATURE_VISION_MID_RANGE:
                        result = result.concat(buildMidRangeVision(actor));
                        break;
                    case FEATURE_FULL_MAP_4:
                        result = result.concat(buildFullMap(actor, 4));
                        break;
                    case FEATURE_FULL_MAP_6:
                        result = result.concat(buildFullMap(actor, 6));
                        break;
                    case FEATURE_FULL_MAP_12:
                        result = result.concat(buildFullMap(actor, 12));
                        break;
                    case FEATURE_TAIL_SIZE:
                        result.push(actor.tail.length / scene.maxX * (scene.maxY / 3) - 0.5);
                        break;
                    case FEATURE_HUNGER:
                        var maxWithoutFood = actor.tail.length * 3;
                        var hunger = Math.min(1, actor.withoutFood / maxWithoutFood) - 0.5;
                        result.push(hunger);
                        break;
                    default:
                        break;
                }
            });
            return result;
        };

        var teachAgent = function teachAgent(reward) {
            if (instanceProps.mode === 'server') {
                scene.agent.learn(reward);
            }
        };

        var isStudenInCycleValue = function isStudenInCycleValue(len) {
            var cycles = 2;
            var result = 0;
            if (turns.length > cycles * len) {
                var parts = turns.slice(-len * cycles);
                var chunk = [];
                var chunks = parts.reduce(function (result, next, index) {
                    if (index % len == 0) {
                        if (index > 0) {
                            result.push(chunk);
                        }
                        chunk = [];
                    }
                    chunk += next;
                    return result;
                }, []);
                chunks.push(chunk);
                var flag = true;
                var next = chunks[0];
                chunks.forEach(function (one) {
                    if (one !== next) {
                        flag = false;
                    }
                });
                if (flag) {
                    result = len;
                }
            }
            return result;
        };

        var maxLen = Math.sqrt(scene.maxX * scene.maxX + scene.maxY * scene.maxY);

        var nextStep = function nextStep() {
            scene.result.step++;
            scene.actor.step += 1;

            var footer = '';

            getActiveActors().forEach(function (actor) {
                buildWalls();

                var toRespawn = false;
                var stepState = buildState(actor);

                var availActions = actions.reduce(function (result, next, index) {
                    if (!isWall(actor.x + next.dx, actor.y + next.dy)) {
                        result.push(index);
                    }
                    return result;
                }, []);

                var action = actor.student ? scene.agent.act(stepState, availActions) : scene.rivalAgent.act(stepState, availActions);
                var act = actions[action];

                var prev = {
                    x: actor.x,
                    y: actor.y
                };

                actor.x += act.dx;
                actor.y += act.dy;

                turns.push(actor.x + '-' + actor.y);
                if (turns.length > maxTurns) {
                    turns = turns.slice(-maxTurns / 10);
                }

                var isCycled = 0;
                for (var cycleLen = 4; cycleLen <= 100; cycleLen++) {
                    if (!isCycled && scene.result.step % cycleLen == 0) {
                        isCycled = isStudenInCycleValue(cycleLen);
                    }
                }

                if (!actor.target) {
                    actor.target = scene.target;
                }
                if (actor.student) {
                    actor.withoutFood++;
                }

                if (isFood(actor.x, actor.y)) {
                    var ownFood = actor.x === actor.target.x && actor.y === actor.target.y;
                    removeFood({ x: actor.x, y: actor.y });
                    growSnake(actor);
                    if (actor.student) {
                        actor.withoutFood = 0;
                        scene.result.wins++;
                    }
                    toRespawn = true;
                    if (actor.student) {
                        teachAgent(0.5); //1 * Math.round(scene.maxX / 8))
                    }
                } else if (isWall(actor.x, actor.y)) {
                    if (actor.student) {
                        footer = 'WALL';
                        teachAgent(-1);
                        restartActor(-1, 'wall');
                    } else {
                        actor.active = false;
                    }
                } else {
                    if (actor.student) {
                        var maxWithoutFood = Math.max(100, scene.maxX * scene.maxY / 3) + actor.tail.length * 2;
                        if (actor.withoutFood > maxWithoutFood) {
                            teachAgent(-1);
                            restartActor(-1, 'starve');
                            if (instanceProps.test) {
                                console.log('STARVE');
                            }
                        } else {
                            if (isCycled > 0) {
                                teachAgent(-1);
                                restartActor(-1, 'cycle: ' + isCycled);
                            } else {
                                //teachAgent(-0.01)
                                // const toFood = Math.sqrt(
                                //     Math.pow(scene.actor.x - scene.actor.target.x, 2) + Math.pow(scene.actor.y - scene.actor.target.y, 2)
                                // )
                                //console.log('tf', maxLen - toFood)
                                // teachAgent((maxLen - toFood) / maxLen)
                                //teachAgent((toFood - 1) / maxLen * -1)
                                //teachAgent(-0.001)
                                //teachAgent(-0.01 + 0.01 / toFood)
                                teachAgent(0);
                            }
                        }
                    }
                }
                actor.tail = actor.tail.map(function (one) {
                    if (one.wait > 0) {
                        one.wait--;
                        return one;
                    } else {
                        var next = {
                            x: one.x,
                            y: one.y
                        };
                        one.x = prev.x;
                        one.y = prev.y;
                        prev = next;
                    }
                    return one;
                });
            });
            addReplay();
        };

        var addReplay = function addReplay() {
            if (!instanceProps.recording) {
                return;
            }
            replay.push(hashField());
        };

        var initAgents = function initAgents(params, spec) {
            scene.agent = new DQNAgent(params, spec);
            scene.rivalAgent = new DQNAgent(params, spec);
        };

        var implantBrain = function implantBrain(agentBrain) {
            var rivalBrain = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

            scene.agent.fromJSON(agentBrain);
            scene.rivalAgent.fromJSON(rivalBrain ? rivalBrain : agentBrain);
        };

        var resizeTo = function resizeTo(maxX, maxY) {
            if (scene.level) {
                scene.maxX = scene.level.maxX - 1;
                scene.maxY = scene.level.maxY - 1;
            } else {
                scene.maxX = maxX;
                scene.maxY = maxY;
            }
            scene.params.maxX = maxX;
            scene.params.maxY = maxY;
            //walls = {}
            //foods = {}
            for (var x = 0; x <= scene.maxX; x++) {
                walls[x] = {};
                foods[x] = {};
                for (var y = 0; y <= scene.maxY; y++) {
                    walls[x][y] = false;
                    foods[x][y] = false;
                }
            }
            buildWalls();
        };

        var hashField = function hashField() {
            var res = '';
            for (var y = 0; y <= scene.maxY; y++) {
                for (var x = 0; x <= scene.maxX; x++) {
                    var c = '';

                    if (isWall(x, y)) {
                        c = 'w';
                    }

                    if (isFood(x, y)) {
                        c = 'F';
                    }

                    if (x == scene.actor.x && y == scene.actor.y) {
                        c = '#';
                    }

                    if (c) {
                        res += x + '' + y;
                    }
                }
            }
            return res;
        };

        var printField = function printField() {
            console.log('F: ' + scene.food.length + ', H: ', scene.actor.x, ',', scene.actor.y, ' T: ', scene.actor.tail.length); //, scene.actor, scene.actor.tail)
            var row = '';
            console.log('-------- ' + scene.maxX + 'x' + scene.maxY + ' -------');
            for (var y = 0; y <= scene.maxY; y++) {
                row = '';
                for (var x = 0; x <= scene.maxX; x++) {
                    var c = '.';

                    if (isWall(x, y)) {
                        c = 'w';
                    }

                    if (isFood(x, y)) {
                        //x == scene.target.x && y == scene.target.y) {
                        c = 'F';
                    }

                    if (x == scene.actor.x && y == scene.actor.y) {
                        c = '#';
                    }

                    row += c;
                }
                console.log(row);
            }
        };

        var loadLevel = function loadLevel(levelName) {
            scene.spec.rivals = 0;
            var level = false;
            if (levelName === 'random') {
                level = academy.levels[randNum(academy.levels.length)];
            } else {
                level = academy.levels.filter(function (one) {
                    return one.name === levelName;
                })[0];
            }
            scene.level = level;
            scene.maxFood = level.maxFood || 1;
            resizeTo(level.maxX - 1, level.maxY - 1);
            scene.food = [];
            respawnFood(scene.actor, true);
            scene.actor.target = clone(scene.food[0]);
            scene.target = clone(scene.food[0]);
            scene.pits = level.pits;
            for (var x = 0; x <= scene.maxX; x++) {
                pits[x] = {};
                for (var y = 0; y <= scene.maxY; y++) {
                    pits[x][y] = false;
                }
            }
            scene.pits.forEach(function (pit) {
                pits[pit.x][pit.y] = true;
            });
        };

        return {
            scene: scene,
            calculateMaxNumInputs: calculateMaxNumInputs,
            initScene: initScene,
            initRivals: initRivals,
            restartActor: restartActor,
            growSnake: growSnake,
            shrinkSnake: shrinkSnake,
            isWall: isWall,
            clone: clone,
            nextStep: nextStep,
            generateID: generateID,
            printField: printField,
            resizeTo: resizeTo,
            loadLevel: loadLevel,
            walls: walls,
            foods: foods,
            pits: pits,
            initAgents: initAgents,
            implantBrain: implantBrain,
            setWall: setWall,
            clearCustomWalls: clearCustomWalls,
            inputs: {
                FEATURE_HEAD_COORDINATES: FEATURE_HEAD_COORDINATES,
                FEATURE_CLOSEST_FOOD_DICRECTION: FEATURE_CLOSEST_FOOD_DICRECTION,
                FEATURE_TAIL_DIRECTION: FEATURE_TAIL_DIRECTION,
                FEATURE_VISION_CLOSE_RANGE: FEATURE_VISION_CLOSE_RANGE,
                FEATURE_VISION_FAR_RANGE: FEATURE_VISION_FAR_RANGE,
                FEATURE_VISION_MID_RANGE: FEATURE_VISION_MID_RANGE,
                FEATURE_TAIL_SIZE: FEATURE_TAIL_SIZE,
                FEATURE_HUNGER: FEATURE_HUNGER,
                FEATURE_FULL_MAP_4: FEATURE_FULL_MAP_4,
                FEATURE_FULL_MAP_6: FEATURE_FULL_MAP_6,
                FEATURE_FULL_MAP_12: FEATURE_FULL_MAP_12,
                FEATURE_CLOSEST_FOOD_ANGLE: FEATURE_CLOSEST_FOOD_ANGLE,
                FEATURE_BODY_MASS_DIRECTION: FEATURE_BODY_MASS_DIRECTION
            }
        };
    }
};
