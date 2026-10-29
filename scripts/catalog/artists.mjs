// Single source of truth for who is in the catalog and how each artist is classified.
// Genres: pop (pop, dance), rock (rock, metal, punk, indie), urban (reggaetón, hip-hop, R&B),
// classics, shown as "Regional, baladas y soul" (ranchera, banda, corridos, tropical, salsa,
// bachata, baladistas, soul, motown, disco, country, crooners).
// Artists already in the catalog but not listed here keep their previous classification.

const GROUPS = {
  "es:urban": `Bad Bunny; KAROL G; Daddy Yankee; J Balvin; Ozuna; Maluma; Anuel AA; Farruko; Nicky Jam; Don Omar;
    Wisin & Yandel; Wisin; Yandel; Zion & Lennox; Sech; Rauw Alejandro; Myke Towers; Feid; Ryan Castro; Blessd;
    Danny Ocean; Lenny Tavárez; Arcángel; De La Ghetto; Jowell & Randy; Alexis & Fido; Chencho Corleone; Plan B;
    Tego Calderón; Ivy Queen; Héctor El Father; Tito El Bambino; Calle 13; Residente; Vico C; Cosculluela; Ñengo Flow;
    J Alvarez; Nio Garcia; Casper Magico; Bryant Myers; Lunay; Jhayco; Eladio Carrión; Tainy; Natti Natasha; Becky G;
    Jay Wheeler; Mora; Young Miko; Dalex; Justin Quiles; Brytiago; Darell; Lyanno; Kevvo; Rkm & Ken-y; Tony Dize;
    Baby Rasta & Gringo; Gente De Zona; Bizarrap; Duki; Trueno; Nicki Nicole; Paulo Londra; Tiago PZK; Maria Becerra;
    Emilia; FMK; LIT killah; L-Gante; KHEA; Rusherking; Wos; YSY A; Cazzu; Milo j; Quevedo; Saiko; Rels B; Bad Gyal;
    Morad; Cris MJ; Tokischa; Jhay Cortez; Guaynaa; Noriel; Kris R; Beéle; Manuel Turizo; Ovy On The Drums; Yandar & Yostin; Kapo; El Alfa; Ñejo; Chimbala; Ken-Y; Omar Courtz; Dei V; NSQK; Latin Mafia`,

  // Japanese: kept out of the Spanish/English filters, playable in artist mode.
  "ja:pop": `Ado`,

  "es:pop": `Shakira; Enrique Iglesias; ROSALÍA; Aitana; Luis Fonsi; Ricky Martin; Juanes; Carlos Vives; Camilo; Chayanne;
    Alejandro Sanz; David Bisbal; Pablo Alborán; Thalía; Paulina Rubio; Gloria Trevi; Alejandra Guzmán; Belinda; RBD;
    Ha*Ash; Jesse & Joy; Kany García; Sin Bandera; Camila; Río Roma; Matisse; Carlos Rivera; Yuridia; Kalimba;
    Ximena Sariñana; Natalia Lafourcade; Mon Laferte; Julieta Venegas; Carla Morrison; Ricardo Arjona; Luis Miguel;
    Cristian Castro; Franco de Vita; Ricardo Montaner; Diego Torres; Fonseca; Bacilos; Morat; Kenia Os; Danna Paola;
    Sofía Reyes; Lali; TINI; Ana Mena; Lola Indigo; Mecano; La Oreja de Van Gogh; Amaral; Laura Pausini;
    Eros Ramazzotti; Nek; Melendi; Pablo López; Manuel Carrasco; Vanesa Martín; India Martínez; Antonio Orozco;
    Álex Ubago; Sergio Dalma; Malú; Rosana; Dani Martín; Beret; Efecto Pasillo; Funambulista; Marta Sánchez;
    Chenoa; Bustamante; Axel; Abel Pintos; Gian Marco; Coti; Alejandro Lerner; CNCO; Kudai; Jotdog; Belanova;
    Moenia; Fey; Timbiriche; OV7; Sentidos Opuestos; Magneto; Menudo; Flans; Alaska y Dinarama; Fangoria;
    Presuntos Implicados; Ella Baila Sola; Nena Daconte; Despistaos; Carlos Baute; La Quinta Estación;
    Natalia Jiménez; Leonel García; Noel Schajris; Draco Rosa; María José; Paty Cantú; Miranda!; Tan Biónica;
    C. Tangana; Omar Montes; Dani Fernández; Sebastián Yatra; Piso 21; Mau y Ricky; Reik; Gloria Estefan; Jennifer Lopez; Kali Uchis;
    Nathy Peluso; Rombai; Emmanuel Horvilleur`,

  "es:rock": `Maná; Soda Stereo; Gustavo Cerati; Los Prisioneros; Caifanes; Jaguares; Café Tacvba; Molotov; Zoé;
    Los Enanitos Verdes; Héroes del Silencio; Bunbury; Hombres G; Duncan Dhu; Mikel Erentxun; Los Fabulosos Cadillacs;
    Los Auténticos Decadentes; Andrés Calamaro; Los Rodríguez; Charly García; Fito Páez; Luis Alberto Spinetta;
    Los Abuelos de la Nada; Babasónicos; Bersuit Vergarabat; Rata Blanca; El Cuarteto de Nos; La Vela Puerca;
    No te va Gustar; Los Bunkers; La Ley; Lucybell; Los Tres; Panda; Allison; Kinky; Plastilina Mosh; Control Machete;
    Cartel De Santa; El Tri; Maldita Vecindad; Fobia; Panteón Rococó; División Minúscula; Siddhartha; Enjambre; DLD;
    Inspector; Jumbo; Porter; Hello Seahorse!; Little Jesus; Odisseo; Cultura Profética; Aterciopelados;
    Doctor Krápula; Los Pericos; Divididos; Attaque 77; Patricio Rey y sus Redonditos de Ricota; La Renga; Los Piojos;
    Ciro y los Persas; Airbag; Turf; Catupecu Machu; Serú Girán; Sui Generis; Virus; Illya Kuryaki and the Valderramas;
    Jarabe de Palo; Ska-P; Extremoduro; Estopa; El Canto del Loco; Vetusta Morla; Love Of Lesbian; IZAL; Marea;
    Radio Futura; Los Secretos; Nacha Pop; El Último de la Fila; Manolo García; Fito & Fitipaldis; Platero y Tú;
    M-Clan; Mägo de Oz; Barricada; Leiva; Supersubmarina; Sidecars; Los Planetas; Café Quijano; Joaquín Sabina;
    Seguridad Social; Medina Azahara; La Gusana Ciega; El Gran Silencio; Los Amigos Invisibles; Los Caligaris;
    Estelares; Los Látigos; Coda; Saúl Hernández`,

  "es:classics": `José José; Juan Gabriel; Rocío Dúrcal; Rocío Jurado; Raphael; Camilo Sesto; Julio Iglesias; José Luis Perales;
    Nino Bravo; Joan Manuel Serrat; Leo Dan; Sandro; Palito Ortega; Los Ángeles Negros; Los Pasteles Verdes;
    Los Iracundos; Los Terrícolas; Los Galos; Los Ángeles Azules; Grupo Niche; Celia Cruz; Héctor Lavoe; Willie Colón;
    Rubén Blades; Marc Anthony; Gilberto Santa Rosa; Víctor Manuelle; Frankie Ruiz; Eddie Santiago; Jerry Rivera;
    Oscar D'León; Fruko Y Sus Tesos; Joe Arroyo; Juan Luis Guerra 4.40; Romeo Santos; Aventura; Prince Royce;
    Monchy & Alexandra; Elvis Crespo; Olga Tañón; Wilfrido Vargas; Selena; Kumbia Kings; A.B. Quintanilla III;
    Bronco; Los Bukis; Marco Antonio Solís; Los Temerarios; Grupo Bryndis; Los Yonic's; Liberación; Los Caminantes;
    Vicente Fernández; Alejandro Fernández; Pedro Infante; Jorge Negrete; Javier Solís; Antonio Aguilar;
    José Alfredo Jiménez; Lola Beltrán; Lucha Villa; Chavela Vargas; Lupita D'Alessio; Daniela Romo; Yuri; Lucero;
    Pandora; Mijares; Emmanuel; Rocío Banquells; Dulce; Isabel Pantoja; Lola Flores; Gipsy Kings; Los Del Río;
    Grupo Frontera; Grupo Firme; Banda MS de Sergio Lizárraga; Banda El Recodo; La Arrolladora Banda El Limón;
    Calibre 50; Julión Álvarez y su Norteño Banda; Carin León; Peso Pluma; Junior H; Natanael Cano; Fuerza Regida;
    Eslabon Armado; Gerardo Ortiz; Los Tigres del Norte; Los Tucanes De Tijuana; Ramón Ayala; Intocable; Pesado;
    Duelo; Los Invasores De Nuevo León; Ana Bárbara; Jenni Rivera; Lupillo Rivera; Joan Sebastian; Espinoza Paz;
    Remmy Valenzuela; Christian Nodal; Ángela Aguilar; Pepe Aguilar; Banda Los Recoditos; Xavi; Tito Double P;
    Gabito Ballesteros; Luis R Conriquez; Edén Muñoz; Óscar Maydon; Mercedes Sosa; Facundo Cabral; Violeta Parra;
    Víctor Jara; Silvio Rodríguez; Pablo Milanés; Buena Vista Social Club; Compay Segundo; Los Panchos;
    Armando Manzanero; Alberto Cortez; Piero; Mocedades; Pimpinela; Dyango; Manolo Galván; Braulio; Danny Daniel;
    Miguel Gallardo; Ana Gabriel; Amanda Miguel; Diego Verdaguer; Marisela; Paquita la del Barrio; Leonardo Favio;
    Camela; Rigo Tovar; Celso Piña; Los Askis; Los Acosta; Los Mier; Industria del Amor; Sonora Santanera;
    Sonora Dinamita; Carlos Gardel; Miguel Bosé; Jeanette; Roberto Carlos; Grupo Cañaveral De Humberto Pabón;
    La Sonora Dinamita; Banda Machos; Banda El Limón; Proyecto X`,

  "en:pop": `Taylor Swift; Ariana Grande; Lady Gaga; Rihanna; Katy Perry; Justin Bieber; Ed Sheeran; Dua Lipa; Bruno Mars;
    Billie Eilish; Olivia Rodrigo; Harry Styles; Sabrina Carpenter; Chappell Roan; Miley Cyrus; Selena Gomez;
    Britney Spears; Christina Aguilera; Beyoncé; Destiny's Child; Mariah Carey; Janet Jackson; Kylie Minogue;
    Michael Jackson; Madonna; Elton John; ABBA; George Michael; Wham!; Prince; Phil Collins; Cyndi Lauper;
    Bonnie Tyler; Hall & Oates; Eurythmics; Paul Simon; James Taylor; Carole King; Sia; Adele; Sam Smith;
    Lana Del Rey; Lorde; Charli xcx; Zara Larsson; Bebe Rexha; Ava Max; Kesha; P!nk; Kelly Clarkson; Avril Lavigne;
    Shawn Mendes; Camila Cabello; Fifth Harmony; One Direction; Backstreet Boys; *NSYNC; Spice Girls; Jonas Brothers;
    Justin Timberlake; Demi Lovato; Carly Rae Jepsen; Ellie Goulding; Gwen Stefani; Fergie; Nelly Furtado;
    Shania Twain; Alanis Morissette; Dido; Maroon 5; The Weeknd; Daft Punk; Mark Ronson; Pharrell Williams;
    Tate McRae; Gracie Abrams; Benson Boone; Teddy Swims; Lewis Capaldi; Calvin Harris; David Guetta; Avicii; Kygo;
    Marshmello; The Chainsmokers; Martin Garrix; Clean Bandit; Rita Ora; Jessie J; Meghan Trainor; Charlie Puth;
    OneRepublic; fun.; Train; Jason Mraz; James Blunt; James Arthur; Lukas Graham; Halsey; Troye Sivan; Tove Lo;
    Lizzo; Paula Abdul; Robbie Williams; Take That; Westlife; Boyzone; Hanson; Aqua; Vengaboys; Eiffel 65;
    Ace of Base; Roxette; Savage Garden; All Saints; Sugababes; Girls Aloud; The Pussycat Dolls; LMFAO; Owl City;
    Little Mix; Jess Glynne; Anne-Marie; Rag'n'Bone Man; Hailee Steinfeld; Mabel; Tina Turner; Cher; Duran Duran;
    Tears For Fears; Pet Shop Boys; Culture Club; Spandau Ballet; Rick Astley; Kim Wilde; Belinda Carlisle;
    Huey Lewis & The News; Kenny Loggins; Men At Work; The Bangles; The Human League; Soft Cell; The Buggles;
    Dexys Midnight Runners; Simply Red; Tracy Chapman; Richard Marx; UB40; Jason Derulo; Sting; Gotye; Sheppard;
    Passenger; Vance Joy; Years & Years; Rudimental; Disclosure; Fred again..; Dean Lewis; Conan Gray; Sombr;
    Alex Warren; Doechii; RAYE; PinkPantheress; Omar Apollo; Mitski; Laufey; Djo; Gigi Perez; Chlöe; Madison Beer;
    Lauv; Ruth B.; Christina Perri; Colbie Caillat; Natasha Bedingfield; Vanessa Carlton; Michelle Branch;
    Hilary Duff; Ashlee Simpson; Jesse McCartney; The Saturdays; Natalie Imbruglia; Swedish House Mafia; Zedd;
    Major Lazer; DJ Snake; Alan Walker; Sigala; Jonas Blue; Galantis; Lost Frequencies; Robin Schulz; Bastille;
    Coldplay?`,

  "en:rock": `Queen; The Beatles; The Rolling Stones; Led Zeppelin; Pink Floyd; AC/DC; Nirvana; Metallica; Guns N' Roses;
    Bon Jovi; Aerosmith; Linkin Park; Coldplay; Radiohead; The Cure; The Police; Red Hot Chili Peppers; Arctic Monkeys;
    The Strokes; The Killers; Green Day; Foo Fighters; Pearl Jam; Soundgarden; Alice in Chains; Stone Temple Pilots;
    The Smashing Pumpkins; R.E.M.; U2; Oasis; Blur; Muse; Imagine Dragons; Twenty One Pilots; Paramore; Fall Out Boy;
    My Chemical Romance; Panic! At the Disco; blink-182; Sum 41; The Offspring; Weezer; Gorillaz; The White Stripes;
    Kings of Leon; Franz Ferdinand; The Clash; The Smiths; Depeche Mode; David Bowie; Fleetwood Mac; Eagles; Toto;
    Dire Straits; Journey; Foreigner; Boston; REO Speedwagon; Supertramp; Electric Light Orchestra; Bryan Adams;
    Rod Stewart; Chicago; Blondie; Simon & Garfunkel; Bob Dylan; Yusuf / Cat Stevens; The Beach Boys; Survivor;
    Scorpions; Deep Purple; Black Sabbath; Van Halen; KISS; Def Leppard; Jimi Hendrix; The Doors; The Who;
    John Lennon; Elvis Presley; Chuck Berry; Mötley Crüe; Poison; Whitesnake; Iron Maiden; Judas Priest;
    Ozzy Osbourne; Motörhead; Rush; Genesis; The Kinks; The Animals; Creedence Clearwater Revival; Lynyrd Skynyrd;
    ZZ Top; Tom Petty and the Heartbreakers; Bruce Springsteen; Billy Idol; Ramones; Sex Pistols; Talking Heads;
    The Cranberries; No Doubt; Garbage; The Verve; Pulp; Placebo; Keane; Snow Patrol; Travis; Kaiser Chiefs;
    The Kooks; Bloc Party; The Libertines; Interpol; Yeah Yeah Yeahs; MGMT; Vampire Weekend; The Black Keys;
    The Lumineers; Mumford & Sons; Of Monsters and Men; Florence + The Machine; Hozier; Noah Kahan;
    Cage The Elephant; Glass Animals; Tame Impala; Arcade Fire; Foster The People; Two Door Cinema Club; Phoenix;
    Portugal. The Man; The Neighbourhood; Cigarettes After Sex; Bon Iver; Måneskin; Nickelback; Creed; 3 Doors Down;
    Matchbox Twenty; Goo Goo Dolls; Third Eye Blind; Lifehouse; The Fray; Daughtry; Evanescence; System Of A Down;
    Limp Bizkit; Korn; Slipknot; Rage Against The Machine; Audioslave; Incubus; Papa Roach; Disturbed;
    Three Days Grace; Breaking Benjamin; Shinedown; Avenged Sevenfold; Bring Me The Horizon; Simple Plan;
    Good Charlotte; Yellowcard; All Time Low; The All-American Rejects; Jimmy Eat World; Smash Mouth; Sugar Ray;
    Barenaked Ladies; Counting Crows; Hootie & The Blowfish; Bush; Collective Soul; Cream; Eric Clapton; INXS;
    Simple Minds; The Pretenders; Pat Benatar; Joan Jett & the Blackhearts; Heart; Europe; New Order; Joy Division;
    Echo & the Bunnymen; Morrissey; The Ronettes?; Billy Joel; The Killers; Kaleo; Greta Van Fleet; Royal Blood;
    The Hives; Jet; The Vines; Wolfmother; Modest Mouse; The Shins; Death Cab for Cutie; Fleet Foxes; The National;
    Arctic Monkeys; Beck; Spin Doctors; The Proclaimers; The Romantics; The Knack; Steve Miller Band; Bachman-Turner Overdrive;
    Santana; Thin Lizzy; Free; Bad Company; Styx; Kansas; Heart; Cheap Trick; Status Quo; The Zombies; The Hollies; The Monkees;
    The Turtles; The Mamas & The Papas; The Byrds; Jefferson Airplane; Janis Joplin; Neil Young; The Band; Steppenwolf`,

  "en:urban": `Eminem; Drake; Kendrick Lamar; Kanye West; Travis Scott; Post Malone; Nicki Minaj; Cardi B; Doja Cat; SZA;
    Frank Ocean; Tyler, The Creator; Childish Gambino; J. Cole; Kid Cudi; Logic; Mac Miller; A$AP Rocky; Juice WRLD;
    XXXTENTACION; Pop Smoke; Future; Metro Boomin; Lil Wayne; Lil Nas X; Wiz Khalifa; Big Sean; Ludacris; Nelly; T.I.;
    50 Cent; Dr. Dre; Snoop Dogg; Ice Cube; 2Pac; The Notorious B.I.G.; Nas; DMX; Busta Rhymes; Missy Elliott;
    Outkast; Fugees; Lauryn Hill; TLC; Usher; Ne-Yo; Chris Brown; Alicia Keys; John Legend; T-Pain;
    Black Eyed Peas; Jay-Z; Lil Kim; Eve; Ja Rule; Fat Joe; Mase; Diddy; Timbaland; Wu-Tang Clan; Run-DMC;
    Beastie Boys; Public Enemy; LL COOL J; Salt-N-Pepa; Will Smith; Vanilla Ice; MC Hammer; House Of Pain;
    Naughty By Nature; Cypress Hill; Bone Thugs-N-Harmony; Warren G; Xzibit; The Game; Mobb Deep; Coolio;
    Montell Jordan; Mark Morrison; Shaggy; Sean Paul; Wyclef Jean; Akon; Sean Kingston; Flo Rida; Lil Jon;
    Macklemore & Ryan Lewis; Macklemore; Chance the Rapper; Khalid; Jack Harlow; Lil Uzi Vert; Playboi Carti;
    Roddy Ricch; DaBaby; Lil Baby; Gunna; 21 Savage; Megan Thee Stallion; Ice Spice; GloRilla; Latto; Polo G;
    Lil Durk; Lil Peep; Daniel Caesar; H.E.R.; Summer Walker; Giveon; Miguel; Jhené Aiko; 6LACK; Steve Lacy;
    Central Cee; Stormzy; Dave; Tyla; Boyz II Men; Toni Braxton; Mary J. Blige; Brandy; Monica; Aaliyah; Ginuwine;
    Mario; Ciara; Ashanti; Jagged Edge; Blackstreet; Bell Biv DeVoe; En Vogue; SWV; Jodeci; K-Ci & JoJo; Brian McKnight;
    Musiq Soulchild; India.Arie; Erykah Badu; D'Angelo; Maxwell; Kehlani; Bryson Tiller; Don Toliver; NAV; Russ;
    Rae Sremmurd; Migos; Quavo; Offset; Young Thug; Lil Yachty; Tory Lanez; PARTYNEXTDOOR; dvsn; Trippie Redd;
    Ski Mask the Slump God; Joey Bada$$; Isaiah Rashad; Schoolboy Q; Vince Staples; Denzel Curry; JID; Baby Keem;
    Lil Tecca; Lil Mosey; Iann Dior; 24kGoldn; Sheck Wes; Gucci Mane; Rick Ross; Meek Mill; Wale; Kodak Black;
    NLE Choppa; Fivio Foreign; Kanye West; Tyga; YG; Kid Ink; B.o.B; Mike Posner; Iyaz; Jason Derulo?`,

  "en:classics": `Earth, Wind & Fire; Bee Gees; Jackson 5; Stevie Wonder; Aretha Franklin; Whitney Houston; Al Green;
    Otis Redding; Marvin Gaye; The Supremes; The Temptations; Four Tops; Sam Cooke; Ray Charles; Kool & The Gang;
    Gloria Gaynor; Donna Summer; Céline Dion; Frank Sinatra; Nat King Cole; Louis Armstrong; Dean Martin;
    Ella Fitzgerald; Etta James; Nina Simone; Ben E. King; The Platters; The Righteous Brothers; The Ronettes;
    Diana Ross; Lionel Richie; Commodores; Barry White; Bill Withers; Smokey Robinson & The Miracles;
    Gladys Knight & The Pips; CHIC; Sister Sledge; KC & The Sunshine Band; Village People; Boney M.; Kenny Rogers;
    Dolly Parton; Johnny Cash; John Denver; Neil Diamond; Tom Jones; Michael Bolton; Air Supply; Carpenters;
    Bob Marley & The Wailers; James Brown; Curtis Mayfield; The Isley Brothers; Rick James; Luther Vandross;
    Anita Baker; Sade; Amy Winehouse; Michael Bublé; Norah Jones; Leon Bridges; Carrie Underwood; Luke Combs;
    Morgan Wallen; Zach Bryan; Chris Stapleton; Kacey Musgraves; Garth Brooks; Tim McGraw; Faith Hill;
    Keith Urban; Lady A; Florida Georgia Line; Billy Ray Cyrus; Willie Nelson; Patsy Cline; Elvis Costello?;
    The Pointer Sisters; Irene Cara; Kenny G; Earth Wind & Fire; The Jacksons; Billy Ocean; Lionel Richie;
    Bobby McFerrin; Percy Sledge; The Drifters; Wilson Pickett; Stevie Wonder; Labelle; Chaka Khan; The O'Jays;
    Hot Chocolate; Shakatak; Teena Marie; Cyndi?; Bobby Darin; Paul Anka; Andy Williams; Bing Crosby;
    Brenda Lee; Mariah?; Toni?; Roberta Flack; Dionne Warwick; Barbra Streisand; Lionel?; Christopher Cross;
    Bertie Higgins; Phil Collins?`,
};

