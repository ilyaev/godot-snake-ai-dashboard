'use strict';

/*
 @return ein objekt mit den klassen Mat und RandMat und helper funktionen
 {
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
 }
*/

// Utility fun

var assert = function assert(condition, message) {
    // from http://stackoverflow.com/questions/15313418/javascript-assert
    if (!condition) {
        message = message || 'Assertion failed';
        if (typeof Error !== 'undefined') {
            throw new Error(message);
        }
        throw message; // Fallback
    }
};
// Random numbers utils
var returnV = false;
var vVal = 0.0;
var gaussRandom = function gaussRandom() {
    if (returnV) {
        returnV = false;
        return vVal;
    }
    var u = 2 * Math.random() - 1;
    var v = 2 * Math.random() - 1;
    var r = u * u + v * v;
    if (r === 0 || r > 1) {
        return gaussRandom();
    }
    var c = Math.sqrt(-2 * Math.log(r) / r);
    vVal = v * c; // cache this
    returnV = true;
    return u * c;
};
var randf = function randf(a, b) {
    return Math.random() * (b - a) + a;
};
var randi = function randi(a, b) {
    return Math.floor(Math.random() * (b - a) + a);
};
var randn = function randn(mu, std) {
    return mu + gaussRandom() * std;
};
// helper function returns array of zeros of length n
// and uses typed arrays if available
var zeros = function zeros(n) {
    if (typeof n === 'undefined' || isNaN(n)) {
        return [];
    }
    if (typeof ArrayBuffer === 'undefined') {
        // lacking browser support
        var arr = new Array(n);
        for (var i = 0; i < n; i++) {
            arr[i] = 0;
        }
        return arr;
    } else {
        return new Float64Array(n);
    }
};

// Mat utils
// fill matrix with random gaussian numbers
var fillRandn = function fillRandn(m, mu, std) {
    for (var i = 0, n = m.w.length; i < n; i++) {
        m.w[i] = randn(mu, std);
    }
};

var fillRand = function fillRand(m, lo, hi) {
    for (var i = 0, n = m.w.length; i < n; i++) {
        m.w[i] = randf(lo, hi);
    }
};

var gradFillConst = function gradFillConst(m, c) {
    for (var i = 0, n = m.dw.length; i < n; i++) {
        m.dw[i] = c;
    }
};

var sig = function sig(x) {
    // helper function for computing sigmoid
    return 1.0 / (1 + Math.exp(-x));
};

/*
  Mat holds a matrix
  **/
var Mat = function Mat(n, d) {
    // n is number of rows d is number of columns
    this.n = n;
    this.d = d;
    this.w = zeros(n * d);
    this.dw = zeros(n * d);
};

Mat.prototype = {
    get: function get(row, col) {
        // slow but careful accessor function
        // we want row-major order
        var ix = this.d * row + col;
        assert(ix >= 0 && ix < this.w.length);
        return this.w[ix];
    },
    set: function set(row, col, v) {
        // slow but careful accessor function
        var ix = this.d * row + col;
        assert(ix >= 0 && ix < this.w.length);
        this.w[ix] = v;
    },
    setFrom: function setFrom(arr) {
        for (var i = 0, n = arr.length; i < n; i++) {
            this.w[i] = arr[i];
        }
    },
    setColumn: function setColumn(m, i) {
        for (var q = 0, n = m.w.length; q < n; q++) {
            this.w[this.d * q + i] = m.w[q];
        }
    },
    toJSON: function toJSON() {
        return {
            n: this.n,
            d: this.d,
            w: this.w
        };
    },
    fromJSON: function fromJSON(json) {
        this.n = json.n;
        this.d = json.d;
        this.w = zeros(this.n * this.d);
        this.dw = zeros(this.n * this.d);
        for (var i = 0, n = this.n * this.d; i < n; i++) {
            this.w[i] = json.w[i]; // copy over weights
        }
    }
};
// return Mat but filled with random numbers from gaussian
var RandMat = function RandMat(n, d, mu, std) {
    var m = new Mat(n, d);
    fillRandn(m, mu, std);
    //fillRand(m,-std,std); // kind of :P
    return m;
};

var copyMat = function copyMat(b) {
    var a = new Mat(b.n, b.d);
    a.setFrom(b.w);
    return a;
};

