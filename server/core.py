
import bottle
from bottle import Bottle, run, static_file, request, redirect, template, HTTPError
from threading  import Thread
from Queue import Queue, Empty
from pexpect import spawn, EOF, TIMEOUT


class Proc:

    def __init__(self, command):
        self.proc = spawn(command)
        self.queue = Queue()
        self.thread = Thread(target = self.enqueue)
        self.thread.daemon = True
        self.thread.start()

    def enqueue(self):
        while True:
            try:
                x = self.proc.read(1)
                self.queue.put(x)
            except TIMEOUT:
                continue
            except EOF:
                self.proc.close()
                return

    def set_size(self, w, h):
        self.proc.setwinsize(h, w)

    def send(self, new):
        self.proc.send(new)

    def receive(self):
        data = ""
        while True:
            try:
                data += self.queue.get_nowait()
            except Empty:
                break
        if data == "":
            try:
                data += self.queue.get(True, 1)
            except Empty:
                pass
        return data


class Handler:

    def __init__(self, settings):
        self.__dict__.update(settings)
        self.next = 0
        self.magic = 0
        self.pages = {}

    def set_magic(self, page):
        self.pages[page].magic = str(self.magic)
        self.magic += 1

    def make(self, page):
        proc = Proc(self.command)
        self.pages[page] = proc
        self.set_magic(page)

    def create(self):
        while self.pages.get(str(self.next), None):
            self.next += 1
        page = str(self.next)
        self.make(page)
        return page

    def renew(self, page):
        page = str(page)
        if not self.pages.get(page, None):
            self.make(page)
        else:
            self.set_magic(page)
        return self.pages[page]

    def terminate(self, page):
        page = str(page)
        pass

    def __getitem__(self, page):
        return self.pages[str(page)]


class Terminus:

    def __init__(self, settings):
        self.settings = settings
        self.path = settings['path']
        self.logs = []
        bottle.TEMPLATE_PATH.insert(0, self.path + '/page')

        self.handlers = {}
        for typ, conf in self.settings['configurations'].iteritems():
            self.handlers[typ] = Handler(conf)

        self.app = Bottle()

        @self.app.route('/resources/<name:path>')
        def get_resource(name):
            return self.resource(name)

        @self.app.route('/favicon.ico')
        def favicon():
            pass

        @self.app.route('/log')
        def show_all_log():
            return "<br/>".join(": ".join(x) for x in self.logs)

        @self.app.route('/log/<what>')
        def show_log():
            if what == "*":
                return show_all_log()
            else:
                return "<br/>".join(": ".join(x) for x in self.logs if x[0] == what)

        @self.app.route('/<config>')
        def find_term(config):
            n = self.handlers[config].create()
            return redirect("/%s/%s" % (config, n))

        @self.app.route('/<config>/<page>')
        def term(config, page):
            # /resources/page/terminus.tpl (search for TEMPLATE_PATH)
            proc = self.handlers[config].renew(page)
            magic = proc.magic
            settings = self.handlers[config].settings
            if isinstance(settings, (list, tuple)):
                settings = ":".join("/resources/settings/" + s for s in settings)
            else:
                settings = "/resources/settings/" + settings
            return template(self.handlers[config].template,
                            termtype = config,
                            id = page,
                            magic = magic,
                            style = self.handlers[config].style,
                            settings = settings)

        @self.app.post('/<config>/<page>/setsize')
        def set_size(config, page):
            proc = self.handlers[config][page]
            if request.forms.magic == proc.magic:
                w = int(request.forms.w)
                h = int(request.forms.h)
                proc.set_size(max(w, 1), max(h, 1))

        @self.app.post('/<config>/<page>/get')
        def receive(config, page):
            proc = self.handlers[config][page]
            if request.forms.magic == proc.magic:
                x = proc.receive()
                return x
            else:
                raise HTTPError(503)

        @self.app.post('/<config>/<page>/send')
        def send(config, page):
            proc = self.handlers[config][page]
            if request.forms.magic == proc.magic:
                proc.send(request.forms.data)

        @self.app.post('/<config>/<page>/close')
        def close(config, page):
            self.handlers[config].terminate(page)


    def log(self, event, message):
        self.logs.append((event, message))

    def resource(self, name):
        return static_file(name, root = self.path)

    def run(self, **kwargs):
        run(self.app, **kwargs)






















# class Terminus:

#     def __init__(self, settings):
#         handler = Proc('bash')

#         self.settings = settings
#         self.path = settings['path']
#         self.handler = handler
#         bottle.TEMPLATE_PATH.insert(0, self.path + '/page')

#         self.app = Bottle()

#         @self.app.post('/setsize')
#         def set_size():
#             try:
#                 w = int(request.forms.w)
#                 h = int(request.forms.h)
#                 self.handler.set_size(max(w, 1), max(h, 1))
#             except:
#                 pass

#         @self.app.route('/get')
#         def receive():
#             x = self.handler.receive()
#             return x

#         @self.app.post('/send')
#         def send():
#             self.handler.send(request.forms.data)
#             return {'data': ''}
#             # return {'data': self.handler.receive()}

#         @self.app.route('/resources/<name:path>')
#         def get_resource(name):
#             return self.resource(name)

#         @self.app.route('/term')
#         @view('terminus') # -> /resources/page/terminus.tpl (search for TEMPLATE_PATH)
#         def get_term():
#             return {"style": self.settings['configurations']['bash']['style'],
#                     "settings": self.settings['configurations']['bash']['settings']}
#             # f = self.resource('terminus.html')
#             # return f




#     @self.app.route('/resources/<name:path>')
#     def get_resource(self, name):
#         return self.resource(name)

#     @self.app.route('/<config>')
#     def find_term(self, config):
#         n = self.next[config]
#         self.next[config] += 1
#         return redirect("/%s/%s" % (config, n))

#     @self.app.route('/<config>/<page>')
#     def term(self, config, page):
#         # /resources/page/terminus.tpl (search for TEMPLATE_PATH)
#         return template('terminus',
#                         termtype = config,
#                         id = page,
#                         style = self.conf[config]['style'],
#                         settings = self.conf[config]['settings'])

#     @self.app.post('/<config>/<page>/setsize')
#     def set_size(self, config, page):
#         try:
#             w = int(request.forms.w)
#             h = int(request.forms.h)
#             self.handlers[config][page].set_size(max(w, 1), max(h, 1))
#         except:
#             pass

#     @self.app.route('/<config>/<page>/get')
#     def receive(self, config, page):
#         x = self.handlers[config][page].receive()
#         return x

#     @self.app.post('/<config>/<page>/send')
#     def send(self, config, page):
#         self.handlers[config][page].send(request.forms.data)

#     @self.app.post('/<config>/<page>/close')
#     def close(self, config, page):
#         self.handlers[config][page].close()
#         del self.handlers[config][page]


#     def resource(self, name):
#         return static_file(name, root = self.path)

#     def run(self, **kwargs):
#         run(self.app, **kwargs)


