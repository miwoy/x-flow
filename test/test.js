var should = require('should');
var x = require('../index');


var testArray = ["one", "tow", "three"];
var objEach = {
    asyncFunc: function(value, index, callback) {
        setTimeout(function() {
            // callback(new Error("test err!"), value);
            callback(null, value);
        }, 10);
    }
};

describe("测试eachAsync部分", function() {
    it("返回值必须是遍历的数组", function(done) {
        // 同步遍历
        x.eachSync(testArray, function(item, index) {
            var context = this; // 获取执行环境
            objEach.asyncFunc(item, index, function(err, result) {
                if (err) {
                    return context.err(err);
                }

                context.results = context.results || []; // 初始化结果集
                context.results.push(result);
                context.next();
            });
        }, function(err, results) {
            should.not.exist(err);
            should.exist(results);
            should(results).be.a.Array();
            results[0].results.should.be.eql(["one", "tow", "three"]);
            done();
        });
    });

    it("异常必须是'test error!'", function(done) {
        x.eachSync(testArray, function(item, index) {
            var context = this; // 
            objEach.asyncFunc(item, index, function(err, result) {

                context.result = "test" + index;
                context.err(new Error("test error!"));
                context.next();
            });
        }, function(err, results) {
            should.exist(err);
            should.exist(results);
            should(err).be.a.Error();
            should(err.message).be.eql("test error!");
            should(results).be.a.Object();
            results.result.should.be.eql("test0");
            done();
        });
    });
});

describe("测试each部分", function() {
    it("返回值必须是传入的数组", function(done) {
        // 同步遍历
        x.each(testArray, function(item, index) {
            var context = this; // 获取执行环境
            objEach.asyncFunc(item, index, function(err, result) {
                if (err) {
                    return context.err(err);
                }

                context.result = result;
                context.end();
            });
        }, function(err, results) {
            should.not.exist(err);
            should.exist(results);
            should(results).be.a.Array();

            for (var i = 0; i < results.length; i++) {
                results[i].result.should.be.eql(testArray[i]);
            }

            done();
        });
    });

    it("异常必须是'test error!'", function(done) {
        x.each(testArray, function(item, index) {
            var context = this; // 
            objEach.asyncFunc(item, index, function(err, result) {

                context.result = "test" + index;
                context.err(new Error("test error!"));
                context.end();
            });
        }, function(err, results) {
            should.exist(err);
            should.exist(results);
            should(err).be.a.Error();
            should(err.message).be.eql("test error!");
            should(results).be.a.Object();
            results.result.should.be.eql("test0");
            done();
        });
    });
});


var obj = {
    asyncFunc: function(callback) {
        var self = this;
        setTimeout(function() {
            callback(null, true);
        }, 10);
    }
};

describe("测试并行与串行结合部分", function() {
    it("results长度必须等于分支长度，step值必须等于其分支下step的数量", function(done) {
        // 开始一个流，返回flow对象
        x.begin()
            .step(function(context) {
                context.step = 1;
                context.next();
            })
            .step(function(context) {
                obj.asyncFunc(function(err, result) {
                    if (err) {
                        return context.err(err); // 传递异常
                    }

                    context.step++;
                    context.next(); // 进入下一步
                });
            })
            .step(function(context) {
                obj.asyncFunc(function(err, result) {
                    if (err) {
                        return context.err(err); // 传递异常
                    }

                    context.step++;
                    context.end(); // 结束此分支流
                });
            })
            // 开启一个分支。分支将与begin主线并行执行
            .fork()
            .step(function(context) {
                context.step = 1;
                context.next();
            })
            .step(function(context) {
                obj.asyncFunc(function(err, result) {
                    if (err) {
                        return context.err(err); // 传递异常
                    }

                    context.step++;
                    context.go(1); // 使用go进入下一步 
                });
            })
            .step(function(context) {
                obj.asyncFunc(function(err, result) {
                    if (err) {
                        return context.err(err); // 传递异常
                    }

                    context.step++;
                    context.end();
                });
            })
            // 开始执行
            .exec(function(err, results) {
                should.not.exist(err);
                should.exist(results);
                should(results).be.a.Array();
                results.length.should.be.eql(2);
                results[0].step.should.be.eql(3);
                results[1].step.should.be.eql(3);
                done();
            });
    });

    it("出现异常必须等于'test error!', 返回值等于'fork 2 step 2'", function(done) {
        // 开始一个流，返回flow对象
        x.begin()
            .step(function(context) {
                obj.asyncFunc(function(err, result) {
                    context.next(); // 进入下一步
                });
            })
            .step(function(context) {
                obj.asyncFunc(function(err, result) {
                    context.end(); // 结束此分支流
                });
            })
            // 开启一个分支。分支将与begin主线并行执行
            .fork()
            .step(function(context) {
                obj.asyncFunc(function(err, result) {
                    context.go(1); // 使用go进入下一步 
                });
            })
            .step(function(context) {
                obj.asyncFunc(function(err, result) {
                    context.result = "fork 2 step 2";
                    return context.err(new Error("test error!")); // 传递异常
                });
            })
            // 开始执行
            .exec(function(err, results) {
                should.exist(err);
                should.exist(results);
                should(results).be.a.Object();
                results.result.should.be.eql("fork 2 step 2");
                err.message.should.be.eql("test error!");
                done();
            });
    });
});
