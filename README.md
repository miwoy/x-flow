# x-flow
node async x --> flow

## 安装

    npm install x-flow

## 介绍

  这是一个小型的异步流程控制工具，不同于`Async`的地方在于用链式调用实现，使用起来方便、简洁灵活性更高。

  实现思路是基于`koa`的中间件思路，串行配置的步骤依次执行，并且每一个并行分支都拥有独立的运行上下文，用于步骤间数据共享，并行间运行环境相互隔离，并在执行完每次并行分支时返回该分支的运行环境

## 使用说明

该库有三个对象, `x`对象、`flow`与context对象。



#####`x`对象为导出的模块对象,对象有三个函数
  * `x.begin([callback])`函数用来返回一个`flow`对象，接受一个可省略的回调参数，效果与`fork`的参数一致(详情请看`flow.fork([callback]))`，返回的`flow`对象默认会开启一个`fork`，所以可以直接配置`step`，不必重新再执行一次`fork`，当然如果你喜欢也可以`fork`
  * `x.each(arrayOrObject, callback1, callback2)`是并行循环，第一个参数为要遍历的对象可以为数组、对象、字符串、数字.第二个参数是`callback1(valueOrItem, keyOrIndex)`回调函数，接受遍历的对象的键值两个参数，执行每次循环的任务。 第三个参数`callback2(callback)`回调函数,用于循环执行完成后的结果处理，参数中的`callback(err, results)`接受异常与结果信息。
  * `x.eachAsync(arrayOrObject, callback1, callback2)`是串行循环。与each区别在于循环是在同一个`fork`中的`context`下依次执行的。而each每次循环都会开启一个`fork`并创建一个`context`

#####`flow`对象为核心对象，对象有三个函数
  * `flow.fork([callback])`用来开启一个并行执行的分支，并隐式创建了一个`context`对象用于该分支流步骤间的数据共享与其他操作（具体请看下面`context`介绍），它接受一个可省略的回调参数，效果与`step`一样，它会当做该`fork`下的第一个步骤进行配置，为了代码整洁美观，建议步骤还是使用`step`进行配置，此方式只适用为了像我一样懒成病得人
  * `flow.step(callback)`函数负责为分支配置需要执行的步骤，接受一个不可省略的回调函数参数`callback(context)`,并且会将当前分支的执行环境注入到回调函数的参数内
  * `flow.exec(callback)`开始执行整个流，并获取执行结果. 接受一个不可省略的回调参数`callback(err, results)`,当流执行完时，如果发生异常会传递给`err`参数，如正常返回，则将各个分支流中的`context`对象整合成一个数组赋值给`results`参数。

#####`context`对象为环境对象，每一个`step`的回调函数中都注入了此对象参数(同时回调函数的`this`默认也会指向它，根据喜好自行选择使用)，它负责共享分支流中各个步骤间的数据，与传递异常，步骤跳转，结束流的功能。他有四个函数

  * `context.next()`执行下一个步骤
  * `context.go(number)`跳进某个步骤，`number`会以当前步骤为中心负数为向上跳，正数为向下跳，例如：`go(0)`相当于递归，`go(1)`相当于`context.next()`，`go(-1)`执行上一个步骤
  * `context.err(error)`传递异常并终止流，error为异常对象
  * `context.end()`结束分支流。

===========================***注意***================================

* **所有的`fork`与`step`函数均返回自身的`flow`对象用于链式调用**

* **对于结果集`results`中的`context`对象是不包含它内置的四个函数的。**

* **`each`与`eachSync`是为了使用方便简单封装的两个循环结构，内部其实是使用`fork`与`step`加[underscore][1]的each函数实现的，所以用`fork`与`step`组合使用是可以处理各种情况下的需求的。并且对于结果集，`each`使用循环`fork`的方式，所以`results`是多个`context`对象的数组，而`eachAsync`使用循环`step`的方式，`results`是只有一个`context`对象的数组**

[1]: https://github.com/jashkenas/underscore  "underscore" 


==============================================================

#### 并行与串行结合部分
```` javascript
var x = require("x-flow");
 
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
        console.log("results:", results); // 正常时打印结果集 results: [ Context { step1: true, step2: true }, Context { step1: true, step2: true } ]
    });
````
-------------------
#### each与eachSync部分	
```` javascript
var x = require("x-flow");

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
x.eachSync(["第一次返回", "第二次返回", "第三次返回"], function(item, index) {
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

    console.log("results:", results); // results: [ Context { results: [ '第一次返回', '第二次返回', '第三次返回' ] } ]

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
    console.log("results", results);    // results [ Context { result: '第一次返回' },Context { result: '第二次返回' },Context { result: '第三次返回' } ]
});

````


