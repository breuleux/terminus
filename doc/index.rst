
================================================
Terminus - the terminal's most natural extension
================================================

.. _intro:

What is Terminus?
=================

Terminus is a terminal emulator with special capabilities, namely the
ability to print out inline HTML and let itself be manipulated by
JavaScript commands. Since these capabilities all work with escape
codes, applications require **no special libraries** in order to
trigger them.

Besides these perks, Terminus is (will be) an ANSI-compliant terminal,
meaning that it can be used as a drop-in replacement for an xterm,
without any compatibility issues. You can even SSH to any remote
machine you can SSH to, and send HTML to display from over there!


Why Terminus?
=============

One might wonder why exactly they would want to print inline HTML in a
terminal, let alone manipulate it with JavaScript commands. I could
try to appeal to the "wow, shiny!" factor (wow! cool progress bars!),
but people don't use terminals because they are good-looking.

Fortunately, there are many real practical uses to having richer
display options for terminals. Here are a few ideas:

* **Previews**: showing a quick preview of an image without popping a
  window above the terminal. This means you can start typing your next
  command immediately while looking at the image.

* **Plots**: Instead of painstakingly creating ASCII art of histograms
  (you've done it before, admit it), you can output actual histograms,
  with much better pixel precision, tighter packing, and barely more
  effort!

  * Or show arbitrary plots inline, or data in a nicely formatted
    table. The key point is that *you still have focus on the
    terminal* and you can type the next command immediately while
    looking at the graphic (e.g. "this datapoint is salient, I'll run
    more analyses on it").

  * Better yet, you can update a live plot by outputting appropriate
    JavaScript commands as new points are added!

  * You can also use a JavaScript library to zoom/pan the plot if
    needed (e.g. "wait, what's this? *zoom*").

* **Hidden information** Showing a condensed version of the output
  with a pop-out when you hover over or click certain parts. Useful to
  output a lot of information (or debug) without cluttering the
  screen.

  * Imagine an interactive shell for your favorite language. When
    printing an object of a certain type, it could display a small
    snippet with a "+" on the left. Clicking on the "+" would show all
    fields and values. Unobtrusive most of the time, priceless when
    you *unexpectedly* need some information.

  * Very long strings could be displayed as "first words ...", with
    trailing "...". When clicked, they would expand in full. Clicked
    again, they would be recompressed.

* If you want to visualize some data as an image (for instance, a
  spectrogram), you can do so easily without any imaging library by
  using the bitmap set mode.

* Pretty-printing mathematical expressions (see: Mathematica).

* If you have a lot of output, you can create a DIV with a maximum
  height and append the output to that DIV. That way, the output is
  constrained to a tidy box which you can review later, and it does
  not get in your way!

* Pipe to a file. ``cat`` the file. The HTML shows and the JavaScript
  is executed all the same (note: there might be slight interference
  if you ``cat`` more than once, because of DIV id clashes). This
  means you can easily save graphical output for later view.

In any case, as mentioned before, Terminus is a full terminal emulator
and can serve as a drop-in replacement for xterm. Just try it out for
a little while and see if its additional features ever come in
handy. And even if they don't... well, it's still a normal console, so
you lose nothing :)

Note that you can determine whether you are outputting to Terminus or
to some other terminal, and whether you are outputting to a terminal
or to a pipe - this is the kind of thing ``ls`` and other commands do
to output something different interactively than in a command
pipeline.

Therefore, it is very possible to override standard commands such as
``ls`` so that they display richly in Terminus, normally in other
terminals, and plainly to a file or pipe.


How it works
============

It's very simple: Terminus has the capability to print HTML and to
execute JavaScript through special escape codes. An escape code is a
series of characters one can print to the terminal to tell it to do
certain things, like move the cursor around or to a specific
coordinate, or insert/remove lines, or set the text color, and so
on. Many of these codes already exist. Most of them are of the form
``\x1B[`` (also called the CSI character; the sequence of the ASCII
characters 27 and 91), sometimes followed by a modifier (``?``, ``<``,
etc.), then followed by a semicolon-separated list of numbers, and
finally ending with a letter. For instance, ``\x1B[3A`` moves the
cursor up three rows and ``\x1B[1;3m`` sets the text to color
bold/bright yellow.

Terminus defines and recognizes special codes that greatly enhance the
expressiveness of terminals.

Let's see a quick example: to print out ``<b>Hello world</b>``, just
print out ``\x1B[?0z<b>Hello world</b>\x1B\x5C`` to the console (you
can use ``echo -e`` or the interactive shell for your favorite
language). Let's break it down:

1. ``\x1B[?0z`` is the *escape code*. The 0 corresponds to the
   **set_html** feature. Other numbers trigger other features.

2. ``<b>Hello world</b>`` is the HTML code we want to print out inline
   in the terminal.

3. ``\x1B\x5C`` is the ESC character followed by a backslash. It
   indicates the end of the HTML snippet, and tells Terminus to
   display it.

Most consoles will ignore the escape sequences (because they don't
know what they mean) and just print the HTML code in plain text
(that's pretty much what we want them to do in that case). Terminus,
on the other hand, will render the HTML.

No special libraries required!

For full documentation on the escape codes, see the :ref:`protocol`
section.


Contents
========

.. toctree::
   :maxdepth: 3

   protocol
   future


Indices and tables
==================

* :ref:`genindex`
* :ref:`modindex`
* :ref:`search`

