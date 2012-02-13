
GID = 0;
function obj() {
    // Return a new object, with an id field set to a unique number
    // (converted to a string). Its toString() method returns the id,
    // meaning that it can be set as an attribute in an object (for
    // what it is worth).
    var self = {};
    self.id = "#" + GID.toString();
    GID += 1;
    self.toString = function () {
        return self.id;
    }
    return self;
}


function grab_settings(accum, files, fn) {
    if (!files.length) {
        fn(accum);
    }
    else {
        var file = files.shift();
        $.get(file, function (data) {
            data = jsyaml.load(data);
            $.extend(true, accum, data);
            grab_settings(accum, files, fn);
        });
    }
}

function makenode(type) {
    return document.createElement(type);
}

function makediv() {
    return makenode('div');
}


function Logger(settings) {
    var self = obj();

    self.log = function(type, data) {
        if (!self.active || (!self.all && !self.what[type])) {
            return;
        }
        var now = Date.now();
        if (now - self.last > settings.group_delay) {
            self.scroll();
        }
        var s = type + ": " + data + "<br/>";
        if (settings.prefix) {
            s = settings.prefix + " " + s;
        }
        self.target.append(s);
        self.last = now;
    }

    self.switch_state = function(value) {
        if (value === undefined) { value = !self.active; }
        if (value) {
            self.active = value;
            self.log('info', 'logging ON')
        }
        else {
            self.log('info', 'logging OFF')
            self.active = value;
        }
    }

    self.scroll = function() {

        if (self.target !== undefined) {
            self.stale.prepend(self.target);
            self.fresh.empty();
        }

        self.target = $(makediv());
        self.target.attr('class', 'log_entry');
        self.fresh.append(self.target);

        if (settings.colorize) {
            var r = String.fromCharCode(65 + Math.random() * 6);
            var g = String.fromCharCode(65 + Math.random() * 6);
            var b = String.fromCharCode(65 + Math.random() * 6);
            self.target.css('background-color', '#'+r+g+b);
        }

        if (settings.animate) {
            self.target.hide();
            setTimeout(function () {
                self.target.slideDown('fast');
            }, 10);
        }
    }

    self.clear = function() {
        self.fresh.empty();
        self.stale.empty();
        self.target = undefined;
        self.last = -settings.group_delay - 1;
    }

    self.init = function(settings) {
        self.settings = settings;
        self.fresh = $(settings.where + " > .fresh");
        self.stale = $(settings.where + " > .stale");
        self.active = settings.start;
        self.what = {}
        self.all = false;
        if (settings.what) {
            for (var i = 0; i < settings.what.length; i++) {
                var type = settings.what[i];
                if (type == false) {
                    self.what = {};
                    break;
                }
                if (type == 'all') {
                    self.all = true;
                    break;
                }
                self.what[type] = true;
            }
        }
        self.clear();
    }

    self.init(settings);
    return self
}


function Nest(element) {
    var self = obj();

    self.n = 1;
    self.element = element;
    self.nestid = 'nest-' + self.id.substring(1);
    $(self.element).attr('id', self.nestid);
    self.children = {};
    self.latest = null;
    self.nest_type = null;

    self.create = function(child) {
        while (self.children[self.n] !== undefined) {
            self.n++;
        }
        self.set_child(self.n, child || EmptyNest());
        self.latest = self.n;
        return self.n;
    }

    self.get_child = function(id, create) {
        if (id == 0) {
            var child = self.get_latest();
            if (child == null) {
                id = self.create();
            }
            else {
                return child;
            }
        }
        else if (create && (self.children[id] == null)) {
            self.set_child(id, EmptyNest());
            self.latest = id;
        }
        return self.children[id];
    }

    self.find = function(nest, create) {
        try {
            return self._find(nest, create);
        }
        catch(err) {
            if (err == 'no_nest') {
                // Errors from ._find would be incomplete.
                throw "The nest [" + nest + "] does not exist.";
            }
            else {
                throw err;
            }
        }
    }

    self._find = function(nest, create) {
        if (!nest.length) {
            return self;
        }
        var first = nest[0];
        var child = self.get_child(first, create);
        if (child == null) {
            throw 'no_nest';
        }
        return child._find(nest.slice(1), create);
    }

    self.get_latest = function () {
        if (self.latest == null) {
            return null;
        }
        else {
            return self.children[self.latest];
        }
    }

    self.actions = {
        '+': function (command) {
            var child = Terminus.construct_nest.call(self, command);
            var id = self.create(child);
            self.latest = id;
        }
    }

    self.process = function(command) {
        self.actions[command.action](command);
    }

    self.push_command = function(command, second_pass) {
        // self.terminal.log('test', 'ok...');
        var latest = self.get_latest();
        if (latest !== null
            && latest.nest_type == command.nest_type
            && command.action != '+') {
            latest.process(command);
        }
        else if (self.nest_type == command.nest_type
                 || command.action == '+') {
            try {
                self.process(command);
            }
            catch(e) {
                err = ('unknown action for nest type '
                       + command.nest_type + ': '
                       + command.action);
                throw err;
            }
            return;
        }
        else if (!second_pass) {
            self.process({action: '+',
                          nest_type: command.nest_type,
                          text: ""});
            self.push_command(command, true);
            // var child = Terminus.construct_nest.call(self, command);
            // var id = self.create(child);
            // self.latest = id;
        }
    }

    return self;
}

function DivNest(div) {
    var self = Nest(div);
    self.nest_type = 'h';

    self.set_child = function(id, child) {
        var existing = self.children[id]
        if (existing !== undefined) {
            self.element.replaceChild(child.element,
                                      existing.element);
            existing.set = undefined;
            existing.remove = undefined;
            existing.demote = undefined;
        }
        else {
            self.element.appendChild(child.element);
        }
        self.children[id] = child;
        child.set = function (new_child) {
            self.set_child(id, new_child);
        }
        child.remove = function () {
            self.remove_child(id);
        }
        child.demote = function () {
            delete self.children[id];
        }
        return id;
    }

    self.remove_child = function(id) {
        var existing = self.children[id];
        self.element.removeChild(existing.element);
        delete self.children[id];
    }

    self.append = function(sub_element) {
        if (typeof sub_element == "string") {
            var div = $(makediv()).html(Terminus.sanitize(sub_element));
            $(self.element).append(div);
        }
        else {
            $(self.element).append(sub_element);
        }
    }

    $.extend(self.actions, {
        // '+': function (command) {
        //     var child = Terminus.construct_nest(command);
        //     var id = self.create(child);
        //     self.latest = id;
        // },
        ':': function (command) {
            $(self.element).append(command.text);
        },
        '/': function (command) {
            var txt = command.text;
            var pos = txt.indexOf(" ");
            var setting = txt.substring(0, pos);
            if (setting == "style") {
                var data = txt.substring(pos + 1);
                var style = makenode('style');
                // The style will only apply under self div.
                style.innerHTML = "#" + self.nestid + " " + data;
                // It is not standards compliant to put <style>
                // tags outside <head>, but it is practical to do
                // so since the style will be removed if the nest
                // is deleted.
                $(self.element).append(style);
            }
        },
        '~': function (command) {
            // TODO: verify that this always works
            setTimeout(function () {
                var txt = command.text;
                var pos = txt.indexOf(" ");
                var id = txt.substring(0, pos);
                var query = "#" + self.nestid + " " + id;
                var to_replace = document.querySelector(query);
                new_child = makenode('span');
                new_child.innerHTML = command.text.substring(pos + 1);
                to_replace.parentNode.replaceChild(
                    new_child,
                    to_replace);
            }, 0);
        }
    })

    return self;
}

function EmptyNest() {
    var div = makediv();
    return DivNest(div);
}


