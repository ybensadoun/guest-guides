import json
L=['en','es','fr','ca','de','nl']
def T(*a): assert len(a)==6, a; return dict(zip(L,a))
G=lambda *n:[f'guide/{x}.jpg' for x in n]
p='content/message.json'; d=json.load(open(p))
old={b['id']:b for b in d['blocks']}
B=[]
B.append({"id":"living","icon":"sofa","tone":"blue",
 "title":T("Living room","Salón","Salon","Menjador","Wohnzimmer","Woonkamer"),
 "sub":T("TV, games, heating","Tele, juegos, calefacción","Télé, jeux, chauffage","Tele, jocs, calefacció","TV, Spiele, Heizung","Tv, spellen, verwarming"),
 "photos":G('living-1','living-2','living-3','dining-2'),
 "items":[
  T("Smart TV: sign in to your own streaming apps, and sign out before you leave.","Smart TV: entrad con vuestras propias apps de streaming y cerrad sesión antes de iros.","Smart TV : connectez-vous à vos propres applis de streaming et déconnectez-vous avant de partir.","Smart TV: entreu amb les vostres apps de streaming i tanqueu la sessió abans de marxar.","Smart-TV: Meldet euch mit euren eigenen Streaming-Apps an und vor der Abreise wieder ab.","Smart-tv: log in met je eigen streamingapps en log uit voordat je vertrekt."),
  T("Board games and books for rainy days.","Juegos de mesa y libros para los días de lluvia.","Jeux de société et livres pour les jours de pluie.","Jocs de taula i llibres per als dies de pluja.","Brettspiele und Bücher für Regentage.","Bordspellen en boeken voor regenachtige dagen."),
  T("Spare batteries are in the TV unit.","Hay pilas de recambio en el mueble de la tele.","Des piles de rechange sont dans le meuble télé.","Hi ha piles de recanvi al moble de la tele.","Ersatzbatterien sind im TV-Möbel.","Reservebatterijen liggen in het tv-meubel."),
  T("Central heating is set on the thermostat by the front door. Please use it responsibly.","La calefacción central se regula en el termostato junto a la puerta de entrada. Usadla con responsabilidad.","Le chauffage central se règle sur le thermostat près de la porte d'entrée. Merci de l'utiliser raisonnablement.","La calefacció central es regula al termòstat de la porta d'entrada. Feu-la servir amb responsabilitat.","Die Zentralheizung wird am Thermostat neben der Haustür eingestellt. Bitte verantwortungsvoll nutzen.","De centrale verwarming stel je in op de thermostaat bij de voordeur. Gebruik hem met mate."),
  T("Air conditioning and a ceiling fan for the summer.","Aire acondicionado y ventilador de techo para el verano.","Climatisation et ventilateur de plafond pour l'été.","Aire condicionat i ventilador de sostre per a l'estiu.","Klimaanlage und Deckenventilator für den Sommer.","Airco en een plafondventilator voor de zomer.")]})
k=old['kitchen']
B.append({"id":"kitchen","icon":"kitchen","tone":"green","title":T("Kitchen","Cocina","Cuisine","Cuina","Küche","Keuken"),
 "sub":T("Appliances, basics, bins","Electrodomésticos, básicos, basura","Équipement, produits de base, poubelles","Electrodomèstics, bàsics, escombraries","Geräte, Grundvorrat, Müll","Apparaten, basis, afval"),
 "photos":k['photos'],"body":k['body'],
 "items":k['items']+[
  T("Bin bags are in the kitchen drawers. When the kitchen bin is full, empty it into the large bins with lids at the front gate.","Las bolsas de basura están en los cajones de la cocina. Cuando el cubo esté lleno, vaciadlo en los contenedores grandes con tapa de la puerta de entrada.","Les sacs poubelle sont dans les tiroirs de la cuisine. Quand la poubelle est pleine, videz-la dans les grands bacs à couvercle au portail.","Les bosses d'escombraries són als calaixos de la cuina. Quan el cubell sigui ple, buideu-lo als contenidors grans amb tapa de la porta d'entrada.","Müllbeutel sind in den Küchenschubladen. Ist der Küchenmülleimer voll, leert ihn in die großen Tonnen mit Deckel am Eingangstor.","Vuilniszakken liggen in de keukenlades. Is de keukenbak vol, leeg hem dan in de grote containers met deksel bij het hek.")],
 "links":[{"href":"#s/garbage","labelKey":"garbage"}]})
