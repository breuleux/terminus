
Terminus.constructors['tb'] = function (command) {
    var nest;
    if (command.action == '+') {
        nest = TableNest(command.text.split(" "));
    }
    else {
        nest = TableNest([]);
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

    file: {
        make_inline: function (text, settings) {
            var path = settings.path;
            var filename = Terminus.sanitize(text);
            var cls = [];

            if (settings.tags) {
                classes = {'*': 'executable',
                           '/': 'directory',
                           '@': 'link',
                           '.': 'normal'}
                cls.push(classes[filename[filename.length - 1]]);
                filename = filename.substring(0, filename.length - 1);
            }
            var split = filename.split('.');
            if (split.length > 1) {
                cls.push('ext-' + split.pop());
            }

            if (path) {
                return ('<span class="file"><a contenteditable=false class="'
                        + (cls.join(' '))
                        + '" href="'
                        + settings.path + filename + '">'
                        + filename
                        + '</a></span>');
            }
            else {
                return '<span class="file">' + filename + '</span>';
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
    }
    var type = (settings.type || "normal").trim();
    return inline_handlers[type].make_inline(text, settings);
}


function TableNest(columns) {

    var table = makenode('table');
    table.setAttribute('contenteditable', 'false');
    var self = DivNest(table);
    self.nest_type = 'tb';

    self.install_sorter = function (elem, i) {
        elem.onclick = function (evt) {
            self.toggle_sort(i);
            // alert('something happened?');
        };
    }

    self.install_sorters = function () {
        var cn = self.element.childNodes;
        for (var i = 0; i < cn.length; i++) {
            if (self.types[i] == 'th') {
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
        self.types.push('th');
        self.nh += 1;
        self.nrows += 1;
        var header = makenode('tr');
        self.element.appendChild(header);

        for (var i = 0; i < self.ncolumns; i++) {
            var colobj = self.columns[i];
            var th = makenode('th');
            th.innerHTML = colobj.label;
            header.appendChild(th);
            self.install_sorter(th, i);
        }
    }

    self.sort = function (colid, reverse) {
        colid = self.find_column(colid);
        var elems = Array.prototype.slice.call(self.element.childNodes);
        var type = (self.columns[colid].type || "normal").trim();
        var col_sort_fn = inline_handlers[type].sort_fn;
        function sort_fn(a, b) {
            if (a.nodeName != 'TR') {
                return -1;
            }
            if (b.nodeName != 'TR') {
                return 1;
            }
            if (a.childNodes[colid].nodeName == 'TH') {
                return -1;
            }
            if (b.childNodes[colid].nodeName == 'TH') {
                return 1;
            }
            var xa = a.childNodes[colid];
            var xb = b.childNodes[colid];
            var v = col_sort_fn(xa, xb);
            return reverse ? -v : v;
        }
        elems = elems.sort(sort_fn);
        $(self.element).empty();

        var head = 0;
        var norm = self.nh;
        var j = 0;
        for (var i = 0; i < elems.length; i++) {
            if (elems[i].nodeName != 'TR') {
                head += 1;
                norm += 1;
                self.element.appendChild(elems[i]);
            }
            else if (self.types[j] == 'td') {
                elems[norm].setAttribute('class', (i % 2 == 0) ? 'even' : 'odd');
                self.element.appendChild(elems[norm]);
                norm += 1;
                j += 1;
            }
            else if (self.types[j] == 'th') {
                self.element.appendChild(elems[head]);
                head += 1;
                j += 1;
            }
            else {
                j += 1;
            }
        }
        // $(self.element).append(elems);
        self.current_sort = [colid, !!reverse];
        // self.install_sorters();
    }

    self.add_columns = function (n) {
        var cn = self.element.childNodes;
        for (var j = 0; j < cn.length; j++) {
            var tag = self.types[j];
            for (var i = 0; i < n; i++) {
                cn[j].appendChild(makenode(tag));
            }
        }
        for (var i = 0; i < n; i++) {
            self.columns.push({'name': '', 'label': ''});
        }
        self.ncolumns += n;
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
            if (settings.name == name) {
                // console.log('crazy' + i + " " + field + '+' + value);
                settings[field] = value;
            }
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
        },
        '+': function (command) {
            // Nothing happens here. Might be used at some point to
            // update the header?
        },
        ':': function (command) {
            var values = command.text.trim().split(self.sep);
            if (values.length > self.ncolumns) {
                self.add_columns(values.length - self.ncolumns);
            }
            if (self.header_freq && self.nrows % self.header_freq == 0) {
                self.write_header();
            }

            var tr = makenode('tr');
            for (var i = 0; i < self.ncolumns; i++) {
                var desc = self.columns[i];
                var td = makenode('td');
                td.setAttribute('class', 'col-' + desc.name);
                td.setAttribute('class', 'type-' + (desc.type || 'normal'));
                // console.log('fuuu ' + values[i] + " " + self.columns[i].type);
                td.innerHTML = build_inline(values[i] || "",
                                            self.columns[i]);
                tr.appendChild(td);
            }
            cls = [self.nrows % 2 ? 'even' : 'odd'];
            tr.setAttribute('class', cls.join(' '));

            // self.tbody.appendChild(tr);
            self.element.appendChild(tr);
            self.nrows += 1;
            self.types.push('td');
        }
    });

    self.ncolumns = columns.length;
    self.columns = [];
    self.nrows = 0;
    self.types = [];
    self.nh = 0;

    for (var i = 0; i < self.ncolumns; i++) {
        var col = columns[i].split(":");
        var colobj = {name: col[0], label: col[1] || col[0]};
        self.columns.push(colobj);
    }

    self.write_header();
    self.sep = " ";
    // self.install_sorters();

    return self;
}
