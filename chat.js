$(document).ready(function() {
	var messageArea = $('#messageArea');
	var messageField = $('#messageField');
	var sendBtn = $('#sendBtn');
	var nameField = $('#nameField');
	var hideChatBtn = $('#hideChatBtn');
	var chatDiv = $('#chatDiv');

	if (socket === undefined) {
		chatDiv.hide();
		hideChatBtn.text('Show Chat');
		hideChatBtn.attr('disabled', true);
		return;
	}

	socket.on('addMessage', function(name, color, message) {
		addMessage(name + ": ", color, message);
	});

	socket.on('userJoined', function(name, color) {
		addMessage(name + " has joined the space battle!", color);
	});

	socket.on('setUsername', function(name) {
		nameField.val(name);
	});

	sendBtn.click(function() {
		if (messageField.val().length > 0) {
			var name = nameField.val();
			var message = messageField.val();
			socket.emit('addMessage', name, message);
			messageField.val('');
		}
	});

	messageField.keyup(function(e) {
		if (e.which == 13) {
			sendBtn.click();
		}
	});

	function addMessage(name, color, message) {
		var messageDiv = $(document.querySelector('#message').content.cloneNode(true).childNodes[0]);
		var spans = messageDiv.find('span');
		messageDiv.find('#name').text(name);
		messageDiv.find('#head').attr('style', 'color:' + color);
		messageDiv.find('#body').text(message);
		messageArea.append(messageDiv);
		messageArea.scrollTop(messageArea[0].scrollHeight);
	}

	hideChatBtn.click(function() {
		if (chatDiv.is(':visible')) {
			chatDiv.hide('fast');
			hideChatBtn.text('Show Chat');
		} else {
			chatDiv.show('fast');
			hideChatBtn.text('Hide Chat');
		}
	});
});