function Screen(term, settings) {
    var self = obj();

    self.no_text_properties = function() {
        return new Array();
    };

    self.total_height = function() {
        // Height of the screen counting HTML elements that might be
        // on one logical line, but are effectively taller than that.
        var total = 0;
        for (var i = 0; i < self.nlines; i++) {
            total += self.heights[i];
        }
        return total;
    }

    self.bottom_virgins = function() {
        // Number of lines at the bottom of the screen that have not
        // been modified yet (are completely blank).
        var total = 0;
        for (var i = self.nlines - 1; i >= 0; i--) {
            if (!self.dirty[i])
                total++;
            else
                break;
        }
        return total;
    }

    self.log_action = function() {
        var a = Array.prototype.slice.call(arguments);
        self.action_log.push(a)
    }

    self.resize = function(nlines, ncols) {
        if (ncols > self.ncols) {
            // Wider screen
            var old_ncol = self.ncols;
            self.ncols = ncols;
            for (var i = 0; i < self.nlines; i++){
                // This adds blanks to row i starting at position
                // old_ncol and marks as modified.
                self.clear_line(i, old_ncol, true);
            }
        }
        else if (ncols < self.ncols) {
            // Thinner screen
            self.ncols = ncols;
            for (var i = 0; i < self.nlines; i++){
                // Discard the extra characters
                self.matrix[i].splice(self.ncols);
                self.modified[i] = true;
                // self.log_action('mod', i);
            }
            if (self.column >= ncols) {
                // Push back the cursor right past the end of the
                // line.
                self.column = ncols;
            }
        }

        if (nlines > self.nlines) {
            // Taller screen
            self.log_action('ins', self.nlines, nlines - self.nlines)
            for (var i = self.nlines; i < nlines; i++){
                // clear_line will populate the line with blanks and
                // will set the appropriate flags, so we just need to
                // initialize self.matrix[i] with an empty list.
                self.matrix[i] = [];
                self.clear_line(i);
            }
        }
        else if (nlines < self.nlines) {
            // Shorter screen
            for (var i = nlines; i <= self.line; i++) {
                // If the cursor is below the new height of the
                // screen, we scroll up until it is the last line.
                self.scroll()
            }
            for (var i = self.nlines; i > nlines; i--) {
                // Delete all lines below the threshold
                delete self.matrix[i];
                delete self.lines[i];
                delete self.dirty[i];
                delete self.modified[i];
                delete self.ext[i];
                if (self.nests[i] !== null && self.nests[i] !== undefined) {
                    self.lost_nests.push(self.nests[i]);
                }
                delete self.nests[i];
            }
            self.log_action('rm', nlines, self.nlines - nlines)
            if (self.line >= nlines) {
                // If the cursor is below the screen, we bump it up
                // (scroll() did not change it)
                self.line = nlines - 1;
            }
        }
        self.nlines = nlines;

        // Reset the scroll boundaries.
        self.scroll0 = 0;
        self.scroll1 = self.nlines;
    }

    // CURSOR

    self.save_cursor = function() {
        self.stored_line = self.line;
        self.stored_column = self.column;
    }

    self.restore_cursor = function() {
        self.line = self.stored_line;
        self.column = self.stored_column;
    }

    self.show_cursor = function() {
        self.cursor_visible = true;
    }

    self.hide_cursor = function() {
        self.cursor_visible = false;
    }

    self.cursor_here = function() {
        self.push_prop(self.line, self.column, 200);
        self.modified[self.line] = true;
        // self.log_action('mod', self.line)
    }

    self.no_cursor_here = function() {
        self.push_prop(self.line, self.column, 201);
        self.modified[self.line] = true;
        // self.log_action('mod', self.line)
    }

    self.move_to = function(line, column) {
        if (line < 0) { line = 0; }
        if (line >= self.nlines) { line = self.nlines - 1; }
        if (column < 0) { column = 0; }
        // We allow overshoot by one column (can't write there though)
        if (column > self.ncols) { column = self.ncols; }
        self.no_cursor_here();
        self.line = line;
        self.column = column;
        self.cursor_here();
    }

    self.move_rel = function(dline, dcolumn) {
        self.move_to(self.line + dline,
                     self.column + dcolumn);
    }

    self.advance = function() {
        var column = self.column + 1;
        self.move_to(self.line, column);
    }

    // STYLE

    self.push_prop = function(i, j, n) {
        // Push a text property (value n) on the character at coordinates
        // {line: i, column: j}
        if (j < self.ncols) { // note: j can be equal to self.ncols
            var data = self.matrix[i][j];
            data[1].push(n);
            data[2] = undefined;
            data[3] = undefined;
        }
    }

    self.compute_style = function(properties) {
        var style = settings.base_style;
        var bold = false;
        var color = settings.default_fg;
        var bgcolor = settings.default_bg;
        var reverse = false;
        var cursor = false;
        var blink = false;
        for (var i = 0; i < properties.length; i++) {
            var n = properties[i];
            if (n == 1) bold = true;
            else if (n == 5) blink = true;
            else if (n == 7) reverse = true;
            else if (n == 22) bold = false;
            else if (n == 25) blink = false;
            else if (n == 27) reverse = false;
            else if (n == 200) cursor = self.cursor_visible;
            else if (n == 201) cursor = false;
            else if (n >= 30 && n <= 37) color = (n - 30);
            else if (n == 39) color = 7;
            else if (n >= 40 && n <= 47) bgcolor = (n - 40);
            else if (n == 49) bgcolor = 0;
            else {
                var s = settings.styles[n];
                if (s !== undefined) {
                    style += s;
                }
            }
        }
        if (bold) {
            color += 10;
            style += settings.bold_style;
        }
        else {
            style += settings.normal_style;
        }
        if (reverse || blink) {
            style += "background-color:" + settings.colors[color] + ";";
            if (bgcolor != -1) {
                style += "color:" + settings.colors[bgcolor] + ";";
            }
            else {
                style += "color:" + settings.colors[0] + ";";
            }
        }
        else {
            if (bgcolor != -1) {
                style += "background-color:" + settings.colors[bgcolor] + ";";
            }
            style += "color:" + settings.colors[color] + ";";
        }
        style += "opacity:" + settings.opacity;
        var cls;
        if (cursor)
            cls = "cursor";
        return [style, cls];
    }

    self.extract_character = function(i, j) {
        var data = self.matrix[i][j];
        var character = data[0];
        var properties = data[1];
        var style = data[2];
        var cls = data[3];
        if (style === undefined || cls === undefined) {
            var things = self.compute_style(properties);
            style = things[0];
            cls = things[1];
            data[2] = style;
            data[3] = cls;
        }
        return [character, properties, style, cls];
    };

    // WRITE

    self.touch_line = function(line, column, keep_ext) {
        self.modified[line] = true;
        if (!keep_ext) {
            self.ext[line] = false;
            if (self.nests[line] !== null) {
                if (self.nests[line] !== undefined)
                    self.lost_nests.push(self.nests[line]);
                self.nests[line] = null;
            }
        }
        self.dirty[line] = Math.max(self.dirty[line], column + 1);
        self.heights[line] = 1;
        // self.log_action('mod', line);
    }

    self.write_at = function(line, column, things) {
        self.matrix[line][column] = things;
        self.touch_line(line, column);
    }

    self.write_at_cursor = function(things) {
        if (self.column == self.ncols) {
            self.next_line();
        }
        self.write_at(self.line, self.column, things);
    }

    self.wait_for_height = function(node, node2, timeout, increment, ntries) {
        setTimeout(function () {
            var nh = $(node).height();
            if (nh == 0 && ntries) {
                console.log(ntries);
                self.wait_for_height(node, node2, timeout + increment, increment, ntries - 1);
            }
            var h = Math.ceil(nh / self.terminal.char_height);
            // self.terminal.log('test', h + " " + node.height + " " + node.innerHeight);
            for (var line = self.nlines; line >= 0; line--) {
                if (self.lines[line] === node2) {
                    // Search for the line the node was put on. This
                    // might not be the original line if we scrolled
                    // down.
                    self.heights[line] = h;
                    self.modified[line] = true;
                    self.lines[line] = node;
                    $(node).show();
                    self.terminal.display();
                    return;
                }
            }
            // We only get here if the original node scrolled past the
            // screen before we could display it. If so, we don't need
            // to play with the heights[] array.
            $(node2).empty();
            $(node2).append(node);
            $(node).show();
            self.terminal.display();
        }, timeout);
    }

    self.write_html_line = function(node, nest) {
        if (self.column == self.ncols) {
            self.next_line();
        }
        var line = self.line;
        self.clear_line(line);
        self.lines[line] = node;
        self.modified[line] = true;
        self.ext[line] = true;
        self.nests[line] = nest;
        self.dirty[line] = 1;
        var h = $(node).height();
        if (h != 0) {
            self.heights[line] = Math.ceil(h / self.terminal.char_height);
        }
        else {
            var node2 = makediv();
            self.heights[line] = 1;
            self.lines[line] = node2;
            $(self.lines[line]).html('<span style="color: #808080;">...</span>').append(node);
            $(node).hide();
            self.wait_for_height(node, node2, 1, 10, 10);
        }
        // self.log_action('mod', line)
    }

    self.next_line = function() {
        var next = (self.line + 1) % self.nlines;
        if (next == 0) {
            self.no_cursor_here();
            self.scroll();
            self.move_to(self.line, 0);
        }
        else {
            self.move_to(next, 0);
        }
    }

    self.get_line = function(i) {
        if (self.modified[i] && !self.ext[i])
            self.make_line(i);
        return self.lines[i];
    }

    self.send_line_to_scroll = function(i) {
        var line = self.get_line(i);
        self.log_action('scroll', self.modified[i], self.nests[i], line);
    }

    // KILL

    self.kill_line_segment = function (line, column0, column1) {
        if (column1 > self.ncols) {
            column1 = self.ncols;
        }
        for (var i = column0; i < column1; i++) {
            self.matrix[line][i] = [self.default_character,
                                    self.no_text_properties()];
        }
        self.touch_line(line, self.ncols);
        if (column1 == self.ncols) {
            self.dirty[line] = column0;
        }
        self.cursor_here();
    }

    self.kill_line = function (n) {
        if (n == 0)
            self.kill_line_segment(self.line, self.column, self.ncols);
        else if (n == 1)
            self.kill_line_segment(self.line, 0, self.column + 1);
        else if (n == 2)
            self.kill_line_segment(self.line, 0, self.ncols);
    }

    self.kill_lines = function (line0, line1) {
        for (var i = line0; i < line1; i++) {
            self.kill_line_segment(i, 0, self.ncols);
        }
    }

    self.kill_screen = function (n) {
        if (n == 0) {
            self.kill_lines((self.line + 1) % self.nlines,
                            self.reln(self.nlines));
            self.kill_line(0);
        }
        else if (n == 1){
            self.kill_lines(0, self.line);
            self.kill_line(1);
        }
        else if (n == 2)
            self.scroll_page();
    }

    // SCROLLING

    self.clear_line = function(i, start_col, keep_ext) {
        if (!start_col)
            start_col = 0;
        for (var j = start_col; j < self.ncols; j++) {
            self.matrix[i][j] = [self.default_character,
                                 self.no_text_properties()];
        }
        self.touch_line(i, self.ncols, keep_ext);
        self.dirty[i] = start_col;
    }

    self.insert_blanks = function(line, start, n) {
        var end = self.ncols - n;
        var arr = self.matrix[line];
        var rval = arr.slice(0, start);
        rval = rval.concat(arr.slice(end, self.ncols));
        rval = rval.concat(arr.slice(start, end));
        for (var i = start; i < start + n; i++) {
            rval[i] = [self.default_character,
                       self.no_text_properties()];
        }
        self.matrix[line] = rval;
        self.touch_line(line, self.dirty[line] + n);
        if (end <= start) {
            self.dirty[line] = start;
        }
    }

    self.delete_characters = function(line, start, n) {
        var end = start + n;
        var arr = self.matrix[line];
        var rval = arr.slice(0, start);
        rval = rval.concat(arr.slice(end, self.ncols));
        rval = rval.concat(arr.slice(start, end));
        for (var i = self.ncols - n; i < self.ncols; i++) {
            rval[i] = [self.default_character,
                       self.no_text_properties()];
        }
        self.matrix[line] = rval;
        self.touch_line(line, self.ncols);
        self.dirty[line] = Math.max(0, self.dirty[line] - n);
    }

    self.push_to_end = function(arr, start, end) {
        var rval = arr.slice(0, start);
        rval = rval.concat(arr.slice(end, self.scroll1));
        rval = rval.concat(arr.slice(start, end));
        rval = rval.concat(arr.slice(self.scroll1, self.nlines));
        return rval;
    }

    self.all_modified = function(start, end) {
        for (var i = start; i < end; i++) {
            self.modified[i] = true;
        }
    }

    self.insert_lines = function(line, n) {
        var start = line;
        var end = self.scroll1 - n;
        if (end < start)
            end = start;

        var fields = 'matrix lines ext nests dirty heights modified'.split(' ')
        for (var i in fields) {
            var field = fields[i];
            self[field] = self.push_to_end(self[field], start, end);
        }
        self.all_modified(self.scroll1, self.nlines);

        self.log_action('ins', line, n)
        self.log_action('rm', self.nlines, n)
        
        var clearto = start + n;
        if (clearto > self.scroll1)
            clearto = self.scroll1;
        for (var i = line; i < clearto; i++) {
            self.clear_line(i);
        }
    }

    self.delete_lines = function(line, n) {
        var start = line;
        var end = line + n;
        if (end > self.scroll1)
            end = self.scroll1;

        var fields = 'matrix lines ext nests dirty heights modified'.split(' ')
        for (var i in fields) {
            var field = fields[i];
            self[field] = self.push_to_end(self[field], start, end);
        }
        self.all_modified(self.scroll1, self.nlines);

        self.log_action('ins', self.nlines, n)
        self.log_action('rm', line, n)
        
        var clearfrom = self.scroll1 - n;
        if (clearfrom < line)
            clearfrom = line;
        for (var i = clearfrom; i < self.scroll1; i++) {
            self.clear_line(i);
        }
    }

    self.scroll = function() {
        self.send_line_to_scroll(0);
        self.delete_lines(0, 1);
    }

    self.scroll_page = function() {
        self.no_cursor_here();
        for (var i = 0; i < self.nlines; i++) {
            self.scroll();
        }
        self.cursor_here();
    }


    self.make_line = function(i) {
        var s = "";
        var current_style = "";
        var current_cls = "";
        var ubound;
        if (i == self.line) {
            ubound = Math.max(self.dirty[i], 
                              self.column + 1);
        }
        else {
            ubound = self.dirty[i];
        }
        if (!ubound) { ubound = 1; }
        if (ubound > self.ncols) { ubound = self.ncols; }
        for (var j = 0; j < ubound; j++) {
            var data = self.extract_character(i, j);
            var c = data[0];
            var style = data[2];
            var cls = data[3];
            if (style != current_style || cls != current_cls) {
                if (cls)
                    s += '</span><span class="' + cls + '" style="' + style + '">';
                else
                    s += '</span><span style="' + style + '">';
                current_style = style;
                current_cls = cls;
            }
            s += c;
        }
        var span = makenode('span');
        span.innerHTML = s;

        var save = "";
        var text = "";

        $(span).bind('paste', function (e) {
            save = $(this).html();
            text = $(this).text();
            self.terminal.focus();
            setTimeout(function () {
                var new_text = $(span).text();
                var txt = Terminus.strdiff(text, new_text);
                self.terminal.to_send += txt.replace(/\xa0/g, ' ');
                self.terminal.send();
                $(span).html(save);
                save = "";
                text = "";
            }, 0);
        });

        self.lines[i] = span;
    };


    self.init = function (term) {
        // INITIALIZE
        self.action_log = [];
        self.terminal = term;

        var nlines = term.nlines;
        var ncols = term.ncols;

        self.matrix = [];
        self.lines = [];
        self.modified = [];
        self.ext = []
        self.nests = [];
        self.dirty = [];
        self.heights = [];

        self.lost_nests = [];

        self.text_properties = self.no_text_properties();
        self.default_character = "&nbsp;";
        // The following is useful for debug:
        // self.default_character = ".";

        self.nlines = 0;
        self.ncols = 0;
        self.resize(nlines, ncols);

        self.line = 0;
        self.column = 0;
        self.cursor_blink = false;
        self.save_cursor(); // init save to (0, 0)
        self.show_cursor();
    }

    self.init(term);
    return self;
}


