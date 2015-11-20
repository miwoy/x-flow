# x-flow
node async x --> flow

## 安装

    npm install x-flow

## 介绍

  这是一个小型的异步流程控制工具，不同于Async的地方在于用的是链式调用，并且少了很多匿名的回调函数，看起来更简洁。

  核心函数只有两个`fork()`与`next()`，`fork()`代表开始并行分支流，`next()`代表一个分支下的串行步骤，当然首先你需要用`begin()`函数返回一个`flow`对象。 并用`end()`函数结束`flow`.

  此工具对异步函数有两个约定：

  1. **异步函数必须存在`callback`,且是参数的最后一个位置,因为`flow`需要知道该异步函数在什么时候结束**
  2. **回调函数参数必须存在`err`,且是参数第一个位置,因为`flow`通过检测回调的第一个参数判断是否出现异常**

## 使用说明

===========================***注意***================================

* **x流执行数据结构是一个数组对象：`[content,func,args]`**

* **其中如果`func`不依赖于一个执行环境可省略`content`或传入`this`或`null`**

* **强烈建议不省略`content`**

* **`args`参数不可省略!!!如异步函数不需要参数时传入`[]`或`null`**

==============================================================

#### 并行与串行结合部分
```` javascript
var x = require("x-flow");
 
/**
 *  测试并行与串行结合部分
 */

var obj = {
	// 定义一个有上下文的异步函数
    asyncFunc: function(forkNum,funcNum,callback) {
        setTimeout(function() {
            console.log("第" + forkNum + "个分支的第" +funcNum + "异步函数开始执行");
            callback(null, "第" + forkNum + "个分支的第" +funcNum + "异步函数执行结果");
        },100);
    }
};


// 开始一个x流，可以为begin传递一个x流数据结构
x.begin()
	// 指定异步函数执行上下文
    .next(obj, obj.asyncFunc, [1,1])
    // 用回调函数获取上一次异步结果，并返回一个x流执行数据结构的数组对象
    .next(function(err, result) {
    	console.log(result);
        return [obj, obj.asyncFunc, [1,2]];
    })
    // 开启一个分支。分支将与begin主线并行执行
    .fork(obj, obj.asyncFunc, [2,1])
    // 未获取上次异步函数执行结果，将会把结果传递至end函数results中
    .next(obj, obj.asyncFunc, [2,2])
    // 未获取上次异步执行结果，并未传递异步函数执行上下文
    .next(obj.asyncFunc, [2,3])
    /** 
     * x流结束，当流中某处出现错误时都将直接执行end方法
     * 并将错误传给err参数
     * results会把所有在流中未获取的返回值合并成数组 
     * results: [[第一个分支（begin）所有未获取的返回值集合],[第二个分支（fork）所有未获取的返回值集合]...]
     * 通常每个分支只有最后一个next的返回值未获取，那么当你取begin分支的结果事可能是这样的 results[0][0]
     * results[0][0][0] 代表第一个分支第一个未获取的next返回值的非err的第一个参数	
     */
    .end(function(err, results) {
        console.log("end", results);
    });
````
-------------------
#### each与eachSync部分	
```` javascript
/**
 * 测试each与eachSync部分
 */

var obj = {
    asyncFunc: function(value, index, callback) {
        setTimeout(function() {
            console.log("第" + index + "此执行");
            callback(null, value);
        }, 100);
    }
};

// 串行遍历
x.eachSync(["第一次返回", "第二次返回", "第三次返回"], function(v, i) {
    return [obj, obj.asyncFunc, [v, i]];
}, function(err, results) {
    console.log("result", results);
});

// 并行遍历
x.each(["第一次返回", "第二次返回", "第三次返回"], function(v, i) {
    return [obj, obj.asyncFunc, [v, i]];
}, function(err, results) {
    console.log("result", results);
});
````