/** Names that only differ from a canonical one by more than case or punctuation. */
export const ALIASES = {
  "Ms. Lauryn Hill": "Lauryn Hill",
  "Manuel Mijares": "Mijares",
  "Alexis & Fido featuring Hector 'El Father' & Baby Rasta": "Alexis & Fido",
  "Arcángel & DJ Luian": "Arcángel",
  "Baby Rasta": "Baby Rasta & Gringo",
  "Wise The Gold Pen and Dj Luian feat. Cosculluela": "Cosculluela",
  "Rocio Durcal": "Rocío Dúrcal",
  "Roberto Carlos Braga": "Roberto Carlos",
  "Juan Luis Guerra": "Juan Luis Guerra 4.40",
  "Fergie & Sadrian": "Fergie",
  "NEK!": "Nek",
  "Jhay Cortez": "Jhayco",
  "JHAYCO": "Jhayco",
  "Earth Wind & Fire": "Earth, Wind & Fire",
  "Macklemore": "Macklemore & Ryan Lewis",
};

/** Wrong matches from earlier imports: same name, different act. */
export const BLOCKED = new Set([
  "Nirvana (UK)",
  "EMILIA(CV:RIE TAKAHASHI)",
  "Sandro & Gustavo",
  "Sandro & Ronaldo",
  "Renga Nek",
]);

