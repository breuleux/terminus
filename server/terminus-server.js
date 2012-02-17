
var yaml = require('js-yaml');
var tty = require('tty');
var path = require('path');
var mustache = require('mustache');
var express = require('express')
var sio = require('socket.io')

function TTY(command, actions) {
    var self = {};

    command = command.split(" ");
    var tty_values = tty.open(command[0], command.slice(1));
    var slave = tty_values[0];
    var proc = tty_values[1];
    var fd = proc.fds[0];

    self.set_window_size = function(nrows, ncols) {
        tty.setWindowSize(fd, nrows, ncols);
    }

    self.send = function(data) {
        slave.write(data);
    }

    self.send_signal = function(signal) {
        proc.kill(signal);
    }

    self.terminate = function(signal) {
        self.send_signal(signal);
        slave.destroy();
    }

    slave.on('data', function () {
        actions.data.apply(self, arguments);
    });
    proc.on('exit', function () {
        actions.exit.apply(self, arguments);
    });

    return self;
}

function TTYFactory(settings, actions) {

    var self = {};

    self.id = 0;

    self.make = function (id) {
        if (self[id]) {
            throw settings.type + " #" + id + " already exists";
        }
        var term = TTY(settings.command, actions);
        term.backlog = "";
        term.parent = self;
        term.id = id;
        console.log('Created TTY '
                    + settings.type
                    + '#' + id +
                    '; command = ' + settings.command);
        self[id] = term;
    }

    self.create = function () {
        while (self[self.id]) {
            self.id += 1;
        }
        self.make(self.id);
        return self.id;
    }

    self.notimeout = function (id) {
        var term = self[id];
        if (term && term.timeout) {
            clearTimeout(term.timeout);
            term.timeout = null;
        }
    }

    self.schedule_terminate = function(id) {
        var term = self[id];
        self.notimeout(id);
        if (settings.grace_period !== true) {
            if (!settings.grace_period) {
                self.terminate(id);
            }
            else {
                term.timeout = setTimeout(function () {
                    if (self[id] === term) {
                        self.terminate(id)
                    }
                }, settings.grace_period * 1000);
            }
        }
    }

    self.terminate = function(id) {
        var term = self[id];
        if (!term) {
            return;
        }
        self.notimeout(id);
        if (term.socket) {
            term.socket.disconnect();
            term.socket = null;
        }
        term.terminate();
        delete self[id];
        console.log('Terminated TTY '
                    + settings.type
                    + '#' + id +
                    '; command = ' + settings.command);
    }

    self.set_socket = function(id, socket) {
        var term = self[id];
        if (!term) { return; }
        self.notimeout(id);
        if (term.socket) {
            term.socket.disconnect();
        }
        term.socket = socket;
        if (term.backlog) {
            socket.emit('data', term.backlog.toString());
            term.backlog = "";
        }
    }

    return self;
}


var mustache_templater = {
    compile: function (source, options) {
        return function (options) {
            return mustache.to_html(source, options)
        }
    },
    render: function (source, options) {
        return this.compile(source, options)(options);
    }
};


function TerminusServer(settings) {
    var self = {};

    var app = express.createServer();
    var io = sio.listen(app);

    var factories = {}

    io.set('log level', 1);
    app.set("view options", {layout: false});
    app.register(".tpl", mustache_templater);

    self.register_configuration = function (type, cfg) {
        cfg.type = type;
        var factory = TTYFactory(cfg, {
            data: function (data) {
                if (this.socket) {
                    this.socket.emit('data', data.toString());
                }
                else {
                    this.backlog += data;
                }
            },
            exit: function () {
                if (this.socket) {
                    this.socket.emit('exit');
                }
                this.parent.terminate(this.id);
            }
        });

        factories[type] = factory;

        app.get('/' + type, function (req, res) {
            var id = factory.create();
            res.redirect('/' + type + '/' + id);
        });

        app.get('/' + type + '/:id', function (req, res) {
            var id = req.params.id;
            console.log('Requesting: ' + type + "/" + id);
            if (!factory[id]) {
                factory.make(id);
            }
            else {
                factory.notimeout(id);
            }
            var client_settings = cfg.settings;
            if (typeof(client_settings) != "string") {
                throw "a list of settings is unsupported"
            }
            else {
                client_settings = '/resources/settings/' + client_settings;
            }
            res.render(path.join(settings.path,
                                 'page',
                                 cfg.template + '.tpl'),
                       {termtype: type,
                        id: id,
                        magic: 12345678,
                        style: cfg.style,
                        settings: client_settings,
                        server: settings.host,
                        port: settings.port})
        });
    }

    app.get('/f/*', function (req, res) {
        var file = req.params[0]
        res.sendfile(path.join('/', file));
    });

    app.get('/resources/*', function (req, res) {
        var file = req.params[0]
        res.sendfile(path.join(settings.path, file));
    });

    for (type in settings.configurations) {
        self.register_configuration(type, settings.configurations[type]);
    }

    io.sockets.on('connection', function (socket) {

        var command = null;
        var id = null;

        socket.on('connect_to', function (data) {
            console.log('connect to: ' + data.command + '/' + data.id);
            command = data.command;
            id = data.id;
            factories[command].set_socket(id, socket);
        });

        socket.on('setsize', function (data) {
            if (command != null) {
                console.log(command + "#" + id + ' | setsize: ' + data.h + "x" + data.w);
                factories[command][id].set_window_size(data.h, data.w);
            }
        });

        socket.on('data', function (data) {
            if (command != null) {
                factories[command][id].send(data);
            }
        });

        socket.on('disconnect', function () {
            if (command != null) {
                factories[command].schedule_terminate(id);
            }
        });
    });

    app.listen(settings.port);

    return self;
}


function main() {

    var settings_file = path.resolve(process.argv[2]);
    var settings_dir = path.normalize(path.join(settings_file, '..'));
    var resource_path = process.argv[3];
    if (!settings_file) {
        console.error("Usage: "
                      + process.argv[0]
                      + " " + process.argv[1]
                      + " <server-settings.yaml>");
        return
    }

    var settings = require(settings_file)[0];
    settings.path = path.resolve((resource_path || settings.path)
                                 .replace('$', settings_dir));

    console.log('resource path: ' + settings.path);

    TerminusServer(settings);
}

main();
