
Roadmap
=======

Prioritary goals
----------------

**Plots and bitmaps**: this is what is lacking for Terminus to be
really useful for scientific work.

**Code cleanup**: The code is very messy right now, and mostly
undocumented. I am probably the only person who can maintain it right
now. I intend to reorganize it and make proper API documentation so
that others may improve and extend the framework.

**SSL support**: Terminus works on a plain unsecured http connection
right now, so it is unsuitable to run it remotely or on a shared
machine.

**Processing speed**: Terminus takes too much time to process certain
commands, which means that it ends up choking under load in some
circumstances. Several tricks could be used to solve this problem,
such as determining when output is going to go directly into
scrollback, or precalculating some things on the server side in a more
efficient way.


Goals for version 2
-------------------

**Terminus readline**: it would be easy to replace readline in CLI
programs by an HTML/JS interactive prompt. Nothing too shiny, but
features like tab completion, multi-line editing or syntax
highlighting would look and work better. Furthermore, the package
could include a way to dispatch messages from the terminal to
processes that might want to listen to them.

**General data exchange format**: it is my opinion that HTML is a
terrible document description language, and that most existing data
exchange formats (XML, JSON, etc.) are also terrible. I wish to
implement an alternative from the following principles:

* No printable character is special. Non-printable C0 control
  characters (ASCII 0 to 31) are co-opted as special characters
  instead.

* Special characters always mean the same thing, all the time,
  regardless of where they are.

* All strings are syntactically valid. Syntax errors are impossible.

* For all documents and all substrings in that document (special
  characters notwithstanding), there should be an equivalent document
  such that the given substring occurs at the very end of the document
  (this is akin to the idea that you can print something anywhere on
  your terminal screen if you send an escape code to change the cursor
  position - but generalized to structured data).

* It should be possible to write a complete parser in 15 minutes in
  any (non-esoteric) language with no help from any libraries. It
  should be possible to write code that always correctly assesses the
  "boundaries" between elements of a stream in five minutes.

Essentially, my idea is to have a data structure containing both a
"stream" of characters and sub-streams (its children), and a set of
"tags" acting as a sort of type (with no enforced semantics, much like
there are no enforced semantics on HTML classes, or on XML
tags/attributes in general).

I would reserve two non-printable characters to serve as nestable
"stream start" and "stream end" characters. Special characters would
serve to encode such concepts as "my siblings form a tag", or "they
form a normal stream", or "they name a character".

The document would also have a set of "cursors" that special codes
could move about as a unit. The objective would be to have a document
description that can be modified by printing commands such as "move to
previous sibling, enter it, split cursors among all children with tag
X, append Y to all, revert cursor".

Ultimately, this is intended to act as a "rich stdout": lightweight
enough that anyone can make a correct parser with a bunch of loops and
counters, powerful enough to represent any kind of structure, flexible
enough to encode structural modifications as afterthoughts, and 