var copyNet = function copyNet(net) {
    // nets are (k,v) pairs with k = string key, v = Mat()
    var newNet = {};
    for (var p in net) {
        if (net.hasOwnProperty(p)) {
            newNet[p] = copyMat(net[p]);
        }
    }
    return newNet;
};
var updateMat = function updateMat(m, alpha) {
    // updates in place
    for (var i = 0, n = m.n * m.d; i < n; i++) {
        if (m.dw[i] !== 0) {
            m.w[i] += -alpha * m.dw[i];
            m.dw[i] = 0;
        }
    }
};
var updateNet = function updateNet(net, alpha) {
    for (var p in net) {
        if (net.hasOwnProperty(p)) {
            updateMat(net[p], alpha);
        }
    }
};
var netToJSON = function netToJSON(net) {
    var j = {};
    for (var p in net) {
        if (net.hasOwnProperty(p)) {
            j[p] = net[p].toJSON();
        }
    }
    return j;
};
var netFromJSON = function netFromJSON(j) {
    var net = {};
    for (var p in j) {
        if (j.hasOwnProperty(p)) {
            net[p] = new Mat(1, 1); // not proud of this
            net[p].fromJSON(j[p]);
        }
    }
    return net;
};
var netZeroGrads = function netZeroGrads(net) {
    for (var p in net) {
        if (net.hasOwnProperty(p)) {
            var mat = net[p];
            gradFillConst(mat, 0);
        }
    }
};
var netFlattenGrads = function netFlattenGrads(net) {
    var n = 0;
    for (var p in net) {
        if (net.hasOwnProperty(p)) {
            var mat = net[p];
            n += mat.dw.length;
        }
    }
    var g = new Mat(n, 1);
    var ix = 0;
    for (var _p in net) {
        if (net.hasOwnProperty(_p)) {
            var _mat = net[_p];
            for (var i = 0, m = _mat.dw.length; i < m; i++) {
                g.w[ix] = _mat.dw[i];
                ix++;
            }
        }
    }
    return g;
};

/*
  Agent util functions
**/

// syntactic sugar function for getting default parameter values
var getopt = function getopt(opt, fieldName, defaultValue) {
    if (typeof opt === 'undefined') {
        return defaultValue;
    }
    return typeof opt[fieldName] !== 'undefined' ? opt[fieldName] : defaultValue;
};

var setConst = function setConst(arr, c) {
    for (var i = 0, n = arr.length; i < n; i++) {
        arr[i] = c;
    }
};

var sampleWeighted = function sampleWeighted(p) {
    var r = Math.random();
    var c = 0.0;
    for (var i = 0, n = p.length; i < n; i++) {
        c += p[i];
        if (c >= r) {
            return i;
        }
    }
    assert(false, 'wtf');
};

var softmax = function softmax(m) {
    var out = new Mat(m.n, m.d); // probability volume
    var maxval = -999999;
    for (var i = 0, n = m.w.length; i < n; i++) {
        if (m.w[i] > maxval) {
            maxval = m.w[i];
        }
    }
    var s = 0.0;
    for (var _i = 0, _n = m.w.length; _i < _n; _i++) {
        out.w[_i] = Math.exp(m.w[_i] - maxval);
        s += out.w[_i];
    }
    for (var _i2 = 0, _n2 = m.w.length; _i2 < _n2; _i2++) {
        out.w[_i2] /= s;
    }
    // no backward pass here needed
    // since we will use the computed probabilities outside
    // to set gradients directly on m
    return out;
};

var maxi = function maxi(w) {
    // argmax of array w
    var maxv = w[0];
    var maxix = 0;
    for (var i = 1, n = w.length; i < n; i++) {
        var v = w[i];
        if (v > maxv) {
            maxix = i;
            maxv = v;
        }
    }
    return maxix;
};

var samplei = function samplei(w) {
    // sample argmax from w, assuming w are
    // probabilities that sum to one
    var r = randf(0, 1);
    var x = 0.0;
    var i = 0;
    while (true) {
        x += w[i];
        if (x > r) {
            return i;
        }
        i++;
    }
    return w.length - 1; // pretty sure we should never get here?
};

/*
  a module for all the util functions
**/
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
    randi: randi,
    fillRand: fillRand,
    maxi: maxi,
    samplei: samplei,
    softmax: softmax
};
