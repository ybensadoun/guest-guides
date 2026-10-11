/**
 * Guest guide intake form (built from Ca La Kimberly v1.0).
 *
 * How to use:
 * 1. Go to https://script.google.com and click "New project".
 * 2. Delete what is there, paste this whole file, click Save.
 * 3. Choose "createGuestGuideForm" in the toolbar and click Run. Accept the permissions (it only creates
 *    one Google Form and one Google Sheet in your Drive).
 * 4. Open "Execution log": it shows the link to send to hosts and the link to edit the form.
 * 5. In the form editor, add the two file-upload questions by hand (Google does not let scripts create them).
 *    The script leaves a placeholder where each one goes: "UPLOAD: logo" and "UPLOAD: style images".
 */
function createGuestGuideForm() {
  const form = FormApp.create('Your guest guide: tell us about your place');
  form.setDescription(
    'We will build a mobile guest guide for your holiday rental, like Ca La Kimberly: house guide, ' +
    'Wi-Fi, check-out, rubbish days, emergency numbers, your favourite places to eat, things to do, ' +
    'markets and local events, in the languages your guests speak.\n\n' +
    'We research opening hours, markets, events and emergency contacts ourselves. What we need from you ' +
    'is what only you know: the house, your rules, and your personal recommendations. ' +
    'Skip anything you are unsure about. It takes about 20 minutes.'
  );
  form.setCollectEmail(true);
  form.setProgressBar(true);
  form.setAllowResponseEdits(true);

  const text = (t, help, req) => form.addTextItem().setTitle(t).setHelpText(help || '').setRequired(!!req);
  const para = (t, help, req) => form.addParagraphTextItem().setTitle(t).setHelpText(help || '').setRequired(!!req);
  const one = (t, choices, help, other, req) => {
    const i = form.addMultipleChoiceItem().setTitle(t).setHelpText(help || '').setRequired(!!req);
    i.setChoices(choices.map(c => i.createChoice(c)));
    if (other) i.showOtherOption(true);
    return i;
  };
  const many = (t, choices, help, other, req) => {
    const i = form.addCheckboxItem().setTitle(t).setHelpText(help || '').setRequired(!!req);
    i.setChoices(choices.map(c => i.createChoice(c)));
    if (other) i.showOtherOption(true);
    return i;
  };
  const page = (t, help) => form.addPageBreakItem().setTitle(t).setHelpText(help || '');
  const note = (t, help) => form.addSectionHeaderItem().setTitle(t).setHelpText(help || '');

  /* 1. You and your listing */
  page('1. You and your listing');
  text('Your name', '', true);
  text('Link to your Airbnb (or Booking, Vrbo) listing', 'We use your listing for the photos, description, amenities, beds and rating.', true);
  text('Name of the guide', 'Usually the name of the house, for example "Ca La Kimberly".', true);
  text('A short welcome line (optional)', 'For example: "Make yourself at home". We will write one if you leave this empty.');
  many('Languages the guide should speak',
    ['English', 'Spanish', 'French', 'Catalan', 'German', 'Dutch', 'Italian', 'Portuguese'],
    'Pick the languages your guests actually speak. Each one is fully translated.', true, true);
  one('Language most of your guests speak', ['English', 'Spanish', 'French', 'German', 'Dutch', 'Italian'], '', true, true);

  /* 2. Location and privacy */
  page('2. Location and privacy',
    'Your exact address is never shown in the guide. We only use the area to work out distances and to find what is around you.');
  text('Town or village, region and country', 'For example: "Can Gordei, La Bisbal del Penedès, Tarragona, Spain".', true);
  text('Neighbourhood or nearest landmark (optional)', 'Helps us place the house approximately. Not displayed.');
  one('How far should we look for markets, events and things to do?',
    ['20 km', '30 to 40 km (recommended)', '60 km', 'Up to about 1 hour by car'],
    'We search every town and district (comarca, département, county...) in that radius, across borders if needed.', false, true);
  one('Do guests usually come by car?', ['Almost always', 'Some do, some do not', 'Rarely, most use public transport'], '', false, false);
  para('Airports, train stations or bus stops your guests use', 'We add timetables, journey times and booking links.');
  one('May the guide say which neighbourhood the house is in?', ['Yes, the neighbourhood name is fine', 'Only the town', 'Nothing more precise than the region'], '', false, true);

  /* 3. Look and feel */
  page('3. Look and feel',
    'Ca La Kimberly uses a bold Bauhaus style (primary colours, simple shapes). Yours can look completely different.');
  note('UPLOAD: logo', 'Add a File upload question here in the form editor: "Your logo (PNG or SVG, square works best)".');
  one('Style you would like',
    ['Bold and graphic (Bauhaus, primary colours)', 'Warm Mediterranean (terracotta, olive, sand)', 'Calm and minimal (white, black, one accent)',
     'Coastal (blues, sand, white)', 'Rustic and natural (wood, greens)', 'Retro and playful', 'Elegant and dark'],
    'Pick the closest one, or describe yours under "Other".', true, true);
  note('UPLOAD: style images', 'Add a File upload question here: "Images of a style you like (optional, up to 5)". Screenshots of websites, posters or interiors all help.');
  para('Describe the feel you want (optional)', 'Colours to use or avoid, fonts you like, words that describe your place.');
  one('Cover picture at the top of the guide',
    ['Use the best photo from my listing', 'I will upload one', 'An illustrated version of my house is fine'], '', true, true);

  /* 4. The house */
  page('4. The house', 'We take rooms, beds and amenities from your listing. Here we need the practical details only you know.');
  text('Check-in time', 'For example: from 16:00');
  text('Check-out time', 'For example: before 12:00', true);
  one('How do guests get the keys?', ['Lockbox', 'Smart lock or code', 'In person', 'It depends'], '', true, true);
  one('Wi-Fi in the guide',
    ['Show the network and password (with a QR code)', 'Keep it in the Airbnb check-in instructions only'],
    'We recommend a separate guest network so your own devices (cameras, alarm) stay private.', false, true);
  para('Wi-Fi network names and password (if shown)', 'Only if you chose to show it.');
  para('Room by room: anything guests should know', 'Living room, kitchen, bedrooms, bathrooms, office, laundry... For example: where the spare blankets are, which beds lift up for suitcases, fragile things, appliances with a trick.');
  para('Heating and cooling', 'Air conditioning, fans, heating, fireplace, thermostat location.');
  many('Outdoor and extras', ['Private pool', 'Shared pool', 'Garden', 'Barbecue', 'Outdoor kitchen', 'Hot tub', 'Terrace or balcony', 'Parking on site', 'Street parking', 'EV charger'], '', true, false);
  para('Pool details (if any)', 'Heated or not, season, depth, rules, who maintains it and when they come.');
  one('Pets', ['Not allowed', 'Allowed', 'Allowed on request'], '', false, true);
  many('Baby and kids gear', ['Travel cot', 'High chair', 'Stair gate', 'Toys and games', 'None'], 'Where is it kept, or is it on request?', true, false);
  para('House rules', 'Smoking, parties, quiet hours, neighbours, shoes, anything that matters to you.', true);
  para('Check-out tasks', 'What should guests do before leaving? Towels, bins, dishes, keys, doors.', true);
  para('Questions guests always ask you', 'These make the most useful parts of the guide.');
  para('People who may come by during a stay', 'Cleaner, gardener, pool person... and roughly when.');

  /* 5. Rubbish and recycling */
  page('5. Rubbish and recycling');
  one('How does rubbish work at the house?',
    ['Door-to-door collection on set days', 'Shared street containers', 'Guests leave it, the cleaner handles it', 'I am not sure, please research it'], '', true, true);
  para('Details', 'Which bin is which, which evening to put out what, where the bins are, where glass goes. A photo of the council calendar helps (upload in the last section or send it later).');

  /* 6. Practical and emergencies */
  page('6. Practical and emergencies', 'We research emergency numbers, hospital, pharmacy on duty, vet, power company and taxis ourselves.');
  para('Nearest bar, shop or bakery within walking distance', 'Name and anything to know (for example: closed 15:00 to 18:00 even if Google says otherwise).');
  para('Food delivery to the house', 'Pizza or other places that deliver, and whether they are good.');
  text('Taxi company you trust (optional)');
  para('Doctor, pharmacy or vet you recommend (optional)');
  one('Should the guide ever ask guests to contact you directly?',
    ['No, guests use the Airbnb messages (recommended)', 'Yes, for emergencies only'], 'Your personal phone number is never published unless you choose it here.', false, true);
  text('If yes: number for emergencies only');

  /* 7. Your favourite places */
  page('7. Your favourite places',
    'This is what makes the guide yours. For each place: the name, the town, and why you love it (a dish, the view, book ahead, dogs welcome, best time to go). We add hours, ratings, maps and links.');
  para('Places to eat and drink', 'One per line. Example: "La Locanda dei Sapori, El Vendrell: our favourite Italian, pizza to take away, book for dinner."', true);
  para('Bakeries, cafés and food shops');
  para('Things to do', 'Beaches, hikes, wineries, museums, day trips, activities for kids, rainy-day ideas.');
  para('Markets you like', 'We will find all the weekly and monthly markets in your radius anyway.');
  para('Local festivals and events you love', 'We look up the dates every year and mark them "expected" until confirmed.');
  para('Places to avoid or tourist traps (optional)', 'Only used to steer our research, never published as a warning.');

  /* 8. Tone and running the guide */
  page('8. Tone and running the guide');
  one('Tone of voice', ['Warm and friendly', 'Calm and practical', 'Fun and playful', 'Elegant'], '', true, true);
  para('Anything the guide should never mention', 'For example: the street name, dogs, the neighbours.');
  one('Monthly check', ['Yes, check hours, events and places every month (recommended)', 'No, I will tell you when something changes'],
    'Each month we check that restaurants are still open, hours are right and event dates are confirmed.', false, true);
  one('Web address', ['A free address is fine (yourname.netlify.app)', 'I want my own domain', 'Not sure yet'], '', false, true);
  para('Anything else', 'Photos of the rubbish calendar, house manuals, links, ideas.');

  // Answers go to a Google Sheet.
  const ss = SpreadsheetApp.create('Your guest guide: answers');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  Logger.log('Send this link to hosts: ' + form.getPublishedUrl());
  Logger.log('Edit the form (add the 2 upload questions): ' + form.getEditUrl());
  Logger.log('Answers sheet: ' + ss.getUrl());
}
