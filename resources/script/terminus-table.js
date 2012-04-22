
Terminus.constructors['tb'] = function (command) {
    var nest;
    if (command.action == '+') {
        // alert(command.text.replace(/\t/g, '!!!'))
        nest = Terminus.TableNest(command.text.split("\t"));
        // nest = TableNest(command.text.split(" "));
    }
    else {
        nest = Terminus.TableNest([]);
        nest.process(command);
    }
    return nest;
}

Terminus.cmp = function (a, b) {
    if (a < b) {
        return -1;
    }
    else if (a > b) {
        return 1;
    }
    else {
        return 0;
    }
}

inline_handlers = {

    normal: {
        make_inline: function (text, settings) {
            return "<span>" + Terminus.sanitize(text) + "</span>";
        },

        sort_fn: function (a, b) {
            var ta = $(a).text();
            var tb = $(b).text();
            return Terminus.cmp(ta, tb);
        }
    },

    number: {
        make_inline: function (text, settings) {
            return '<span>' + text + '</span>';
        },

        sort_fn: function (a, b) {
            function parsenum(x) {
                var t = $(x).text().trim();
                var n = -parseFloat(t);
                if (t.match(/[kK]$/))
                    n *= 1000;
                else if (t.match(/M$/))
                    n *= 1000000;
                else if (t.match(/G$/))
                    n *= 1000000000;
                return n;
            }
            var na = parsenum(a);
            var nb = parsenum(b);
            return Terminus.cmp(na, nb);
        }
    },

    bar: {
        make_inline: function (text, settings) {
            var n = parseInt(text);
            var w = n * (settings.scale || 1);
            return '<div class="bar" style="width: ' + w + 'px"></div>';
        },

        sort_fn: function (a, b) {
            var na = $(a).width();
            var nb = $(b).width();
            return Terminus.cmp(na, nb);
        }
    },

    file: {
        make_inline: function (text, settings) {
            var path = settings.path;
            var filename = Terminus.sanitize(text);
            var cls = [];

            if (settings.tags) {
                classes = {'*': 'executable',
                           '/': 'directory',
                           '@': 'symlink',
                           '.': 'normal'}
                cls.push(classes[filename[filename.length - 1]]);
                filename = filename.substring(0, filename.length - 1);
            }

            var matchers = [
                [/\.([a-zA-Z]+)$/, function (whole, match) {
                    // this.log('test', 'match! ' + match + " " + filename);
                    cls.push('ext-' + match);
                }],
                [/([~#])$/, function (whole, match) {
                    cls.push('save-file');
                }],
                [/^\./, function (whole, match) {
                    cls.push('hidden-file');
                }],
            ]
            for (var i = 0; i < matchers.length; i++) {
                var matcher = matchers[i];
                var match = filename.match(matcher[0]);
                if (match !== null) {
                    matcher[1].apply(this, match);
                }
            }

            // var last = filename[filename.length - 1];
            // if (last == '~' || last == '#')
            // var split = filename.split('.');
            // if (split.length > 1) {
            //     cls.push('ext-' + split.pop());
            // }

            if (path) {
                return ('<span class="file"><a contenteditable=false class="'
                        + (cls.join(' '))
                        + '" href="'
                        + settings.path + filename + '">'
                        + filename
                        + '</a></span>');
            }
            else {
                var rval = '<span class="file"><span class="' + (cls.join(' ')) + '">' + filename + '</span></span>';
                console.log(rval);
                return rval;
                // return '<span class="file">' + filename + '</span>';
            }
        },

        sort_fn: function (a, b) {
            var ta = $(a).text();
            var tb = $(b).text();
            return Terminus.cmp(ta, tb);
        }
    }
}

function build_inline(text, settings) {
    if (!settings.type) {
        if (text.trim().match(/^[0-9]*(\.[0-9]*)?([eE][0-9]+)?[kKMG]?$/)) {
            settings.type = 'number';
        }
        else {
            settings.type = 'normal';
        }
    }
    var type = (settings.type || "normal").trim();
    return inline_handlers[type].make_inline.call(this, text, settings);
}


Terminus.TableNest = function(columns) {

    var div = document.createElement('div');
    var self = Terminus.DivNest(div);
    self.nest_type = 'tb';

    var table = document.createElement('div');
    table.setAttribute('class', 'terminus-table');
    self.element.appendChild(table);
    self.table = table;

    self.install_sorter = function (elem, i) {
        elem.onclick = function (evt) {
            self.toggle_sort(i);
        };
    }

    self.install_sorters = function () {
        var cn = self.table.childNodes;
        for (var i = 0; i < cn.length; i++) {
            if ($(cn[i]).hasClass('terminus-header')) {
                for (var j = 0; j < self.ncolumns; j++) {
                    var target = cn[i].childNodes[j];
                    console.log('install ' + i + ' ' + j);
                    console.log(target);
                    self.install_sorter(target, j);
                }
            }
        }
    }

    self.find_column = function (name) {
        if (typeof name == "number") {
            if (name < 0 || name >= self.ncolumns) {
                return -1;
            }
            return name;
        }
        for (var i = 0; i < self.ncolumns; i++) {
            var settings = self.columns[i];
            if (settings.name == name || settings.label == name) {
                return i;
            }
        }
        return -1;
    }

    self.toggle_sort = function (colid) {
        if (self.current_sort && self.current_sort[0] == colid) {
            self.sort(colid, !self.current_sort[1]);
        }
        else {
            self.sort(colid);
        }
    }

    self.write_header = function () {
        var header = document.createElement('div');
        header.setAttribute('class', ['terminus-row',
                                      'terminus-header',
                                      'terminus-staticrow',
                                      'row-' + self.n,
                                      'head-' + self.nh].join(' '));
        self.table.appendChild(header);

        for (var i = 0; i < self.ncolumns; i++) {
            var colobj = self.columns[i];
            var th = document.createElement('div');
            th.setAttribute('class', 'terminus-cell');
            th.innerHTML = colobj.label;
            header.appendChild(th);
            self.install_sorter(th, i);
        }

        self.nrows += 1;
        self.nh += 1;
        self.n += 1;
    }

    self.sort = function (colid, reverse) {
        colid = self.find_column(colid);
        var cn = self.table.childNodes;
        var saved = Array.prototype.slice.call(cn);
        var elems = Array.prototype.slice.call(cn);
        var type = (self.columns[colid].type || "normal").trim();
        var col_sort_fn = inline_handlers[type].sort_fn;
        function sort_fn(a, b) {
            if ($(a).hasClass('terminus-staticrow')) {
                return -1;
            }
            if ($(b).hasClass('terminus-staticrow')) {
                return 1;
            }
            var xa = a.childNodes[colid].childNodes[0];
            var xb = b.childNodes[colid].childNodes[0];
            var v = col_sort_fn(xa, xb);
            return reverse ? -v : v;
        }
        elems.sort(sort_fn);
        $(self.table).empty();

        var head = 0;
        var norm = self.nh;
        for (var i = 0; i < elems.length; i++) {
            if ($(saved[i]).hasClass('terminus-staticrow')) {
                self.table.appendChild(elems[head]);
                head += 1;
            }
            else {
                if (i % 2 == 0) {
                    $(elems[norm]).removeClass('odd').addClass('even')
                }
                else {
                    $(elems[norm]).removeClass('even').addClass('odd')
                }
                self.table.appendChild(elems[norm]);
                norm += 1;
            }
        }
        self.current_sort = [colid, !!reverse];
    }

    self.check_columns = function (values) {
        if (values.length > self.ncolumns) {
            self.add_columns(values.length - self.ncolumns);
        }
    }

    self.add_columns = function (n) {
        var cn = self.table.childNodes;
        for (var j = 0; j < cn.length; j++) {
            for (var i = 0; i < n; i++) {
                var node = document.createElement('div');
                node.setAttribute('class', 'terminus-cell');
                cn[j].appendChild(node);
            }
        }
        for (var i = 0; i < n; i++) {
            self.columns.push({'name': '', 'label': ''});
        }
        self.ncolumns += n;
        self.install_sorters();
    }

    self.opt_setters.static = function (data) {
        var pos = parseInt(data);
        if (pos < 0) {
            pos += self.nrows;
        }
        var target = $(self.table.childNodes[pos]);
        if (!target.hasClass('terminus-staticrow')) {
            target.addClass('terminus-staticrow');
            self.nh += 1;
        }
    }

    self.opt_setters.nostatic = function (data) {
        var pos = parseInt(data);
        if (pos < 0) {
            pos += self.nrows;
        }
        var target = $(self.table.childNodes[pos]);
        if (target.hasClass('terminus-staticrow')) {
            target.removeClass('terminus-staticrow');
            self.nh -= 1;
        }
    }

    self.opt_setters.flow = function (data) {
        var opt = Terminus.parse_bool(data);
        if (opt) {
            self.table.setAttribute('class', 'terminus-flow');
        }
        else {
            self.table.setAttribute('class', 'terminus-table');
        }
    }

    self.opt_setters.sep = function (data) {
        self.sep = String.fromCharCode(data.trim());
    }

    self.opt_setters.header_freq = function (data) {
        self.header_freq = parseInt(data.trim());
    }

    self.opt_setters.c = function (data) {
        var split = Terminus.split_one(data, '.');
        var name = split[0];
        split = Terminus.split_one(split[1], ' ');
        var field = split[0];
        var value = split[1];
        for (var i = 0; i < self.ncolumns; i++) {
            var settings = self.columns[i];
            if (settings.name == name || settings.label == name) {
                settings[field] = value;
            }
        }
    }

    self.insert_row = function (i) {
        var tr = document.createElement('div');
        tr.setAttribute('class',
                        ['terminus-row',
                         i % 2 ? 'odd' : 'even',
                         'row-' + self.n].join(' '));
        var cn = self.table.childNodes;
        if (i == cn.length) {
            self.table.appendChild(tr);
        }
        else {
            self.table.insertBefore(tr, cn[i]);
        }
        self.nrows += 1;
        self.n += 1;
    }

    self.delete_row = function (i) {
        var cn = self.table.childNodes;
        var tr = cn[i];
        if ($(tr).hasClass('terminus-header')) {
            self.th -= 1;
        }
        self.table.removeChild(tr);
        self.nrows -= 1;
    }

    self.fill_row = function (i, values) {
        var tr = self.table.childNodes[i];
        $(tr).empty();

        for (var i = 0; i < self.ncolumns; i++) {
            var desc = self.columns[i];
            var td = document.createElement('div');
            td.innerHTML = build_inline.call(self,
                                             values[i] || "",
                                             self.columns[i]);
            td.setAttribute('class',
                            ['terminus-cell',
                             'col-' + desc.name,
                             'type-' + (desc.type || 'normal')].join(' '));
            tr.appendChild(td);
        }        
    }

    $.extend(self.actions, {
        '!': function (command) {
            var split = Terminus.split_one(command.text, ' ');
            if (split[0] == 'sort') {
                sort_by = split[1].trim();
                if (sort_by[0] == '~')
                    self.sort(sort_by.substring(1), true);
                else
                    self.sort(sort_by);
            }
            else {
                throw "unknown !action for tb nest: " + split[0];
            }
        },
        '+': function (command) {
            // Nothing happens here. Might be used at some point to
            // update the header?
        },

        ':': function (command) {
            var values = command.text.trim().split(self.sep);
            self.check_columns(values);

            if (self.header_freq && self.nrows % self.header_freq == 0) {
                self.write_header();
            }

            var pos = self.nrows;
            self.insert_row(pos);
            self.fill_row(pos, values);
        },

        '~': function (command) {
            var text = command.text.trim();
            var split = Terminus.split_one(text, ' ');
            var i = split[0];
            var insert = false;
            if (i[0] == '+') {
                i = i.substring(1);
                insert = true;
            }
            var pos = parseInt(i);
            if (pos < 0) {
                pos += self.nrows;
            }

            var str = split[1].trim();
            if (!str) {
                self.delete_row(pos);
            }
            else {
                var values = split[1].split(self.sep);
                self.check_columns(values);
                if (insert) {
                    self.insert_row(pos);
                }
                self.fill_row(pos, values);
            }
        }
    });

    self.ncolumns = columns.length;
    self.columns = [];
    self.nrows = 0;
    self.nh = 0;
    self.n = 0;

    for (var i = 0; i < self.ncolumns; i++) {
        var col = columns[i].split(":");
        var name = col[0].trim();
        var label = (col[1] || name).trim();
        var colobj = {name: name, label: label};
        self.columns.push(colobj);
    }

    self.write_header();
    self.sep = "\t";

    return self;
}
