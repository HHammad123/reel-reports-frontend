/**
 * Top 250 most popular Google Fonts
 * Organized by popularity and usage statistics
 * Each font includes a lazy-loaded import for optimal performance
 */
export const top250 = [
    // Top Sans-serif fonts
    {
        family: 'Roboto',
        load: () => import('@remotion/google-fonts/Roboto'),
    },
    {
        family: 'Open Sans',
        load: () => import('@remotion/google-fonts/OpenSans'),
    },
    {
        family: 'Lato',
        load: () => import('@remotion/google-fonts/Lato'),
    },
    {
        family: 'Montserrat',
        load: () => import('@remotion/google-fonts/Montserrat'),
    },
    {
        family: 'Poppins',
        load: () => import('@remotion/google-fonts/Poppins'),
    },
    {
        family: 'Inter',
        load: () => import('@remotion/google-fonts/Inter'),
    },
    {
        family: 'Raleway',
        load: () => import('@remotion/google-fonts/Raleway'),
    },
    {
        family: 'Ubuntu',
        load: () => import('@remotion/google-fonts/Ubuntu'),
    },
    {
        family: 'Nunito',
        load: () => import('@remotion/google-fonts/Nunito'),
    },
    {
        family: 'Nunito Sans',
        load: () => import('@remotion/google-fonts/NunitoSans'),
    },
    {
        family: 'Work Sans',
        load: () => import('@remotion/google-fonts/WorkSans'),
    },
    {
        family: 'Quicksand',
        load: () => import('@remotion/google-fonts/Quicksand'),
    },
    {
        family: 'Rubik',
        load: () => import('@remotion/google-fonts/Rubik'),
    },
    {
        family: 'Source Sans 3',
        load: () => import('@remotion/google-fonts/SourceSans3'),
    },
    {
        family: 'DM Sans',
        load: () => import('@remotion/google-fonts/DMSans'),
    },
    {
        family: 'Mulish',
        load: () => import('@remotion/google-fonts/Mulish'),
    },
    {
        family: 'Manrope',
        load: () => import('@remotion/google-fonts/Manrope'),
    },
    {
        family: 'Outfit',
        load: () => import('@remotion/google-fonts/Outfit'),
    },
    {
        family: 'Plus Jakarta Sans',
        load: () => import('@remotion/google-fonts/PlusJakartaSans'),
    },
    {
        family: 'Lexend',
        load: () => import('@remotion/google-fonts/Lexend'),
    },
    // Popular Serif fonts
    {
        family: 'Playfair Display',
        load: () => import('@remotion/google-fonts/PlayfairDisplay'),
    },
    {
        family: 'Merriweather',
        load: () => import('@remotion/google-fonts/Merriweather'),
    },
    {
        family: 'Lora',
        load: () => import('@remotion/google-fonts/Lora'),
    },
    {
        family: 'PT Serif',
        load: () => import('@remotion/google-fonts/PTSerif'),
    },
    {
        family: 'Noto Serif',
        load: () => import('@remotion/google-fonts/NotoSerif'),
    },
    {
        family: 'EB Garamond',
        load: () => import('@remotion/google-fonts/EBGaramond'),
    },
    {
        family: 'Libre Baskerville',
        load: () => import('@remotion/google-fonts/LibreBaskerville'),
    },
    {
        family: 'Crimson Text',
        load: () => import('@remotion/google-fonts/CrimsonText'),
    },
    {
        family: 'Bitter',
        load: () => import('@remotion/google-fonts/Bitter'),
    },
    {
        family: 'Source Serif 4',
        load: () => import('@remotion/google-fonts/SourceSerif4'),
    },
    // Display & Decorative fonts
    {
        family: 'Bebas Neue',
        load: () => import('@remotion/google-fonts/BebasNeue'),
    },
    {
        family: 'Pacifico',
        load: () => import('@remotion/google-fonts/Pacifico'),
    },
    {
        family: 'Dancing Script',
        load: () => import('@remotion/google-fonts/DancingScript'),
    },
    {
        family: 'Comfortaa',
        load: () => import('@remotion/google-fonts/Comfortaa'),
    },
    {
        family: 'Lobster',
        load: () => import('@remotion/google-fonts/Lobster'),
    },
    {
        family: 'Caveat',
        load: () => import('@remotion/google-fonts/Caveat'),
    },
    {
        family: 'Anton',
        load: () => import('@remotion/google-fonts/Anton'),
    },
    {
        family: 'Righteous',
        load: () => import('@remotion/google-fonts/Righteous'),
    },
    {
        family: 'Satisfy',
        load: () => import('@remotion/google-fonts/Satisfy'),
    },
    {
        family: 'Great Vibes',
        load: () => import('@remotion/google-fonts/GreatVibes'),
    },
    // Monospace fonts
    {
        family: 'Roboto Mono',
        load: () => import('@remotion/google-fonts/RobotoMono'),
    },
    {
        family: 'Fira Code',
        load: () => import('@remotion/google-fonts/FiraCode'),
    },
    {
        family: 'Source Code Pro',
        load: () => import('@remotion/google-fonts/SourceCodePro'),
    },
    {
        family: 'JetBrains Mono',
        load: () => import('@remotion/google-fonts/JetBrainsMono'),
    },
    {
        family: 'Inconsolata',
        load: () => import('@remotion/google-fonts/Inconsolata'),
    },
    {
        family: 'Space Mono',
        load: () => import('@remotion/google-fonts/SpaceMono'),
    },
    {
        family: 'IBM Plex Mono',
        load: () => import('@remotion/google-fonts/IBMPlexMono'),
    },
    {
        family: 'Courier Prime',
        load: () => import('@remotion/google-fonts/CourierPrime'),
    },
    {
        family: 'Red Hat Mono',
        load: () => import('@remotion/google-fonts/RedHatMono'),
    },
    {
        family: 'DM Mono',
        load: () => import('@remotion/google-fonts/DMMono'),
    },
    // Additional popular fonts (51-250)
    {
        family: 'Barlow',
        load: () => import('@remotion/google-fonts/Barlow'),
    },
    {
        family: 'Hind',
        load: () => import('@remotion/google-fonts/Hind'),
    },
    {
        family: 'Josefin Sans',
        load: () => import('@remotion/google-fonts/JosefinSans'),
    },
    {
        family: 'Arimo',
        load: () => import('@remotion/google-fonts/Arimo'),
    },
    {
        family: 'Dosis',
        load: () => import('@remotion/google-fonts/Dosis'),
    },
    {
        family: 'PT Sans',
        load: () => import('@remotion/google-fonts/PTSans'),
    },
    {
        family: 'Libre Franklin',
        load: () => import('@remotion/google-fonts/LibreFranklin'),
    },
    {
        family: 'Karla',
        load: () => import('@remotion/google-fonts/Karla'),
    },
    {
        family: 'Cabin',
        load: () => import('@remotion/google-fonts/Cabin'),
    },
    {
        family: 'Oxygen',
        load: () => import('@remotion/google-fonts/Oxygen'),
    },
    {
        family: 'Overpass',
        load: () => import('@remotion/google-fonts/Overpass'),
    },
    {
        family: 'Fira Sans',
        load: () => import('@remotion/google-fonts/FiraSans'),
    },
    {
        family: 'Maven Pro',
        load: () => import('@remotion/google-fonts/MavenPro'),
    },
    {
        family: 'Cairo',
        load: () => import('@remotion/google-fonts/Cairo'),
    },
    {
        family: 'Exo 2',
        load: () => import('@remotion/google-fonts/Exo2'),
    },
    {
        family: 'Signika',
        load: () => import('@remotion/google-fonts/Signika'),
    },
    {
        family: 'Assistant',
        load: () => import('@remotion/google-fonts/Assistant'),
    },
    {
        family: 'Public Sans',
        load: () => import('@remotion/google-fonts/PublicSans'),
    },
    {
        family: 'Red Hat Display',
        load: () => import('@remotion/google-fonts/RedHatDisplay'),
    },
    {
        family: 'Epilogue',
        load: () => import('@remotion/google-fonts/Epilogue'),
    },
    {
        family: 'Space Grotesk',
        load: () => import('@remotion/google-fonts/SpaceGrotesk'),
    },
    {
        family: 'Sora',
        load: () => import('@remotion/google-fonts/Sora'),
    },
    {
        family: 'Urbanist',
        load: () => import('@remotion/google-fonts/Urbanist'),
    },
    {
        family: 'Figtree',
        load: () => import('@remotion/google-fonts/Figtree'),
    },
    {
        family: 'Schibsted Grotesk',
        load: () => import('@remotion/google-fonts/SchibstedGrotesk'),
    },
    {
        family: 'Onest',
        load: () => import('@remotion/google-fonts/Onest'),
    },
    {
        family: 'Archivo',
        load: () => import('@remotion/google-fonts/Archivo'),
    },
    {
        family: 'Noto Sans JP',
        load: () => import('@remotion/google-fonts/NotoSansJP'),
    },
    {
        family: 'Titillium Web',
        load: () => import('@remotion/google-fonts/TitilliumWeb'),
    },
    {
        family: 'Commissioner',
        load: () => import('@remotion/google-fonts/Commissioner'),
    },
    {
        family: 'Be Vietnam Pro',
        load: () => import('@remotion/google-fonts/BeVietnamPro'),
    },
    {
        family: 'Jost',
        load: () => import('@remotion/google-fonts/Jost'),
    },
    {
        family: 'Chivo',
        load: () => import('@remotion/google-fonts/Chivo'),
    },
    {
        family: 'Heebo',
        load: () => import('@remotion/google-fonts/Heebo'),
    },
    {
        family: 'Mukta',
        load: () => import('@remotion/google-fonts/Mukta'),
    },
    {
        family: 'Kanit',
        load: () => import('@remotion/google-fonts/Kanit'),
    },
    {
        family: 'IBM Plex Sans',
        load: () => import('@remotion/google-fonts/IBMPlexSans'),
    },
    {
        family: 'Barlow Condensed',
        load: () => import('@remotion/google-fonts/BarlowCondensed'),
    },
    {
        family: 'Roboto Condensed',
        load: () => import('@remotion/google-fonts/RobotoCondensed'),
    },
    {
        family: 'Oswald',
        load: () => import('@remotion/google-fonts/Oswald'),
    },
    {
        family: 'Noto Sans',
        load: () => import('@remotion/google-fonts/NotoSans'),
    },
    {
        family: 'Roboto Slab',
        load: () => import('@remotion/google-fonts/RobotoSlab'),
    },
    {
        family: 'Asap',
        load: () => import('@remotion/google-fonts/Asap'),
    },
    {
        family: 'Zilla Slab',
        load: () => import('@remotion/google-fonts/ZillaSlab'),
    },
    {
        family: 'Cormorant Garamond',
        load: () => import('@remotion/google-fonts/CormorantGaramond'),
    },
    {
        family: 'Spectral',
        load: () => import('@remotion/google-fonts/Spectral'),
    },
    {
        family: 'Arvo',
        load: () => import('@remotion/google-fonts/Arvo'),
    },
    {
        family: 'Domine',
        load: () => import('@remotion/google-fonts/Domine'),
    },
    {
        family: 'Vollkorn',
        load: () => import('@remotion/google-fonts/Vollkorn'),
    },
    {
        family: 'Alegreya',
        load: () => import('@remotion/google-fonts/Alegreya'),
    },
    {
        family: 'Crete Round',
        load: () => import('@remotion/google-fonts/CreteRound'),
    },
    {
        family: 'Rokkitt',
        load: () => import('@remotion/google-fonts/Rokkitt'),
    },
    {
        family: 'Slabo 27px',
        load: () => import('@remotion/google-fonts/Slabo27px'),
    },
    {
        family: 'Noticia Text',
        load: () => import('@remotion/google-fonts/NoticiaText'),
    },
    {
        family: 'Frank Ruhl Libre',
        load: () => import('@remotion/google-fonts/FrankRuhlLibre'),
    },
    {
        family: 'Old Standard TT',
        load: () => import('@remotion/google-fonts/OldStandardTT'),
    },
    {
        family: 'Abril Fatface',
        load: () => import('@remotion/google-fonts/AbrilFatface'),
    },
    {
        family: 'Secular One',
        load: () => import('@remotion/google-fonts/SecularOne'),
    },
    {
        family: 'Fredoka',
        load: () => import('@remotion/google-fonts/Fredoka'),
    },
    {
        family: 'Bungee',
        load: () => import('@remotion/google-fonts/Bungee'),
    },
    {
        family: 'Passion One',
        load: () => import('@remotion/google-fonts/PassionOne'),
    },
    {
        family: 'Russo One',
        load: () => import('@remotion/google-fonts/RussoOne'),
    },
    {
        family: 'Permanent Marker',
        load: () => import('@remotion/google-fonts/PermanentMarker'),
    },
    {
        family: 'Cookie',
        load: () => import('@remotion/google-fonts/Cookie'),
    },
    {
        family: 'Kaushan Script',
        load: () => import('@remotion/google-fonts/KaushanScript'),
    },
    {
        family: 'Shadows Into Light',
        load: () => import('@remotion/google-fonts/ShadowsIntoLight'),
    },
    {
        family: 'Amatic SC',
        load: () => import('@remotion/google-fonts/AmaticSC'),
    },
    {
        family: 'Sacramento',
        load: () => import('@remotion/google-fonts/Sacramento'),
    },
    {
        family: 'Handlee',
        load: () => import('@remotion/google-fonts/Handlee'),
    },
    {
        family: 'Patrick Hand',
        load: () => import('@remotion/google-fonts/PatrickHand'),
    },
    {
        family: 'Gloria Hallelujah',
        load: () => import('@remotion/google-fonts/GloriaHallelujah'),
    },
    {
        family: 'Indie Flower',
        load: () => import('@remotion/google-fonts/IndieFlower'),
    },
    {
        family: 'Architects Daughter',
        load: () => import('@remotion/google-fonts/ArchitectsDaughter'),
    },
    {
        family: 'Courgette',
        load: () => import('@remotion/google-fonts/Courgette'),
    },
    {
        family: 'Kalam',
        load: () => import('@remotion/google-fonts/Kalam'),
    },
    {
        family: 'Ubuntu Mono',
        load: () => import('@remotion/google-fonts/UbuntuMono'),
    },
    {
        family: 'Anonymous Pro',
        load: () => import('@remotion/google-fonts/AnonymousPro'),
    },
    {
        family: 'VT323',
        load: () => import('@remotion/google-fonts/VT323'),
    },
    {
        family: 'Overpass Mono',
        load: () => import('@remotion/google-fonts/OverpassMono'),
    },
    {
        family: 'Major Mono Display',
        load: () => import('@remotion/google-fonts/MajorMonoDisplay'),
    },
    {
        family: 'Share Tech Mono',
        load: () => import('@remotion/google-fonts/ShareTechMono'),
    },
    {
        family: 'Nova Mono',
        load: () => import('@remotion/google-fonts/NovaMono'),
    },
    {
        family: 'Cutive Mono',
        load: () => import('@remotion/google-fonts/CutiveMono'),
    },
    {
        family: 'Cousine',
        load: () => import('@remotion/google-fonts/Cousine'),
    },
    {
        family: 'B612 Mono',
        load: () => import('@remotion/google-fonts/B612Mono'),
    },
    {
        family: 'Saira',
        load: () => import('@remotion/google-fonts/Saira'),
    },
    {
        family: 'Prompt',
        load: () => import('@remotion/google-fonts/Prompt'),
    },
    {
        family: 'M PLUS Rounded 1c',
        load: () => import('@remotion/google-fonts/MPLUSRounded1c'),
    },
    {
        family: 'Varela Round',
        load: () => import('@remotion/google-fonts/VarelaRound'),
    },
    {
        family: 'Catamaran',
        load: () => import('@remotion/google-fonts/Catamaran'),
    },
    {
        family: 'Encode Sans',
        load: () => import('@remotion/google-fonts/EncodeSans'),
    },
    {
        family: 'Exo',
        load: () => import('@remotion/google-fonts/Exo'),
    },
    {
        family: 'League Spartan',
        load: () => import('@remotion/google-fonts/LeagueSpartan'),
    },
    {
        family: 'Rajdhani',
        load: () => import('@remotion/google-fonts/Rajdhani'),
    },
    {
        family: 'Tajawal',
        load: () => import('@remotion/google-fonts/Tajawal'),
    },
    {
        family: 'Almarai',
        load: () => import('@remotion/google-fonts/Almarai'),
    },
    {
        family: 'Gothic A1',
        load: () => import('@remotion/google-fonts/GothicA1'),
    },
    {
        family: 'Nanum Gothic',
        load: () => import('@remotion/google-fonts/NanumGothic'),
    },
    {
        family: 'Sarabun',
        load: () => import('@remotion/google-fonts/Sarabun'),
    },
    {
        family: 'Chakra Petch',
        load: () => import('@remotion/google-fonts/ChakraPetch'),
    },
    {
        family: 'Bai Jamjuree',
        load: () => import('@remotion/google-fonts/BaiJamjuree'),
    },
    {
        family: 'Mitr',
        load: () => import('@remotion/google-fonts/Mitr'),
    },
    {
        family: 'Athiti',
        load: () => import('@remotion/google-fonts/Athiti'),
    },
    {
        family: 'Mada',
        load: () => import('@remotion/google-fonts/Mada'),
    },
    {
        family: 'El Messiri',
        load: () => import('@remotion/google-fonts/ElMessiri'),
    },
    {
        family: 'Amiri',
        load: () => import('@remotion/google-fonts/Amiri'),
    },
    {
        family: 'Markazi Text',
        load: () => import('@remotion/google-fonts/MarkaziText'),
    },
    {
        family: 'Harmattan',
        load: () => import('@remotion/google-fonts/Harmattan'),
    },
    {
        family: 'Lalezar',
        load: () => import('@remotion/google-fonts/Lalezar'),
    },
    {
        family: 'Scheherazade New',
        load: () => import('@remotion/google-fonts/ScheherazadeNew'),
    },
    {
        family: 'Vazirmatn',
        load: () => import('@remotion/google-fonts/Vazirmatn'),
    },
    {
        family: 'Readex Pro',
        load: () => import('@remotion/google-fonts/ReadexPro'),
    },
    {
        family: 'Alexandria',
        load: () => import('@remotion/google-fonts/Alexandria'),
    },
    {
        family: 'Reem Kufi',
        load: () => import('@remotion/google-fonts/ReemKufi'),
    },
    {
        family: 'Kufam',
        load: () => import('@remotion/google-fonts/Kufam'),
    },
    {
        family: 'Aref Ruqaa',
        load: () => import('@remotion/google-fonts/ArefRuqaa'),
    },
    {
        family: 'Mirza',
        load: () => import('@remotion/google-fonts/Mirza'),
    },
    {
        family: 'Rasa',
        load: () => import('@remotion/google-fonts/Rasa'),
    },
    {
        family: 'Yrsa',
        load: () => import('@remotion/google-fonts/Yrsa'),
    },
    {
        family: 'Teko',
        load: () => import('@remotion/google-fonts/Teko'),
    },
    {
        family: 'Yantramanav',
        load: () => import('@remotion/google-fonts/Yantramanav'),
    },
    {
        family: 'Khand',
        load: () => import('@remotion/google-fonts/Khand'),
    },
    {
        family: 'Pragati Narrow',
        load: () => import('@remotion/google-fonts/PragatiNarrow'),
    },
    {
        family: 'Laila',
        load: () => import('@remotion/google-fonts/Laila'),
    },
    {
        family: 'Eczar',
        load: () => import('@remotion/google-fonts/Eczar'),
    },
    {
        family: 'Martel',
        load: () => import('@remotion/google-fonts/Martel'),
    },
    {
        family: 'Martel Sans',
        load: () => import('@remotion/google-fonts/MartelSans'),
    },
    {
        family: 'Modak',
        load: () => import('@remotion/google-fonts/Modak'),
    },
    {
        family: 'Pavanam',
        load: () => import('@remotion/google-fonts/Pavanam'),
    },
    {
        family: 'Ramabhadra',
        load: () => import('@remotion/google-fonts/Ramabhadra'),
    },
    {
        family: 'Halant',
        load: () => import('@remotion/google-fonts/Halant'),
    },
    {
        family: 'Share',
        load: () => import('@remotion/google-fonts/Share'),
    },
    {
        family: 'Karma',
        load: () => import('@remotion/google-fonts/Karma'),
    },
    {
        family: 'Archivo Black',
        load: () => import('@remotion/google-fonts/ArchivoBlack'),
    },
    {
        family: 'Coda',
        load: () => import('@remotion/google-fonts/Coda'),
    },
    {
        family: 'Bungee Inline',
        load: () => import('@remotion/google-fonts/BungeeInline'),
    },
    {
        family: 'Orbitron',
        load: () => import('@remotion/google-fonts/Orbitron'),
    },
    {
        family: 'Black Ops One',
        load: () => import('@remotion/google-fonts/BlackOpsOne'),
    },
    {
        family: 'Monoton',
        load: () => import('@remotion/google-fonts/Monoton'),
    },
    {
        family: 'Press Start 2P',
        load: () => import('@remotion/google-fonts/PressStart2P'),
    },
    {
        family: 'Bungee Shade',
        load: () => import('@remotion/google-fonts/BungeeShade'),
    },
    {
        family: 'Rubik Mono One',
        load: () => import('@remotion/google-fonts/RubikMonoOne'),
    },
    {
        family: 'Audiowide',
        load: () => import('@remotion/google-fonts/Audiowide'),
    },
    {
        family: 'Tilt Warp',
        load: () => import('@remotion/google-fonts/TiltWarp'),
    },
    {
        family: 'Gruppo',
        load: () => import('@remotion/google-fonts/Gruppo'),
    },
    {
        family: 'Poiret One',
        load: () => import('@remotion/google-fonts/PoiretOne'),
    },
    {
        family: 'Forum',
        load: () => import('@remotion/google-fonts/Forum'),
    },
    {
        family: 'Syncopate',
        load: () => import('@remotion/google-fonts/Syncopate'),
    },
    {
        family: 'Megrim',
        load: () => import('@remotion/google-fonts/Megrim'),
    },
    {
        family: 'Julius Sans One',
        load: () => import('@remotion/google-fonts/JuliusSansOne'),
    },
    {
        family: 'Advent Pro',
        load: () => import('@remotion/google-fonts/AdventPro'),
    },
    {
        family: 'Wire One',
        load: () => import('@remotion/google-fonts/WireOne'),
    },
    {
        family: 'Nixie One',
        load: () => import('@remotion/google-fonts/NixieOne'),
    },
    {
        family: 'Anek Malayalam',
        load: () => import('@remotion/google-fonts/AnekMalayalam'),
    },
    {
        family: 'Libre Caslon Text',
        load: () => import('@remotion/google-fonts/LibreCaslonText'),
    },
    {
        family: 'Bodoni Moda',
        load: () => import('@remotion/google-fonts/BodoniModa'),
    },
    {
        family: 'Fraunces',
        load: () => import('@remotion/google-fonts/Fraunces'),
    },
    {
        family: 'Literata',
        load: () => import('@remotion/google-fonts/Literata'),
    },
    {
        family: 'Newsreader',
        load: () => import('@remotion/google-fonts/Newsreader'),
    },
    {
        family: 'Petrona',
        load: () => import('@remotion/google-fonts/Petrona'),
    },
    {
        family: 'Piazzolla',
        load: () => import('@remotion/google-fonts/Piazzolla'),
    },
    {
        family: 'Castoro',
        load: () => import('@remotion/google-fonts/Castoro'),
    },
    {
        family: 'Hahmlet',
        load: () => import('@remotion/google-fonts/Hahmlet'),
    },
    {
        family: 'Texturina',
        load: () => import('@remotion/google-fonts/Texturina'),
    },
    {
        family: 'Syne',
        load: () => import('@remotion/google-fonts/Syne'),
    },
    {
        family: 'Brygada 1918',
        load: () => import('@remotion/google-fonts/Brygada1918'),
    },
    {
        family: 'Varta',
        load: () => import('@remotion/google-fonts/Varta'),
    },
    {
        family: 'Grandstander',
        load: () => import('@remotion/google-fonts/Grandstander'),
    },
    {
        family: 'Red Rose',
        load: () => import('@remotion/google-fonts/RedRose'),
    },
    {
        family: 'Andada Pro',
        load: () => import('@remotion/google-fonts/AndadaPro'),
    },
    {
        family: 'Trispace',
        load: () => import('@remotion/google-fonts/Trispace'),
    },
    {
        family: 'Kumbh Sans',
        load: () => import('@remotion/google-fonts/KumbhSans'),
    },
    {
        family: 'Truculenta',
        load: () => import('@remotion/google-fonts/Truculenta'),
    },
    {
        family: 'Belleza',
        load: () => import('@remotion/google-fonts/Belleza'),
    },
    {
        family: 'Didact Gothic',
        load: () => import('@remotion/google-fonts/DidactGothic'),
    },
    {
        family: 'Questrial',
        load: () => import('@remotion/google-fonts/Questrial'),
    },
    {
        family: 'Monda',
        load: () => import('@remotion/google-fonts/Monda'),
    },
    {
        family: 'Lexend Deca',
        load: () => import('@remotion/google-fonts/LexendDeca'),
    },
    {
        family: 'Red Hat Text',
        load: () => import('@remotion/google-fonts/RedHatText'),
    },
    {
        family: 'Alata',
        load: () => import('@remotion/google-fonts/Alata'),
    },
    {
        family: 'Asap Condensed',
        load: () => import('@remotion/google-fonts/AsapCondensed'),
    },
    {
        family: 'Mandali',
        load: () => import('@remotion/google-fonts/Mandali'),
    },
    {
        family: 'Tomorrow',
        load: () => import('@remotion/google-fonts/Tomorrow'),
    },
    {
        family: 'Darker Grotesque',
        load: () => import('@remotion/google-fonts/DarkerGrotesque'),
    },
    {
        family: 'DM Serif Display',
        load: () => import('@remotion/google-fonts/DMSerifDisplay'),
    },
    {
        family: 'Gelasio',
        load: () => import('@remotion/google-fonts/Gelasio'),
    },
    {
        family: 'Inria Serif',
        load: () => import('@remotion/google-fonts/InriaSerif'),
    },
    {
        family: 'Crimson Pro',
        load: () => import('@remotion/google-fonts/CrimsonPro'),
    },
    {
        family: 'Sawarabi Gothic',
        load: () => import('@remotion/google-fonts/SawarabiGothic'),
    },
    {
        family: 'Kosugi Maru',
        load: () => import('@remotion/google-fonts/KosugiMaru'),
    },
    {
        family: 'M PLUS 1p',
        load: () => import('@remotion/google-fonts/MPLUS1p'),
    },
    {
        family: 'Zen Maru Gothic',
        load: () => import('@remotion/google-fonts/ZenMaruGothic'),
    },
    {
        family: 'Stick No Bills',
        load: () => import('@remotion/google-fonts/StickNoBills'),
    },
];
