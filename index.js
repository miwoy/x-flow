(function() {
    try {
        if (window !== undefined) {

        }
        var util = {};
        var isType = function(type) {
            return function(value) {
                var _value = Object.prototype.toString.call(value);
                return _value === "[object " + type + "]";
            }
        };

        util.isString = isType("String");
        util.isFunction = isType("Function");
        util.isNumber = isType("Number");
        util.isArray = isType("Array");
        util.isObject = isType("Object");
        util.isDate = isType("Date");
        util.isRegExp = isType("RegExp");
        util.isNull = isType("Null");
        util.isUndefined = isType("Undefined");


        window.x = init(util, {
            ArgsTypeError: Error
        });
    } catch (e) {
        var util = require('util');
        var error = require('./error');

        module.exports = init(util, error);
    }


    function init(util, error) {
        // 导出对象
        var x = {};


        // 开始一个x --> 流
        x.begin = function() {
            var flow = new Flow();
            return flow;

        };

        /**
         * 遍历一个数组或对象，遍历结果在第一个回调函数中返回，异步结果在第二个回调中返回
         * @param  {[type]} aryOrObj 要遍历的数组或对象
         * @param  {[type]} cb1      遍历结果，返回value与key，如果是数组返回value与index.
         * @param  {[type]} cb2      待所有异步处理完成或出现错误时的回调函数
         */
        x.each = function(aryOrObj, cb1, cb2) {
            var flow = new Flow();

            each(aryOrObj, function(value, key) {
                flow.fork(function() {
                    cb1.call(this, value, key);
                });
            });

            flow.exec(cb2);
        };

        /**
         * each同步版
         */
        x.eachSync = function(aryOrObj, cb1, cb2) {
            var flow = new Flow();

            each(aryOrObj, function(v, k) {

                flow.step(function() {
                    cb1.call(this, v, k);
                });

            });

            flow.exec(cb2);
        };


        /**
         * 流对象
         */
        function Flow() {
            this.matrix = []; // 配置矩阵
        }

        /**
         * 配置步骤
         * @param  {Function} callback 步骤执行内容，省略或传入非function类型将抛出异常
         *                             回调函数中可接受此回调函数执行上下文环境，用于分支流间数据传递与结果处理
         */
        Flow.prototype.step = function() {

            if (arguments.length === 0 || !util.isFunction(arguments[0])) throw new error.ArgsTypeError(arguments[0]);

            var context;

            if (this.matrix.length === 0) { // 如果矩阵长度为0时配置矩阵默认队列
                context = new Context(); // 初始化context对象
                context.queue.push(arguments[0]); // 为队列增加步骤
                this.matrix.push(context); // 为矩阵增加context队列对象

            } else { // 如果矩阵长度不为0时取矩阵最后一个context队列对象
                context = this.matrix[this.matrix.length - 1];
                context.queue.push(arguments[0]);

            }


            return this;
        };

        /**
         * 开启分支流
         * @param  {Function} [callback] 效果与step的回调一致，默认配置成分支流队列的顶端。可省略                   
         */
        Flow.prototype.fork = function() {
            var context = new Context(); // 初始化context对象

            if (util.isFunction(arguments[0])) context.queue.push(arguments[0]);

            this.matrix.push(context); // 为矩阵增加context队列对象

            return this;
        };

        /**
         * 执行函数
         * @param  {Function} callback err,results 当流程出现错误时会第一时间传递给err,没有错误则将各个分支流的context对象合并成数组返回给results
         */
        Flow.prototype.exec = function(callback) {
            var self = this; // 取this对象
            var num = 1; // 并行分支计数器
            var cded = false; // 异常处理断定器，
            var results = new Array(this.matrix.length); // 初始化结果集
            var forkEnd = function(i) {
                return function(err) { // 分支结束函数，利用闭包维持索引i
                    var context = this;
                    if (cded) { // 当断定器断定已经有异常发生并被处理时，其他并行分支的异常或结果均会被抛弃
                        return;
                    }

                    // 删除内置属性
                    delete context.queue;
                    delete context.index;

                    // 出现错误时立即返回，并将出现错误的环境对象放入回调第二个参数位置返回
                    if (err) {
                        cded = true;
                        return callback && callback(err, context);
                    }

                    results[i] = context;

                    // 计数器等于矩阵长度时，确认最终数据返回
                    if (++num > self.matrix.length) {
                        callback && callback(err, results);
                    }
                };
            };

            // 矩阵长度为0， 立即返回
            if (this.matrix.length === 0) return callback && callback(null, []);

            // 遍历矩阵，开始执行
            each(this.matrix, function(context, i) {
                context.queue.push(forkEnd(i));
                context.queue[0].call(context, context);
            });
        };


        /**
         * 队列环境对象
         */
        function Context() {
            this.queue = []; // 队列
            this.index = 0; // 队列索引记录器
        }

        /**
         * 下一步
         */
        Context.prototype.next = function() {
            this.index++;

            // 如果是队列末尾，执行分支结束函数
            if (this.index === this.queue.length - 1)
                return this.queue[this.index].call(this);
            this.queue[this.index].call(this, this);
        };

        /**
         * 跳转
         * @param  {[type]} count 步长，以自身为零点，向上为负数，向下为正数
         */
        Context.prototype.go = function(count) {

            // 异常处理
            if (!util.isNumber(count)) throw new error.ArgsTypeError(count, "必须是Number类型！");
            if (count + this.index < 0 || count + this.index > this.queue.length - 2) throw new RangeError("索引" + (count + this.index) + "超出界限！");


            this.index += count;
            this.queue[this.index].call(this, this);
        };

        /**
         * 异常传递
         * @param  {[type]} err 异常对象
         */
        Context.prototype.err = function(err) {
            this.queue[this.queue.length - 1].call(this, err);
        };

        /**
         * 结束函数
         * @return {[type]} [description]
         */
        Context.prototype.end = function() {
            this.queue[this.queue.length - 1].call(this);
        };

        /**
         * 自构建each函数，支持遍历数组对象数字字符串
         * @param  {[type]}   obj      [description]
         * @param  {Function} callback [description]
         * @return {[type]}            [description]
         */
        function each(obj, callback) {
            if (util.isString(obj) || util.isArray(obj)) {
                for (var i = 0; i < obj.length; i++) {
                    callback(obj[i], i);
                }
            } else if (util.isObject(obj) && !util.isFunction(obj)) {
                for (var key in obj) {
                    callback(obj[key], key);
                }
            } else if (util.isNumber(obj)) {
                if (obj > 0) {
                    for (var i = 0; i < obj; i++) {
                        callback(obj - i, i);
                    }
                } else {
                    for (var i = 0; i < -obj; i++) {
                        callback(obj + i, i);
                    }

                }
            }
        }

        return x;
    }

})()