/** Artists that record in both languages: each song's language comes from its title. */
export const BILINGUAL = new Set([
  "Shakira", "Enrique Iglesias", "Ricky Martin", "Santana", "Pitbull", "Camila Cabello", "Jennifer Lopez",
  "Gloria Estefan", "Christina Aguilera", "Marc Anthony", "Selena", "Becky G", "Kali Uchis", "Julio Iglesias",
  "Thalía", "Paulina Rubio", "Luis Fonsi", "Prince Royce", "Romeo Santos", "Nelly Furtado", "Draco Rosa",
  "Laura Pausini", "Eros Ramazzotti", "Chayanne", "Selena Gomez", "Gipsy Kings", "Natti Natasha", "Anitta",
  "Alejandro Sanz", "Juanes", "Los Del Río", "Ritchie Valens",
]);

const ES_WORDS =
  /\b(el|la|los|las|de|del|que|mi|tu|te|y|en|un|una|por|para|con|amor|coraz[oó]n|quiero|eres|sin|como|vida|noche|baila|bailando|loca|loco|mujer|nada|todo|soy|estoy|ya|pa|mami|papi|beb[eé]|bonita|hoy|siempre|nunca|cuando|dime|dame|ella|vez|otra|solo|amigo|sue[ñn]o|cielo|fuego|nadie|quien|t[uú]|est[aá]s|ti|hasta|desde|tan|m[aá]s)\b|[ñáéíóú¿¡]/gi;
