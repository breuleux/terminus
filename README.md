
**Note:** even though the project might seem dead, I do use this
  terminal. It just happens to be good enough for my purposes so I
  don't bother updating it. If you have trouble making it work, have
  suggestions or want to contribute anything, please do tell me about
  it :)

Terminus - VT100 emulator + inline HTML
=======================================

Terminus is a terminal emulator with the ability to create and
manipulate inline HTML cells in addition to plain text. In its current
state, it can already serve as an xterm replacement (bar some escape
codes that are not yet supported).

For the most part, Terminus plays nice with existing UNIX utilities: I
have organized most of its capabilities in a line-based approach, so
notwithstanding one or two gotchas, they play nice with command-line
utilities such as `grep` or `sed`. Since it's all based on escape
codes, the enhanced display options also work through SSH.


Install
-------

Terminus requires `node` and its package manager, `npm`, to be installed.

``` bash
# Start the server
cd path/to/terminus
cd server
npm install
node terminus-server.js server.yaml

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

Terminus is used much like a normal xterm. You can run commands like
top, emacs, vi, ipython or ssh without many problems. Not all escape
codes are handled yet and there might be some slight bugs in those
that are, so commands like reset (!) and screen are iffy, and for some
reason ipython seems to show the wrong colors. You can paste with
Ctrl+V or the mouse wheel.

You can start exploring with the applications that are in `bin/`. So
far, they are `dr`, `show`, `tcmd`, `box` and `xkcd`. You will have to
add them to your `PATH` in order to execute them unqualified.

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
box
```

![box](https://raw.github.com/breuleux/terminus/master/media/screenshots/box.png)


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
obviously for the fact that the remote filesystem is not mounted by
default - but you can do it with sshfs and config).

Useful shortcuts
----------------

`Shift-Space <letter>`: Same as `Control-<letter>`, but since most
browsers don't allow catching some shortcuts (e.g. `Control-w`) this
is the only way to send some control codes. I might change that
binding, because it's too easy to accidentally hit shift-space right
after a shifted characted.

`Control-Shift-b`: Drop all unprocessed characters in the queue. This
is handy if a program prints data faster than Terminus can handle it.

`Control-Shift-c Space`: Clear elements that are absolutely positioned
at the top, left, right and bottom of the terminal screen, if they are
present.

`Control-Shift-d <shortcut>`: bypasses Terminus's key bindings and
uses the browser's default bindings instead. For instance, `C-S-d C-l`
will focus the url bar.

`Control-Shift-l`: Clear all lines in the scrollback.

`F5`: Refresh the page. This does not terminate your session and will
solve most problems, at the expense of losing the screen's contents
and the scrollback.

The list of key bindings can be found
[here](https://github.com/breuleux/terminus/blob/master/resources/settings/default.yaml).


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

