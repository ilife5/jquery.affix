;(function($, exports, Affix, undefined) {
    /**
     * 竖向有边界的浮动效果
     */

    var getValue = Affix.getValue;

    /**
     * @param opts
     *  floatArea : 浮动的节点
     *  top : 浮动时距视口高度
     *  left : 浮动时节点左边距的参考节点
     *  rangeTop : 浮动时的上边界参考节点(必须)
     *  rangeBottom : 浮动时的下边界参考节点(必须)
     * @method
     */
    function affix_hBox(opts) {
        var top = opts.top,
            left = opts.left,
            rangeTop = opts.rangeTop,
            rangeBottom = opts.rangeBottom,
            check = opts.check || function () {
                return true;
            },
            floatArea = opts.floatArea,
            $floatArea = $(floatArea),
            oriTop = $floatArea.css('top').substring(0, $floatArea.css('top').indexOf('px')),
            affix;

        if(!rangeTop || !rangeBottom) {
            return;
        }

        //rangeBottom可传el节点
        if($(rangeBottom).get(0).nodeType) {
            var $BottomEl = $(rangeBottom);
            rangeBottom = function () {
                if(Affix.isIE7) {
                    var _factor = Affix.GetZoomFactor() || 0.1;
                    return $BottomEl.offset().top + $BottomEl.outerHeight() * _factor;
                } else {
                    return $BottomEl.offset().top + $BottomEl.outerHeight();
                }
            };
        } else {
            if(Affix.isIE7) {
                var rb = rangeBottom,
                    _factor = Affix.GetZoomFactor() || 0.1;
                rangeBottom = function() {
                    return getValue(rb) * _factor;
                }
            }
        }

        //rangeTop可传el节点
        if($(rangeTop).get(0).nodeType) {
            var $rangeTop = $(rangeTop);
            rangeTop = function () {
                return $rangeTop.offset().top;
            };
        }

        //left可传el节点
        if(left) {
            if($(left).get(0).nodeType) {
                var $left = $(left);
                left = function () {
                    return $left.offset().left - $(document).scrollLeft();
                };
            }
        }

        function resetFloatPosition() {
            var scrollTop = $(document).scrollTop(),
                floatAreaH = $floatArea.outerHeight(),
                bottom = getValue(rangeBottom),
                top;
            if(Affix.isIE7) {
                floatAreaH  = floatAreaH * (Affix.GetZoomFactor() || 0.1);
            }
            if(scrollTop + floatAreaH >= bottom && check()) {
                top = bottom - getValue(rangeTop) - floatAreaH;
            } else {
                top = oriTop;
            }
            $floatArea.css('top', top*1);
        }

        affix = new Affix({
            el:$floatArea,
            heightHack:true,
            range:[rangeTop, null, function() {
                var foh = $floatArea.outerHeight();
                if(Affix.isIE7) {
                    foh  = foh * (Affix.GetZoomFactor() || 0.1);
                }
                return getValue(rangeBottom) + $(window).height() - foh ;
            }],
            top:top,
            everyTime:true,
            left:left,
            recoveryStyle:{
                top:function() {
                    var scrollTop = $(document).scrollTop(),
                        floatAreaH = $floatArea.outerHeight(),
                        bottom = getValue(rangeBottom);
                    if(Affix.isIE7) {
                        floatAreaH  = floatAreaH * (Affix.GetZoomFactor() || 0.1);
                    }
                    if(scrollTop + floatAreaH >= bottom && check()) {
                        return bottom - getValue(rangeTop) - floatAreaH;
                    } else {
                        return oriTop;
                    }
                }
            }
        });

        affix.resetFloatPosition = resetFloatPosition;

        $(affix).bind('outOfWork', function() {
            resetFloatPosition();
        });

        return affix;
    }

    exports.affix_hBox = affix_hBox;

})(jQuery, window, window.Affix);