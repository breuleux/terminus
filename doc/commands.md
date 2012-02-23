
Commands
========

Here are the commands recognized by Terminus. They can be tested with
the `tcmd` utility. Piping commands such as `dr -l` to `cat -v` or
`less` is a good way to see how the commands work. You can also append
more commands to their output: try something like `dr -l; tcmd '/tb
style .col-size {color: red}'`, for instance.


t (terminal)
------------

This type of nest represents a sub-terminal, embedded in its parent.

`+t <nlines> <ncols>`: create a terminal within the current nest.

`:t <text>`: interpret the text according to the terminal. Printing
some text XYZ has essentially the same effect as printing `ESC[?0y:t
XYZ`.

It is not possible to configure a `t` nest for the time being.


h (HTML)
--------

Add and manipulate an HTML element.

`+h <html>`: create an HTML nest with the given html. If nothing is
  given, the element will be a mere `div`.

`:h <html>`: append the given HTML to the element created with `+h`.

`/h style <selector> {<css>}`: set a css style for the given
  selector. The style will only apply in the target nest, not outside.

`~h #<id> <html>` append the html to the element with the
  given id.

`~h #<id> = <html>` replace the element with the given id with the
  given html.

`~h #<id>` remove the element with the given id.


svg (SVG)
---------

The `svg` nest essentially works just like the `h` nest, with one
difference: the generated SVG element is automatically set up to allow
panning and zooming. The following additional settings therefore
exist:

`/svg pan <bool>`: allow/disallow panning (set to true or false).

`/svg zoom <bool>`: allow/disallow zooming (set to true or false).

`/svg zoom_speed <float>`: set the zoom factor. 1.0 is no zoom, 2.0
  means 200% zoom with each scroll, etc.


tb (table)
----------

Used to create tables.

`+tb <column1>\t<column2>\t...`: create a table with the given
  columns. Each column is either a string naming it or a `name:label`
  pair.

`:tb <value1>\t<value2>\t...`: add a row to the table with the
  specified value, one for each column.

`~tb <i> <value1>\t<value2>\t...`: replace the ith row.

`~tb +<i> <value1>\t<value2>\t...`: insert this row right before the
  ith row.

`~tb <i>`: delete the ith row.

`/tb static <i>`: set the ith row as "static". This means it does
  not move when data is sorted (e.g. headers are static).

`/tb nostatic <i>`: set the ith row as "not static". This means it
  moves when data is sorted.

`/tb flow <bool>`: if `flow` is true, each row of the table will be
  displayed as a box, and rows will be laid one after the other,
  inline.

`/tb header_freq <i>`: displays a header every i rows. Note that
  headers count as rows, so if you want to have 10 rows in-between
  headers, set header_freq to 11.

`/tb sep <chr>`: set the field separator to the specified
  character. The character must be an integer, written in decimal,
  representing the ASCII value of the desired separator. By default,
  the separator is the horizontal tab character (\t, ASCII 9), but if
  the data may contain tabulations, you can set a different separator.

`/tb c <column_name>.type <type>`: change the type of the
  column. The type may be `normal`, `number` (right-align), `file`
  (file name with the appropriate highlighting) or `bar` (horizontal
  bar). Note that these changes (and property changes) only apply to
  *new* rows, not existing ones.

`/tb c <column_name>.<property> <type>`: change some property of the
  column. The properties you can use depend on the type of column.

  * file: a file column accepts the `path` property, to determine what
    the file names are relative to and create appropriate targets for
    the links. The `tags` property is boolean, if true then the last
    character of each file must be one of *, /, @ or ., denoting
    respectively an executable file, a directory, a symbolic link or a
    normal file.

  * bar: accepts the `scale` property, which multiplies its length.

`/tb style <selector> {<css>}`: set a css style for the given
  selector. The following classes are automatically defined for
  certain elements: `row-i`, for the ith generated row (includes
  headers - also note that inserting or deleting rows does not change
  the value of this class); `col-name`, for the column with that name;
  `type-type` for all columns with a given type, `even` and `odd` for
  even-numbered and odd-numbered rows. Some types of column also
  provide:

  * file: provides the `ext-<extension>` class for a file with an
    extension, as well as the classes `executable`, `directory`,
    `symlink`, `normal`, `save-file` (those ending in ~ or #) and
    `hidden-file` (those starting with a dot).

  * bar: provides the `bar` class.

`!tb sort <column_name>`: sort the column. If the first character of
column_name is `~`, sort in reverse order.


xy (2D plot)
------------

Partly implemented, but not done yet :)


img (image)
-----------

Transfer image files in base64. Not done yet. Alternatively, you can
save the image as a file and use the `h` command with an `<img>` tag.