function ScreenDisplay(terminal, screen, settings) {

    var self = obj();

    self.display = function() {
        var scr = self.screen;

        var changes = false;

        var n_displayed;
        if (settings.cut_bottom) {
            n_displayed = (scr.nlines - scr.bottom_virgins());
        }
        else {
            n_displayed = (scr.nlines
                           - Math.max(0, 
                                      Math.min(scr.total_height() - scr.nlines,
                                               scr.bottom_virgins())));
        }

        var lost = scr.lost_nests;
        scr.lost_nests = [];

        var al = scr.action_log;
        scr.action_log = [];

        var actions = {
            scroll: function (modified, nest, value) {
                var child = self.box.childNodes[self.nscroll];
                self.nests[self.nscroll] = nest;
                var idx = lost.indexOf(nest);
                if (idx != -1) {
                    lost.splice(idx, 1);
                }
                if (self.nscroll >= settings.scrollback) {
                    self.box.removeChild(self.box.firstChild);
                    var nest = self.nests.shift();
                    if (nest !== null)
                        lost.push(nest);
                }
                else {
                    self.nscroll = self.nscroll + 1;
                }
                if (modified) {
                    $(child).empty();
                    child.appendChild(value);
                }
                var div = makediv();
                $(div).text('-- SHOULD NOT BE HERE (from scroll) --');
                self.nests.splice(self.nscroll, 0, null);
                self.box.insertBefore(div, child.nextSibling);
            },
            ins: function (line, n) {
                var idx = self.nscroll + line;
                var elem = self.box.childNodes[idx];
                for (var j = 0; j < n; j++) {
                    var div = makediv();
                    $(div).text('-- SHOULD NOT BE HERE (from insert) --')
                    if (elem === undefined) {
                        self.box.appendChild(div);
                        self.nests.push(null)
                    }
                    else {
                        self.box.insertBefore(div, elem);
                        self.nests.splice(idx, 0, null);
                    }
                }
            },
            rm: function (line, n) {
                for (var j = 0; j < n; j++) {
                    var idx = self.nscroll + line;
                    var child = self.box.childNodes[idx];
                    self.box.removeChild(child);
                    self.nests.splice(idx, 1);
                }
            },
        }

        for (var i = 0; i < al.length; i++) {
            var entry = al[i];
            actions[entry[0]].apply(self, entry.slice(1));
        }

        for (var i = 0; i < n_displayed; i++) {
            if (scr.modified[i]) {
                var idx = self.nscroll + i;
                var line = scr.get_line(i);
                var cont = self.box.childNodes[idx]
                $(cont).show();
                if (cont.hasChildNodes()) {
                    cont.replaceChild(line, cont.childNodes[0]);
                }
                else {
                    cont.appendChild(line);
                }
                scr.modified[i] = false;
                self.nests[idx] = scr.nests[i];
                changes = true;
            }
        }

        for (var i = n_displayed; i < scr.nlines; i++) {
            var cont = self.box.childNodes[self.nscroll + i];
            $(cont).hide();
        }

        self.lost_nests = self.lost_nests.concat(lost);

        if (!changes) {
            return false;
        }

        return true;
    }

    self.clear_scrollback = function() {
        for (var i = 0; i < self.nscroll; i++) {
            self.box.removeChild(self.box.firstChild);
            var nest = self.nests.shift();
            if (nest !== null) {
                self.lost_nests.push(nest);
            }
        }
        self.nscroll = 0;
    }

    self.init = function (terminal, screen, settings) {

        self.terminal = terminal;
        self.screen = screen;
        self.settings = settings;

        self.box = makediv();

        // SCROLLBACK

        if (!settings.scrollback) { settings.scrollback = 0; }
        self.nscroll = 0;

        self.nests = [];
        self.lost_nests = [];

    }

    self.init(terminal, screen, settings);
    return self;
}



