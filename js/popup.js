
/* Make a HR object */
if (typeof(HR) == "undefined") {
  HR = {};
};

HR.setupForm = function() {

	chrome.tabs.getSelected(null, function(tab) {
	  $('#url').val(tab.url);
	});

	$('#status').hide();

};

/*
#
# People
#
*/

/*HR.loadPeople = function() {

	var req = new XMLHttpRequest();
	req.open(
		"GET",
		"people.xml",
		true
	);
	req.onload = parsePeople;
	req.send(null);

}

HR.parsePeople =  function() {
	var people = $.xml2json(req.response);
	$people = $(people.person);

	_updateSelect($people);
	console.log('hi')
}
*/

/*function updateSelect($people) {
	$people.each(function(i,person) {
		$('#combobox')
			.append($('<option>')
				.text(person.first_name + ' ' + person.last_name)
				.attr('value', person.id));
		//console.log(person.id + ': ' + person.first_name + ' ' + person.last_name);
	});
}*/

HR.createPerson = function(e) {

	e.preventDefault();

	HR.tagArray = this['tags'].value.split(',');
	var note = this['notes'].value.trim();

	var person = {
		'person': {
			'first-name': this['first-name'].value,
			'last-name': this['last-name'].value,
			'company-name': this['company-name'].value,
			'contact-data': {
				'web-addresses': {
					'web-address': {
						'url': this['url'].value,
						'location': 'Work'
					}
				}
			}
		}
	}

	var xml = json2xml(person);	
	console.log(xml)

	var req = new XMLHttpRequest();
	req.open(
		"POST",
		"https://" + HR.config.highriseID + ".highrisehq.com/people.xml",
		true,
		HR.config.apikey,
		HR.config.apipass
	);
	req.onload = _afterAddPerson;
	req.send(xml);
	
	function _afterAddPerson() {
	
		// find ID for person just submitted
		var xml = $.parseXML(req.response);
		var id = $(xml).find('id:first').text();
	
		// add tags if any
		if (HR.tagArray) {
			HR.addTags(id);
		}
	
		// add note saying this was added by web
		HR.addNote(id, 'Added from the web');
	
		// add note
		if (note) {
			HR.addNote(id, note)
		}
	
		// show status message
		$('#add-person-form').hide();
		$('#status').append('Added!');
		$('#status').fadeIn();
	
		// reset form
		document.getElementById('add-person-form').reset();
	}


} // end addPerson


/*function updatePerson(id) {

	// PUT /people/#{id}.xml
	// James Doe: id = 124933667

	id = 124933667;

	var data = {
		'person': {
			'first-name': 'frankie',
			'contact-data': {
				'web-addresses': {
					'web-address': {
						'url': 'http://foo.bar',
						'location': 'Work'
					}
				}	
			}
		}
	}

	var xml = json2xml(data);	
	xml = xml.replace(/<id>/g, '<id type="integer">');

	var req = new XMLHttpRequest();

	req.open(
		"PUT",
		"https://connectedio.highrisehq.com/people/" + id + ".xml",
		true,
		'6ea1e333703499445ab59520e7ea61ef',
		'jaywalk'
	);
	req.onload = callback;
	console.log(xml)
	req.send(xml);

	function callback() {
		console.log(req);		
	}

}*/

/*
#
# Tags
#
*/

HR.getTags = function() {

	var req = new XMLHttpRequest();
	req.open(
		"GET",
		"https://"+ HR.config.highriseID +".highrisehq.com/tags.xml",
		true,
		HR.config.apikey,
		HR.config.apipass
	);
	req.onload = _makeTagArray;
	req.send(null);
	
	function _makeTagArray() {
	
		var tagsXML = $.parseXML(req.response);
	
		var tags = [];
	
		$(tagsXML).find('tag').each(function() {
	
			//console.log($(this).find('name').text());
			tags.push(
				$(this).find('name').text()	
			);
	
		});
		HR.setupTags(tags);
	
	} // _makeTagArray
} // HR.getTags

HR.setupTags = function(tags) {

	var availableTags = tags;

	function split( val ) {
		return val.split( /,\s*/ );
	}
	function extractLast( term ) {
		return split( term ).pop();
	}

	$( "#tags" )
	// don't navigate away from the field on tab when selecting an item
	.bind( "keydown", function( event ) {
		if ( event.keyCode === $.ui.keyCode.TAB &&
				$( this ).data( "autocomplete" ).menu.active ) {
			event.preventDefault();
		}
	})
	.autocomplete({
		minLength: 0,
		source: function( request, response ) {
			// delegate back to autocomplete, but extract the last term
			response( $.ui.autocomplete.filter(
				availableTags, extractLast( request.term ) ) );
		},
		focus: function() {
			// prevent value inserted on focus
			return false;
		},
		select: function( event, ui ) {
			var terms = split( this.value );
			// remove the current input
			terms.pop();
			// add the selected item
			terms.push( ui.item.value );
			// add placeholder to get the comma-and-space at the end
			terms.push( "" );
			this.value = terms.join( ", " );
			return false;
		}
	});	

} // HR.setupTags

HR.addTag = function(id,tag) {
	
	if (tag.trim() == '') return;

	// create XML for data
	var data = {
		'name': tag
	}	
	var xml = json2xml(data);

	// send to highrise
	var req = new XMLHttpRequest();

	req.open(
		"POST",
		"https://" + HR.config.highriseID + ".highrisehq.com/people/" + id + "/tags.xml",
		true,
		HR.config.apikey,
		HR.config.apipass
	);
	req.onload = function() {
		console.log('tag added')
	};
	req.send(xml);

} // HR.addTag

HR.addTags = function(id) {		
	// for each tag, loop through and fire an update request
	for (var i = 0; i < HR.tagArray.length; i++) {
		HR.addTag(id,HR.tagArray[i]);
	}

} // HR.addTags

/*
#
# Notes
#
*/

HR.addNote = function(id, text) {

	// create XML for data
	var data = {
		'note': {
			'body': text
		}
	}	
	var xml = json2xml(data);

	// send to highrise
	var req = new XMLHttpRequest();

	req.open(
		"POST",
		"https://" + HR.config.highriseID + ".highrisehq.com/people/" + id + "/notes.xml",
		true,
		HR.config.apikey,
		HR.config.apipass
	);
	req.onload = function() {
		console.log('added note')
	};
	req.send(xml);

}// HR.addNote
