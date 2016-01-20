var util = require('util');

/**
 * 父级异常类
 * @param {[type]} 异常信息    
 * @param {[type]} 子类构造函数 
 */
var AbstractError = function(msg, constr) {
    Error.captureStackTrace(this, constr || this);
    this.message = msg || 'Error';
};
util.inherits(AbstractError, Error);
AbstractError.prototype.name = 'Abstract Error';
AbstractError.prototype.code = 1000;



/**
 * 参数校验异常
 * @param {[type]} msg [description]
 */
var ArgsError = function(msg) {
    ArgsError.super_.call(this, msg, this.constructor);
};
util.inherits(ArgsError, AbstractError);
ArgsError.prototype.name = 'Args Error';
ArgsError.prototype.code += 100;


/**
 * 参数类型校验异常
 * @param {[type]} msg [description]
 */
var ArgsTypeError = function(value, str) { 
    var msg = "参数：" + value + "类型不合法！" + (str || "");
    ArgsTypeError.super_.call(this, msg, this.constructor);
};
util.inherits(ArgsTypeError, ArgsError);
ArgsTypeError.prototype.name = 'ArgsType Error';
ArgsTypeError.prototype.code += 1;

/**
 * 参数值约定校验异常
 * @param {[type]} msg [description]
 */
var ArgsValueError = function(value, str) {
    var msg = "参数：" + value + "值不合法！" + (str || "");
    ArgsValueError.super_.call(this, msg, this.constructor);
};
util.inherits(ArgsValueError, ArgsError);
ArgsValueError.prototype.name = 'ArgsValue Error';
ArgsValueError.prototype.code += 2;

module.exports = {
	ArgsError: ArgsError,
	ArgsTypeError: ArgsTypeError,
	ArgsValueError: ArgsValueError
};