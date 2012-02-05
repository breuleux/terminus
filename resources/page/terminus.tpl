
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

    <div id="terminal" class="term_area">
      <!-- <div class="font_control_div"> -->
      <!--   <span class="font_control">X</span> -->
      <!-- </div> -->
    </div>

    <!-- <div id="log"> -->
    <!-- </div> -->

    <script>
      $(document).ready(function() {

        var setting_files = "{{settings}}".split(":");

        grab_settings({}, setting_files, function (settings) {
            console.log(settings);
            settings.termtype = "{{termtype}}";
            settings.id = "{{id}}";
            settings.magic = "{{magic}}";
            settings.path = "/" + settings.termtype + "/" + settings.id;
            term_div = $("#terminal");
            terminal = Terminus(term_div, settings);
            term = terminal;
        });

      });
    </script>

  </body>
</html>
