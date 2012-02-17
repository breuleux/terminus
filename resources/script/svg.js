

Terminus.constructors['svg'] = function (command) {
    var nest;
    if (command.action == '+') {
        // this.log('test', command.action);
        // this.log('test', command.nest_type);
        // this.log('test', Terminus.sanitize(command.text));
        nest = SVGNest($(command.text.trim()
                         || "<svg></svg>")[0]);
    }
    else {
        var div = makenode('svg');
        nest = SVGNest(div);
        nest.process(command);
    }
    return nest;
}


function SVGNest(div) {
    var self = DivNest(div);
    self.nest_type = 'svg';
    self.interactor = svg_interact(div, {zoom: true,
                                         pan: true,
                                         zoom_speed: 1.5});

    self.opt_setters.zoom_speed = function (data) {
        value = parseFloat(data);
        if (!isNaN(value)) {
            self.interactor.settings.zoom_speed = value;
        }
    }

    self.bool_setter = function (field) {
        return function(data) {
            data = data.trim();
            if (data == 'false') {
                self.interactor.settings[field] = false;
            }
            else if (data == 'true') {
                self.interactor.settings[field] = true;
            }
        }
    }

    self.opt_setters.zoom = self.bool_setter('zoom');
    self.opt_setters.pan = self.bool_setter('pan');

    self.make_node = function (html) {
        return $("<svg>" + html + "</svg>")[0].childNodes[0];
    }

    $.extend(self.actions, {
        '+': function (command) {
            // TODO: +svg in svg -> <g> tag
            // other nest types -> no effect
        },
    });

    return self;
}


function svg_interact(svg_element, settings) {

    var self = obj();
    self.svg_element = svg_element;
    self.settings = settings;

    self.init = function () {
        svg_element.setAttribute('preserveAspectRatio', false);

        var width = parseInt(svg_element.getAttribute("width")
                             || $(svg_element).width());
        if (!width) { return; }
        var height = parseInt(svg_element.getAttribute("height")
                              || $(svg_element).height());
        if (!height) { return; }
        var vbox = svg_element.getAttribute('viewBox');

        if (vbox === null) {
            vbox = [0, 0, width, height];
            self.scalex = 1;
            self.scaley = 1;
        }
        else {
            vbox = vbox.split(" ").map(function (x) { return parseInt(x); });
            self.scalex = width / vbox[2];
            self.scaley = height / vbox[3];
        }
 
        self.vbox = {x: vbox[0],
                     y: vbox[1],
                     w: vbox[2],
                     h: vbox[3]};

        self.anchor = null;

        $(svg_element).bind('mousewheel', self.handle_mousewheel);
        $(svg_element).bind('mousedown', self.handle_mousedown);
        $(svg_element).bind('mousemove', self.handle_mousemove);
        $(svg_element).bind('mouseup', self.handle_mouseup);
    }

    self.mousepos = function(event) {
        var box = self.vbox;
        var absx = event.offsetX;
        var absy = event.offsetY;
        var x = (absx / self.scalex) + box.x
        var y = (absy / self.scaley) + box.y
        return {x: x, y: y};
    }

    self.change_box = function(x, y, w, h) {        
        self.vbox = {x: x,
                     y: y,
                     w: w,
                     h: h};
        var newbox = [x, y, w, h].join(' ');
        svg_element.setAttribute('viewBox', newbox);
    }

    self.handle_mousewheel = function (event, delta) {

        if (!settings.zoom)
            return;

        var zoom = Math.pow(settings.zoom_speed, delta);
        var p = self.mousepos(event);

        var box = self.vbox;

        var neww = box.w / zoom;
        var newh = box.h / zoom;

        var newx = p.x - (p.x - box.x) / zoom;
        var newy = p.y - (p.y - box.y) / zoom;

        self.scalex *= zoom;
        self.scaley *= zoom;

        self.change_box(newx, newy, neww, newh);

        event.preventDefault();
    }

    self.handle_mousedown = function (event) {
        self.anchor = self.mousepos(event);
        event.preventDefault();
    }

    self.handle_mousemove = function (event) {
        if (!settings.pan || !self.anchor)
            return;
        var a = self.anchor;
        var p = self.mousepos(event);
        var box = self.vbox;

        self.change_box(box.x + a.x - p.x,
                        box.y + a.y - p.y,
                        box.w, box.h);
        event.preventDefault();
    }

    self.handle_mouseup = function (event) {
        self.anchor = null;
    }

    self.init();
    return self;
}
