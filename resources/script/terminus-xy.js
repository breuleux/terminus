
// +xy 700 500 linear linear
// /xy add square linkx +circle # y = x*x
// :xy square x:1 y:1
// :xy square x:2 y:4
// :xy square x:3 y:9
// :xy square x:4 y:16 .max +large # maximum


// http://www.dweebd.com/javascript/binary-search-an-array-in-javascript/
function binarySearch(find, comparator) {
    var low = 0, high = this.length - 1, i = 0, comparison;
    while (low <= high) {
        i = Math.floor((low + high) / 2);
        comparison = comparator(this[i], find);
        if (comparison < 0) { low = i + 1; continue; };
        if (comparison > 0) { high = i - 1; continue; };
        return [i, 1];
    }
    // return [i, 0];
    return [high, 0];
};


Terminus.constructors['xy'] = function (command) {
    var nest = null;
    if (command.action == '+') {
        // var split = Terminus.split_one(command.text.trim(), ' ');
        var args = command.text.trim().split(' ');
        var w = args[0];
        var h = args[1];
        var scalex = args[2];
        var scaley = args[3];
        nest = Terminus.XYNest({w: w,
                                 h: h,
                                 scale: {x: scalex, y: scaley}});
    }
    else {
        nest = Terminus.XYNest({w: 700,
                                 h: 400,
                                 scale: {x: "linear", y: "linear"}});
        nest.process(command);
    }
    return nest;
}


function Sorter(data, major) {
    var self = data; //{};

    self.comparator = function(a, b) {
        var aa = a[major];
        var bb = b[major];
        return aa > bb ? 1 : (aa < bb ? -1 : 0);
    }

    self.update_extremum = function(which, datum, field) {
        var x = self[which][field];
        var value = datum[field];
        if (x == null) {
            self[which][field] = d3[which](data, function (x) {return x[field]});
        }
        else if (Math[which](x, value) == value) {
            self[which][field] = value;
        }
    }

    self.acquire = function(datum) {
        var where = binarySearch.call(data, datum, self.comparator);
        var i = where[0];
        var match = where[1];
        if (match) {
            data[i] = datum;
        }
        else {
            data.splice(i+1, 0, datum);
        }
        self.update_extremum('min', datum, 'x');
        self.update_extremum('min', datum, 'y');
        self.update_extremum('max', datum, 'x');
        self.update_extremum('max', datum, 'y');
    }

    self.data = data;
    self.major = major;

    self.min = {x: null,
                y: null};
    self.max = {x: null,
                y: null};

    data.sort(self.comparator);
    return self;
}


