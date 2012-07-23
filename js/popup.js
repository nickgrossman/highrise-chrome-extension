
/* Make a HR object */
if (typeof(HR) == "undefined") {
  HR = {};
  HR.users = {}
};

HR.setupForm = function() {

	chrome.tabs.getSelected(null, function(tab) {
	  $('#url').val(tab.url);
	});

	$('#status').hide();

	// get site users
	var req = new XMLHttpRequest();
	req.open(
		"GET",
		"https://"+ HR.config.highriseID +".highrisehq.com/users.xml",
		true,
		HR.config.apikey,
		HR.config.apipass
	);
	req.onload = function() {
		var xml = $.parseXML(req.response);			
		
		$(xml).find('user').each(function() {
			var id = $(this).find('id').text();
			HR.users[id] = $(this).find('name').text();
		});
		console.log(HR.users);
	};
	req.send(null);

};

/*
#
# People
#
*/

HR.loadPeople = function() {

	var req = new XMLHttpRequest();
	req.open(
		"GET",
		"https://"+ HR.config.highriseID +".highrisehq.com/people.xml",
		true,
		HR.config.apikey,
		HR.config.apipass
	);
	req.onload = _makePeopleArray;
	req.send(null);
	
	function _makePeopleArray() {
	
		var xml = $.parseXML(req.response);			

		var people = [];
	
		$(xml).find('person').each(function() {
	
			var person = {};
			person.label = $(this).find('first-name').text() + ' ' + $(this).find('last-name').text();
			person.value = $(this).find('id:first').text()
			
			people.push(person);
	
		});

		$( "#full-name" )
		.autocomplete({
			minLength: 0,
			source: people,
			focus: function( event, ui ) {
				//$( "#full-name" ).val( ui.item.label );
				response( $.ui.autocomplete.filter(
					people, extractLast( request.term ) ) );
				return false;
			},
			select: HR.loadPerson
		})
		.data( "autocomplete" )._renderItem = function( ul, item ) {
			return $( "<li></li>" )
				.data( "item.autocomplete", item )
				.append( "<a>" + item.label + "</a>" )
				.appendTo( ul );
		};
		
		$("#loading-people").hide();
		$("#full-name").show();
	}
}

HR.loadPerson = function( e, ui ) {
	
	var id = ui.item.value;
	
	e.preventDefault();
	
	// setup form to show a person we already have.
	
	$('#person-card span').text( ui.item.label );
	$("#person-card").show();
	$( "#full-name" ).hide();
	$( "#person-id" ).val( id );
	
	// fetch details
	
	var personReq = new XMLHttpRequest();
	personReq.open(
		"GET",
		"https://"+ HR.config.highriseID +".highrisehq.com/people/"+ id +".xml",
		true,
		HR.config.apikey,
		HR.config.apipass
	);
	personReq.onload = function() {
		// put tags into tag field
		console.log(personReq.response);
		var xml = $.parseXML(personReq.response);
		
		// load company
		var company = $(xml).find('company-name').text();
		$("#company-name").val(company);
		
		// load links
		console.log($(xml).find('web-address').find('url'));
		$(xml).find('web-address').find('url').each(function(i,v) {
			$('#existing-links').show();
			$('#existing-links').append('<a class="link existing-item" href="'+ $(this).text() +'">'+ $(this).text().substring(0,32) +'</a>')
		});
		
		// load tags
		var tagsString = ''
		var numTags = $(xml).find('tag').find('name').length;
		$(xml).find('tag').find('name').each(function(i,v) {
			tagsString += $(this).text(); 
			if (i != numTags - 1) {
				tagsString += ', ';
			}
		})
		$('#tags').val(tagsString);

	}	
	personReq.send(null);
	
	
	// fetch notes	
	var notesReq = new XMLHttpRequest();
	notesReq.open(
		"GET",
		"https://"+ HR.config.highriseID +".highrisehq.com/people/"+ id +"/notes.xml",
		true,
		HR.config.apikey,
		HR.config.apipass
	);
	notesReq.onload = function() {
		// load notes into HTML
		console.log(notesReq.response);
		var xml = $.parseXML(notesReq.response);
	
		// turn each note into an element
		$(xml).find('note').each(function(i,v) {
			$('#existing-notes').show();
			var note = $(this).find('body').text();
			var author_id = $(this).find('author-id').text(); 
			var author = HR.users[author_id];
			var date = new Date($(this).find('created-at').text());
			var prettyDate = date.getMonth() + '/' + date.getDate() + '/' + date.getFullYear();

			$('#existing-notes').append('<div class="note existing-item"><div class="note-content">'+ note +' </div><span class="note-author">&mdash; '+ author +' (' + prettyDate + ')</span></div>');
		});
		
	}	
	notesReq.send(null);
	
}

HR.submitForm = function(e) {
	e.preventDefault();
	
	if ($('#person-id').val() != '') {
	// if ID is set, update person
		console.log('updating person');
		HR.updatePerson();	
		
	} else {
	// if no ID is set, create person
		console.log('creating person');
		HR.createPerson();
		
	}
	
}

HR.createPerson = function(e) {

	HR.tagArray = document.getElementById('tags').value.split(',');
	var note = document.getElementById('notes').value.trim();
	
	// assemble name
	var names = HR.assembleNames(document.getElementById('full-name').value.trim());

	var person = {
		'person': {
			'first-name': names.first,
			'last-name': names.last,
			'company-name': document.getElementById('company-name').value,
			'contact-data': {
				'web-addresses': {
					'web-address': {
						'url': document.getElementById('url').value,
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
		HR.addTag(id, 'added from web');
	
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

HR.assembleNames = function(fullName) {
	
	var names = fullName.split(' ');
	console.log(names);
	
	var namesObj = {
		'first': '',
		'last': ''
	}
	
	for (var i = 0; i < names.length; i++) {
		if (i == 0) 
		{
			namesObj['first'] = names[i];
			
		} else if ( i == names.length -1) 
		{
			namesObj['last'] = names[i];
			
		} else {
			namesObj['first'] += " " + names[i];
		}
	}
	console.log(namesObj);
	return namesObj;
}


HR.updatePerson = function() {
	
	var id = document.getElementById('person-id').value;
	console.log(id);

	// PUT /people/#{id}.xml
	// James Doe: id = 124933667

	HR.tagArray = $('#tags').val().split(',');
	var note = $('#notes').val().trim();
	
	// assemble name
	
	var data = {
		'person': {
			'contact-data': {
				'web-addresses': {
					'web-address': {
						'url': document.getElementById('url').value,
						'location': 'Work'
					}
				}
			}
		}
	}

	console.log(data)
	var xml = json2xml(data);	

	xml = xml.replace(/<id>/g, '<id type="integer">');

	if (HR.tagArray) {
		HR.addTags(id);
	} else {
		console.log('no tags');
	}
	
	// add note
	if (note) {
		HR.addNote(id, note)
	} else {
		console.log('no new note');
	}

	var req = new XMLHttpRequest();

	req.open(
		"PUT",
		"https://"+ HR.config.highriseID +".highrisehq.com/people/" + id + ".xml",
		true,
		HR.config.apikey,
		HR.config.apipass
	);
	req.onload = _afterUpdatePerson;
	console.log(xml)
	req.send(xml);

	function _afterUpdatePerson() {
		console.log(req);		
		
		// show status message
		$('#add-person-form').hide();
		$('#status').append('Updated!');
		$('#status').fadeIn();
		
		// reset form
		document.getElementById('add-person-form').reset();
	}

}

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
	console.log(HR.tagArray)
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
