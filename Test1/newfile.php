<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
    <meta http-equiv="Pragma" content="no-cache" />
    <meta http-equiv="Expires" content="0" />
</head>
<body>

<h1 id = "oben"><a href = "#unten">Oben</a></h1>

<?php
class Car {
    public $color;
    public $model;
    public function __construct($color, $model) {
        $this->color = $color;
        $this->model = $model;
    }
    public function message() {
        return "My car is a " . $this->color . " " . $this->model . "!";
    }
}

$myCar = new Car("black", "Volvo");
echo $myCar -> message();
echo "<br>";

$myCar = new Car("red", "Toyota");
echo $myCar -> message();
echo "<br>";

for ($x = 0; $x <= 10; $x++) {
    echo "The number is: $x <br>";
}
?>

<form action="form.php" method="post">
Name: <input type="text" name="name"><br>
E-mail: <input type="text" name="email"><br>
<input type="submit">
</form>
<br>

<div id="root"></div>
    <script>
        var host = 'ws://127.0.0.1:12345/websockets.php';
        var socket = new WebSocket(host);
        socket.onmessage = function(e) {
            document.getElementById('root').innerHTML = e.data;
        };
    </script>

<dl>
    <dt>term 1</dt><dd>definition 1</dd>
    <dt>term 2</dt><dd>definition 2</dd>
    <dt>term 3</dt><dd>definition 3</dd>
    <dt>term 4</dt><dd>definition 4</dd>
</dl>

<a id="unten" href = "#oben">Unten</a>

</body>
</html>
