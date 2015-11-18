var _ = require('underscore');

// 导出对象
var xFlow = {};


// 开始一个x --> 流
xFlow.begin = function(func, args) {
    var flow = new Flow();
    if (func && args) {
        var queue = [];
        flow.matrix.push(queue);
        execQueue(queue, func, args, flow);
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
        cb2(err, results);
    });
};

/**
 * each同步版
 */
xFlow.eachSync = function(aryOrObj, cb1, cb2) {
    var flow = new Flow();
    _.each(aryOrObj, function(v, k) {
        flow.next(cb1(v));
    });
    flow.end(function(err, results) {
        cb2(err, results);
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
 */
Flow.prototype.next = function(callback) {
    var queue;
    var rlt;
    if (this.matrix.length === 0) {
        queue = [];
        this.matrix.push(queue);
        if (arguments.length === 1 && _.isFunction(callback)) {
            rlt = callback();
        } else if (arguments.length === 1 &&_.isArray(callback)){
            rlt = callback;

        }  else if (arguments.length === 2){
        	rlt = [arguments[0], arguments[1]];
        } else {
        	throw new Error("参数有误：",arguments);
        }
        execQueue(queue, rlt[0], rlt[1], this);
    } else {
        // callback 回调上一次异步结果
        queue = this.matrix[this.matrix.length - 1];
        if (arguments.length <= 1) {
            queue.push(callback);
        } else {
            queue.push(_.values(arguments));
        }

    }


    return this;
};

/**
 * 并行执行
 * @param  {[type]} func 要执行的异步函数，确保参数中回调函数位置在参数最后一位
 *                       可接受单个数组参数[func, args]
 * @param  {[type]} args 异步函数所需参数（不要带上回调函数，此工具默认会在最后位置添加一个callback）                   
 */
Flow.prototype.fork = function(func, args) {

	if (_.isArray(func)) {
		args = func[1];
		func = func[0];
	}
    var queue = [];
    this.matrix.push(queue);
    execQueue(queue, func, args, this);
    return this;
    // 并行操作 func 结果存入flow队列中
};

/**
 * 结束
 * @param  {Function} callback err,results 当流程出现错误时会第一时间传递给err,没有错误则将流程内未处理的结果集合并成一个数组对象
 * @return {[type]}            [description]
 */
Flow.prototype.end = function(callback) {
    var num = 1;
    var cded = false;
    var self = this;
    var forkSuccess = function(err, result) {
        if (cded) {
            return;
        }
        if (err) {
            self.matrix = null;
            cded = true;
            return callback(err, null);
        }
        self.results.push(_.values(arguments).slice(1));
        if (++num > self.matrix.length) {
            callback(err, self.results);
            self.matrix = null;
        }
    };
    _.each(this.matrix, function(queue, i) {
        queue.push(forkSuccess);
    });

    // callback 结果数组
};

/**
 * 队列执行的封装函数
 */
function execQueue(queue, func, args, flow) {

    args.push(function(err, result) {
    	var callback;
        if (err) {
            callback = queue[queue.length - 1];
            if (_.isFunction(callback)) {
                return callback(err);
            } else {
                throw err;
            }

        }


        if (queue.length > 0) {
            callback = queue.shift();
            var rlt;
            if (_.isFunction(callback)) {
                rlt = callback.apply(null, _.values(arguments));
            } else {
                flow.results.push(_.values(arguments).slice(1));
                rlt = callback;
            }

            if (rlt)
                execQueue(queue, rlt[0], rlt[1], flow);
        }

    });

    func.apply(this, args);

}

