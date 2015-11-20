var _ = require('underscore');

// 导出对象
var xFlow = {};


// 开始一个x --> 流
xFlow.begin = function() {

    if (arguments.length === 1) {
        throw new Error("不可以省略异步函数参数数组");
    }

    if (arguments.length === 2) {

        if (!_.isFunction(arguments[0])) {
            throw new Error("异步函数", arguments[0], "类型错误");
        }



        if (arguments[1] && !_.isArray(arguments[1])) {
            throw new Error("异步函数参数数组必须存在，且为数组格式：", arguments[1]);
        }
    }

    if (arguments.length === 3) {
        if (!(_.isObject(arguments[0]) && !_.isFunction(arguments[0]) && !_.isArray(arguments[0]))) {
            throw new Error("参数类型错误!异步函数执行上下文：", arguments[0], "必须是一个对象");
        }
    }






    var flow = new Flow();
    if (arguments[0]) {
        var func = arguments[0],
            args = arguments[1];
        var rlt = [];
        if (arguments.length === 1 && _.isArray(arguments[0])) {
            rlt = arguments[0];
        } else {
            rlt = _.values(arguments);
        }
        var queue = [];
        flow.matrix.push(queue);
        execQueue(queue, rlt, flow);
    }

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
        flow.fork(cb1(value, key));
    });

    flow.end(function(err, results) {
        _.each(results, function(v, i) {
            results[i] = results[i][0];
        });

        cb2(err, results);
    });
};

/**
 * each同步版
 */
xFlow.eachSync = function(aryOrObj, cb1, cb2, cb3) {
    var flow = new Flow();
    var rlts;
    _.each(aryOrObj, function(v, k) {
        if (cb2) {
            flow.next(function() {
                if (arguments.length > 0) {
                    rlts = rlts || [];
                    rlts.push(_.values(arguments).slice(1));
                    cb2.apply(this, _.values(arguments));

                }

                return cb1(v, k);
            });
        } else {
            flow.next(cb1(v, k));
        }

    });
    flow.end(function(err, results) {
        if (cb2) {
            rlts = rlts || [];
            rlts.push(results[0][0]);
            cb2.apply(this, [err].concat(results[0][0]));
        }
        if (cb3) {
            rlts = rlts || results[0];
            cb3(err, rlts);
        }

    });
};

module.exports = xFlow;

// 流对象
function Flow() {
    this.matrix = [];
    this.results = [];
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
Flow.prototype.next = function() {

    if (arguments.length === 0) {
        throw new Error("参数个数必须大于0");
    }
    if (arguments.length === 1) {
        if (!(_.isFunction(arguments[0]) || _.isArray(arguments[0]))) {
            throw new Error("参数必须是一个回调函数\n或异步执行数据\n或是一个异步执行数据数组,");
        }

    }

    if (arguments.length === 2) {
        if (!(_.isFunction(arguments[0]) || _.isArray(arguments[0]))) {
            throw new Error("参数必须是一个回调函数\n或异步执行数据\n或是一个异步执行数据数组,");
        }

    }






    var queue;
    var rlt;
    if (this.matrix.length === 0) {
        queue = [];
        this.matrix.push(queue);
        if (arguments.length === 1 && _.isFunction(arguments[0])) {
            rlt = arguments[0]();
        } else if (arguments.length === 1 && _.isArray(arguments[0])) {
            rlt = arguments[0];

        } else if (arguments.length === 2) {
            rlt = [arguments[0], arguments[1]];
        } else if (arguments.length === 3) {
            rlt = [arguments[0], arguments[1], arguments[2]];
        } else {
            throw new Error("参数有误：", arguments);
        }
        execQueue(queue, rlt, this);
    } else {
        // callback 回调上一次异步结果
        queue = this.matrix[this.matrix.length - 1];
        if (arguments.length === 1) {
            queue.push(arguments[0]);
        } else {
            queue.push(_.values(arguments));
        }

    }


    return this;
};

/**
 * 并行执行
 * @param  {Object} content 执行环境，如果该异步函数依赖于一个环境时，需要把该环境传递进来
 * @param  {Function} func  要执行的异步函数，确保参数中回调函数位置在参数最后一位
 *                          可接受单个数组参数[func, args]
 * @param  {Array} args     异步函数所需参数（不要带上回调函数，此工具默认会在最后位置添加一个callback）                   
 */
Flow.prototype.fork = function() {
    var rlt = [];
    if (arguments.length === 1 && _.isArray(arguments[0])) {
        rlt = arguments[0];
    } else {
        rlt = _.values(arguments);
    }
    var queue = [];
    this.matrix.push(queue);
    execQueue(queue, rlt, this);
    return this;
    // 并行操作 func 结果存入flow队列中
};

/**
 * 结束
 * @param  {Function} callback err,results 当流程出现错误时会第一时间传递给err,没有错误则将流程内未处理的结果集合并成一个数组对象
 */
Flow.prototype.end = function(callback) {
    var num = 1;
    var cded = false;
    var self = this;
    var forkSuccess = function(i) {
        var index = i;
        return function(err, result) {
            if (cded) {
                return;
            }
            if (err) {
                self.matrix = null;
                cded = true;
                return callback(err, null);
            }
            self.results[i] = self.results[i] || [];
            self.results[i].push(_.values(arguments).slice(1));
            if (++num > self.matrix.length) {
                callback(err, self.results);
                self.matrix = null;
            }
        };
    };
    _.each(this.matrix, function(queue, i) {
        queue.push(forkSuccess(i));
    });

    // callback 结果数组
};

/**
 * 队列执行的封装函数
 */
function execQueue(queue, execDataArray, flow, index) {
    var content, func, args;
    index = index || flow.matrix.length - 1;
    if (execDataArray.length === 3) {
        content = execDataArray[0];
        func = execDataArray[1];
        args = execDataArray[2];
    } else if (execDataArray.length === 2) {
        content = this;
        func = execDataArray[0];
        args = execDataArray[1];
    }

    args.push(function(err) {
        var callback;
        if (err) {
            callback = queue[queue.length - 1];
            if (_.isFunction(callback)) {
                return callback(err);
            } else {
                throw err;
            }

        }
        var cbArguments = arguments;
        (function() {
            if (queue.length > 0) {
                callback = queue.shift();
                var rlt;
                if (_.isFunction(callback)) {
                    rlt = callback.apply(null, _.values(cbArguments));
                } else {
                    flow.results[index] = flow.results[index] || [];
                    flow.results[index].push(_.values(cbArguments).slice(1));
                    rlt = callback;
                }


                if (rlt)
                    execQueue(queue, rlt, flow, index);
                else
                    arguments.callee();
            }
        })();

    });

    func.apply(content, args || []);

}