Terminus.XYNest = function(settings) {

    var div = document.createElement('div');
    var self = Terminus.DivNest(div);
    self.nest_type = 'xy';

    self.add_series = function (name, linker, point_handlers, classes, key, overwrite) {

        if (['linkx', 'linky', 'freex', 'freey'].indexOf(linker) == -1) {
            return null;
        }

        var i = self.series.length;
        var data = [];
        var existing_i = self.series_idx[name];
        if (existing_i != undefined) {
            var existing = self.series[existing_i];
            if (!overwrite) {
                return existing;
            }
            i = existing_i;
            data = existing.data;
        }

        var series = Sorter((data || []).slice(0),
                            linker[linker.length - 1]);
        series.name = name;
        series.linker = linker;
        series.point_handlers = point_handlers;
        classes = classes.slice(0);
        classes.push('_line');
        classes.push('line-' + name);
        series.classes = classes;
        series.key = key;
        self.series_idx[name] = i;
        self.series.splice(i, 1, series);
        return series;
    }

    self.compute_extremum = function (which, field) {
        return d3[which](self.series.map(function (s) { return s[which][field]; })) || 0;
    }

    self.update_scales = function () {
        var minx = self.compute_extremum('min', 'x');
        var miny = self.compute_extremum('min', 'y');
        var maxx = self.compute_extremum('max', 'x');
        var maxy = self.compute_extremum('max', 'y');
        // if (self.log) {
        //     self.log('test', minx + '-' + maxx + '/' + miny + '-' + maxy
        //              + ' -- ' + self.series[0].max.x);
        // }
        self.x = d3.scale[settings.scale.x]().domain(
            [minx, maxx]).range([0, settings.w]);
        self.y = d3.scale[settings.scale.y]().domain(
            [miny, maxy]).range([settings.h, 0]);
    }

    // self.acquire = function (series, point) {
    //     series.acquire(point);
    // }

    $.extend(self.actions, {
        '+': function (command) {
            // No effect
        },
        ':': function (command) {
            var split = Terminus.split_one(command.text.trim(), '#');
            var key = split[1].trim();
            var args = split[0].split(' ');
            var series_name = args[0];
            // var series_i = self.series_idx[series_name];
            // var series;
            // if (series_i == undefined) {
            //     series = self.add_series(series_name, 'linkx', [], [], '', null);
            // }
            // else {
            //     series = self.series[series_i];
            // }

            var series = self.add_series(series_name, 'linkx', [], [], '', null, false);

            var classes = ['_point'];
            var point_handlers = [];
            var point = {classes: classes,
                         point_handlers: point_handlers};

            for (var i = 1; i < args.length; i++) {
                var arg = args[i];
                if (arg[0] == '+') {
                    point_handlers.push(arg.substring(1));
                }
                else if (arg[0] == '-') {
                    var idx = point_handlers.indexOf(arg.substring(1));
                    point_handlers.slice(idx, 1);
                }
                else if (arg[0] == '.') {
                    classes.push(arg.substring(1));
                }
                else {
                    var name_and_value = arg.split(':');
                    var name = name_and_value[0]
                    var value = name_and_value[1];
                    var ivalue = parseFloat(value);
                    if (!isNaN(ivalue)) { value = ivalue; }
                    point[name] = value;
                }
            }
            series.acquire(point);
            self.changes = true;
            // self.redraw();
        }
    });

    self.opt_setters.series = function (command) {
        var split = Terminus.split_one(command, '#');
        var args = split[0].split(' ');
        
        var series_name = args[0];
        var series_i = self.series_idx[series_name];
        var series;
        var data = null;
        if (series_i != undefined) {
            data = self.series[series_i].data;
            self.series[series_i] = null;
        }

        var linker = args[1];
        var point_handlers = [];
        var classes = [];
        for (var i = 2; i < args.length; i++) {
            var arg = args[i];
            if (arg[0] == '+') {
                point_handlers.push(arg.substring(1));
            }
            else if (arg[0] == '.') {
                classes.push(arg.substring(1));
            }
        }

        series = self.add_series(series_name, linker, point_handlers, classes, split[1], true);

        self.changes = true;
        // self.redraw();
    };

    self.redraw = function () {

        if (!self.changes) {
            return;
        }

        self.update_scales();

        if (self.log) {
            // self.log('test', self.series[0].data.length);
            // self.log('test', self.x.toString());
        }

        var paths = svg.selectAll('._line')
            .data(self.series, function (d) { return d.name; });

        paths.enter().append("svg:path")

        paths.exit().remove();

        paths.attr('class', function (d) {return d.classes.join(' ')})
             .attr("d", d3.svg.line()
                   .x(function (d) {return self.x(d.x);})
                   .y(function (d) {return self.y(d.y);}));


        var point_sets = svg.selectAll('._point-set')
            .data(self.series, function (series) { return series.name; })

        point_sets.enter().append("svg:g")
            .attr('class', '_point-set')

        point_sets.exit().remove()

        var points = point_sets.selectAll('.__point')
            .data(function (d) {return d;})

        points.enter().append("svg:g")

        points.exit().remove()

        points.attr("class", '__point') //function (d) {return d.classes.join(' ')})
            .attr("transform", function (d) {
                return "translate(" + self.x(d.x) + ',' + self.y(d.y) + ")"; 
            })
            .each(function (d) {
                // circle = d3.svg.circle().attr('r', 10).classed(d.classes.join(' '));
                // circle = d3.svg.symbol()//.classed(d.classes.join(' '));
                var svgNS = "http://www.w3.org/2000/svg";
                var circle = document.createElementNS(svgNS, "circle");
                d3.select(circle).attr("r", 10).attr("class", d.classes.join(' '));
                // circle.setAttributeNS(null, "r", 10);
                // circle.setAttributeNS(null, "class", d.classes.join(' '));
                // var z = $('<svg><circle class="' + d.classes.join(' ') + '" cx=0 cy=0 r=10 /></svg>')[0].childNodes[0];
                if (this.childNodes.length) {
                    this.removeChild(this.childNodes[0]);
                }
                this.appendChild(circle);
            });

        self.changes = false;
        

            //   // .attr("cx", function (d) { return self.x(d.x); })
            //   // .attr("cy", function (d) { return self.y(d.y); })
            // .attr("transform", function (d) { return "translate(" + self.x(d.x) + ',' + self.y(d.y) + ")"; })
            //   .attr("r", 10)



        // points.enter().append("svg:circle")

        // points.exit().remove()

        // points.attr("class", function (d) {return d.classes.join(' ')})
        //       // .attr("cx", function (d) { return self.x(d.x); })
        //       // .attr("cy", function (d) { return self.y(d.y); })
        //     .attr("transform", function (d) { return "translate(" + self.x(d.x) + ',' + self.y(d.y) + ")"; })
        //       .attr("r", 10)





        //     .selectAll('.point')
        //     .data(function (d) {return d;})

        // points.enter().append("svg:circle")
        //     .attr("class", function (d) {return d.classes.join(' ')})
        //     .attr("cx", function (d) { return self.x(d.x); })
        //     .attr("cy", function (d) { return self.y(d.y); })
        //     .attr("r", 10)

        ////

        // var points = svg.selectAll('._point-set')
        //     .data(self.series, function (series) { return series.name; })
        //     .enter().append("svg:g")
        //     .attr('class', '_point-set')
        //     .selectAll('.point')
        //     .data(function (d) {return d;})

        // points.enter().append("svg:circle")
        //     .attr("class", function (d) {return d.classes.join(' ')})
        //     .attr("cx", function (d) { return self.x(d.x); })
        //     .attr("cy", function (d) { return self.y(d.y); })
        //     .attr("r", 10)

        ////

        // points.enter().append("svg:circle")
        //     .attr("class", function (d) {return d.classes.join(' ')})
        //     .attr("cx", function (d) { return self.x(d.x); })
        //     .attr("cy", function (d) { return self.y(d.y); })
        //     .attr("r", 10)


        // if (self.series.length > 0) {
        //     var pts = svg.selectAll('.point')
        //         .data(self.series[0])

        //     pts.enter().append("svg:circle")
        //         .attr("class", function (d) {return d.classes.join(' ')})
        //         .attr("cx", function (d) { return self.x(d.x); })
        //         .attr("cy", function (d) { return self.y(d.y); })
        //         .attr("r", 10)

        //     pts.exit().remove();
           
        // }

        // points
    };

    self.resize = function () {
        svg.attr('width', settings.w)
            .attr('height', settings.h)
            .attr('style', 'border: 1px solid red');
        // self.redraw();
    };

    self.series = [];
    self.series_idx = {};
    self.changes = true;

    var sel = d3.select(self.element);
    var svg = sel.append('svg:svg');
    self.resize();

    setInterval(self.redraw, 100);
    
    return self;
}


function svg_interact(svg_element, settings) {

    var self = Terminus.obj();
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








