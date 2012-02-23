
Applications
============

In the `bin/` directory of the Terminus program, I have included
several commands making use of Terminus's capabilities. Help for all
commands can be gotten with `command --help`.


dr
--

**Usage**: `dr [options] <file(s)>`

List files. By default, it will display a sequence of small inline
divs containing clickable file names. In all honesty, I think the
column-based display `ls` has by default might be more readable, but I
like to try things.

`dr -l` will display in long form, much like `ls -l`. Unlike `ls`,
however, `dr` displays tidy sortable columns. You can also sort them
programmatically by doing e.g. `dr -l; tcmd '!tb sort Size'` (note:
this trick works on all tables, as long as you print out that command
right after it is displayed, while it is still on the current logical
line).

I also threw an amusing feature: try `dr --bar` to get a histogram of
the file size in a column. Also try `dr --bar --flow`, or `dr -l
--flow`, or `dr --table`.

Overall, `dr` is not particularly useful over `ls` (it could be, if I
had any good ideas), but it is a showcase. I recommend trying out `dr
-l | cat -v`. This will give you a feel of what to print to get a
similar table display.


show
----

**Usage**: `show <image/audio/video file or url>`

`show` does precisely what the name says: it shows something
graphically. You can show images on the filesystem, or from the
net. If you mount a remote filesystem using, say, sshfs, you can
display remote images as well, see `server/server.yaml` for
information on how to set up the configuration.

You can use the `-w` and `-h` flags to set the width and height,
respectively, of the element to display. Using the `--handler=iframe`
option will allow you to display pretty much anything a browser can
inside of an iframe.

Current issues: not many supported formats, audio and video don't seem
to work very reliably.


xkcd
----

**Usage**: `xkcd <comic #>`

This will show you the latest [xkcd](http://xkcd.com) comic by Randall
Monroe. You can also give a comic number to view that comic in
particular, and use the `-i` flag to see the date, transcript, etc.


box
---

**Usage**: `box <command>`, `<command> | box`

`box` allows you to box the output of a command. Essentially, this
creates a mini-terminal inside the main terminal where the command is
executed. You can execute any command with it, and you can even pipe
the output of a command to `box` and have it do the right thing.

The `-rROWS` and `-cCOLUMNS` options let you pick the number of rows
and columns of the box. The `-n` option lets you pick a "nest" where
to put the mini-terminal (this is mostly useful when n=1,2,4 or 5,
corresponding to top, left, right and bottom, until I add explicit
options for them).

You can start an interactive program in a box, interact a bit, and
then stop the program, run it in the background, and put it back in
foreground. When you put the box back in the foreground, it will
"jump" from where it was in the stream, and back to the bottom. Any
output of the boxed program will stay in the box, even if it is
running in the background.

Current issues: there are several issues with box:

1. The box does not seem to refresh when text is sent by a background
   process (it does get there, though, as you can see if you send the
   process back to the foreground). Should not be too difficult to
   fix.

2. `box` messes up the bash history, but only when it's run in
   Terminus. I have absolutely no idea why.

3. It is currently not possible to run box in the background
   immediately (i.e. you can't do `box dr &`). You have to run it in
   the foreground, then stop and let it run as a background process
   (e.g. `box dr`, `C-z`, `bg`).


tcmd
----

**Usage**: `tcmd <terminus command>`

`tcmd` is a command-line interface to Terminus's various features. In
a sense, it is similar to `tput`.

Essentially, you can provide a semicolon-separated (you can set
another delimiter with the `-d` option) list of commands. Each command
will be prefixed by the appropriate escape code (typically `ESC[?0y`).

The `-n` option can be used to set the nest.

Example uses:

```bash
tcmd '+h; :h <span>This soup is </span>; :h <b>AMAZING</b>'
tcmd '+tb color\tfruit; :tb yellow\tlemon; :tb orange\torange; :tb red\tstrawberry; !tb sort color'
```









