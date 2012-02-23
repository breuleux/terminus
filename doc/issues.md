
Issues
======


Security (1)
------------

Terminus currently runs a server on localhost, to which it connects
using a browser. Not only is all traffic unencrypted, but on a shared
machine, it suffices to connect to the appropriate localhost port to
have access to another user's shell. If you are the only user on your
machine, then it's all fine, otherwise I strongly advise not to run
Terminus in its current state.


Security (2)
------------

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
   parse!).

In my opinion, this is a major issue, because not all programs pay
attention to what they send on stdout. I reserve myself the right to
deprecate the current specification and block dangerous escape codes
by default if I judge that it is the best way to sanitize and secure
Terminus.


Interactivity
-------------

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
   <TERMINUS_TOKEN> w`` through stdout in order to agree to receive
   messages (else the shell assumes that the child doesn't want them).

3) The process can then send JavaScript workers through stdout. These
   workers, at any time, can send ``CSI ? 1 ; <TOKEN> w <message> ST``
   as terminal keystrokes.

4) When receiving that code, the shell looks at TOKEN and forwards the
   message to the corresponding child's stdin.

More precisely, when ``CSI ? 1;<A>;<B>;...;<Z> w <message> ST`` is
sent, then the topmost shell, upon reception, will send ``CSI ?
1;<B>;...;<Z> w <message> ST`` to process with token A. That process
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
