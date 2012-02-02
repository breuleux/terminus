
.. _protocol:

=================
Terminus protocol
=================

Nesting
=======

Terminus not only allows the display of inline HTML, it also allows
*nesting* these elements. The **nest** of an element is a sequence of
integers identifying where to find it - an address of sorts. Using
this address, one can easily append new data to an existing element,
or execute JavaScript commands on it, if needed.

When a command takes a *nest* parameter, it expects a list of
semicolon-separated numbers. If that list is, say, ``1;42;3``, this
means "take the 1st child of the root, then the 42nd child of that
child, and then the 3rd child of that".

The effect of adding an element to a nest depends on what kind of nest
it is:

* It is ``addChildNode`` of the element if the nest is a div. That
  just appends it to the end.

* If the nest is a Terminus screen, then the element will be placed on
  the row the cursor lies in. Note that regardless of the actual
  height of the element, it takes up exactly one *logical* row, as far
  as the screen is concerned.

.. note::

  If any character is written on the logical row occupied by an HTML
  element after its insertion, said element is scrapped and the row's
  text is printed instead.

.. note::

  The integer id of a nest does not indicate its order with respect to
  its parent. Indeed, the nests may be created in any order, and some
  ids may even be skipped entirely.


Terminology
===========

* ``CSI`` is the sequence of two characters ``\x1B\x5B``, that is, the
  escape character followed by the ``[`` character.

* In the syntax bits, ``[x]`` means that ``x`` is optional, and
  ``<x>`` means ``x`` is a parameter.

* ``ST`` is the sequence of two characters ``\x1B\x5C``, that is, the
  escape character followed by the ``\`` character.


0-9: Setting
============

A setter tells Terminus two things:

1. How to construct an element to insert in the document.

2. Where that element should be put.

The second point is always given by the ``nest`` parameter. If the
specified nest already exists, the old element is replaced by the
new. If not, it is created.

.. note::

  In the context of **set** commands, if no nest is given, this
  amounts to replacing the Terminus screen itself by another
  element. Terminus may be instantiated with an option preventing
  this.

0: set_text
-----------

**Syntax**: ``CSI`` ``?`` ``1`` ``[;;<nest>]`` ``z`` ``<text>`` ``ST``

Tells Terminus to set the specified nest to some DIV containing the
given plain text (printed verbatim).

When giving the nest, it is important to use *two* semicolons.


1: set_html
-----------

**Syntax**: ``CSI`` ``?`` ``1`` ``[;<h>[;<w>]]`` ``[;;<nest>]`` ``z`` ``<html>`` ``ST``

Tells Terminus to set the specified nest to an instantiated DOM
element corresponding to the HTML code given.

If ``h`` is nonzero, the element will span ``h`` rows. If ``w`` is
nonzero, the element will span ``w`` columns (both ``h`` and ``w``
default to 0).

When giving the nest, it is important to use *two* semicolons.


2: set_bitmap
-------------

TBD

3: set_mime
-----------

TBD

4: set_json
-----------

TBD

4: set_tagged
-------------

TBD



10-19: Appending
================

Similarly to a setter, an appender tells Terminus two things:

1. How to construct an element to insert in the document.

2. Where that element should be *appended*.

The second point is always given by the ``nest`` parameter. If the
specified nest does not already exist it is created.

An element added in this way *does not get a nest*, and as such it is
not addressable, though the user may address it by other means,
e.g. through JavaScript (not recommended).

If no nest is given, the element will be appended to the root.


10: append_text
---------------

**Syntax**: ``CSI`` ``?`` ``10`` ``[;;<nest>]`` ``z`` ``<text>`` ``ST``

Tells Terminus to add the given plain text to the nest. If the nest is
a Terminus terminal, it will be as if the text was received by the
terminal through stdout of the current process.

When giving the nest, it is important to use *two* semicolons.


11: append_html
---------------

**Syntax**: ``CSI`` ``?`` ``11`` ``[;<h>[;<w>]]`` ``[;;<nest>]`` ``z`` ``<html>`` ``ST``

Tells Terminus to *append* an instantiated DOM element corresponding
to the HTML code given to the specified nest.

If ``h`` is nonzero, the element will add ``h`` rows. If ``w`` is
nonzero, the element will add ``w`` columns (both ``h`` and ``w``
default to 0).

When giving the nest, it is important to use *two* semicolons. If no
nest is given, the new element will be appended to the root.


12: append_bitmap
-----------------

TBD

13: append_mime
---------------

TBD

14: append_json
---------------

TBD

15: append_tagged
-----------------

TBD


100-110: Scripting
==================

The following commands execute scripting commands in the browser with
the specified nest as their context.

100: javascript
---------------

**Syntax**: ``CSI`` ``?`` ``100`` ``[;;<nest>]`` ``z`` ``<javascript>`` ``ST``

Execute JavaScript code in the context of the specified nest.

Once received, Terminus executes the code verbatim, with the ``this``
variable set to the target context. The command may use the jQuery
library (be careful if ``this`` is a Terminus instance and not a DOM
element!).

.. todo::

  ``terminus.$(this)`` may be used to get a handle to a Nest object,
  on which methods such as ``set``, ``append`` and ``get_child`` are
  defined. It is much preferable, however, to use the specific codes
  when they exist.


101: coffeescript
-----------------

TBD


200-210: Nesting
================

These commands manipulate nests: creating, demoting, removing, etc.

200: create
-----------

**Syntax**: ``CSI`` ``?`` ``200`` ``[<nest>]`` ``z``

**Response**: ``CSI`` ``?`` ``200`` ``[<nest>]`` ``z``

This finds a child of the given nest that doesn't already exist,
creates it, and reports back about it in a response. The response
arrives through stdin (it's just as if the user had typed it
themselves). Use this to create unique nests, to avoid interference
with other programs.

The nest in the response will have one more element than the nest in
the request. For example, you might send ``\x1B[?200z`` and read back
``\x1B[?200;1z``, or send ``\x1B[?200;7;1;13;99z`` and receive
``\x1B[?200;7;1;13;99;66z``.

.. note::

  The newly created nest will be an empty ``div``, but you can use one
  of the ``set_X`` commands to discard it afterwards.

.. warning::

  Even though it might appear unnecessary to do so, it is sometimes
  necessary to call ``recreate`` (see below) on the nest that was
  reported back before using it. The reason why is that if you store
  the program's output into a file to print it back, the nests are
  hardcoded in the stream. Think about what happens if you print the
  file twice: the same nest will be reused, so you won't see the
  output twice, you'll see it once, and then it will be refreshed in
  the same place.

  In the future, a smart shell could solve the issue by creating a
  fresh nest for every process and filtering the escape codes to make
  sure that different processes don't share nests.

201: demote
-----------

**Syntax**: ``CSI`` ``?`` ``201`` ``[<nest>]`` ``z``

This *invalidates* the target nest if it already exists. The concrete
effect of this command is that if there's already some element
corresponding to this nest, it will cease corresponding to that
nest. It will not disappear from the stream, but merely become
unaddressable.

202: recreate
-------------

**Syntax**: ``CSI`` ``?`` ``202`` ``[<nest>]`` ``z``

This is equivalent to ``demote`` followed by ``set-html`` of an empty
div, but atomic.

203: remove
-----------

**Syntax**: ``CSI`` ``?`` ``203`` ``[<nest>]`` ``z``

This is a stronger version of ``demote`` which also happens to remove
the element from the stream.

204: copy
---------

**Syntax**: ``CSI`` ``?`` ``204`` ``[<source_nest>]`` ``[;;<target_nest>]`` ``z``

This copies the element in ``source_nest`` to ``target_nest``.

205: move
---------

**Syntax**: ``CSI`` ``?`` ``205`` ``[<source_nest>]`` ``[;;<target_nest>]`` ``z``

This is equivalent to ``copy`` followed by ``remove`` on the source
nest.

206: redirect
-------------

**Syntax**: ``CSI`` ``?`` ``206`` ``[<source_nest>]`` ``[;;<target_nest>]`` ``z``

This puts the element in ``source_nest`` in ``target_nest``, and sets
things up so that both references ``source_nest`` and ``target_nest``
point to ``target_nest``. This creates an alias, so to speak.

.. note::

  After the execution of this command, the element is not displayed in
  the original ``source_nest`` location anymore.