function Terminus(div, settings) {
    var self = Nest(div);

    // SIZE

    self.adjust_size = function () {

        self.char_width = Math.max(self.font_control.width(), 1);
        self.char_height = Math.max(self.font_control.height(), 1);

        var h = self.terminal.height() - (self.top.height() + self.bottom.height());
        var w = self.terminal.width() - (self.left.width() + self.right.width());

        self.left_outer.height(h);
        self.right_outer.height(h);

        self.center_outer.height(h);
        self.center_outer.width(w);
        if (settings.scrolling.jscrollpane) {
            self.center_outer.data('jsp').reinitialise();
        }

        var nlines = settings.nlines || (Math.floor(h / self.char_height) - settings.nlines_sub);
        var ncols = settings.ncols || (Math.floor(w / self.char_width) - settings.ncols_sub);

        if (settings.nlines_min) { nlines = Math.max(nlines, settings.nlines_min); }
        if (settings.ncols_min) { ncols = Math.max(ncols, settings.ncols_min); }

        if (settings.nlines_max) { nlines = Math.min(nlines, settings.nlines_max); }
        if (settings.ncols_max) { ncols = Math.min(ncols, settings.ncols_max); }

        // Pad the bottom so that the first line is flush with the top of
        // the screen when we're scrolled down completely.
        var diff = (self.center_outer.height()
                    - (self.nlines * self.char_height));
        if (self.screens) {
            for (var i = 0; i < self.screens.length; i++) {
                $(self.screends[i].box).css('margin-bottom', (diff + settings.fiddle) + 'px');
            }
        }

        if (nlines == self.nlines && ncols == self.ncols) {
            return;
        }
        self.nlines = nlines;
        self.ncols = ncols;
        self.log('resize', self.ncols + "x" + self.nlines);

        if (self.screens) {
            for (var i = 0; i < self.screens.length; i++) {
                self.screens[i].resize(self.nlines, self.ncols);
            }
        }

        $.post(settings.path+'/setsize', {h: self.nlines, w: self.ncols, magic: settings.magic});
    }


    self.add_thing = function(thing) {
        self.center.append(thing);
    }
    self.scroll_to_bottom = function() {
        if (settings.scrolling.jscrollpane) {
            // self.center_outer.data('jsp').reinitialise();
            var api = self.center_outer.data('jsp');
            api.scrollToPercentY(1);
        }
        else {
            var x = self.center[0];
            x.scrollTop = x.scrollHeight;
        }
    }
    self.scroll_by = function(dy) {
        if (settings.scrolling.jscrollpane) {
            self.center_outer.data('jsp').scrollByY(dy);
        }
        else {
            var x = self.center[0];
            x.scrollTop += dy;
        }
    }


    self.log = function(event, data) {
        self.logger.log(event, data);
    }


    // CHILDREN

    self.get_latest = function () {
        var nests = self.screen.nests;
        // We are in the context of the cursor.
        var thenest = nests[self.screen.line];
        if (thenest === null) {
            return null;
        }
        else {
            return self.children[thenest];
        }
    }

    self.set_child = function(id, child) {
        var existing = self.children[id];
        var wrap;
        if (existing !== undefined) {
            wrap = self.children_wrappers[id];
            wrap.replaceChild(child.element,
                              existing.element);
            existing.set = undefined;
            existing.demote = undefined;
            existing.remove = undefined;
        }
        else if (self.children_wrappers[id]) {
            wrap = self.children_wrappers[id];
            $(wrap).empty();
            $(wrap).append(child.element);
        }
        else {
            self.log('nest', 'creating nest #' + id);
            wrap = makediv();
            $(wrap).append(child.element);
            self.screen.write_html_line(wrap, id);
            self.screen.move_to(self.screen.line, self.ncols);
        }
        self.children_wrappers[id] = wrap;
        self.children[id] = child;
        child.set = function (new_child) {
            self.set_child(id, new_child);
        }
        child.remove = function () {
            self.remove_child(id);
        }
        child.demote = function () {
            delete self.children[id];
        }
        if (id == 1 || id == 2 || id == 4 || id == 5) {
            setTimeout(self.adjust_size, 10);
        }
        return id;
    }

    self.remove_child = function(id) {
        self.log('nest', 'removing nest #' + id);
        delete self.children[id];
        if (!self.child_protected[id]) {
            delete self.children_wrappers[id];
        }
        else {
            $(self.children_wrappers[id]).empty();
        }
    }

    self.append = function(sub_element) {
        if (typeof sub_element == "string") {
            self.to_write += sub_element;
        }
        else {
            self.screen.write_html_line(sub_element, null);
            self.screen.move_to(self.screen.line, self.ncols);
        }
    }

    self.create_div_for_html = function(html, parameters) {
        var div = makediv();
        if (parameters.height) {
            $(div).height(parameters.height * self.char_height);
        }
        if (parameters.width) {
            $(div).width(parameters.width * self.char_width);
        }
        div.innerHTML = html;
        return div;
    }

    self.handlers = {

        // push_stream: function (data, parameters) {
        //     var nest = parameters.nest;
        //     var latest = self

        //     var target = self.find(nest.slice(0, nest.length), true);
        //     var command = Terminus.parse_command(data);
        //     self.log('test', command.action);
        //     self.log('test', command.nest_type);
        //     self.log('test', command.text);
        //     try {
        //         target.push_command(command);
        //     }
        //     catch(e) {
        //         self.log('error', e);
        //     }
        // },

        push: function (data, parameters) {
            // try {
                // self.log('test', self.screen.line + " " + self.screen.nests + " " + self.screen.nests[self.screen.line]);
                var nest = parameters.nest;
                var target = self.find(nest, true);
                var command = Terminus.parse_command(data);
                // self.log('test', data + "/");
                // self.log('test', command.action + "/");
                // self.log('test', command.nest_type + "/");
                // self.log('test', command.text + "/");
                target.push_command(command);
            // }
            // catch(e) {
            //     self.log('error', e);
            //     throw e;
            // }
        },

        text_set: function (data, parameters) {
            if (!parameters.nest.length) {
                return;
            }
            data = Terminus.sanitize(data);
            var div = $(makediv()).html("<span>"+data+"</span>")[0];
            var nest = parameters.nest;
            var target = self.find(nest.slice(0, nest.length - 1), true);
            var id = target.set_child(nest[nest.length-1], DivNest(div));
            var wrap = self.children_wrappers[id];
            if(parameters.height)
                $(wrap.element).height($(div).height());
            if(parameters.width)
                $(wrap.element).width($(div).width());
        },

        html_set: function (data, parameters) {
            if (!parameters.nest.length) {
                return;
            }
            var div = self.create_div_for_html(data, parameters);
            var nest = parameters.nest;
            var target = self.find(nest.slice(0, nest.length - 1), true);
            var id = target.set_child(nest[nest.length-1], DivNest(div));
            var wrap = self.children_wrappers[id];
            if(parameters.height)
                $(wrap.element).height($(div).height());
            if(parameters.width)
                $(wrap.element).width($(div).width());
        },

        html_append: function (data, parameters) {
            var div = self.create_div_for_html(data, parameters);
            var nest = parameters.nest;
            var target = self.find(nest, true);
            target.append(div);
        },

        text_append: function (data, parameters) {
            var nest = parameters.nest;
            var target = self.find(nest, true);
            target.append(data);
        },

        js: function (data, parameters) {
            try {
                var target = self.find(parameters.nest, true);
                var f = function() {
                    eval(data);
                }
                f.call(target);
            }
            catch(whatever) {
                // self.write_all("JS ERROR -> " + whatever);
                self.to_write += "JS ERROR -> " + whatever;
            }
        },

        create: function (data, parameters) {
            var target = self.find(parameters.nest, true);
            var id = target.create();
            var new_nest = parameters.nest.slice(0);
            new_nest.push(id);
            self.to_send += ('\x1B[?200;' + new_nest.join(';') + 'z');
        },

        demote: function (data, parameters) {
            var target = self.find(parameters.nest, true);
            target.demote();
        },

        remove: function (data, parameters) {
            var target = self.find(parameters.nest, true);
            target.remove();
        },

        move: function (data, parameters) {
            var source = self.find(parameters.source, true);
            var dest = self.find(parameters.dest, true);
            source.remove();
            dest.set(source);
        },

        OSC: function (data, parameters) {
            self.log('esc_unknown', 'OSC -> ' + data);
        },
    }

    self.handle_ext = function(ext) {
        // self.log('test', ext.type + ext.accum + ext.args);
        return self.handlers[ext.type](ext.accum, ext.args);
    }


    // DISPLAY

    self.display = function() {
        if (self.screend.display()) {
            self.scroll_to_bottom();
        }
        var lost = self.screend.lost_nests;
        self.screend.lost_nests = [];
        for (var i = 0; i < lost.length; i++) {
            self.remove_child(lost[i]);
        }
    }

    self.use_screen = function(n) {
        if (self.screend) {
            $(self.screend.box).hide();
        }
        self.screen = self.screens[n];
        var new_screend = self.screends[n];
        self.screend = new_screend;
        $(self.screend.box).show();
        self.display();
    }

    // WRITING

    self.write_all = function() {
        while (self.to_write) {
            var tow = self.to_write;
            self.to_write = "";
            self.write_string(tow);
        }
        self.display();
    }

    self.write_string = function(data) {
        for (var i in data) {
            var s = data[i];
            var c = s.charCodeAt();
            // self.log(s);
            self.write(c);
        }
    }

    self.write = function(c) {
        var s = self.sm.run(c);
        if (s != '') {
            self.screen.write_at_cursor([s, self.screen.text_properties.slice(0)]);
            self.screen.advance();
        }
    }

    self.get_data = function () {
        // setTimeout avoids the annoying "waiting..." message
        // browsers display while the request hangs.
        setTimeout(function () {
            $.post(settings.path + "/get", {magic: settings.magic},
                   function(data) {
                       if (data != "") {
                           self.to_write += data;
                           self.write_all();
                       }
                       self.get_data();
                   })
                .error(function () {
                    self.to_write += '\n\x1B[1;31mConnection to server terminated';
                    self.to_write += ' because this session was opened elsewhere.';
                    self.to_write += '\nRefresh to reclaim session.\x1B[0m';
                    self.write_all();
                })
        }, 0)
    }

    self.focus = function() {
        self.textarea.focus();
    }

    self.init = function (div, settings) {

        // LOG

        self.logger = Logger(settings.log);

        // HANDY POINTERS

        self.terminal = div;
        self.terminal.attr('contenteditable', true);
        self.terminal.attr('spellcheck', false);

        self.d_terminal = div[0];
        self.settings = settings;

        self.csi = Terminus.csi;
        
        // FONT CONTROL

        var font_control_div = $(makediv());
        font_control_div.attr('class', 'font_control_div');
        var font_control = $(makenode('span'));
        font_control.attr('class', 'font_control');
        font_control.append('X');
        font_control_div.append(font_control);
        self.terminal.append(font_control_div);
        self.font_control = font_control;

        self.init1(div, settings);
    }


    self.init1 = function (div, settings) {

        // CHILDREN

        self.n = 10;
        self.children_wrappers = {};
        self.child_protected = {};

        // STRUCTURE
        function make_positional_nojscroll(parent, name, index) {
            var div = makediv();
            var jdiv = $(div);
            jdiv.attr('id', name);
            jdiv.attr('class', name);

            parent.append(div);
            self[name] = jdiv;
            self[name + "_outer"] = jdiv;

            if (index) {
                self.children_wrappers[index] = div;
                self.child_protected[index] = true;
                // var nest = EmptyNest();
                // jdiv.append(nest.element);
                // self.children[index] = nest;
            }
        }

        function make_positional(parent, name, index) {

            var div = makediv();
            var jdiv = $(div);
            jdiv.attr('id', name);
            jdiv.attr('class', name);

            jdiv.jScrollPane({
                stickToBottom: true,
                enableKeyboardNavigation: false,
                isScrollableH: settings.scrolling.scrollh,
                isScrollableV: settings.scrolling.scrollv
            });
            
            var api = jdiv.data('jsp');
            var pane = api.getContentPane();

            var inndiv = pane;
            parent.append(jdiv);
            self[name] = inndiv;
            self[name+'_outer'] = jdiv;

            if (index) {
                self.children_wrappers[index] = inndiv[0];
                self.child_protected[index] = true;
                // var nest = EmptyNest();
                // inndiv.append(nest.element);
                // self.children[index] = nest;
            }
        }

        make_positional_nojscroll(self.terminal, 'top', 1);
        make_positional_nojscroll(self.terminal, 'middle');
        make_positional_nojscroll(self.middle, 'left', 2);
        if (settings.scrolling.jscrollpane) {
            make_positional(self.middle, 'center');
        }
        else {
            make_positional_nojscroll(self.middle, 'center');
        }
        make_positional_nojscroll(self.middle, 'right', 4);
        make_positional_nojscroll(self.terminal, 'bottom', 5);

        // SIZE

        self.adjust_size();

        // SCREENS

        self.screens = [];
        self.screends = [];
        for (var i = 0; i < settings.screens.length; i++) {
            var sgr = $.extend(true, {}, self.settings.sgr, settings.screens[i].sgr || {});
            var screen = Screen(self, sgr);
            self.screens.push(screen);
            var screend = ScreenDisplay(self, screen, settings.screens[i]);
            self.screends.push(screend);
            self.center.append(screend.box);
            $(screend.box).hide();
        }
        self.use_screen(0);

        // Major hack to allow pasting: we'll constantly put focus on an
        // invisible text area, then when the user pastes, we'll clear the
        // text area, check what appears in it, and we'll send the
        // contents over to the pty. I don't yet know how to make middle
        // click paste work, unfortunately, so we'll make do with Ctrl+V.
        var textarea = $(makenode('textarea'));
        textarea.attr('class', 'pastegrab');
        self.textarea = textarea;
        self.textarea.css('height', 0).css('width', 0);
        // self.textarea.css('height', 30).css('width', 100);
        self.add_thing(textarea);

        // ESCAPE

        self.escape = false;
        self.ext = false;

        // STATE

        self.sm = Terminus.state_machine(Terminus.input_state_machine, 'init', self);

        // WORKERS

        setInterval(function () {
            self.adjust_size();
        }, 500)

        // setInterval(function () {
        //     self.display();
        // }, 100)

        // var df = function () {
        //     self.display();
        //     setTimeout(df, 100);
        // }
        // df();

        setInterval(function () {
            $('.cursor').each (function () {
                var elem = $(this);
                var c = elem.css('color');
                var bgc = elem.css('background-color');
                elem.css('color', bgc);
                elem.css('background-color', c);
            })}, 500)

        self.get_data();

        self.to_write = "";
        self.to_send = "";

        self.send = function () {
            if (self.to_send != "") {
                var to_send = self.to_send;
                self.to_send = "";
                $.post(settings.path+"/send", {data: to_send, magic: settings.magic});
            }
        };

        // setInterval(function () {
        //     if (self.to_send != "") {
        //         var to_send = self.to_send;
        //         self.to_send = "";
        //         $.post(settings.path+"/send", {data: to_send, magic: settings.magic});
        //     }
        // }, 10);


        // BINDINGS

        // self.terminal.bind('input', function(e) {
        //     e.preventDefault();
        //     e.stopPropagation();
        // });

        $(window).bind('resize', function (e) {
            setTimeout(self.adjust_size, 10);
        });

        // $(document).bind('paste', function(e) {
        self.terminal.bind('paste', function(e) {
            var target = self.textarea;
            target.val("");
            // target.html("");
            setTimeout(function() {
                var text = target.val();
                // alert(text);
                self.to_send += text;
                self.textarea.focus();
                self.send();
            }, 0);
        });

        self.keynames = {
            8: "Backspace",
            9: "Tab",
            13: "Enter",
            16: "S-",
            17: "C-",
            18: "A-",
            27: "Esc",
            32: "Space",
            33: "PgUp",
            34: "PgDn",
            35: "End",
            36: "Home",
            37: "Left",
            38: "Up",
            39: "Right",
            40: "Down",
            45: "Insert",
            46: "Delete",
            48: "0",
            49: "1",
            50: "2",
            51: "3",
            52: "4",
            53: "5",
            54: "6",
            55: "7",
            56: "8",
            57: "9",
            65: "a",
            66: "b",
            67: "c",
            68: "d",
            69: "e",
            70: "f",
            71: "g",
            72: "h",
            73: "i",
            74: "j",
            75: "k",
            76: "l",
            77: "m",
            78: "n",
            79: "o",
            80: "p",
            81: "q",
            82: "r",
            83: "s",
            84: "t",
            85: "u",
            86: "v",
            87: "w",
            88: "x",
            89: "y",
            90: "z",
            112: "F1",
            113: "F2",
            114: "F3",
            115: "F4",
            116: "F5",
            117: "F6",
            118: "F7",
            119: "F8",
            120: "F9",
            121: "F10",
            122: "F11",
            123: "F12",
        }

        function word_operation(direction, operation) {
            return function () {

                var mat = self.screen.matrix[self.screen.line];
                var skipover = ("! @ # $ % ^ & * ( ) [ ] { }"
                                + " / ? \\ | &nbsp; &gt; &lt;"
                                + " = + - _ ` ~ ; : \" ' . ,").split(" ")
                if (direction == "left") {
                    var j = self.screen.column - 1;
                    for (; j >= 0; j--) {
                        if (skipover.indexOf(mat[j][0]) == -1) { break; }
                        self.to_send += operation;
                    }
                    for (; j >= 0; j--) {
                        if (skipover.indexOf(mat[j][0]) != -1) { break; }
                        self.to_send += operation;
                    }
                }
                else {
                    var j = self.screen.column;
                    for (; j < self.ncols; j++) {
                        if (skipover.indexOf(mat[j][0]) == -1) { break; }
                        self.to_send += operation;
                    }
                    for (; j < self.ncols; j++) {
                        if (skipover.indexOf(mat[j][0]) != -1) { break; }
                        self.to_send += operation;
                    }
                }
                return true;
            }
        }

        self.commands = {
            backspace: "\x7F",
            enter: "\x0D",
            tab: "\x09",
            esc: "\x1B",
            csi: "\x1B[",
            noop: "",

            up: "\x1B[A",
            down: "\x1B[B",
            right:"\x1B[C",
            left: "\x1B[D",

            home: "\x1B[1~",
            insert: "\x1B[2~",
            "delete": "\x1B[3~",
            end: "\x1B[4~",
            pgup: "\x1B[5~",
            pgdn: "\x1B[6~",

            f1: "\x1B[[A",
            f2: "\x1B[[B",
            f3: "\x1B[[C",
            f4: "\x1B[[D",
            f5: "\x1B[[E",
            f6: "\x1B[17~",
            f7: "\x1B[18~",
            f8: "\x1B[19~",
            f9: "\x1B[20~",
            f10: "\x1B[21~",
            f11: "\x1B[23~",
            f12: "\x1B[24~",

            clear_up: function () {
                self.remove_child(1);
            },

            clear_down: function () {
                self.remove_child(5);
            },

            clear_left: function () {
                self.remove_child(2);
            },

            clear_right: function () {
                self.remove_child(4);
            },

            clear_scrollback: function () {
                self.screend.clear_scrollback();
                self.display();
                return true;
            },

            log_mode: function () {
                self.logger.switch_state();
                return "noscroll";
            },

            clear_log: function () {
                self.logger.clear();
                return "noscroll";
            },
            
            scroll_up_line: function () {
                self.scroll_by(-self.char_height);
                return "noscroll";
            },

            scroll_down_line: function () {
                self.scroll_by(self.char_height);
                return "noscroll";
            },

            scroll_up_page: function () {
                self.scroll_by(-self.char_height * self.nlines);
                return "noscroll";
            },

            scroll_down_page: function () {
                self.scroll_by(self.char_height * self.nlines);
                return "noscroll";
            },

            word_left: "\x1B[1;5D",
            word_right: "\x1B[1;5C",
            word_up: "\x1B[1;5A",
            word_down: "\x1B[1;5B",

            // word_left: word_operation("left", "\x1B[D"),
            // word_right: word_operation("right", "\x1B[C"),

            word_delete_left: word_operation("left", "\x7f"),
            word_delete_right: word_operation("right", "\x1B[3~"),

            space: " ",
            tilde: "~",
        }

        self.focus();

        self.keydown_fn = function(e) {

            var bindings = (self.bindings
                            || settings.bindings);

            // var bindings = settings.bindings;

            var orig_code = (self.keynames[e.which] || "<"+e.which+">");
            var code = orig_code;
            if (e.shiftKey && orig_code != "S-")
                code = "S-" + code;
            if (e.altKey && orig_code != "A-")
                code = "A-" + code;
            if ((e.ctrlKey || e.metaKey) && orig_code != "C-")
                code = "C-" + code;
            var just_modifiers = (code[code.length - 1] == '-');

            // this is needed for paste to work
            if (code == "C-") {
                // We only do this when the Control key is pressed, to
                // avoid scrolling to the bottom in too many
                // situations.
                self.textarea.focus();
            }

            self.log('keydown', code);

            var commands = bindings[code];

            if (commands === undefined) {
                if (self.bindings && self.bindings._eat) {
                    // We delete the sub-bindings, except for when we
                    // hit modifiers without any other key.
                    if (!just_modifiers) {
                        delete self.bindings;
                    }
                    e.stopPropagation();
                    e.preventDefault();
                    return;
                }
                else if (self.bindings && self.bindings._browser) {
                    if (!just_modifiers) {
                        delete self.bindings;
                    }
                    return;
                }
                else if (self.bindings && !just_modifiers) {
                    delete self.bindings;
                    return self.keydown_fn(e);
                }
                else {
                    return;
                }
            }

            if (typeof commands != "string") {
                self.bindings = commands;
                e.stopPropagation();
                e.preventDefault();
                return;
            }

            if (self.bindings && !self.bindings._stick) {
                delete self.bindings;
            }

            self.log('exec', commands)

            var cancel = false;
            commands = commands.split(" ");
            for (var i = 0; i < commands.length; i++) {
                var command = commands[i];
                if (command[0] == "~") {
                    if (command[1] == "~") {
                        var s = command.slice(2).charCodeAt() - 64;
                        self.to_send += String.fromCharCode(s);
                        cancel = true;
                    }
                    else {
                        var fn = self.commands[command.slice(1)];
                        if (typeof fn == "string") {
                            self.to_send += fn;
                            cancel = true;
                        }
                        else if (typeof fn != "undefined") {
                            cancel = fn();
                        }
                    }
                }
                else {
                    self.to_send += command;
                    cancel = true;
                }
            }
            
            if (cancel) {
                if (cancel != "noscroll") {
                    self.scroll_to_bottom();
                }
                e.stopPropagation();
                e.preventDefault();
            }
            self.send();
        };

        self.terminal.bind('keydown', self.keydown_fn);

        self.terminal.bind('keypress', function(e) {
            if (!e.ctrlKey) {
                var key = e.which;
                if (key == 8) {
                    return;
                }
                var s;
                s = String.fromCharCode(key);
                self.to_send += s;
                if (e.charCode || e.keyCode == 13) {
                    e.stopPropagation();
                    e.preventDefault();
                }
                self.send();
            }
        });
    }

    self.init(div, settings);
    return self;
}



