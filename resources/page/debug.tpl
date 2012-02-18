B
<html>
  <head>
    <meta charset="utf-8">
    <title>Terminus</title>
    <link type="text/css" href="/resources/style/{{style}}" rel="stylesheet"/>
    <link type="text/css" href="/resources/style/jquery.jscrollpane.css" rel="stylesheet" media="all" />
    <script type="text/javascript" src="/resources/script/jquery.js"></script>
    <script type="text/javascript" src="/resources/script/jquery.mousewheel.js"></script>
    <script type="text/javascript" src="/resources/script/mwheelIntent.js"></script>
    <script type="text/javascript" src="/resources/script/jquery.jscrollpane.js"></script>
    <script type="text/javascript" src="/resources/script/js-yaml.min.js"></script>
    <script type="text/javascript" src="/resources/script/terminus.js"></script>
    <script type="text/javascript" src="/resources/script/terminus-svg.js"></script>
    <script type="text/javascript" src="/socket.io/socket.io.js"></script>
  </head>

  <body>

    <div id="terminal" class="term_area" style="width:80%; float:left">
    </div>

    <div id="log" class="log" style="width:20%; float:left">
      <div id="fresh_log" class="fresh"></div>
      <div id="stale_log" class="stale"></div>
    </div>

    <script>
      $(document).ready(function() {

        var setting_files = "{{settings}}".split(":");

        grab_settings({}, setting_files, function (settings) {
            console.log(settings);
            settings.termtype = "{{termtype}}";
            settings.id = "{{id}}";
            settings.magic = "{{magic}}";
            settings.path = "/" + settings.termtype + "/" + settings.id;
            settings.server = "{{server}}";
            settings.port = "{{port}}";
            term_div = $("#terminal");
            terminal = Terminus(term_div, settings);
            terminal.connect_socket_io();
            term = terminal;
        });

      });
    </script>

  </body>
</html>
