<?php

include "WebSocket.php";


class Client {
	public $websocket = null;

	public function __construct($websocket) {
		$this->websocket = $websocket;
	}

	public function run() {
	}
}


$address = '0.0.0.0';
$port = 88;

$server = new Server($address, $port);
$client = new WebSocket($server->accept());



// Send messages into WebSocket in a loop.
while (true) {
    sleep(1);

	$send = new stdClass();
	$send->time = time();
	$send->content = "Hellu!";

	$client->send(json_encode($send));
    
    # get data
    $payload = $client->recv();
    // var_dump($payload);
	echo "[" . time() . "]: " . $payload->time  . "\n";
}