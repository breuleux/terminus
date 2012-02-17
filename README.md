
Terminus - xterm++
==================

Terminus is a terminal emulator with the ability to create and
manipulate inline HTML cells in addition to plain text. In its current
state, it can already serve as an xterm replacement (bar some escape
codes that are not yet supported).

Install
-------

Terminus requires `node` to be installed. A bit annoyingly, the
`setWindowSize` function, which allows resizing the pty, disappeared
in node 0.6.0, so you'll have to install an older version for the time
being. Here's exactly what to do:

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

**IMPORTANT**: client/server communication is not encrypted at
all. Only run Terminus locally, and don't run it on a shared machine!

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

Right now, Terminus's novel capabilities are not really shown off
because my priority is to make the whole system as solid as
possible. It is very easy to use, though. Start with typing this in
the terminal:

``` bash
echo -e '\x1B[?0y:h <img src="http://www.catfacts.org/american-bobtail-cat-facts.jpg" />'
```

Note that this is the standard echo, *not* a hacked up version. Have
some fun using an <img> tag instead, or make a table (you might have
to style it, else it'll be black on black). Now try this:

``` bash
echo -e '\x1B[?0;;19y/h style b {color: red}'
echo -e '\x1B[?0;;19y:h <b>Hello</b>'
sleep 1
echo -e '\x1B[?0;;19y:h <b>world!</b>'
```

The 19 is arbitrary: it's a "nest id" telling Terminus where to put
stuff. The first command will create the div since it doesn't already
exist and the second command will append to what was already
created. The nests 1, 2, 4 and 5 are special: they represent top,
left, right and bottom respectively.

The Terminus server gives access to the filesystem in
/f/path/from/root, so you can link to files or images on the
filesystem that way.

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

There is more documentation in doc/, use ``make html`` (you'll need
``sphinx``), or you can read as plain text if it suits your fancy.

Do note that the documentation is a bit of a design document
sometimes, and some features it describes are not really implemented
yet.

Configuration
-------------

See `server/server.yaml` and `resources/settings/default.yaml`. They
are documented. If you change default.yaml you can just refresh the
page to see the changes.
