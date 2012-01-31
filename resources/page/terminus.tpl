
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
  </head>

  <body>
    <div id="font_control_div">
      <span id="font_control" class="term_area">X</div>
    </div>

    <div id="terminal" class="term_area">
    </div>

    <!-- <div id="log"> -->
    <!-- </div> -->

    <script>
      $(document).ready(function() {
        var termtype = "{{termtype}}";
        var id = "{{id}}";
        var magic = "{{magic}}";
        var path = "/" + termtype + "/" + id;
        var settings_file = "/resources/settings/{{settings}}";
        <!-- var settings = jsyaml.load(); -->

        terminal = $("#terminal");
        d_terminal = terminal[0];
        term = Terminus(terminal, path, magic);
      });
    </script>

  </body>
</html>
