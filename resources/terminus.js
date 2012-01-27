
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


function makenode(type) {
    return document.createElement(type);
}

function makediv() {
    return makenode('div');
}

function Nest(element) {
    var self = obj();

    self.n = 1;
    self.element = element;
    self.children = {};

    self.get_child = function(id, create) {
        if (create && (!id || self.children[id] === undefined)) {
            id = self.set_child(id, EmptyNest());
        }
        return self.children[id];
    }

    self.find = function(nest, create) {
        try {
            return self._find(nest, create);
        }
        catch(err) {
            if (err == 'no_nest') {
                // Errors from ._find might be incomplete.
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
        if (child === undefined) {
            throw 'no_nest'; // "The nest [" + nest + "] does not exist.";
        }
        return child.find(nest.slice(1), create);
    }
    return self;
}

function DivNest(div) {
    var self = Nest(div);

    self.set_child = function(id, child) {
        if (id == 0) {
            id = self.n++;
        }
        var existing = self.children[id]
        if (existing !== undefined) {
            self.element.replaceChild(child.element,
                                      existing.element);
            existing.set = undefined;
        }
        else {
            self.element.appendChild(child.element)
        }
        self.children[id] = child;
        child.set = function (new_child) {
            self.set_child(id, new_child);
        }
        return id;
    }

    self.append = function(sub_element) {
        self.element.appendChild(sub_element)
    }

    return self;
}

function EmptyNest() {
    // var div = document.createElement('div');
    var div = makediv();
    return DivNest(div);
}


function Screen(nlines, ncols, char_height, char_width) {
    var self = obj();

    self.no_text_properties = function() {
        return new Array();
    };

    self.total_height = function() {
        var total = 0;
        for (var i = 0; i < self.nlines; i++) {
            total += self.heights[i];
        }
        return total;
    }

    self.bottom_virgins = function() {
        var total = 0;
        for (var i = self.nlines - 1; i >= 0; i--) {
            if (self.virgin[i])
                total++;
            else
                break;
        }
        return total;
    }

    self.resize = function(nlines, ncols) {
        // -- DON'T USE --
        // Scroll lost lines up
        // Add new lines down
        // Remove rightmost characters
        // Add characters to the right

        if (ncols > self.ncols) {
            var old_ncol = self.ncols;
            self.ncols = ncols;
            for (var i = 0; i < self.nlines; i++){
                self.clear_line(old_ncol);
            }
        }
        else if (ncols < self.ncols) {
            self.ncols = ncols;
            for (var i = 0; i < self.nlines; i++){
                self.matrix[i].splice(self.ncols);
            }
        }

        if (nlines > self.nlines) {
            for (var i = self.nlines; i < nlines; i++){
                self.matrix[i] = [];
                self.clear_line(i);
            }
        }
        else if (nlines < self.nlines) {
            for (var i = self.nlines; i < nlines; i++){
                self.scroll();
            }
            for (var i = self.nlines; i < nlines; i++){
                self.matrix[i] = undefined;
                self.lines[i] = undefined;
                self.virgin[i] = undefined;
                self.modified[i] = undefined;
                self.ext[i] = undefined;
            }
        }
        self.nlines = nlines;
    }

    // CURSOR
    self.line = 0;
    self.column = 0;
    self.cursor_blink = false;

    self.save_cursor = function() {
        self.stored_line = self.line;
        self.stored_column = self.column;
    }
    self.save_cursor(); // init save to (0, 0)

    self.restore_cursor = function() {
        self.line = self.stored_line;
        self.column = self.stored_column;
    }

    self.show_cursor = function() {
        self.cursor_visible = true;
    }
    self.show_cursor();

    self.hide_cursor = function() {
        self.cursor_visible = false;
    }

    self.cursor_here = function() {
        self.push_prop(self.line, self.column, 200);
        self.modified[self.line] = true;

        // self.touch_line(self.line);

        // self.modified[self.line] = true;
        // self.ext[self.line] = false;
        // self.virgin[self.line] = false;
        // self.heights[self.line] = 1;
    }

    self.no_cursor_here = function() {
        self.push_prop(self.line, self.column, 201);
        self.modified[self.line] = true;
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
        if (j != self.ncols) {
            var all = self.matrix[i][j];
            all[1].push(n);
            all[2] = undefined;
            all[3] = undefined;
        }
    }

    self.sgr_styles = {
        3: "font-style: italic;",
        4: "text-decoration: underline;",
        9: "text-decoration: line-through;",
        23: "font-style: normal;",
        24: "text-decoration: none;",
        29: "text-decoration: none;",
        53: "text-decoration: overline;",
        55: "text-decoration: none;",
    }

    self.colors = {
        0: '#000000',
        1: '#800000',
        2: '#800000',
        3: '#aa8000',
        4: '#000080',
        5: '#800080',
        6: '#008080',
        7: '#aaaaaa', 
        
        10: 'black',
        11: 'red',
        12: 'green',
        13: 'yellow',
        14: 'blue',
        15: 'magenta',
        16: 'cyan',
        17: 'white', 
    }

    self.compute_style = function(properties) {
        var style = "";
        var bold = false;
        var color = 7;
        var bgcolor = 0;
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
            else if (n == 200) cursor = true;
            else if (n == 201) cursor = false;
            else if (n >= 30 && n <= 37) color = (n - 30);
            else if (n == 39) color = 7;
            else if (n >= 40 && n <= 47) bgcolor = (n - 40);
            else if (n == 49) bgcolor = 0;
            else {
                var s = self.sgr_styles[n];
                if (s !== undefined) {
                    style += s;
                }
            }
        }
        if (bold) {
            color += 10;
        }
        if (reverse || blink) {
            style += "background-color:" + self.colors[color] + ";";
            style += "color:" + self.colors[bgcolor] + ";";
        }
        else {
            style += "background-color:" + self.colors[bgcolor] + ";";
            style += "color:" + self.colors[color] + ";";
        }
        var cls;
        if (cursor && self.cursor_visible)
            cls = "cursor";
        return [style, cls];
    }

    self.extract_character = function(i, j) {
        var all = self.matrix[i][j];
        var character = all[0];
        var properties = all[1];
        var style = all[2];
        var cls = all[3];
        if (style === undefined || cls === undefined) {
            var things = self.compute_style(properties);
            style = things[0];
            cls = things[1];
            all[2] = style;
            all[3] = cls;
        }
        return [character, properties, style, cls];
    };

    // WRITE

    self.touch_line = function(line) {
        self.modified[line] = true;
        self.ext[line] = false;
        self.virgin[line] = false;
        self.heights[line] = 1;
    }

    self.write_at = function(line, column, things) {
        self.matrix[line][column] = things;
        self.touch_line(line);
    }

    self.write_at_cursor = function(things) {
        if (self.column == self.ncols) {
            self.next_line();
        }
        self.write_at(self.line, self.column, things);
    }

    // INITIALIZE
    self.scrollback = [];
    
    self.nlines = nlines;
    self.ncols = ncols;
    self.char_height = char_height;
    self.char_width = char_width;

    self.matrix = [];
    self.lines = [];
    self.modified = [];
    self.ext = []
    self.virgin = [];
    self.heights = [];

    self.text_properties = self.no_text_properties();
    self.default_character = "&nbsp;";

    for (var i = 0; i < self.nlines; i++) {
        self.matrix[i] = [];
        for (var j = 0; j < self.ncols; j++) {
            self.matrix[i][j] = [self.default_character,
                                 self.no_text_properties()];
        }
        self.virgin[i] = true;
        self.heights[i] = 1;
        self.modified[i] = true;
        self.ext[i] = false;
    }

    self.write_ext = function(type, data, parameters) {
        if (type == 'html') {
            self.next_line();
            var div = makediv();
            if (parameters.height) { $(div).height(parameters.height); }
            if (parameters.width) { $(div).width(parameters.width); }
            div.innerHTML = data;
            var line = self.line - 1;
            self.lines[line] = div
            self.modified[line] = true;
            self.ext[line] = true;
            self.virgin[line] = false;
            if (parameters.height) {
                self.heights[line] = (parameters.height / self.char_height);
            }
            else {
                setTimeout(function () {
                        self.heights[line] = Math.ceil($(div).height() / self.char_height);
                    }, 5);
            }
        }
        else if (type == 'js') {
            eval(data);
        }
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
        var div = makediv();
        var line = self.get_line(i);
        div.appendChild(self.lines[i]);
        self.scrollback.push(div);
    }

    // KILL

    self.kill_line_segment = function (line, column0, column1) {
        if (column1 > self.ncols) {
            column1 = self.ncols;
        }
        for (var i = column0; i < column1; i++) {
            // var all = self.matrix[line][i];
            // all[0] = ".";
            self.matrix[line][i] = [self.default_character, self.no_text_properties()];
        }
        self.touch_line(line);
        // self.modified[line] = true;
        // self.ext[line] = false;
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
    self.scroll0 = 0;
    self.scroll1 = self.nlines;

    self.rotate = function(arr) {
        var rval = arr.slice(0, self.scroll0);
        rval = rval.concat(arr.slice(self.scroll0 + 1, self.scroll1));
        rval.push(arr[self.scroll0]);
        rval = rval.concat(arr.slice(self.scroll1));
        return rval;
    }

    self.clear_line = function(i) {
        for (var j = 0; j < self.ncols; j++) {
            self.matrix[i][j] = [self.default_character,
                                 self.no_text_properties()];
        }
        self.touch_line(i);
        self.virgin[i] = true;
        // self.modified[i] = true;
        // self.ext[i] = false;
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
        self.touch_line(line);
        // self.modified[line] = true;
        // self.ext[line] = false;
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
        self.touch_line(line);
        // self.modified[line] = true;
        // self.ext[line] = false;
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

        self.matrix = self.push_to_end(self.matrix, start, end);
        self.lines = self.push_to_end(self.lines, start, end);
        self.ext = self.push_to_end(self.ext, start, end);
        self.virgin = self.push_to_end(self.virgin, start, end);
        self.heights = self.push_to_end(self.heights, start, end);
        self.all_modified(start, self.nlines);
        
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

        self.matrix = self.push_to_end(self.matrix, start, end);
        self.lines = self.push_to_end(self.lines, start, end);
        self.ext = self.push_to_end(self.ext, start, end);
        self.virgin = self.push_to_end(self.virgin, start, end);
        self.heights = self.push_to_end(self.heights, start, end);
        self.all_modified(start, self.nlines);
        
        var clearfrom = self.scroll1 - n;
        if (clearfrom < line)
            clearfrom = line;
        for (var i = clearfrom; i < self.scroll1; i++) {
            self.clear_line(i);
        }
    }

    self.scroll = function() {

        self.send_line_to_scroll(0);
        self.clear_line(self.scroll0);

        self.lines = self.rotate(self.lines);
        self.matrix = self.rotate(self.matrix);
        self.ext = self.rotate(self.ext);
        self.all_modified(0, self.nlines);
    }

    self.scroll_page = function() {
        self.no_cursor_here();
        for (var i = 0; i < self.nlines; i++) {
            self.send_line_to_scroll(i);
            self.clear_line(i);
        }
        self.cursor_here();
    }

    self.make_line = function(i) {
        var s = "";
        var current_style = "";
        var current_cls = "";
        for (var j = 0; j < self.ncols; j++) {
            var all = self.extract_character(i, j);
            var c = all[0];
            var style = all[2];
            var cls = all[3];
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
        self.lines[i] = span;
    };

    return self;
}


function Terminus(div) {
    var self = obj();

    // HANDY POINTERS

    self.terminal = div;
    self.d_terminal = div[0];

    // SIZE

    self.char_width = $("#font_control").width();
    self.char_height = $("#font_control").height();
        
    self.nlines = Math.floor(self.terminal.height() / self.char_height) - 0;
    self.ncols = Math.floor(self.terminal.width() / self.char_width) - 2;

    $.post('/setsize', {h: self.nlines, w: self.ncols});

    // var block = document.createElement('div');
    // var diff = self.terminal.height() - (self.nlines * self.char_height);
    // // alert(diff);
    // block.setAttribute("height", diff);
    // $(block).append('x');
    // self.d_terminal.appendChild(block);


    // SCROLLING

    self.n_scrolls = 10;
    self.scroll_block_size = 100;
    var scrollbacks = makediv();
    scrollbacks.setAttribute('id', 'scrollbacks');
    self.scrollbacks = $(scrollbacks);
    self.d_terminal.appendChild(scrollbacks);

    self.rotate_scrollback = function () {
        self.scrollbacks.children().first().remove();
        var new_div = makediv();
        self.scrollbacks.append(new_div);
    }

    self.clear_scrollback = function(x) {
        self.scrollbacks.empty();
        for (var i = 0; i < self.n_scrolls; i++) {
            var new_div = makediv();
            self.scrollbacks.append(new_div);
        }
    }

    self.clear_scrollback();

    self.add_scroll = function(x) {
        var add_to = self.scrollbacks.children().last();
        add_to.append(x);
        var len = add_to.children().length;
        if (len == self.scroll_block_size) {
            self.rotate_scrollback();
        }
    }

    self.log = function(x) {
        self.add_scroll(x + "<br/>");
    }


    // CONTENTS
    
    var contents = [];
    var container = makediv();
    container.setAttribute('id', 'contents');
    for (var i = 0; i < self.nlines; i++) {
        var new_div = makediv();
        new_div.setAttribute('id', 'content' + i);
        contents.push(new_div);
        container.appendChild(new_div);
    }
    self.contents = contents;

    // Pad the bottom so that the first line is flush with the top of
    // the screen when we're scrolled down completely.
    var diff = self.terminal.height() - (self.nlines * self.char_height);
    // diff - 4 is a bit arbitrary, but it works well for me in
    // Chrome. I don't know about others.
    $(container).css('margin-bottom', (diff - 4) + 'px');
    self.d_terminal.appendChild(container);

    // Major hack to allow pasting: we'll constantly put focus on an
    // invisible text area, then when the user pastes, we'll clear the
    // text area, check what appears in it, and we'll send the
    // contents over to the pty. I don't yet know how to make middle
    // click paste work, unfortunately, so we'll make do with Ctrl+V.
    var textarea = makenode('textarea');
    self.textarea = $(textarea);
    self.textarea.css('height', 0).css('width', 0);
    self.d_terminal.appendChild(textarea);


    // DISPLAY

    self.display = function(force) {
        var changes = false;
        var n_displayed = self.nlines - Math.min(self.screen.total_height() - self.nlines,
                                                 self.screen.bottom_virgins());
        // if (n_displayed != self.nlines)
        //     self.log(n_displayed + " " + self.screen.total_height() + " " + self.screen.bottom_virgins());
        // var n_displayed = self.nlines;

        for (var i = 0; i < n_displayed; i++) {
            if (self.screen.modified[i] || force) {
                var line = self.screen.get_line(i);
                $(self.contents[i]).empty();
                self.contents[i].appendChild(line);
                self.screen.modified[i] = false;
                changes = true;
            }
        }
        for (var i = n_displayed; i < self.nlines; i++) {
            $(self.contents[i]).empty();
        }

        if (!changes && !force) {
            return;
        }
        var scrollback = self.screen.scrollback;
        self.screen.scrollback = [];
        for (var i = 0; i < scrollback.length; i++) {
            self.add_scroll(scrollback[i]);
        }
        d_terminal.scrollTop = d_terminal.scrollHeight + 100;
    }

    self.use_screen = function(n) {
        self.screen = self.screens[n];
        self.display(true);
    }

    self.screens = [Screen(self.nlines, self.ncols, self.char_height, self.char_width),
                    Screen(self.nlines, self.ncols, self.char_height, self.char_width)];
    self.use_screen(0);

    // WRITING

    self.write_all = function(data) {
        for (var i in data) {
            var s = data[i];
            var c = s.charCodeAt();
            self.write(c);
        }
    }
    
    self.escape = false;

    self.apply_all = function(nums, policies, which) {
        for (var i = 0; i < nums.length; i++) {
            var n = nums[i];
            var policy = policies[n];
            if (policy !== undefined) {
                policy();
            }
            else {
                self.log('unknown '+nums+which)
            }
        }
    }

    self.csi = {
        "@0": function (_) { self.screen.insert_blanks(self.screen.line, self.screen.column, 1) },
        "@1": function (n) { self.screen.insert_blanks(self.screen.line, self.screen.column, n[0]) },

        A0: function(_) { self.screen.move_rel(-1, 0); },
        A1: function(n) { self.screen.move_rel(-n[0], 0); },

        B0: function(_) { self.screen.move_rel(1, 0); },
        B1: function(n) { self.screen.move_rel(n[0], 0); },

        C0: function(_) { self.screen.move_rel(0, 1); },
        C1: function(n) { self.screen.move_rel(0, n[0]); },

        D0: function(_) { self.screen.move_rel(0, -1); },
        D1: function(n) { self.screen.move_rel(0, -n[0]); },

        E0: function(_) { self.screen.move_to(self.screen.line + 1, 0); },
        E1: function(n) { self.screen.move_to(self.screen.line + n[0], 0); },

        F0: function(_) { self.screen.move_to(self.screen.line - 1, 0); },
        F1: function(n) { self.screen.move_to(self.screen.line - n[0], 0); },

        G1: function(n) { self.screen.move_to(self.screen.line, n[0] - 1); },

        H0: function(n) { self.screen.move_to(0, 0); },
        H1: function(n) { self.screen.move_to(n[0] - 1, 0); },
        H2: function(n) {
            var l = n[0] - 1;
            var c = n[1] - 1;
            if (isNaN(l)) l = 0;
            if (isNaN(c)) c = 0;
            self.screen.move_to(l, c);
        },

        J0: function(_) { self.screen.kill_screen(0); },
        J1: function(n) { self.screen.kill_screen(n[0]); },

        K0: function(_) { self.screen.kill_line(0); },
        K1: function(n) { self.screen.kill_line(n[0]); },

        L0: function(_) { self.screen.insert_lines(self.screen.line + 1, 1); },
        L1: function(n) { self.screen.insert_lines(self.screen.line + 1, n[0]); },

        M0: function(_) { self.screen.delete_lines(self.screen.line + 1, 1); },
        M1: function(n) { self.screen.delete_lines(self.screen.line + 1, n[0]); },

        P0: function(_) {
            self.screen.delete_characters(self.screen.line, self.screen.column, 1);
        },
        P1: function(n) {
            self.screen.delete_characters(self.screen.line, self.screen.column, n[0]);
        },

        $c0: function (_) { self.to_send += "\x1B[>0;0;0c"; },
        $c1: '$c0',

        d0: function (_) { self.screen.move_to(1, self.screen.column); },
        d1: function (n) { self.screen.move_to(n[0] - 1, self.screen.column); },

        f0: 'H0',
        f1: 'H1',
        f2: 'H2',

        _h: function (nums) {
            var policies = {
                1: function () { self.app_key = true; },
                12: function () { self.screen.cursor_blink = true; },
                25: self.screen.show_cursor,
                1047: function () { self.use_screen(1); },
                1048: function () { self.screen.save_cursor(); },
                1049: function () { self.screen.save_cursor();
                                    self.use_screen(1); },
            };
            self.apply_all(nums, policies, 'h');
        },

        _l: function (nums) {
            var policies = {
                1: function () { self.app_key = false; },
                12: function () { self.cursor_blink = false; },
                25: self.screen.hide_cursor,
                1047: function () { self.use_screen(0); },
                1048: function () { self.screen.restore_cursor(); },
                1049: function () { self.use_screen(0);
                                    self.screen.restore_cursor(); },
            };
            self.apply_all(nums, policies, 'l');
        },

        m0: function(_) {
            self.screen.text_properties = self.screen.no_text_properties();
        },

        m: function(nums) {
            for (var i = 0; i < nums.length; i++) {
                var n = nums[i];
                if (n == 0) {
                    self.screen.text_properties = self.screen.no_text_properties();
                }
                else {
                    self.screen.text_properties.push(n);
                }
            }
        },
        
        r2: function(nums) {
            self.screen.scroll0 = nums[0] - 1;
            self.screen.scroll1 = nums[1];
            self.screen.move_to(0, 0);
        },

        s0: function (_) { self.screen.save_cursor(); },
        u0: function (_) { self.screen.restore_cursor(); },

        _z0: function (_) { }, // invalid (no-op)
        _z1: function (_) { }, // invalid (no-op)
        _z: function (n) {
            var types = {0: ['html', '|height', '-width'],
                         1: ['js']};
            var type = n[0];
            var count = n[1];
            if (isFinite(count)) {
                var desc = types[type];
                if (desc !== undefined) {
                    self.ext_type = desc[0];
                    self.ext_data = {};
                    for (var i = 1; i < desc.length; i++) {
                        var value = n[i + 1];
                        if (value !== undefined) {
                            var propname = desc[i];
                            if (propname[0] == '|') {
                                value = value * self.char_height;
                                propname = propname.substring(1);
                            }
                            else if (propname[0] == '-') {
                                value = value * self.char_width;
                                propname = propname.substring(1);
                            }
                            self.ext_data[propname] = value;
                        }
                    }
                    self.ext_accum = "";
                    self.ext_count = count;
                }
            }
        },
    }

    self.write_escape = function(esc) {
        var nums = [];
        var alt = "";
        if (esc.mode == 91) {
            var contents = esc.contents;
            if (contents[0] == "?") {
                alt = "_";
                contents = contents.substring(1);
            }
            else if (contents[0] == ">") {
                alt = "$";
                contents = contents.substring(1);
            }
            if (contents != "") {
                nums = contents.split(";").map(function (x) {
                        return parseInt(x);
                    });
            }
            var name = alt + esc.type;
            var fn = self.csi[name + nums.length] || self.csi[name];
            if (typeof(fn) == "string") {
                fn = self.csi[fn];
            }
            if (fn !== undefined) {
                fn(nums);
            }
            else {
                // self.log(String.fromCharCode(esc.mode) + esc.contents + alt + esc.type + " " + nums.join("/") + " " + (alt + esc.type + nums.length));
            }
        }
        else if (esc.mode == 40 && esc.contents == "") {
            // Some kind of character set switching. Who cares.
        }
        else {
            // self.log(String.fromCharCode(esc.mode) + esc.contents + alt + esc.type + " " + nums.join("/") + " " + (alt + esc.type + nums.length));
        }
        // self.log(String.fromCharCode(esc.mode) + esc.contents + alt + esc.type + " " + nums.join("/") + " " + (alt + esc.type + nums.length));
    }

    var deco = function (x) {
        return function () {
            return '<span style="text-decoration:overline;">' + x + '</span>';
        }
    }

    var noop = function () {
        return false;
    }

    self.char_convert = {
        0: deco('0'),
        1: deco('1'),
        2: deco('2'),
        3: deco('3'),
        4: deco('4'),
        5: deco('5'),
        6: deco('6'),
        7: noop,
        8: function () {
            self.screen.move_to(self.screen.line, self.screen.column - 1);
            return false;
        },
        9: function() {
            // Tab length = 8
            self.screen.move_to(self.screen.line, (self.screen.column & (~7)) + 8);
            return false;
        },

        10: function () {
            self.screen.next_line();
            return false;
        },
        11: deco('b'),
        12: deco('c'),
        13: function () {
            self.screen.move_to(self.screen.line, 0);
            return false;
        },
        14: deco('d'),
        15: deco('e'),
        16: deco('f'),
        17: deco('g'),
        18: deco('h'),
        19: deco('i'),

        20: deco('j'),
        21: deco('k'),
        22: deco('l'),
        23: deco('m'),
        24: deco('n'),
        25: deco('o'),
        26: deco('p'),
        27: function () {
            self.escape = {mode: false,
                           type: false,
                           contents: ""};
            return false;
        },
        28: deco('q'),
        29: deco('r'),

        30: deco('s'),
        31: deco('t'),
        32: '&nbsp;',
        // 32: '_',
        38: '&amp;',
        60: '&lt;',
        62: '&gt;',
    }

    self.write = function(c) {
        var s = String.fromCharCode(c);

        if (self.ext_count > 0) {
            self.ext_accum += s;
            self.ext_count--;
        }
        else if (self.ext_count <= 0) {
            self.ext_count = undefined;
            try {
                self.display();
                self.screen.write_ext(self.ext_type, self.ext_accum, self.ext_data);
            }
            catch(whatever) {
                self.write_all("JS ERROR -> " + whatever);
            }
            self.ext_accum = "";
        }
        else if (self.escape !== false) {
            if (self.escape.mode === false) {
                self.escape.mode = c;
                if (c == 61 || c == 62) {
                    self.write_escape(self.escape);
                    self.escape = false;
                }
            }
            else if (c >= 0x20 && c <= 0x3f) {
                self.escape.contents += s;
            }
            else if (c >= 0x40 && c <= 0x7e) {
                self.escape.type = s;
                self.write_escape(self.escape);
                self.escape = false;
            }
        }
        else {
            var entry = self.char_convert[c];
            if (entry !== undefined) {
                if (typeof(entry) == "string") {
                    s = entry;
                }
                else {
                    s = entry();
                    if (s === false) {
                        return;
                    }
                }
            }
            self.screen.write_at_cursor([s, self.screen.text_properties.slice(0)]);
            self.screen.advance();
        }
    }

    setInterval(function () {
            self.display();
        },
        10)

    setInterval(function () {
            $('.cursor').each (function () {
                    var elem = $(this);
                    var c = elem.css('color');
                    var bgc = elem.css('background-color');
                    elem.css('color', bgc);
                    elem.css('background-color', c);
                })
        },
        200)

    setInterval(function () {
            $.get("/get",
                  function(data) {
                      if (data != "") {
                          self.write_all(data);
                          d_terminal.scrollTop = d_terminal.scrollHeight + 100;
                      }
                  })
        },
        100);

    self.to_send = "";
    setInterval(function () {
            if (self.to_send != "") {
                var to_send = self.to_send;
                self.to_send = "";
                $.post("/send", {data: to_send},
                       function (data) {
                           self.write_all(data.data);
                           d_terminal.scrollTop = d_terminal.scrollHeight;
                       });
            }
        },
        10);

    $(document).bind('paste', function(e) {
            var target = self.textarea;
            target.val("");
            setTimeout(function() {
                    var text = target.val();
                    self.to_send += text;
                }, 0);
        });

    $(document).bind('keydown', function(e) {
            self.textarea.focus();
            var key = e.keyCode;
            var keymap = {
                8: "\x7F",       // Backspace
                9: "\x09",       // Tab
                27: "\x1B",      // Esc
                33: "\x1B[5~",   // PgUp
                34: "\x1B[6~",   // PgDn
                35: "\x1B[4~",   // End
                36: "\x1B[1~",   // Home
                37: self.app_key ? "\x1BOD" : "\x1B[D",    // Left
                38: self.app_key ? "\x1BOA" : "\x1B[A",    // Up
                39: self.app_key ? "\x1BOC" : "\x1B[C",    // Right
                40: self.app_key ? "\x1BOB" : "\x1B[B",    // Down
                // 38: "\x1B[A",    // Up
                // 39: "\x1B[C",    // Right
                // 40: "\x1B[B",    // Down
                45: "\x1B[2~",   // Ins
                46: "\x1B[3~",   // Del
                112: "\x1B[[A",  // F1
                113: "\x1B[[B",  // F2
                114: "\x1B[[C",  // F3
                115: "\x1B[[D",  // F4
                // 116: "\x1B[[E",  // F5
                117: "\x1B[17~", // F6
                118: "\x1B[18~", // F7
                119: "\x1B[19~", // F8
                120: "\x1B[20~", // F9
                121: "\x1B[21~", // F10
                122: "\x1B[23~", // F11
                123: "\x1B[24~", // F12
            }
            
            var s;
            if (e.ctrlKey && !e.shiftKey) {
                if (key >= 97 && key <= 122)
                    key -= 32;
                if (key != 86) {
                    if (key >= 65 && key <= 90) {
                        key -= 64;
                        s = String.fromCharCode(key);
                    }
                }
            } else if (e.ctrlKey && e.shiftKey) {
                if (key >= 97 && key <= 122)
                    key -= 32;
                if (key == 76) {
                    self.clear_scrollback();
                }
            }
            else {
                s = keymap[key];
            }

            if (s !== undefined) {
                self.to_send += s;
                e.stopPropagation();
                e.preventDefault();
            }
        });

    $(document).bind('keypress', function(e) {
            if (!e.ctrlKey) {
                var key = e.keyCode;
                var s;
                s = String.fromCharCode(key);
                self.to_send += s;
            }
        });

    return self;
}