B[-1]["items"].append(T("A high chair for little ones.","Trona para los más pequeños.","Chaise haute pour les petits.","Cadira alta per als més petits.","Hochstuhl für die Kleinen.","Kinderstoel voor de kleintjes."))
B.append({"id":"bedrooms","icon":"bed","tone":"red","title":T("Bedrooms","Habitaciones","Chambres","Habitacions","Schlafzimmer","Slaapkamers"),
 "sub":T("Beds, suitcases, air conditioning","Camas, maletas, aire acondicionado","Lits, valises, climatisation","Llits, maletes, aire condicionat","Betten, Koffer, Klimaanlage","Bedden, koffers, airco"),
 "photos":G('bed1-1','bed1-2','bed2-1','bed2-2','bed3-1','bed3-2'),
 "items":[
  T("Bedroom 1: king-size bed and a smart TV. Bedroom 2: double bed. Bedroom 3: two single beds (one pull-out). The fourth bed is the sofa bed in the attic office.","Habitación 1: cama king y smart TV. Habitación 2: cama de matrimonio. Habitación 3: dos camas individuales (una nido). La cuarta cama es el sofá cama del despacho del ático.","Chambre 1 : lit king size et smart TV. Chambre 2 : lit double. Chambre 3 : deux lits simples (un gigogne). Le quatrième couchage est le canapé-lit du bureau sous les toits.","Habitació 1: llit king i smart TV. Habitació 2: llit de matrimoni. Habitació 3: dos llits individuals (un niu). El quart llit és el sofà llit del despatx de les golfes.","Schlafzimmer 1: Kingsize-Bett und Smart-TV. Schlafzimmer 2: Doppelbett. Schlafzimmer 3: zwei Einzelbetten (eines ausziehbar). Der vierte Schlafplatz ist das Schlafsofa im Dachbüro.","Slaapkamer 1: kingsize bed en smart-tv. Slaapkamer 2: tweepersoonsbed. Slaapkamer 3: twee eenpersoonsbedden (een uitschuifbaar). De vierde slaapplek is de slaapbank in het zolderkantoor."),
  T("The beds in the two double rooms lift up: store your suitcases underneath.","Las camas de las dos habitaciones dobles se levantan: guardad las maletas debajo.","Les lits des deux chambres doubles se relèvent : rangez vos valises dessous.","Els llits de les dues habitacions dobles s'aixequen: deseu-hi les maletes a sota.","Die Betten in den beiden Doppelzimmern lassen sich hochklappen: Koffer darunter verstauen.","De bedden in de twee tweepersoonskamers klappen omhoog: berg je koffers eronder op."),
  T("Air conditioning and a ceiling fan in every bedroom.","Aire acondicionado y ventilador de techo en cada habitación.","Climatisation et ventilateur de plafond dans chaque chambre.","Aire condicionat i ventilador de sostre a cada habitació.","Klimaanlage und Deckenventilator in jedem Schlafzimmer.","Airco en een plafondventilator in elke slaapkamer."),
  T("Extra pillows and blankets are available. A travel cot is there for little ones.","Hay almohadas y mantas extra. Hay una cuna de viaje para los más pequeños.","Oreillers et couvertures supplémentaires disponibles. Un lit parapluie est là pour les petits.","Hi ha coixins i mantes extra. Hi ha un bressol de viatge per als més petits.","Extra Kissen und Decken sind da. Für die Kleinen gibt es ein Reisebett.","Extra kussens en dekens zijn aanwezig. Er is een campingbedje voor de kleintjes.")]})
B.append({"id":"bathrooms","icon":"drop","tone":"blue","title":T("Bathrooms","Baños","Salles de bain","Banys","Bäder","Badkamers"),
 "sub":T("Towels, toilet, toiletries","Toallas, inodoro, aseo","Serviettes, toilettes, produits","Tovalloles, vàter, higiene","Handtücher, Toilette, Pflege","Handdoeken, toilet, verzorging"),
 "photos":G('bath1-1','bath1-2','bath2-1'),
 "items":[
  T("There is one bath towel per person for use in the house. Please don't take them to the beach.","Hay una toalla de baño por persona para usar en casa. Por favor, no las llevéis a la playa.","Il y a une serviette de bain par personne pour la maison. Merci de ne pas les emporter à la plage.","Hi ha una tovallola de bany per persona per fer servir a casa. Si us plau, no les porteu a la platja.","Es gibt ein Badetuch pro Person für das Haus. Bitte nicht mit an den Strand nehmen.","Er is één badhanddoek per persoon voor in huis. Neem ze alsjeblieft niet mee naar het strand."),
  T("Only toilet paper goes down the toilet. Use the small bin for everything else (wipes, sanitary items, tissues).","Solo el papel higiénico va al inodoro. Usad la papelera para todo lo demás (toallitas, compresas, pañuelos).","Seul le papier toilette va dans les toilettes. Utilisez la petite poubelle pour le reste (lingettes, protections, mouchoirs).","Només el paper higiènic va al vàter. Feu servir la paperera per a tot el que no ho sigui (tovalloletes, compreses, mocadors).","Nur Toilettenpapier gehört in die Toilette. Alles andere (Feuchttücher, Hygieneartikel, Taschentücher) in den kleinen Eimer.","Alleen wc-papier mag in het toilet. Gebruik het kleine bakje voor de rest (doekjes, maandverband, tissues)."),
  T("Shampoo, shower gel and a hair dryer are provided.","Hay champú, gel de ducha y secador de pelo.","Shampooing, gel douche et sèche-cheveux fournis.","Hi ha xampú, gel de dutxa i assecador de cabells.","Shampoo, Duschgel und Föhn sind vorhanden.","Shampoo, douchegel en een föhn zijn aanwezig.")]})