Terminus.deco = function (x) {
    return function () {
        return ['<span style="text-decoration:overline;">' + x + '</span>', 'init'];
    }
}

Terminus.raw_text = function (x) {
    return function () {
        return [x, 'init'];
    }
}

Terminus.noop = function () {
    return ['', 'init'];
}


Terminus.input_state_machine = {
    // This is the state machine used to read the input stream going
    // to the terminal, character by character.

    // Each state is associated to a function. The argument of the
    // function will be set to the next character received by Terminus
    // from the server. "this" in the function is set to the Terminus
    // instance. The function for a given state can return either of
    // three things:

    // - A string representing the next state to skip to
    //   *immediately*. The function associated to the next state will
    //   be run with the same character. Careful about infinite loops.

    // - [return_value, next_state]: the state machine returns a
    //   string to print out on the terminal verbatim. The state
    //   machine goes into the next state and waits for the next
    //   character. return_value can be an empty string if you want to
    //   print nothing, but wait for the next character.

    // - {value: return_value, next_state: state, fallback: other_state}
    //   If there is a value it is returned to print on the terminal,
    //   and if the next state does not exist, the state machine will
    //   go to the state given by fallback instead. The state given in
    //   fallback can be any of the three formats mentioned.


    //// init state ////

    init: function (c) {
        var s = String.fromCharCode(c);
        // if chr_<c> exists we will use that
        // else we will just print out the character
        return {next_state: "chr_" + c,
                fallback: [s, 'init']};
    },

    //// C0 - control codes 0 <= c <= 31 ////

    chr_0: Terminus.deco('0'),
    chr_1: Terminus.deco('1'),
    chr_2: Terminus.deco('2'),
    chr_3: Terminus.deco('3'),
    chr_4: Terminus.deco('4'),
    chr_5: Terminus.deco('5'),
    chr_6: Terminus.deco('6'),
    chr_7: Terminus.noop,
    chr_8: function () {
        // Backspace - not destructive
        this.screen.move_to(this.screen.line, this.screen.column - 1);
        return ['', 'init'];
    },
    chr_9: function() {
        // Tab length = 8
        this.screen.move_to(this.screen.line, (this.screen.column & (~7)) + 8);
        return ['', 'init'];
    },

    chr_10: function () {
        // Newline
        this.screen.next_line();
        return ['', 'init'];
    },
    chr_11: Terminus.deco('b'),
    chr_12: Terminus.deco('c'),
    chr_13: function () {
        // Carriage return
        this.screen.move_to(this.screen.line, 0);
        return ['', 'init'];
    },
    chr_14: Terminus.deco('e'),
    chr_15: Terminus.deco('f'),
    chr_16: Terminus.deco('g'),
    chr_17: Terminus.deco('h'),
    chr_18: Terminus.deco('i'),
    chr_19: Terminus.deco('j'),

    chr_20: Terminus.deco('k'),
    chr_21: Terminus.deco('l'),
    chr_22: Terminus.deco('m'),
    chr_23: Terminus.deco('n'),
    chr_24: Terminus.deco('o'),
    chr_25: Terminus.deco('p'),
    chr_26: Terminus.deco('q'),
    chr_27: function () {
        // ESC - starts off an escape code by initializing the escape
        // data structure and hopping to state esc.
        this.escape = {mode: false,
                       type: "",
                       prefix: "",
                       contents: "",
                       suffix: ""};
        return ['', 'esc'];
    },
    chr_28: Terminus.deco('s'),
    chr_29: Terminus.deco('t'),

    chr_30: Terminus.deco('u'),
    chr_31: Terminus.deco('v'),

    // Characters that need to be escaped in HTML
    chr_32: Terminus.raw_text('&nbsp;'),
    chr_38: Terminus.raw_text('&amp;'),
    chr_60: Terminus.raw_text('&lt;'),
    chr_62: Terminus.raw_text('&gt;'),

    //// ESCAPE ////
    
    esc: function (c) {
        // This will receive the character right after
        // ESC (e.g. '['). Immediately hop to esc_<c>.
        this.escape.mode = c;
        return 'esc_' + c;
    },

    esc_40: function () {
        // ESC ( - switch to stdcode0 and wait for next character
        return ['', 'stdcode0'];
    },

    esc_61: function () { return 'esc_log'; }, // ESC =
    esc_62: function () { return 'esc_log'; }, // ESC >

    esc_91: function () {
        // CSI = ESC [ - switch to stdcode0 and wait for next character
        return ['', 'stdcode0'];
    },

    esc_92: function () {
        // ST = ESC \ - do nothing
        return ['', 'init'];
    },

    esc_93: function () {
        // OSC = ESC ] - switch to seek
        this.ext = {
            type: 'OSC',
            args: {},
            accum: ""
        }
        return ['', 'seek0'];
    },

    //// STANDARD ESCAPE CODE ////
    // ESC <x> <prefix> <n0;n1;n2...> <suffix> <letter>

    stdcode0: function (c) {
        // Accumulate the prefix modifier (e.g. "?" in CSI ? 12 h)
        if ((c >= 32 && c <= 47) || (c >= 60 && c <= 63)) {
            this.escape.prefix += String.fromCharCode(c);
            return ['', 'stdcode0'];
        }
        // We immediately switch to stdcode1 if we see a character we
        // don't understand.
        return 'stdcode1';
    },

    stdcode1: function (c) {
        // Accumulate the semicolon-separated list of numbers usually
        // found as part of an escape code.
        if (c >= 48 && c <= 59) {
            this.escape.contents += String.fromCharCode(c);
            return ['', 'stdcode1'];
        }
        // We immediately switch to stdcode2 if we see a character we
        // don't understand.
        return 'stdcode2';
    },

    stdcode2: function (c) {
        // Accumulate the suffix modifier (rarely used)
        if ((c >= 32 && c <= 47) || (c >= 60 && c <= 63)) {
            this.escape.suffix += String.fromCharCode(c);
            return ['', 'stdcode2'];
        }
        // We immediately switch to stdcode3 if we see a character we
        // don't understand.
        return 'stdcode3';
    },

    stdcode3: function (c) {
        // End the code (usually with a letter)
        this.escape.type = String.fromCharCode(c);
        return {next_state: 'exec_' + this.escape.mode,
                fallback: 'esc_unknown'};
    },

    //// SEEK ////
    // Accumulate everything in ext.accum until ext.delim is found.
    // The sequence also ends with ESC (and executes the appropriate
    // escape code if needed). ext.escape contains an escape
    // character. Any character output right after it is copied
    // verbatim in the accumulator.

    seek0: function (c) {
        if (c == 27) {
            // ESC
            return ['', 'seek1'];
        }
        else if (c == this.ext.delim) {
            // DELIMITER
            this.handle_ext(this.ext);
            this.ext = undefined;
            return ['', 'init']
        }
        else if (c == this.ext.escape) {
            return ['', 'seekX'];
        }
        this.ext.accum += String.fromCharCode(c);
        return ['', 'seek0'];
    },

    seekX: function (c) {
        // This character was escaped, therefore it passes verbatim.
        this.ext.accum += String.fromCharCode(c);
        return ['', 'seek0'];
    },

    seek1: function (c) {
        this.handle_ext(this.ext);
        this.ext = undefined;
        return 'esc';
    },

    //// EXEC ////

    exec_40: function () {
        // ESC (
        return ['', 'init']
    },

    exec_91: function () {
        // CSI = ESC [
        var nums = [];
        var esc = this.escape;
        var contents = esc.contents;
        if (contents != "") {
            nums = contents.split(";").map(function (x) {
                return parseInt(x);
            });
        }
        var name = esc.prefix + esc.type + esc.suffix;
        var fn = this.csi[name + nums.length] || this.csi[name];
        if (typeof(fn) == "string") {
            fn = this.csi[fn];
        }
        if (fn !== undefined) {
            var next_state = fn.call(this, nums);
            if (next_state === undefined) {
                return 'esc_log';
            }
            else {
                // return 'esc_log';
                return ['', next_state];
            }
        }
        else {
            return 'esc_unknown';
        }
    },

    esc_log: function () {
        var esc = this.escape;
        this.log('esc',
                 (String.fromCharCode(esc.mode)
                  + esc.prefix
                  + esc.contents
                  + esc.suffix
                  + esc.type));
        return ['', 'init'];
    },

    esc_unknown: function () {
        var esc = this.escape;
        this.log('esc_unknown',
                 (String.fromCharCode(esc.mode)
                  + esc.prefix
                  + esc.contents
                  + esc.suffix
                  + esc.type));
        return ['', 'init'];
    },
}


