$(document).ready(function() {
	var messageArea = $('#messageArea');
	var messageField = $('#messageField');
	var sendBtn = $('#sendBtn');
	var nameField = $('#nameField');
	var hideChatBtn = $('#hideChatBtn');
	var chatDiv = $('#chatDiv');

	if (socket === undefined) {
		chatDiv.hide();
		hideChatBtn.text("Show Chat");
		hideChatBtn.attr('disabled', true);
		return;
	}

	socket.on('message', function(message) {
		addMessage(message);
	});

	sendBtn.click(function() {
		if (messageField.val().length > 0) {
			var name = nameField.val();
			var message = name + ': ' + messageField.val() + '\n';
			addMessage(message);
			socket.send(message);
			messageField.val('');
		}
	});

	messageField.keyup(function(e) {
		if (e.which == 13) {
			sendBtn.click();
		}
	});

	function addMessage(message) {
		messageArea.val(messageArea.val() + message);
		messageArea.scrollTop(messageArea[0].scrollHeight);
	}

	hideChatBtn.click(function() {
		if (chatDiv.is(":visible")) {
			chatDiv.hide("fast");
			hideChatBtn.text("Show Chat");
		} else {
			chatDiv.show("fast");
			hideChatBtn.text("Hide Chat");
		}
	});
});