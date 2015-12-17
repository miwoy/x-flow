var _ = require('underscore');

// 导出对象
var xFlow = {};


// 开始一个x --> 流
xFlow.begin = function() {
    var flow = new Flow();
    return flow;

};

/**
 * 遍历一个数组或对象，遍历结果在第一个回调函数中返回，异步结果在第二个回调中返回
 * @param  {[type]} aryOrObj 要遍历的数组或对象
 * @param  {[type]} cb1      遍历结果，返回value与key，如果是数组返回value与index.
 *                           此回调函数需要返回一个数组，数组内包含操作函数与所需参数
 *                           例：return [func, args];
 * @param  {[type]} cb2      待所有异步处理完成或出现错误时的回调函数
 */
xFlow.each = function(aryOrObj, cb1, cb2) {
    var flow = new Flow();
    _.each(aryOrObj, function(value, key) {
        flow.fork(function() {
            cb1.call(this, value, key);
        });
    });

    flow.exec(cb2);
};

/**
 * each同步版
 */
xFlow.eachSync = function(aryOrObj, cb1, cb2) {
    var flow = new Flow();
    var rlts;
    _.each(aryOrObj, function(v, k) {
        
        flow.step(function() {
            cb1.call(this, v, k);
        });

    });
    flow.exec(cb2);
};

module.exports = xFlow;

// 流对象
function Flow() {
    this.matrix = [];
}

/**
 * 串行执行
 * @param  {Function} callback 执行异步操作前的初始化函数，
 *                             注意：会将上一步结果传递给此函数
 *                             如果需要上一次异步操作的结果，可在参数中获取
 *                             在不需要即使处理上一步结果时可填写两个参数 func,args 或 [func,args]
 *                             如使用callback，需要确保callback要有返回值，返回[func,args]
 *                             如果该异步函数依赖于一个环境时，需要把该环境传递进来
 */
Flow.prototype.step = function() {

    if (arguments.length === 0 || !_.isFunction(arguments[0])) return this;

    var context;
    var rlt;
    if (this.matrix.length === 0) {
        context = new Context();
        context.queue.push(arguments[0]);
        this.matrix.push(context);

    } else {
        context = this.matrix[this.matrix.length - 1];
        context.queue.push(arguments[0]);

    }


    return this;
};

/**
 * 并行执行
 * @param  {Object} context 执行环境，如果该异步函数依赖于一个环境时，需要把该环境传递进来
 * @param  {Function} func  要执行的异步函数，确保参数中回调函数位置在参数最后一位
 *                          可接受单个数组参数[func, args]
 * @param  {Array} args     异步函数所需参数（不要带上回调函数，此工具默认会在最后位置添加一个callback）                   
 */
Flow.prototype.fork = function() {
    var context = new Context();

    if (_.isFunction(arguments[0])) context.queue.push(arguments[0]);

    this.matrix.push(context);

    return this;
};

/**
 * 结束
 * @param  {Function} callback err,results 当流程出现错误时会第一时间传递给err,没有错误则将流程内未处理的结果集合并成一个数组对象
 */
Flow.prototype.exec = function(callback) {
    var self = this;
    var num = 1;
    var cded = false;
    var results = new Array(this.matrix.length);
    var forkEnd = function(i) {
        var index = i;
        return function(err) {
            var context = this;
            if (cded) {
                return;
            }

            delete context.queue;
            delete context.index;

            if (err) {
                cded = true;
                return callback(err, context);
            }

            results[i] = context;
            if (++num > self.matrix.length) {
                callback(err, results);
            }
        };
    };

    _.each(this.matrix, function(context, i) {
        context.queue.push(forkEnd(i));
        context.queue[0].call(context, context);
    });
};



function Context() {
    this.queue = [];
    this.index = 0;
}

Context.prototype.next = function() {
    this.index++;
    this.queue[this.index].call(this, this);
};
Context.prototype.go = function(count) {
    if (_.isNumber(count)) throw new Error("参数必须为数字！");
    if (count + this.index < 0 || count + this.index > this.queue.length - 2) throw new Error("索引超出界限！");


    this.index += count;
    this.queue[this.index].call(this);
};
Context.prototype.err = function(err) {
    this.queue[this.queue.length - 1].call(this, err);
};
Context.prototype.end = function() {
    this.queue[this.queue.length - 1].call(this);

};
