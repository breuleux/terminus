
import sys

class Printer:

    def __init__(self, nest_type = "h", nest = ()):
        self.nest_type = nest_type
        self.nest = nest

    def at(self, *nest):
        return Printer(self.nest_type, self.nest + nest)

    def command(self, action, *args, **kw):
        if action not in '+:/~!':
            raise TypeError('Not an allowed action: ' + action)
        nest = self.nest + kw.pop('nest', ())
        end = kw.pop('end', 1310)
        esc = kw.pop('esc', 1)
        where = kw.pop('where', sys.stdout)
        s = "\x1B[?0{end}{esc}{nest}y{action}{type} {contents}{endc}".format(
            end = ";" + str(end) if (end != 1310 or esc != 1) else "",
            esc = ";" + str(esc) if (esc != 1) else "",
            nest = (";;" + ";".join(map(str, nest))) if nest else "",
            action = action,
            type = self.nest_type,
            contents = " ".join(map(str, args)),
            endc = chr(end) if end != 1310 else '\n')
        try:
            where.write(s)
            where.flush()
        except IOError:
            pass

    def js(self, *args, **kw):
        nest = self.nest + kw.pop('nest', ())
        end = kw.pop('end', None)
        esc = kw.pop('esc', None)
        where = kw.pop('where', sys.stdout)
        s = "\x1B[?100{end}{esc}{nest}y{contents}{endc}".format(
            end = ";" + str(end) if end else "",
            esc = ";" + str(esc) if esc else "",
            nest = ";;" + ";".join(map(str, nest)) if nest else "",
            contents = ";".join(map(str, args)),
            endc = chr(end or 10))
        try:
            where.write(s)
            where.flush()
        except IOError:
            pass

    def new(self, *args, **kw):
        return self.command('+', *args, **kw)

    def append(self, *args, **kw):
        return self.command(':', *args, **kw)

    def set(self, *args, **kw):
        return self.command('/', *args, **kw)

    def mod(self, *args, **kw):
        return self.command('~', *args, **kw)

    def do(self, *args, **kw):
        return self.command('!', *args, **kw)

    def __call__(self, *args, **kw):
        return self.append(*args, **kw)

class printers:
    h = Printer("h")
    svg = Printer("svg")
    tb = Printer("tb")
    t = Printer("t")


if __name__ == '__main__':
    pr = printers.h.at(0, 99)
    pr1 = pr.at(1)
    pr2 = pr.at(2)
    pr3 = pr.at(3)
    for i in range(16):
        i = hex(i)[2:]
        pr1.set('style', '.c{i} {{color: #{i}00}}'.format(i = i))
        pr1('<div class=c{i}>RED {i}</div>'.format(i = i))
        pr2.set('style', '.c{i} {{color: #0{i}0}}'.format(i = i))
        pr2('<div class=c{i}>GREEN! {i}</div>'.format(i = i))
        pr3.set('style', '.c{i} {{color: #00{i}}}'.format(i = i))
        pr3('<div class=c{i}>BLUE! {i}</div>'.format(i = i))

