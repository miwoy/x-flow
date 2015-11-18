var x = require('./index');

// 测试并行与串行结合部分
x.begin(function(callback) {
        setTimeout(function() {
            console.log("test 0");
            callback(null, 0, 2, 3, 4);
        }, 1000);
    }, [])
    .next(function(err, result) {
        return [function(callback) {
            setTimeout(function() {
                console.log("test 1");
                callback(null, 1);
            }, 1000);
        }, []];
    })
    .next(function(err, result) {
        return [function(callback) {
            setTimeout(function() {
                console.log("test 2");
                callback(null, 2, 3, 4, 5, 6);
            }, 1000);
        }, []];
    })
    .fork(function(callback) {
        setTimeout(function() {
            console.log("test 3");
            callback(null, 3);
        }, 1000);
    }, [])
    .next(function(callback) {
        setTimeout(function() {
            console.log("test 4");
            callback(null, 4);
        }, 1000);
    }, [])
    .next(function(err, result) {
        return [function(callback) {
            setTimeout(function() {
                console.log("test 5");
                callback(null, 5);
            }, 1000);
        }, []];
    })
    .end(function(err, results) {
        console.log("end", results);
    });



// // 测试each部分
// x.eachSync([2, 3, 4], function(v) {
//     return [function(callback) {
//             setTimeout(function() {
//                 console.log(v);
//                 callback(null, v);
//             }, 500);
//         },
//         []
//     ];
// }, function(err, results) {
// 	console.log("result",results);
// });
