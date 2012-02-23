
Terminus protocol
=================

## Nesting

Terminus not only allows the display of inline HTML, it also allows
*nesting* these elements. The **nest** of an element is a sequence of
integers identifying where to find it - an address of sorts. Using
this address, one can easily append new data to an existing element,
or execute JavaScript commands on it, if needed.

When a command takes a *nest* parameter, it expects a list of
semicolon-separated numbers. If that list is, say, `1;42;3`, this
means "take the 1st child of the root, then the 42nd child of that
child, and then the 3rd child of that".

The effect of adding an element to a nest depends on what kind of nest
it is. A nest may be a wrapper around a `div`, a file lister, a
plotter, a Terminus screen. Each type of nest will parse and display
incoming data differently.

Most importantly, if the nest is a Terminus screen, then the element
will be placed (or updated) on the row the cursor lies in. Note that
regardless of the actual height of the element, it takes up exactly
one *logical* row, as far as the screen is concerned.

**Note**: if any character is written on the logical row occupied by
  an HTML element after its insertion, said element is scrapped and
  the row's text is printed instead.

**Note**: the integer id of a nest does not indicate its order with
  respect to its parent. Indeed, the nests may be created in any
  order, and some ids may even be skipped entirely.

#### Nest #0

The nest `0` represents the nest on which there is "focus". In a
terminal window, that is the nest at the line occupied by the
cursor. In other nests, it is typically the last nest that was
created.


## Terminology

* `CSI` is the sequence of two characters `\x1B\x5B`, that is, the
  escape character followed by the `[` character (`\x1B[`).

* In the syntax bits, `[x]` means that `x` is optional, and
  `<x>` means `x` is a parameter.


## The principal command

**Syntax**: `CSI` `?` `0` `[;<terminator>[;<escape>]]` `[;;<nest>]` `y` `<action><nest_type>` `<data>` `<terminator>`

**Defaults**: `terminator = 1310 (\r\n)` and `escape = 1`.

**Example**: `\x1B[?0;7y+h <b>BOLD TEXT</b>\a` (note that `\a` is
  the bell character, i.e. the ASCII character #7, i.e. `\x07`).

Whew. Let's break this down:

**terminator**: you can specify the ASCII character that will end the
  sequence. By default, it is the newline character, so the command
  ends with the newline (technically, a newline sends both the CR and
  LF characters to the terminal, so this is the actual delimiter). If
  your command contains newlines, you can pick the bell character
  instead (ASCII character 7, `\a`, or `\x07`). Note that the ESC
  character (`\x1B`) *always* ends the command.

**escape**: this character will escape the character that follows
  it. By default this is the ASCII character 1 `\x01`. What this means
  is that `\x01<terminator>` will let the terminator character through
  without ending the command. `\x01\x01` will append the escape
  character itself. The ESC character (`\x1B`) can be escaped that
  way.

**nest**: the nest where the command will be executed. By default,
  this is the terminal itself.

**action**: there are four types of actions that are allowed:

  * `+<nest_type> <arguments>`: create a *new nest* with the given
    type and the given arguments. There must be defaults for all
    arguments.

  * `:<nest_type> <data>`: *append* the data to the target nest.

    *Note:* if the target nest does not have the right type, then the
    command will execute in the nest that has focus (the one the
    cursor is on, or the last one that was created), if that nest has
    the right type. If it does not, then a new nest of the right type
    will be created with `+<nest_type>`.

  * `/<nest_type> <setting> <value>`: *sets* some configuration
    value in the nest. For instance, this can be a stylesheet. The
    note given above for the `:` action also applies here.

  * `~<nest_type> <id> <modification>`: *modifies* some element in
    the nest with the given id. The format of the `modification`
    argument may vary. The nest must already exist and it must have
    the right type for this action to work.

  * `!<nest_type> <command>`: *perform* a command, such as sorting.

**nest_type**: see the
  [commands](https://github.com/breuleux/terminus/blob/master/doc/commands.md)
  page.


## Scripting

The following commands execute scripting commands in the browser with
the specified nest as their context.

### 100: javascript

**Syntax**: `CSI` `?` `100` `[;<terminator>[;<escape>]]` `[;;<nest>]` `y` `<javascript>` `<terminator>`

Execute JavaScript code in the context of the specified nest.

Once received, Terminus executes the code verbatim, with the `this`
variable set to the nest. The nest has the following methods
(incomplete list):

* `this.get_child(id, [create])`: get the nest with id `id`. If
  `create` is true, an empty child will be created if needed.

* `this.get_latest()`: get the child on which there is focus
  (equivalent to `this.get_child(0)`).

* `this.push_command(command)`: this is what gets called when you
  use a command like `:h <b>hello</b>`. In that case you would have:
  `command = {nest_type: "h", action: ":", text: "<b>hello</b>"}`.

  The responsibility of `push_command` is to find where exactly the
  command should be processed. This might be the target nest, or the
  last subnest in that nest.

* `this.process(command)`: this is the function that processes a
  command in the nest itself (it usually assumes the command has the
  right type, unless the action is `+`).


### 101: coffeescript

TODO!


## Nesting

These commands manipulate nests: creating, demoting, removing, etc.

### 200: create

**Syntax**: `CSI` `?` `200` `[<nest>]` `z`

**Response**: `CSI` `?` `200` `[<nest>]` `z`

This finds a child of the given nest that doesn't already exist,
creates it, and reports back about it in a response. The response
arrives through stdin (it's just as if the user had typed it
themselves). Use this to create unique nests, to avoid interference
with other programs.

The nest in the response will have one more element than the nest in
the request. For example, you might send `\x1B[?200z` and read back
`\x1B[?200;1z`, or send `\x1B[?200;7;1;13;99z` and receive
`\x1B[?200;7;1;13;99;66z`.

**Note**: the newly created nest will be an empty `div`, but you can
  use one of the `set_X` commands to discard it afterwards.

**Warning**: even though it might appear unnecessary to do so, it is
  sometimes necessary to call `demote` (see below) on the nest that
  was reported back before using it. The reason why is that if you
  store the program's output into a file to print it back, the nests
  are hardcoded in the stream. Think about what happens if you print
  the file twice: the same nest will be reused, so you won't see the
  output twice, you'll see it once, and then it will be refreshed in
  the same place. In the future, a smart shell could solve the issue
  by creating a fresh nest for every process and filtering the escape
  codes to make sure that different processes don't share nests.

### 201: demote

**Syntax**: `CSI` `?` `201` `[<nest>]` `z`

This *invalidates* the target nest if it already exists. The concrete
effect of this command is that if there's already some element
corresponding to this nest, it will cease corresponding to that
nest. It will not disappear from the stream, but merely become
unaddressable.

### 202: remove

**Syntax**: `CSI` `?` `202` `[<nest>]` `z`

This is a stronger version of `demote` which also happens to remove
the element from the stream.

### 203: move

**Syntax**: `CSI` `?` `203` `[<source_nest>]` `[;;<target_nest>]` `z`

This moves the source nest to the target nest. The original element
disappears from the source and cannot be addressed at that path
anymore.

### 204: bump

**Syntax**: `CSI` `?` `204` `[<nest>]` `z`

"Bump" the element, if possible, so that it becomes the latest nest.

