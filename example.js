var x = require('./index');

/**
 *  测试并行与串行结合部分
 */

var obj = {
    // 定义一个有上下文的异步函数
    asyncFunc: function(forkNum, funcNum, callback) {
        setTimeout(function() {
            console.log("第" + forkNum + "个分支的第" + funcNum + "异步函数开始执行");
            callback(null, "第" + forkNum + "个分支的第" + funcNum + "异步函数执行结果");
        }, 100);
    }
};


// 开始一个流，返回flow对象
x.begin()
    // 指定异步函数执行上下文
    .step(function(context) {
        obj.asyncFunc(1, 1, function(err, result) {
            if (err) {
                return context.err(err); // 传递异常
            }

            context.step1 = true; // 步骤间传递数据
            context.next(); // 进入下一步
        });
    })
    .step(function(context) {
        obj.asyncFunc(1, 2, function(err, result) {
            if (err) {
                return context.err(err); // 传递异常
            }

            console.log("step1:", context.step1); // 打印上一步的数据  step1: true
            context.step2 = true;
            context.end(); // 结束此分支流
        });
    })
    // 开启一个分支。分支将与begin主线并行执行
    .fork()
    .step(function(context) {
        obj.asyncFunc(2, 1, function(err, result) {
            if (err) {
                return context.err(err); // 传递异常
            }

            context.step1 = true;
            context.go(1); // 使用go进入下一步 
        });
    })
    .step(function(context) {
        obj.asyncFunc(2, 2, function(err, result) {
            if (err) {
                return context.err(err); // 传递异常
            }

            context.step2 = true;
            context.end();
        });
    })
    // 开始执行
    .exec(function(err, results) {
        if (err) {
            return console.log("err:", err); // 如果有错误打印错误信息
        }
        console.log("forkAndStep results:", results); // 正常时打印结果集 results: [ Context { step1: true, step2: true }, Context { step1: true, step2: true } ]
    });



/**
 * 测试each与eachSync部分
 */

var objEach = {
    asyncFunc: function(value, index, callback) {
        setTimeout(function() {
            console.log("第" + index + "此执行");
            // callback(new Error("test err!"), value);
            callback(null, value);
        }, 100);
    }
};

// 同步遍历
x.eachSync(-9, function(item, index) {
    var context = this;  // 获取执行环境
    objEach.asyncFunc(item, index, function(err, result) {
        if (err) {
            return context.err(err);
        }

        context.results = context.results || [];   // 初始化结果集
        context.results.push(result);
        context.next();
    });
}, function(err, results) {
    if (err) {
        return console.log("err:", err.message); // err: test err!
    }

    console.log("eachSync results:", results); // results: [ Context { results: [ '第一次返回', '第二次返回', '第三次返回' ] } ]

});

// 异步遍历
x.each({
    one: "第一次返回",
    two: "第二次返回",
    three: "第三次返回"
}, function(value, key) {
    var context = this;   // 获取执行环境
    objEach.asyncFunc(value, key, function(err, result) {
        if (err) {
            return context.err(err);
        }

        context.result = result;
        context.end();
    });
}, function(err, results) {
    if (err) {
        return console.log("err:", err);    // err: test err!
    }
    console.log("each results", results);    // results [ Context { result: '第一次返回' },Context { result: '第二次返回' },Context { result: '第三次返回' } ]
});
