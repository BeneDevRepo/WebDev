<?php

class Server {
	public $address = null;
	public $port = null;
	public $server = null;

	public function __construct($address, $port) {
		$this->address = $address;
		$this->port = $port;

		$this->server = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
		socket_set_option($this->server, SOL_SOCKET, SO_REUSEADDR, 1);
		socket_bind($this->server, $this->address, $this->port);
		socket_listen($this->server);
	}

	public function accept() {
		return socket_accept($this->server);
	}
}

class WebSocket {
	public $socket = null;

	public function __construct($socket) {
		$this->socket = $socket;

		// Send WebSocket handshake headers.
		$request = socket_read($this->socket, 5000);
		preg_match('#Sec-WebSocket-Key: (.*)\r\n#', $request, $matches);
		$key = base64_encode(pack('H*', sha1($matches[1] . '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')));
		$headers = "HTTP/1.1 101 Switching Protocols\r\n";
		$headers .= "Upgrade: websocket\r\n";
		$headers .= "Connection: Upgrade\r\n";
		$headers .= "Sec-WebSocket-Version: 13\r\n";
		$headers .= "Sec-WebSocket-Accept: $key\r\n\r\n";
		socket_write($this->socket, $headers, strlen($headers));
	}

	public function send($content) {
		$response = chr(129) . chr(strlen($content)) . $content;

		return socket_write($this->socket, $response);
	}

	
	public function recv() {
		$raw = socket_read($this->socket, 5000);

		$raw = unpack("c*", $raw);

		$opcode = $raw[1] & 0x0F;
		$mask = $raw[2] & 0x80;
		$len = $raw[2] & 0x7F;

		# Ignoring exlen
		$mask_key = array(
			0 => $raw[3],
			1 => $raw[4],
			2 => $raw[5],
			3 => $raw[6],
		);

		$result = "";

		for($i = 0; $i < $len; $i++) {
			$ind = 7 + $i;
			$byte = $raw[$ind];
			$key = $i % 4;
			$result .= chr($byte ^ $mask_key[$key]);
		}

		return json_decode($result);
	}
};