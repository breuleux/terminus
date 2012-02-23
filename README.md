
Terminus - xterm++
==================

Terminus is a terminal emulator with the ability to create and
manipulate inline HTML cells in addition to plain text. In its current
state, it can already serve as an xterm replacement (bar some escape
codes that are not yet supported).

Install
-------

Terminus requires `node` to be installed. A bit annoyingly, the
`tty.setWindowSize` function, which allows terminal resizing,
disappeared in node 0.6.0, so you'll have to install an older version
for the time being. Here's exactly what to do:

``` bash
# install node
wget http://nodejs.org/dist/v0.5.9/node-v0.5.9.tar.gz
tar -zxvf node-v0.5.9.tar.gz
cd node-v0.5.9
./configure && make && make install

# install npm
curl http://npmjs.org/install.sh | sh

# start the server
cd /path/to/terminus
cd server
npm install
node --use-legacy terminus-server.js server.yaml

# open the client (chrome recommended, but firefox should work ok)
google-chrome http://localhost:8080/bash
```

You can also go to /debug or /python instead of /bash. Read the
`server.yaml` file.

If you don't want to mess with an existing, more recent version of
node, you can install node 0.5.9 in some isolated place with
`configure --prefix=~/local`, or you can omit `make install` and run
`/path/to/node/out/Release/node`.

There's also a Python server but it's pretty bad compared to the node
one (plus, I broke it). You can go back in time on the repo (Feb
15-ish) if you want to try that.

**IMPORTANT**: client/server communication is not encrypted at all
(for the time being - integrating ssl should be easy enough). Only run
Terminus locally, and don't run it on a shared machine!

**IMPORTANT**: using escape codes, programs can do arbitrary
javascript injection, and this includes simulating keyboard strokes
and typing commands on your shell. Because of this, it is technically
possible for serious wreckage to occur with a mere *cat* of a
malicious file. Anybody who can tell me how to properly sandbox
JavaScript within JavaScript to avoid this gets a cookie.


Using
-----

Terminus is used much like a normal xterm. You can run commands, top,
emacs, vi, ipython, irb, ssh, without many problems. Not all escape
codes are handled yet and there might be some slight bugs in those
that are, so commands like reset (!) and screen are iffy, and for some
reason ipython seems to show the wrong colors. You can paste with
Ctrl+V or the mouse wheel.

You can start exploring with the applications that are in `bin/`. So
far, they are `dr`, `show`, `tcmd` and `xkcd`. You will have to add
them to your `PATH` in order to execute them unqualified.

I have taken screenshots of myself using each of the commands. I think
they speak for themselves.

```
dr
```

![dr](https://raw.github.com/breuleux/terminus/master/media/screenshots/dr.png)

```
show
```

![show](https://raw.github.com/breuleux/terminus/master/media/screenshots/limecat.png)


```
xkcd
```

![xkcd](https://raw.github.com/breuleux/terminus/master/media/screenshots/xkcd.png)


```
tcmd
```

![tcmd1](https://raw.github.com/breuleux/terminus/master/media/screenshots/tcmd.png)

(note: the tb example doesn't work like that anymore, you now have to
use \t as a separator instead of a space)

![tcmd2](https://raw.github.com/breuleux/terminus/master/media/screenshots/sandwich.png)

The Terminus server gives access to the filesystem in
`/f/user@host/path/from/root`, so you can link to files or images on
the filesystem that way.

So, you see, it's really easy. Since it works with escape codes on
stdout, you can take advantage of the features in any language without
any special libraries, and it works through plain SSH as well (except
obviously for the fact that the remote filesystem won't be on /f, so
don't bother linking to images, you'll have to transmit them
somehow). It doesn't work with screen, though, because screen actually
eats up the escape codes - they never get to the terminal. I'd say it
is not my problem :)

Documentation
-------------

See
 [protocol](https://github.com/breuleux/terminus/blob/master/doc/protocol.md),
 [commands](https://github.com/breuleux/terminus/blob/master/doc/commands.md),
 [apps](https://github.com/breuleux/terminus/blob/master/doc/apps.md).

Configuration
-------------

See `server/server.yaml` and `resources/settings/default.yaml`. The
options are extensive (including nearly total customization of key
bindings), and documented. If you change default.yaml you can just
refresh the page to see the changes (you won't lose your session - it
will connect right back to it).

