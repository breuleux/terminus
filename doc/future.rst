
===============
Future features
===============

.. _future:

There are several huge features planned for Terminus. Here's an
overview:


Security (1)
============

Right now, Terminus's security model is similar to Superman, in the
sense that it's a damn shame it doesn't exist.

Terminus currently runs a server on localhost, to which it connects
using a browser. Not only is all traffic unencrypted, but on a shared
machine, it suffices to connect to the appropriate localhost port to
have access to another user's shell. If you are the only user on your
machine, then it's all fine, otherwise I strongly advise not to run
Terminus in its current state.

Since I am the only user on my computer, I didn't really bother much
with making Terminus more secure, but certainly that's a requirement
for many users. My secret hope is that somebody else likes Terminus
enough to do it for me :D


Security (2)
============

There is another security problem (harder to solve, therefore
potentially much more serious): using escape codes, programs can do
arbitrary javascript injection, and this includes simulating keyboard
strokes and typing commands on your shell. Because of this, it is
technically possible for serious wreckage to occur with a mere *cat*
of a malicious file.

Several measures could be taken to solve this issue:

1. Prevent any code contributed through escape codes from seeing or
   manipulating the routines that feed input directly to the
   underlying terminal. Instead, they might get the option to send
   "wrapped" input, encoded so to be harmless. Also block them from
   doing any kind of screen scraping. I don't know how to do that yet,
   pray tell if you have any ideas (ideas that *provably* work).

2. Drop HTML and JavaScript support and use a properly controlled
   interchange format (perhaps s-expressions? they are easy to
   parse!), and/or the *line tag* idea presented further.

In my opinion, this is a major issue, because not all programs pay
attention to what they send on stdout. I reserve myself the right to
deprecate the current specification and block dangerous escape codes
by default if I judge that it is the best way to sanitize and secure
Terminus.


Line tags
=========

It would be nifty if it was possible to output rich text AND
manipulate it with standard line-based utilities such as grep, sort,
uniq and so forth. That won't work very well with html: even if you
pay attention not to put newlines in the output, it will be a headache
to grep contents without also grepping tags.

One possible solution to this issue would be to issue new versions of
grep and co. that recognize escape codes. On normal lines they behave
normally, but when they see the escape code for HTML, they switch
behavior to something more appropriate. But there are several
additional issues with this: first, people would have to use a new
command; second, we would have to implement something like HTML
search; third, on a normal terminal, HTML output is still completely
unreadable.

Here is my proposed solution: an escape code to *tag* lines. For
instance, listing a directory might produce ::

    OSC \x01 BEL file1
    OSC \x01 BEL file2
    OSC \x01 BEL directory/

Where OSC is ``\x1B]``, BEL is ``\x07`` and the character ``\x01``
means "this is a file" (we can use an arbitrary long sequence of
well-chosen characters to describe pretty much any content type). The
file itself is the rest of the line, up to a newline or to a zero
character. Now let's see where this leads us:

* On most terminals, the escape code, up to BEL, does not print. The
  output is identical to that of ls. This is good, because it means
  nobody needs Terminus to read it.

* Using the standard grep on that stream will usually filter the same
  lines as before. Since none of the characters in the tag are
  printable except for a lone ``]``, very few uses of grep will match
  them in practice. As for checking for the start of a line, as an
  easy workaround, one can check for ``ST`` instead.

* Utilities such as sort and uniq will work as before if the tags on
  all lines match. With most sane uses, that would be the case.

Now, clearly, a blanket replacement of standard utilities such as
``ls`` to output these tags is unthinkable: a low, but still
significant number of scripts would break as a result. However, and
this is key, if one was to add a new program which did, it would play
nice with all other utilities, and provided they were compelled to use
it by Terminus, and that Terminus and these utilities eventually made
their way into standard distributions, they would never feel a need to
fall back to the originals.

Now, if we have these tags, we can use them: upon reception of a tag,
Terminus can stall display until it sees a newline, and then it can
format the data properly. If it sees the "file" tag and a filename, it
can decide to color-code it, or to display it as a link. If it sees a
"table-header" tag, it can create a table, and when it sees a "row"
tag it can append it to the appropriate table.

One advantage of this strategy is that functions like ls don't have to
resort to dirty tricks to determine whether they are running
interactively or feeding their output to a pipe (see: ``ls`` versus
``ls|cat``). They can just output tagged lines: the tags will not
affect most utilities, nor will they show up in most terminals, but
Terminus and other clients can choose to display the data richly. And
since most utilities won't strip tags, something like ``ls|grep x``
will *still* display richly, rather than fall back to a plain sequence
of uncolored lines.


Interactivity
=============

As it stands, it is difficult for HTML elements added with Terminus to
communicate back to the process that printed them. For instance,
perhaps we would like to print out a form that the user can fill and
submit by clicking a button (among other things). Currently, it is
possible to insert JavaScript on the page to write on the terminal as
if the user was typing, but that can only communicate with the
foreground process, and we can't really check with certainty that the
foreground process is the right one.

Ideally, for maximal compatibility, we would like to *embed* the
protocol in stdin/stdout. As far as I can tell, this requires
enlisting help from the shell, or from a thin wrapper around it. The
protocol would be as follows:

1) Prior to executing a child process, the shell sets the
   TERMINUS_TOKEN environment variable to some unique numerical value
   (probably concatenating the pid with the time).

2) The child process reads TERMINUS_TOKEN to verify that the shell can
   route requests to it. It then responds with the code ``CSI ?
   <TERMINUS_TOKEN> y`` through stdout in order to agree to receive
   messages (else the shell assumes that the child doesn't want them).

3) The process can then send JavaScript workers through stdout. These
   workers, at any time, can send ``CSI ? 1 ; <TOKEN> y <message> ST``
   as terminal keystrokes.

4) When receiving that code, the shell looks at TOKEN and forwards the
   message to the corresponding child's stdin.

More precisely, when ``CSI ? 1;<A>;<B>;...;<Z> y <message> ST`` is
sent, then the topmost shell, upon reception, will send ``CSI ?
1;<B>;...;<Z> y <message> ST`` to process with token A. That process
can then further dispatch the message to its own children. If there is
only one token in the list, then the escape code is stripped out.

Now, of course, the shell has to be aware of this protocol. What
happens if it isn't? Well, the worst thing that could happen is that a
non-aware bash session is started from an aware session, thus
inheriting TERMINUS_TOKEN, and unwittingly transmits the same token to
all children processes. One could forcefully reset the variable in
configuration, but that doesn't solve the general problem that calls
to fork() can *silently break* the communication channel we're trying
to establish. For this reason, a sensible solution would be for child
processes to respond to TERMINUS_TOKEN with their own PID, and for the
parent to verify that the PID is correct. Over SSH, at least there is
not as much of an environment inheritance problem (if you want to
transmit environment variables, you actually have to try), so it
shouldn't be too difficult to make the protocol work safely.
