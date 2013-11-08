;(function($, exports, Affix, undefined) {

    /**
     * 单边界吸顶效果
     * @param opts
     *  el :  浮动节点
     *  top : 浮动时距视口高度
     *  left : 浮动时参考的左边定位节点
     *  range : 浮动参考上边界
     * @return {*}
     */
    function affix_singleRange(opts) {
        var top = opts.top,
            left = opts.left,
            range = opts.range,
            $el = $(opts.el);

        //left可传el节点
        if(left) {
            if($(left).get(0).nodeType) {
                var $left = $(left);
                left = function () {
                    return $left.offset().left - $(document).scrollLeft();
                };
            }
        }

        var affix = new Affix({
            el : $el,
            top : top,
            everyTime : true,
            heightHack : true,
            left : left,
            range : range,
            autoRender: false
        });
        affix.render();

        return affix;
    }

    exports.affix_singleRange = affix_singleRange;

})(jQuery, window, window.Affix);
