
Terminus - xterm++
==================

Terminus is a terminal emulator with the ability to create and
manipulate inline HTML cells in addition to plain text. In its current
state, it can already serve as an xterm replacement (bar some escape
codes that are not yet supported).

Install
-------

You will need Python >=2.6 with the packages ``bottle``, ``paste``,
``pexpect`` and ``yaml``.

Then, position yourself in the root project directory and execute ::

  bin/terminus resources/

Then open your browser at ``http://localhost:8080/bash``. It should
work fine with Chrome. I have not tried with any other browser, but it
shouldn't be difficult to make Terminus work everywhere. Instead of
``bash``, you can also go to ``debug`` or ``python``.

**IMPORTANT**: client/server communication is not encrypted at
all. Only run Terminus locally, and don't run it on a shared machine!

Using
-----

Terminus is used much like a normal xterm. You can run commands, top,
emacs, vi, ipython, irb, ssh, without many problems. Not all escape
codes are handled yet and there might be some slight bugs in those
that are, so commands like reset (!) and screen are iffy, and for some
reason ipython seems to show the wrong colors. Also, *paste with
Ctrl-V*.  But hey, project is only two weeks old after all.

Right now, Terminus's novel capabilities are not really shown off
because my priority is to make the whole system as solid as
possible. It is very easy to use, though. Start with typing this in
the terminal ::

  echo -e '\x1B[?11z<b>Hello world!</b>\x1B\\'

Note that this is the standard echo, *not* a hacked up version. Have
some fun using an <img> tag instead, or make a table (you might have
to style it, else it'll be black on black). Now try this ::

  echo -e '\x1B[?11;;19z<b>Hello</b>\x1B\\'
  sleep 1
  echo -e '\x1B[?11;;19z<b>world!</b>\x1B\\'

The 19 is arbitrary: it's a "nest id" telling Terminus where to put
stuff. The first command will create the div since it doesn't already
exist and the second command will append to what was already
created. The nests 1, 2, 4 and 5 are special: they represent top,
left, right and bottom respectively. Try them!

You can also execute JavaScript in the appropriate context ($ is
jQuery)::

  echo -e '\x1B[?100;;19z$(this.element).append("<i>test</i>")\x1B\\'

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

See the server.yaml and default.yaml files in resources/settings. They
are documented. If you change default.yaml you can just refresh the
page to see the changes.

What needs to be fixed
----------------------

Terminus is still under heavy development. It is usable in its current
state, but there are some cases where it'll hang up (just refresh if
that happens, it won't lose your session). The server never closes the
ptys it creates. The documented escape codes are not all implemented
yet. Many standard vtXXX escape codes are not implemented (and some of
them I'm not even sure what they do exactly). The console is more
sluggish than I feel that it should be (especially evident when you
open an emacs session in it with clear background). It also uses a bit
too many resources.

But anyway... have fun! And give me some feedback :)