Terminus.state_machine = function(machine, initial_state, target) {
    var self = obj();
    self.machine = machine;
    self.state = initial_state;
    self.target = target;

    self.process_next_state = function(next) {
        if (typeof next == "string") {
            next = {next_state: next};
        }
        else if (!next.next_state) {
            next = {next_state: next[1],
                    value: next[0]}
        }
        if (machine[next.next_state] === undefined) {
            if (next.fallback !== undefined) {
                return self.process_next_state(next.fallback);
            }
            else {
                target.log('error', ('switch to nonexistent state '
                                     + next.next_state
                                     + ' from: ' + self.state));
                self.state = initial_state;
            }
        }
        else {
            self.state = next.next_state;
        }
        return next.value;
    }

    self.next = function(data) {
        var fn = machine[self.state];
        if (fn === undefined) {
            target.log('error', '?switch to nonexistent state ' + self.state);
            self.state = initial_state;
        }
        var next = fn.call(self.target, data);
        return self.process_next_state(next);
    }

    self.run = function (data) {
        var count = 100;
        while (true) {
            var result = self.next(data);
            if (result !== undefined && result !== null) {
                return result;
            }
            if (!count) {
                self.log("error", "potentially infinite loop (state = " + self.state + ")");
                return '';
            }
            count--;
        }
    }

    return self;
}


