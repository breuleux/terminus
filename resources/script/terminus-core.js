
Terminus = {}

Terminus.GID = 0;
Terminus.obj = function() {
    // Return a new object, with an id field set to a unique number
    // (converted to a string). Its toString() method returns the id,
    // meaning that it can be set as an attribute in an object (for
    // what it is worth).
    var self = {};
    self.id = "#" + Terminus.GID.toString();
    Terminus.GID += 1;
    self.toString = function() {
        return self.id;
    }
    return self;
}


Terminus.grab_settings = function(accum, files, fn) {
    if (!files.length) {
        fn(accum);
    }
    else {
        var file = files.shift();
        $.get(file, function(data) {
            data = jsyaml.load(data);
            $.extend(true, accum, data);
            Terminus.grab_settings(accum, files, fn);
        });
    }
}


Terminus.Logger = function(settings) {
    var self = Terminus.obj();

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

        self.target = $(document.createElement('div'));
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
            setTimeout(function() {
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
        self.target = undefined;
        self.last = -settings.group_delay - 1;
        // self.clear();
    }

    self.init(settings);

    return self
}


Terminus.Nest = function(element) {
// function Nest(element) {
    var self = Terminus.obj();

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
        self.set_child(self.n, child || Terminus.EmptyNest());
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
            self.set_child(id, Terminus.EmptyNest());
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

    self.get_latest = function() {
        if (self.latest == null) {
            return null;
        }
        else {
            return self.children[self.latest];
        }
    }

    self.actions = {
        '+': function(command) {
            var child = Terminus.construct_nest.call(self, command);
            var id = self.create(child);
            self.latest = id;
        }
    }

    self.process = function(command) {
        self.actions[command.action].call(self, command);
        setTimeout(self.focus, 100); // why is a timeout needed? I have no idea
    }

    self.push_command = function(command, second_pass) {
        // self.log('test', self.nest_type + ' ' + command.action + ' ' + command.nest_type);
        var latest = self.get_latest();
        if (latest !== null
            && latest.nest_type == command.nest_type
            && command.action != '+') {
            latest.process(command);
        }
        else if (self.nest_type == command.nest_type
                 || command.action == '+') {
            // try {
            self.process(command);
            // }
            // catch(e) {
            //     err = ('unknown action for nest type '
            //            + command.nest_type + ': '
            //            + command.action);
            //     throw err;
            // }
            return;
        }
        else if (!second_pass) {
            self.process({action: '+',
                          nest_type: command.nest_type,
                          text: ""});
            self.push_command(command, true);
        }
    }

    self.focus = function() {
        $(self.element).focus();
        // self.log('test', 'spurious focus on: ' + self.nestid);
    }

    self.scroll_to_bottom = function() {
        var latest = self.get_latest();
        if (latest !== null) {
            latest.focus();
            latest.scroll_to_bottom();
        }
    }

    return self;
}

Terminus.DivNest = function(div) {
    var self = Terminus.Nest(div);
    div.setAttribute('contenteditable', 'false');
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
        child.bump = function () {
            $(child.element).detach();
            self.element.appendChild(child.element);
            // child.scroll_to_bottom();
            setTimeout(child.scroll_to_bottom, 10);
        }
        child.log = self.log;
        child.parent_terminal = self.parent_terminal || self;

        return id;
    }

    self.remove_child = function(id) {
        var existing = self.children[id];
        self.element.removeChild(existing.element);
        delete self.children[id];
    }

    self.append = function(sub_element) {
        // DEPRECATED
        if (typeof sub_element == "string") {
            var div = $(document.createElement('div')).html(Terminus.sanitize(sub_element));
            $(self.element).append(div);
        }
        else {
            $(self.element).append(sub_element);
        }
    }

    self.make_node = function (html) {
        return $(html)[0];
    }

    self.opt_setters = {
        'style': function (data) {
            var style = document.createElement('style');
            // The style will only apply under self div.
            style.innerHTML = "#" + self.nestid + " " + data;
            // It is not standards compliant to put <style>
            // tags outside <head>, but it is practical to do
            // so since the style will be removed if the nest
            // is deleted.
            $(self.element).append(style);
        },
        '_default': function(setting, data) {
            // Nothing.
        }
    }

    $.extend(self.actions, {
        ':': function (command) {
            $(self.element).append(self.make_node(command.text.trim()));
        },
        '/': function (command) {
            var split = Terminus.split_one(command.text, " ");
            (self.opt_setters[split[0]]
             || self.opt_setters._default)(split[1]);
        },
        '~': function (command) {
            // TODO: verify that this always works
            var txt = command.text;
            var split = Terminus.split_one(command.text, " ");
            var id = split[0];
            var contents = split[1].trim();
            var query = "#" + self.nestid + " " + id;

            setTimeout(function () {
                var target = document.querySelector(query);

                if (contents == "") {
                    // console.log(target);
                    // console.log(target.parentNode);
                    // target.parentNode.removeChild(target);
                    $(target).remove();
                }

                else if (contents[0] == "=") {
                    var new_child = self.make_node(contents.substring(1).trim());
                    target.parentNode.replaceChild(
                        new_child,
                        target);
                }

                else if (contents[0] == "<") {
                    var new_child = self.make_node(contents);
                    target.appendChild(new_child);
                }

                else {
                    var split = Terminus.split_one(contents, "=");
                    var attr = split[0].trim();
                    var value = split[1].trim();
                    target.setAttribute(attr, value);
                }
            }, 0);
        }
    })

    return self;
}

Terminus.EmptyNest = function() {
    var div = document.createElement('div');
    return Terminus.DivNest(div);
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

Terminus.parse_bool = function (x) {
    x = x.trim();
    if (x == 'false' || x == '') {
        return false;
    }
    else if (x == 'true') {
        return true;
    }
}


