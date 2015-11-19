var x = require('./index');
var _ = require('underscore');

// /**
//  *  测试并行与串行结合部分
//  */

// var obj = {
// 	// 定义一个有上下文的异步函数
//     asyncFunc: function(forkNum,funcNum, callback) {
//         setTimeout(function() {
//             console.log("第" + forkNum + "个分支的第" +funcNum + "异步函数开始执行");
//             callback(null, "第" + forkNum + "个分支的第" +funcNum + "异步函数执行结果");
//         },100);
//     }
// };


// // 开始一个x流，可以为begin传递一个x流数据结构
// x.begin()
// 	// 指定异步函数执行上下文
//     .next(obj, obj.asyncFunc, [1,1])
//     // 用回调函数获取上一次异步结果，并返回一个x流执行数据结构的数组对象
//     .next(function(err, result) {
//     	console.log(result);
//         return [obj, obj.asyncFunc, [1,2]];
//     })
//     // 开启一个分支。分支将与begin主线并行执行
//     .fork(obj, obj.asyncFunc, [2,1])
//     // 未获取上次异步函数执行结果，将会把结果传递至end函数results中
//     .next(obj, obj.asyncFunc, [2,2])
//     // 未获取上次异步执行结果，并未传递异步函数执行上下文
//     .next(obj.asyncFunc, [2,3])
//     /** 
//      * x流结束，当流中某处出现错误时都将直接执行end方法
//      * 并将错误传给err参数
//      * results会把所有在流中未获取的返回值合并成数组 
//      * results: [[第一个分支（begin）所有未获取的返回值集合],[第二个分支（fork）所有未获取的返回值集合]...]
//      * 通常每个分支只有最后一个next的返回值未获取，那么当你取begin分支的结果事可能是这样的 results[0][0]
//      * results[0][0][0] 代表第一个分支第一个未获取的next返回值的非err的第一个参数	
//      **/
//     .end(function(err, results) {
//         console.log("end", results);
//     });


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
var b= "dasf";
// 同步遍历
// x.eachSync(["第一次返回", "第二次返回", "第三次返回"], function(v, i) {
//     return [obj, obj.asyncFunc, [v, i]];
// }, null, function(err, results) {
//     console.log(results);
// });

// 异步遍历
x.each(["第一次返回", "第二次返回", "第三次返回"], function(v, i) {
    return [obj, obj.asyncFunc, [v, i]];
}, function(err, results) {
    console.log("results", results);
});