Terminus.apply_all = function(nums, policies, which) {
    for (var i = 0; i < nums.length; i++) {
        var n = nums[i];
        var policy = policies[n];
        if (policy !== undefined) {
            policy.call(this);
        }
        else {
            this.log('esc_unknown', '->' + '[?' + n + which)
        }
    }
}

Terminus.csi = {

    "@0": function (_) { this.screen.insert_blanks(this.screen.line, this.screen.column, 1) },
    "@1": function (n) { this.screen.insert_blanks(this.screen.line, this.screen.column, n[0]) },

    A0: function(_) { this.screen.move_rel(-1, 0); },
    A1: function(n) { this.screen.move_rel(-n[0], 0); },

    B0: function(_) { this.screen.move_rel(1, 0); },
    B1: function(n) { this.screen.move_rel(n[0], 0); },

    C0: function(_) { this.screen.move_rel(0, 1); },
    C1: function(n) { this.screen.move_rel(0, n[0]); },

    D0: function(_) { this.screen.move_rel(0, -1); },
    D1: function(n) { this.screen.move_rel(0, -n[0]); },

    E0: function(_) { this.screen.move_to(this.screen.line + 1, 0); },
    E1: function(n) { this.screen.move_to(this.screen.line + n[0], 0); },

    F0: function(_) { this.screen.move_to(this.screen.line - 1, 0); },
    F1: function(n) { this.screen.move_to(this.screen.line - n[0], 0); },

    G1: function(n) { this.screen.move_to(this.screen.line, n[0] - 1); },

    H0: function(n) { this.screen.move_to(0, 0); },
    H1: function(n) { this.screen.move_to(n[0] - 1, 0); },
    H2: function(n) {
        var l = n[0] - 1;
        var c = n[1] - 1;
        if (isNaN(l)) l = 0;
        if (isNaN(c)) c = 0;
        this.screen.move_to(l, c);
    },

    J0: function(_) { this.screen.kill_screen(0); },
    J1: function(n) { this.screen.kill_screen(n[0]); },

    K0: function(_) { this.screen.kill_line(0); },
    K1: function(n) { this.screen.kill_line(n[0]); },

    L0: function(_) { this.screen.insert_lines(this.screen.line, 1); },
    L1: function(n) { this.screen.insert_lines(this.screen.line, n[0]); },

    M0: function(_) { this.screen.delete_lines(this.screen.line, 1); },
    M1: function(n) { this.screen.delete_lines(this.screen.line, n[0]); },

    P0: function(_) {
        this.screen.delete_characters(this.screen.line, this.screen.column, 1);
    },
    P1: function(n) {
        this.screen.delete_characters(this.screen.line, this.screen.column, n[0]);
    },

    ">c0": function (_) { this.to_send += "\x1B[>0;0;0c"; },
    ">c1": '>c0',

    d0: function (_) { this.screen.move_to(1, this.screen.column); },
    d1: function (n) { this.screen.move_to(n[0] - 1, this.screen.column); },

    f0: 'H0',
    f1: 'H1',
    f2: 'H2',

    "?h": function (nums) {
        var policies = {
            1: function () { this.app_key = true; },
            12: function () { this.screen.cursor_blink = true; },
            25: this.screen.show_cursor,
            1047: function () { this.use_screen(1); },
            1048: function () { this.screen.save_cursor(); },
            1049: function () { this.screen.save_cursor();
                                this.use_screen(1); },
        };
        Terminus.apply_all.call(this, nums, policies, 'h');
    },

    "?l": function (nums) {
        var policies = {
            1: function () { this.app_key = false; },
            12: function () { this.cursor_blink = false; },
            25: this.screen.hide_cursor,
            1047: function () { this.use_screen(0); },
            1048: function () { this.screen.restore_cursor(); },
            1049: function () { this.use_screen(0);
                                this.screen.restore_cursor(); },
        };
        Terminus.apply_all.call(this, nums, policies, 'l');
    },

    m0: function(_) {
        this.screen.text_properties = this.screen.no_text_properties();
    },

    m: function(nums) {
        for (var i = 0; i < nums.length; i++) {
            var n = nums[i];
            if (n == 0) {
                this.screen.text_properties = this.screen.no_text_properties();
            }
            else {
                this.screen.text_properties.push(n);
            }
        }
    },

    r0: function(_) {
        this.screen.scroll0 = 0;
        this.screen.scroll1 = this.screen.nlines;
        this.screen.move_to(0, 0);
    },
    r2: function(nums) {
        this.screen.scroll0 = nums[0] - 1;
        this.screen.scroll1 = nums[1];
        this.screen.move_to(0, 0);
    },

    s0: function (_) { this.screen.save_cursor(); },
    u0: function (_) { this.screen.restore_cursor(); },

    "?y0": function (_) { }, // invalid (no-op)
    "?y": function (n) {
        var types = {
            0: [['push', 'delim', 'escape', ';;', '*nest'],
                false],

            100: [['js', 'delim', 'escape', ';;', '*nest'],
                  false],

            200: [['create', '*nest'],
                  true],
            201: [['demote', '*nest'],
                  true],
            202: [['remove', '*nest'],
                  true],
            203: [['move', '*source', ';;', '*dest'],
                  true],
        };
        var type = n[0];
        if (types[type] === undefined) {
            return;
        }
        var desc = types[type][0];
        var now = types[type][1];
        if (desc !== undefined) {
            var data = {};
            var j = 1;
            var edge = function() {
                return n[j] === undefined || isNaN(n[j]);
            }
            for (var i = 1; i < desc.length; i++) {
                var propname = desc[i];
                if (propname[0] == '*') {
                    var value = [];
                    while (!edge()) {
                        value.push(n[j]);
                        j++;
                    }
                    data[propname.substring(1)] = value;
                }
                else if (propname == ';;') {
                    if (!edge()) {
                        return;
                    }
                    j++;
                }
                else {
                    if (!edge()) {
                        var value = n[j]; // undefined if absent
                        data[propname] = value;
                        j++;
                    }
                }
            }
            if (now) {
                this.handle_ext({type: desc[0],
                                 args: data,
                                 accum: ""});
            }
            else {
                this.ext = {
                    type: desc[0],
                    args: data,
                    accum: "",
                    delim: data.delim === undefined ? 10 : data.delim,
                    escape: data.escape === undefined ? 1 : data.escape
                }
                return 'seek0';
            }
        }
    },

    "?z0": function (_) { }, // invalid (no-op)
    "?z": function (n) {
        var types = {
            0: [['text_set', ';;', '*nest'],
                false],
            1: [['html_set', 'height', 'width', ';;', '*nest'],
                false],

            10: [['text_append', ';;', '*nest'],
                 false],
            11: [['html_append', 'height', 'width', ';;', '*nest'],
                 false],

            100: [['js', ';;', '*nest'],
                  false],

            200: [['create', '*nest'],
                  true],
            201: [['demote', '*nest'],
                  true],
            202: [['remove', '*nest'],
                  true],
            203: [['move', '*source', ';;', '*dest'],
                  true],
       };
        var type = n[0];
        if (types[type] === undefined) {
            return;
        }
        var desc = types[type][0];
        var now = types[type][1];
        if (desc !== undefined) {
            var data = {};
            var j = 1;
            var edge = function() {
                return n[j] === undefined || isNaN(n[j]);
            }
            for (var i = 1; i < desc.length; i++) {
                var propname = desc[i];
                if (propname[0] == '*') {
                    var value = [];
                    while (!edge()) {
                        value.push(n[j]);
                        j++;
                    }
                    data[propname.substring(1)] = value;
                }
                else if (propname == ';;') {
                    if (!edge()) {
                        return;
                    }
                    j++;
                }
                else {
                    if (!edge()) {
                        var value = n[j]; // undefined if absent
                        data[propname] = value;
                        j++;
                    }
                }
            }
            if (now) {
                this.handle_ext({type: desc[0],
                                 args: data,
                                 accum: ""});
            }
            else {
                this.ext = {
                    type: desc[0],
                    args: data,
                    accum: "",
                    delim: 7,
                    escape: 1
                }
                return 'seek0';
            }
        }
    }
}