B.append({"id":"office","icon":"desk","tone":"yellow","title":T("Office","Despacho","Bureau","Despatx","Büro","Kantoor"),
 "sub":T("Desk, sofa bed, TV in the attic","Escritorio, sofá cama, tele en el ático","Bureau, canapé-lit, télé sous les toits","Escriptori, sofà llit, tele a les golfes","Schreibtisch, Schlafsofa, TV im Dach","Bureau, slaapbank, tv op zolder"),
 "photos":G('bed4-1'),
 "items":[
  T("The office is in the attic: a desk to work, a sofa bed and a smart TV.","El despacho está en el ático: escritorio para trabajar, sofá cama y smart TV.","Le bureau est sous les toits : une table de travail, un canapé-lit et une smart TV.","El despatx és a les golfes: escriptori per treballar, sofà llit i smart TV.","Das Büro ist im Dachgeschoss: Schreibtisch zum Arbeiten, Schlafsofa und Smart-TV.","Het kantoor is op zolder: een bureau om te werken, een slaapbank en een smart-tv."),
  T("Wifi: tap Wifi on the Home screen. If the signal is weak, switch to the long range network.","Wifi: toca Wifi en la pantalla de inicio. Si la señal es débil, cambia a la red de largo alcance.","Wifi : touchez Wifi sur l'écran d'accueil. Si le signal est faible, passez au réseau longue portée.","Wifi: toca Wifi a la pantalla d'inici. Si el senyal és feble, canvia a la xarxa de llarg abast.","WLAN: Auf dem Startbildschirm auf WLAN tippen. Bei schwachem Signal ins Netz mit großer Reichweite wechseln.","Wifi: tik op Wifi op het startscherm. Is het signaal zwak, kies dan het netwerk met groot bereik."),
  T("Air conditioning and a ceiling fan here too.","También hay aire acondicionado y ventilador de techo.","Climatisation et ventilateur de plafond ici aussi.","També hi ha aire condicionat i ventilador de sostre.","Auch hier Klimaanlage und Deckenventilator.","Ook hier airco en een plafondventilator.")]})
B.append({"id":"laundry","icon":"washer","tone":"yellow","title":T("Laundry","Lavadero","Buanderie","Safareig","Waschraum","Wasruimte"),
 "sub":T("Washing machine, dryer, iron","Lavadora, secadora, plancha","Lave-linge, sèche-linge, fer","Rentadora, assecadora, planxa","Waschmaschine, Trockner, Bügeleisen","Wasmachine, droger, strijkijzer"),
 "photos":G('laundry-1'),
 "items":[
  T("Washing machine, tumble dryer, drying rack, iron and ironing board.","Lavadora, secadora, tendedero, plancha y tabla de planchar.","Lave-linge, sèche-linge, étendoir, fer et table à repasser.","Rentadora, assecadora, estenedor, planxa i taula de planxar.","Waschmaschine, Trockner, Wäscheständer, Bügeleisen und Bügelbrett.","Wasmachine, droger, droogrek, strijkijzer en strijkplank.")]})
po=old['pool']
B.append({"id":"pool","icon":"pool","tone":"blue","title":T("Pool","Piscina","Piscine","Piscina","Pool","Zwembad"),
 "sub":po['sub'],"photos":po['photos'],
 "items":[po['items'][1],po['items'][0],po['items'][3],old['rules']['items'][1]]})
ou=old['outside']
B.append({"id":"outside","icon":"flame","tone":"orange","title":T("Outside","Exterior","Extérieur","Exterior","Draußen","Buiten"),
 "sub":T("Barbecue, outdoor kitchen, garden","Barbacoa, cocina exterior, jardín","Barbecue, cuisine extérieure, jardin","Barbacoa, cuina exterior, jardí","Grill, Außenküche, Garten","Barbecue, buitenkeuken, tuin"),
 "photos":ou['photos'],"items":ou['items']+[po['items'][2]]})
r=old['rules']
B.append({"id":"rules","icon":"home","tone":"ink","title":r['title'],
 "sub":T("No smoking inside","No fumar dentro","Ne pas fumer à l'intérieur","No fumar a dins","Drinnen nicht rauchen","Binnen niet roken"),
 "items":[r['items'][0],r['items'][2]]})
B.append(old['checkout'])
d['blocks']=B
json.dump(d,open(p,'w'),ensure_ascii=False,indent=2); open(p,'a').write('\n')
print([b['id'] for b in B])