const EN_WORDS =
  /\b(the|you|your|i|i'm|my|love|baby|don't|it's|to|of|on|and|we|with|what|when|all|is|be|girl|night|heart|feel|dance|let|like|can't|won't|never|time|want|need|get|go|so|up|it|this|that|tonight|crazy|world|life|hips|lie|whenever|wherever|oh|she|he|they|from|for)\b/gi;

// English contractions ("Livin'", "Don't") outweigh a Spanish word or two in the same title.
const EN_CONTRACTION = /\w(n'|'(s|t|re|ll|ve|d|m))(\s|$)/gi;
const IT_WORDS =
  /\b(e|da|io|che|non|il|di|della|dello|sono|sei|tra|gli|perch[eé]|pi[uù]|questo|quella|amore|cuore|ancora|sempre|mai|notte|siamo|vuoto|ritorno|dove|nessuno|cosa|tutto|niente|grande|uomo|ragazza|strani|amori|occhi|parole|vivimi|incancellabile|solitudine|ascolta)\b|c'[eè]/gi;

const FR_WORDS =
  /\b(le|les|une|je|pas|est|mon|ma|toujours|pour|qui|dans|avec|faut|moi|toi|nous|vous|sur|perdant|amour)\b|c'est|j'ai/gi;

/** Titles plainly in Italian or French (two or more telltale words), out of place in a Spanish/English game. */
export function isForeignTitle(title) {
  const t = title.replace(/\((feat|ft|with)[^)]*\)/gi, "");
  const es = (t.match(ES_WORDS) ?? []).length;
  return [IT_WORDS, FR_WORDS].some((re) => {
    const n = (t.match(re) ?? []).length;
    return n >= 2 && n > es;
  });
}

