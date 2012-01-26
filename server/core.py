
from bottle import Bottle, run, static_file, request
# from .asyncproc import Process
# from subprocess import Popen, PIPE
from threading  import Thread
from Queue import Queue, Empty
from pexpect import spawn, EOF, TIMEOUT

class Echo:

    def __init__(self):
        self.state = ""

    def send(self, new):
        self.state = new

    def receive(self):
        if self.state:
            x = chr(int(self.state))
            self.state = ""
        else:
            x = ""
        return x



class Proc:

    def __init__(self):

        self.proc = spawn('bash')

        self.queue = Queue()
        self.thread = Thread(target = self.enqueue)
        self.thread.daemon = True
        self.thread.start()

    def enqueue(self):
        while True:
            try:
                # self.proc.expect('.', 1)
                # x = self.proc.after
                x = self.proc.read(1)
                # print("received:", x)
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
        # self.proc.stdin.write(new)
        # self.proc.stdin.flush()

    def receive(self):
        data = ""
        while True:
            try:
                data += self.queue.get_nowait()
            except Empty:
                break
        # print 'recv:', data
        return data



def selfroute():
    pass


class Terminus:

    def __init__(self, path, handler):
        self.path = path
        self.handler = handler
        self.app = Bottle()

        @self.app.post('/setsize')
        def set_size():
            # print "AWTEWATWARW", request.forms.w, request.forms.h
            self.handler.set_size(int(request.forms.w),
                                  int(request.forms.h))

        @self.app.route('/get')
        def receive():
            x = self.handler.receive()
            return x

        @self.app.post('/send')
        def send():
            self.handler.send(request.forms.data)
            return {'data': self.handler.receive()}

        @self.app.route('/resources/<name>')
        def get_resource(name):
            return self.resource(name)

        @self.app.route('/term')
        def get_term():
            return self.resource('terminus.html')

    def resource(self, name):
        return static_file(name, root = self.path)

    def run(self, host, port):
        run(self.app, host = host, port = port)


