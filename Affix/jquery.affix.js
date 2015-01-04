//add start pause method

;(function($, exports, undefined) {

//检测是否为ie6 ie7
    var isIE6 = /MSIE 6\.0/.test(navigator.userAgent),
        isIE7 = /MSIE 7\.0/.test(navigator.userAgent);

    var AffixConfig = {};

    /**
     * 返回v>=b
     * @param {Function|Number} v
     * @param {Function|Number} b
     */
    function compare(v, b) {
        //如果不存在v或者b，则说明该range不存在，返回true
        if (v == null || b == null) {
            return true;
        }

        return Number(getValue(v)) >= Number(getValue(b));
    }

    /**
     * 如果v是function，返回运行后的值
     * 如果v不是function，存在d则返回d的值，否则直接返回v
     * @param v
     * @param d 默认值
     * @example
     * var obj = {
     *      a : 1,
     *      b : function () {return 1}
     *  };
     *  getValue(obj.a);    //1
     *  getValue(obj.b);    //1
     *  getValue(obj.a, 2); //2
     */
    function getValue(v, d) {
        if($.type(v) === 'object') {
            var r = {};
            $.each(v, function(name, va) {
                r[name] = getValue(va);
            });
            return r;
        } else if ($.isFunction(v)) {
            return v();
        } else {
            return typeof d === 'undefined' ? v : d;
        }
    }


// handle multiple browsers for requestAnimationFrame()
    var requestAFrame = (function () {
        var func = window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame;

        if(!func) {
            func = function(callback) {
                return window.setTimeout(callback, 1000 / 60); // shoot for 60 fps
            };

            func.noSupportAnimationFrame = true;
        }

        return func;
    })();

// handle multiple browsers for cancelAnimationFrame()
    var cancelAFrame = (function () {
        return window.cancelAnimationFrame ||
            window.webkitCancelAnimationFrame ||
            window.mozCancelAnimationFrame ||
            window.oCancelAnimationFrame ||
            function (id) {
                window.clearTimeout(id);
            };
    })();

    function GetZoomFactor () {
        var factor = 1;
        if (document.body.getBoundingClientRect) {
            // rect is only in physical pixel size in IE before version 8
            var rect = document.body.getBoundingClientRect();
            var physicalW = rect.right - rect.left;
            var logicalW = document.body.offsetWidth;

            // the zoom level is always an integer percent value
            factor = Math.round ((physicalW / logicalW) * 100) / 100;
        }
        return factor;
    }

    /**
     * 判断一个当前页面是否在range划定的范围内
     * @param range
     *  range的值可以为单值，判断当前滚动条的y轴值是否在range内
     *  range的值可以为一个数组，如[t, r, b, l]，分别代表了上、右、下、左边界
     *  其中range的值既可以为数字或者函数
     * @return {Boolean} 当前页面是否在range区域内部
     */
    function elInRange(range) {
        var $win = $(window),
            sTop = $win.scrollTop(),
            sLeft = $win.scrollLeft(),
            right = $win.width() + sLeft;
        if ($.isArray(range)) {
            return compare(sTop, range[0]) && compare(range[1], right) &&
                compare(range[2], sTop + $win.height()) && compare(sLeft, range[3]);
        } else {
            range = [range];
            return compare(sTop, range[0]);
        }
    }

//根据当前位置做ie下位置的适配
    function getPosition(o, $el) {
        var top = o.top,
            bottom = o.bottom,
            left = o.left,
            right = o.right,
            ret = {};

        //如果有top值，使用top值，否则使用bottom值
        if (top != null) {
            ret.top = getValue(top, $(window).scrollTop() + top - $el.offsetParent().offset().top);
        } else if (bottom != null) {
            ret.top = getValue(bottom, $(window).scrollTop() + $(window).height() - $el.outerHeight() - bottom - $el.offsetParent().offset().top);
        }

        //如果有left值，使用left值，否则使用right值
        if (left != null) {
            ret.left = getValue(left, $(window).scrollLeft() + left - $el.offsetParent().offset().left);
        } else if (right != null) {
            ret.left = getValue(right, $(window).scrollLeft() + $(window).width() - $el.outerWidth() - right - $el.offsetParent().offset().left);
        }
        return ret;
    }

    var classNames = {
        inRange: "affix-active",
        outOfRange: "affix-default"
    };

    function Affix(options) {
        var me = this;
        //遍历参数，如果存在于defaultConfig中，将该参数作为实例的属性
        if (options != null) {
            $.each(options, function (k, v) {
                if (k in me) {
                    me[k] = v;
                }
            });
        }

        if(!me.range) {
            me.range = $(me.el).position().top;
        }

        if(me.left === null) {
            me.left = function() {
                return $(me.el).parent().position().left - $(document).scrollLeft();
            }
        } else if($(me.left).get(0).nodeType) {
            me.left = function() {
                return $(me.left).position().left - $(document).scrollLeft();
            }
        }

        me.isWork = false;
        me.currentStyle = {};
        me.lastStyle = {};
        $(me.el).data('$objAfix', me);

        if(me.autoRender) {
            me.render();
        }
    }

    Affix.getValue = getValue;
    Affix.GetZoomFactor = GetZoomFactor;
    Affix.isIE7 = isIE7;
    Affix.isIE6 = isIE6;

    $.extend(Affix.prototype, {
        el:null, //目标节点
        everyTime:true, //是否每次动态计算位置
        autoRender:true,    //是否创建时立即执行
        heightHack:false, //是否模拟高度，避免在setposition的临界状态时的抖动
        heightHackFix:null,
        range:null, //生效范围
        top:0, //生效时的top值
        left:null, //生效时的left值
        bottom:null, //生效时的bottom值
        right:null, //生效时的right值
        additionStyle:null, //生效时的附加样式
        recoveryStyle:null,
        ie7FixedHack:false, //是否针对ie7 fixed定位的不完整实现（父级元素position取值为relative，缩放的场景下定位不准确）做hack
        currentStyle:{},
        lastStyle:{},
        isWork:false,
        container: null,
        classNames: classNames, //样式hack
        setPosition:function () {
            var me = this,
                range = me.range,
                $el = $(me.el),
                isPositionAbs = isIE6 || me.ie7FixedHack,       //是否在吸顶时对元素进行绝对定位
                isFactorNeeded = isIE7 && !me.ie7FixedHack;     //是否需要在IE7且fixed定位时对元素的坐标进行修正
            /**
             * 区分range的值
             * 当range为单值时，比较top >= range，如果range是个函数，则比较top >= range.call(this)
             * 当range为数组时，比较top >= range[0] && top <= range[1]，如果range中数组项为函数时，
             * 比较top>=range[0].call(this) && top <= range[1].call(this)
             */
            if (elInRange(range)) {
                //使用isWork保存在range之中的样式是否已经生效，如果生效，不用每次都改变样式
                if (!me.isWork || me.everyTime) {
                    me.currentStyle = $.extend({
                        top:getValue(me.top),
                        left:getValue(me.left),
                        bottom:getValue(me.bottom),
                        right:getValue(me.right),
                        position:'fixed'
                    }, me.additionStyle);
                    if(!me.isWork) {
                        $.each(me.currentStyle, function (k) {
                            me.lastStyle[k] = $el.css(k);
                        });
                    }
                    if (isPositionAbs) {
                        me.currentStyle.position = 'absolute';
                    }

                    $.each(['top', 'bottom', 'left', 'right'], function(i, name) {
                        //在循环中加入IE7位置修复的hack
                        if(isFactorNeeded) {
                            var _factor = GetZoomFactor() || 0.1;
                        }

                        if(me.currentStyle[name] === null) {
                            delete me.currentStyle[name];
                            delete me.lastStyle[name];
                        } else if(isFactorNeeded) {
                            me.currentStyle[name] = me.currentStyle[name] / _factor;
                        }
                    });
                    $el.css(me.currentStyle);
                    me.heightHackDom && me.heightHackDom.show();
                    me.isWork = true;
                    if(me.heightHackDom) {
                        if(me.heightHackFix) {
                            me.heightHackDom.css('height', me.heightHackFix);
                        } else {
                            me.heightHackDom.css('height', $(me.el).outerHeight(true));
                        }
                    }
                }

                if(!$el.hasClass(me.classNames.inRange)) {
                    $el.removeClass(me.classNames.outOfRange).addClass(me.classNames.inRange);
                }

                //绝对定位需要随着滚动条的移动而更新
                if (isPositionAbs) {
                    $el.css(getPosition(me.currentStyle, $el));
                }
                $(me).trigger('changePosition');
            } else {
                if(me.isWork) {
                    me.isWork = false;
                    me.resetPosition();
                } else {
                    $(me).trigger('outOfWork');
                }

                if(!$el.hasClass(me.classNames.outOfRange)) {
                    $el.removeClass(me.classNames.inRange).addClass(me.classNames.outOfRange);
                }
            }
            $(me).trigger('position');
            me.onAnimation = false;
        }
    });

    Affix.prototype.render = function () {
        var me = this,
            $win = $(window),
            renderFunc;

        if(me.container != null) {
            $(me.el).appendTo(me.container);
        }

        me.onAnimation = false;
        me.animationId = null;
        me.alternation = false;     //用于记录当前帧是否为假帧，chrome、ff、IE10在满帧时的速度为60+，只用30帧就可以正常的显示动画，将渲染的帧数减半
        me.endAnimation = false;    //记录最后的补帧句柄
        me.scrollCount = 0;         //记录滚动次数，用来在IE6下进行渲染的判断

        if(me.heightHack) {
            me.heightHackDom = $('<div style="margin-top: 0px; overflow: hidden;"></div>');
            me.heightHackDom.css('height', $(me.el).outerHeight(true)).hide().insertAfter(me.el);
        }

        me.setPositionProxy = $.proxy(me.setPosition, me);

        //由于在不支持requestAnimationFrame的浏览器中，由于渲染的不同步，导致页面产生抖动
        //将效果改为不连续的定位
        if(requestAFrame.noSupportAnimationFrame) {
            me.renderFunc = function() {
                if(me.endAnimation) {
                    cancelAFrame(me.endAnimation);
                    me.endAnimation = null;
                }

                me.endAnimation = requestAFrame(me.setPositionProxy);

            };
        } else {
            me.renderFunc = function() {
                if(!me.onAnimation) {
                    me.onAnimation = true;
                    me.animationId = requestAFrame(me.setPositionProxy);
                }
            };
        }

        $win.on('scroll.affix resize.affix', me.renderFunc);
        me.setPosition();
        return me;
    };

    Affix.prototype.destroy = function() {
        $(this.el).data('$objAfix', null);
        this.pause();
        this.pause = this.start = this.destroy = function() {
            return false;
        };
    };

    Affix.prototype.resetPosition = function() {
        var me = this,
            $el = $(me.el);

        //heightHackDom需放在$el.css方法之后，否则在chrome中会因为滚动条的向上跳动导致抖动发生
        $el.css($.extend(me.lastStyle, getValue(me.recoveryStyle)));
        me.heightHackDom && me.heightHackDom.hide();
        $(me).trigger('positionReset');   
    };

    Affix.prototype.start = function() {
        if(!this.run) {
            $(window).on('scroll.affix resize.affix', this.renderFunc);
            this.run = true;
        }
    };

    Affix.prototype.pause = function() {
        this.run = false;
        if(this.isWorking()) {
            this.isWork = false;
            this.resetPosition();
        }
        $(window).off('scroll.affix resize.affix', this.renderFunc);
    };

    Affix.prototype.isWorking = function() {
        return this.isWork;
    };

    Affix.prototype.refreshAll = function() {
        $(window).trigger('scroll.affix');
    };

    Affix.prototype.getOriDomOffset = function() {
        if(this.isWorking()) {
            return $(this.heightHackDom).offset();
        } else {
            return $(this.el).offset();
        }
    };

    $.fn.affix = function(opts) {
        $(this).each(function() {
            var el = this;
            var config = AffixConfig[$(el).data("affix")];
            new Affix($.extend(true, {
                    el : el
                }, opts, config
            ))
        });
    };

    $(function() {
        $("[data-affix]").affix();
    });

    exports.Affix = Affix;
    exports.AffixConfig = AffixConfig;

})(jQuery, window);
