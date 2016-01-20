var should = require('should');
var x = require('../index');
var error = require('../error');

var objEach = {
    asyncFunc: function(value, index, callback) {
        setTimeout(function() {
            // callback(new Error("test err!"), value);
            callback(null, value);
        }, 10);
    }
};

var obj = {
    asyncFunc: function(callback) {
        setTimeout(function() {
            callback(null, true);
        }, 10);
    }
};

describe("测试eachAsync部分", function() {
    it("返回值必须是遍历的数组", function(done) {
        // 同步遍历
        x.eachSync({
            0: "one",
            1: "two",
            2: "three"
        }, function(item, index) {
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
            results[0].results.should.be.eql(["one", "two", "three"]);
            done();
        });
    });

    it("异常必须是'test error!'", function(done) {
        x.eachSync(["one", "two", "three"], function(item, index) {
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

    it("测试传入参数不为数组对象数字字符串时", function() {
        var num = 0;
        x.each(null, function(item, index) {
            num++;
        });

        should(num).be.eql(0);
    });
});

describe("测试each部分", function() {
    it("返回值必须是传入的数组", function(done) {
        // 同步遍历
        x.each(-9, function(item, index) {
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
            done();
        });
    });

    it("异常必须是'test error!'", function(done) {
        x.each(9, function(item, index) {
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

    it("测试step参数为空或不为函数时，抛出类型错误异常", function(done) {
        try {
            x.begin()
                .step()
                .exec(function(err, results) {

                });
        } catch (e) {
            should(e.name).be.eql("ArgsType Error");
            done();
        }
    });
    it("测试go函数参数不为Number，抛出类型错误异常", function(done) {
        try {
            x.begin()
                .step(function(ctx) {
                    ctx.go("q");
                })
                .exec(function(err, results) {

                });
        } catch (e) {
            should(e.name).be.eql("ArgsType Error");
            done();
        }
    });
    it("测试go函数参数索引越界，抛出类型错误异常", function(done) {
        try {
            x.begin()
                .step(function(ctx) {
                    ctx.go(2);
                })
                .exec(function(err, results) {

                });
        } catch (e) {
            should(e.name).be.eql("RangeError");
            done();
        }
    });

    it("测试矩阵长队为零时，results等于[]", function() {
        x.begin()
            .exec(function(err, results) {
                should(results).be.eql([]);
            });
    });
});

describe("测试Error部分", function() {
    it("ArgsValueError name is 'ArgsValue Error'", function() {
        var err = new error.ArgsValueError(9, "参数值不能大于5");
        should(err.name).be.eql("ArgsValue Error");
    });
    it("ArgsError name is 'Args Error'", function() {
        var err = new error.ArgsError(9);
        should(err.name).be.eql("Args Error");
    });
});