Terminus.sanitize = function (data) {
    return data
        .replace(/  /g, ' &nbsp')
        .replace(/>/g, '&gt;')
        .replace(/</g, '&lt;')
        .replace(/\n/g, '<br/>');
}

Terminus.strdiff = function (before, after) {
    var ldiff = after.length - before.length;
    for (var i = 0; i < before.length; i++) {
        var bi = before[i].replace('\xa0', ' ');
        var ai = after[i].replace('\xa0', ' ');
        if (bi != ai) {
            return after.substring(i, i + ldiff);
        }
    }
    return after.substring(i, i + ldiff);
}

Terminus.constructors = {
    // DivNest (HTML)
    'h': function (command) {
        var div = makediv();
        var nest = DivNest(div);
        if (command.action == '+') {
            div.innerHTML = command.text;
        }
        else {
            nest.process(command);
        }
        return nest;
    },

    // Terminus
    't': function (command) {
    },

    // TableNest
    'tb': function (command) {
    },

    // PlotNest
    'plot': function (command) {
    },

    // FileNest
    'f': function (command) {
    },

    // ProgressBarNest
    'progress': function (command) {
    },

    // SVGNest
    'svg': function (command) {
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
    },
}

Terminus.split_one = function (text, c) {
    var pos = text.indexOf(c);
    if (pos == -1) {
        return [text, ''];
    }
    return [text.substring(0, pos),
            text.substring(pos + 1)];
}

Terminus.parse_command = function (text) {
    var action = text[0];
    text = text.slice(1);
    var things = Terminus.split_one(text, " ");
    var nest_type = (things[0] || text).trim();
    var contents = things[1] || "";
    return {
        action: action,
        nest_type: nest_type,
        text: contents
    }
}

Terminus.construct_nest = function (command) {
    var constructor = Terminus.constructors[command.nest_type];
    if (constructor == null) {
        throw "no constructor for '" + command.nest_type + "'.";
    }
    else {
        return constructor.call(this, command);
    }
}





function SVGNest(div) {
    var self = DivNest(div);
    self.nest_type = 'svg';
    svg_interact(div, {zoom: true,
                       pan: true,
                       zoom_speed: 1.5});

    $.extend(self.actions, {
        '+': function (command) {
            // TODO: +svg in svg -> <g> tag
            // other nest types -> no effect
        },
        ':': function (command) {
            $(self.element).append(command.text);
        },
        '/': function (command) {
            var txt = command.text;
            var pos = txt.indexOf(" ");
            var setting = txt.substring(0, pos);
            if (setting == "style") {
                var data = txt.substring(pos + 1);
                var style = $("<svg><style>"
                              + "#" + self.nestid + " " + data
                              + "</style></svg>")[0].childNodes[0];
                // var style = makenode('style');
                // // The style will only apply under self div.
                // style.innerHTML = "#" + self.nestid + " " + data;
                // // It is not standards compliant to put <style>
                // // tags outside <head>, but it is practical to do
                // // so since the style will be removed if the nest
                // // is deleted.
                $(self.element).append(style);
            }
        },
        '~': function (command) {
            // TODO: verify that this always works
            setTimeout(function () {
                var txt = command.text;
                var pos = txt.indexOf(" ");
                var id = txt.substring(0, pos);
                var query = "#" + self.nestid + " " + id;
                var to_replace = document.querySelector(query);
                // new_child = makenode('span');
                // new_child.innerHTML = command.text.substring(pos + 1);
                var new_child = $("<svg>" + command.text.substring(pos + 1) + "</svg>")[0].childNodes[0];
                to_replace.parentNode.replaceChild(
                    new_child,
                    to_replace);
            }, 0);
        }
    });

    // self.process = function(command) {
    //     self.actions[command.action](command);
    // }

    return self;
}