/** Best guess of a song title's language ("es", "en" or "it"); null when the title says nothing. */
export function titleLanguage(title) {
  const t = title.replace(/\((feat|ft|with)[^)]*\)/gi, "");
  const scores = {
    es: (t.match(ES_WORDS) ?? []).length,
    en: (t.match(EN_WORDS) ?? []).length + 4 * (t.match(EN_CONTRACTION) ?? []).length,
    it: (t.match(IT_WORDS) ?? []).length,
  };
  const [best, second] = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return best[1] === 0 || best[1] === second[1] ? null : best[0];
}

/** Italian singers with Spanish versions of their songs: only titles that read as Spanish are kept. */
export const SPANISH_VERSIONS_ONLY = new Set(["Laura Pausini", "Eros Ramazzotti", "Nek", "Tiziano Ferro"]);

/** name → { language, genre } */
export const ARTISTS = new Map();
for (const [key, list] of Object.entries(GROUPS)) {
  const [language, genre] = key.split(":");
  for (const raw of list.split(";")) {
    const name = raw.trim();
    // A trailing "?" marks a name I was unsure belonged in this group; those are skipped.
    if (!name || name.endsWith("?")) continue;
    if (!ARTISTS.has(name)) ARTISTS.set(name, { language, genre });
  }
}
