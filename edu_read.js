/* OTOTO — освітня гра, слот 4: «Читання і літери» (ПІЛОТ). CoLaba Production.

   Підключається ПІСЛЯ edu.js; реєструється через BO.edu.register (контракт — у шапці edu.js).
   Без мережі, без картинок: лише емодзі + CSS. Голос — Web Speech API (speechSynthesis),
   якщо на пристрої є голос мови дитини; інакше тихо, без помилок (кнопка 🔊 ховається).

   ЗАВДАННЯ ЗА ВІКОМ (ctx.band):
     3–5   find   — «Знайди літеру»: великі літери, тапнути показану
           first  — «З якої літери починається слово?»: 🍎 → А / A
     6–8   build  — «Склади слово»: картинка + перемішані літери, тапати по порядку
           miss   — «Якої літери не вистачає?»: к_т → і
     9–14  scram  — «Розплутай слово»: довші слова, з рівня 3 — зайва літера-пастка
           spell  — «Яке слово написано правильно?» (помилкові варіанти генеруються самі)
           sent   — «Прочитай і вибери малюнок» (лише мови з полем sentences)
   Рівні нескінченні: 5 правильних відповідей = новий рівень (складність росте з рівнем).
   Нагорода: +1 ⭐ за кожне розв'язане завдання, +1 ⭐ за новий рівень. 4 медалі (MEDALS).

   ── ЯК ДОДАТИ / РОЗШИРИТИ МОВУ (для носія мови) ──
   Один об'єкт на мову в READ_DATA нижче:
     speech:    код голосу для озвучки ('uk-UA')
     alphabet:  усі літери ВЕЛИКИМИ, в порядку абетки (масив рядків). Літера з кількох знаків
                (угор. CS, DZS…, чеське CH, узб. Oʻ Sh…) — один елемент: слова діляться на
                літери за абеткою (найдовший збіг), тож «szem» = SZ+E+M, «choʻchqa» = Ch+Oʻ+Ch+Q+A.
                Слова з подвоєним диграфом (угор. ssz, ccs, ggy…) або з апострофом ʼ ігри не беруть.
     vowels:    голосні ВЕЛИКИМИ (рядок) — для генерації помилок у «правильно написаному слові»
     words:     [[слово, емодзі], …] — прості іменники, які легко намалювати одним емодзі.
                Слово пишеться як у словнику (німецькі іменники — з великої), без апострофів,
                дефісів і пробілів. Перша літера (без наголосу/діакритики) має бути в alphabet.
     sentences: (необов'язково) [[речення, правильне емодзі, хибне, хибне], …] — для віку 9–14.
     avoid:     (необов'язково) справжні слова мови, які генератор помилок у «правильно написаному
                слові» міг би утворити з наших слів (Katze → Kotze, pato → puto, kura → kora): їх як
                «помилку» не показуємо; сюди ж — грубі/страшні слова, які могли б утворитися в «Якої
                літери не вистачає?» (P_TO + U = PUTO): така літера-пастка відкидається. Кожна літера слова
                в words має бути в alphabet (É, Ç, Ã… — теж, якщо вони є в словах; голосні — і у vowels):
                інакше «Якої літери не вистачає?» дасть хибні варіанти (перевіряє edu_read_check.py).
   Код гри при цьому не міняється. Повні дані (≈60–70 слів + 14 речень): усі 18 мов (pl, de, ro, kk, fr, es — дані чекають перевірки носієм мови, див. new_words_review.csv). */
(function () {
  'use strict';
  const BO = window.BO;
  if (!BO || !BO.edu) return;

  /* ===================== ДАНІ МОВ ===================== */
  const READ_DATA = {
    uk: {
      speech: 'uk-UA',
      alphabet: ['А','Б','В','Г','Ґ','Д','Е','Є','Ж','З','И','І','Ї','Й','К','Л','М','Н','О','П','Р','С','Т','У','Ф','Х','Ц','Ч','Ш','Щ','Ь','Ю','Я'],
      vowels: 'АЕЄИІЇОУЮЯ',
      words: [
        ['кіт','🐱'],['пес','🐶'],['лев','🦁'],['сир','🧀'],['дім','🏠'],['ніс','👃'],['око','👁️'],['жук','🪲'],
        ['торт','🎂'],['слон','🐘'],['вовк','🐺'],['гриб','🍄'],['хліб','🍞'],['сова','🦉'],['риба','🐟'],['жаба','🐸'],
        ['рука','✋'],['нога','🦵'],['чай','🍵'],['сніг','❄️'],['дощ','🌧️'],['тигр','🐯'],['лимон','🍋'],['банан','🍌'],
        ['груша','🍐'],['вишня','🍒'],['кавун','🍉'],['качка','🦆'],['мавпа','🐒'],['свиня','🐷'],['курка','🐔'],['зірка','⭐'],
        ['сонце','☀️'],['книга','📖'],['ключ','🔑'],['лампа','💡'],['квітка','🌸'],['хмара','☁️'],['їжак','🦔'],['єнот','🦝'],
        ['індик','🦃'],['акула','🦈'],['ананас','🍍'],['яблуко','🍎'],['морква','🥕'],['огірок','🥒'],['цибуля','🧅'],['корова','🐄'],
        ['бджола','🐝'],['дерево','🌳'],['ялинка','🎄'],['ракета','🚀'],['машина','🚗'],['місяць','🌙'],['равлик','🐌'],['шоколад','🍫'],
        ['черепаха','🐢'],['олівець','✏️'],['фламінго','🦩'],['ведмідь','🐻'],['метелик','🦋'],['парасолька','☂️'],['годинник','⏰'],
      ],
      sentences: [
        ['Воно жовте, кисле і росте на дереві.','🍋','🍌','🍎'],
        ['Він живе в морі, плаває і має плавці.','🐟','🐦','🐸'],
        ['Вночі вона сяє високо в небі.','🌙','☀️','☁️'],
        ['Цей звір має довгий хобот.','🐘','🦁','🐒'],
        ['Вона повзе повільно і носить хатку на спині.','🐌','🐝','🐸'],
        ['Узимку з неба падає біле і холодне.','❄️','🌧️','🌸'],
        ['Ним відмикають двері.','🔑','📖','💡'],
        ['Вона літає над квітами і робить мед.','🐝','🦋','🦉'],
        ['Він рудий, хитрий і має пухнастий хвіст.','🦊','🐺','🐻'],
        ['Нею пишуть і малюють у зошиті.','✏️','🔑','☂️'],
        ['Вона летить до зірок у космос.','🚀','🚗','⛵'],
        ['Цей птах не спить уночі і має великі очі.','🦉','🦆','🐔'],
        ['Він колючий і живе в лісі під листям.','🦔','🐰','🐢'],
        ['Її відкривають, коли йде дощ.','☂️','📖','⏰'],
      ],
      // справжні слова, які генератор помилок не має показувати як «помилку» (див. шапку);
      // наприкінці — грубі/страшні слова, які могли б утворитися в «Якої літери не вистачає?»
      avoid: [
        'трот','сон','граб','гріб','гроб','груб','сива','раба','роба','руба','ряба','рака',
        'ріка','нуга','тир','лиман','банна','гроша','кавну','кака','кача','мапа','синя','крука',
        'курак','карка','кирка','кірка','корка','кука','сінце','кнага','клич','лапа','лама','квитка',
        'хмура','акала','моква','огарок','корява','древо','ялика','ялина','мушина','машинна','місць','курва',
        'сука','біс','чорт','дурка','пук','пука','рила','кат','ніж','ножа',
      ],
    },
    en: {
      speech: 'en-GB',
      alphabet: ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'],
      vowels: 'AEIOU',
      words: [
        ['cat','🐱'],['dog','🐶'],['sun','☀️'],['hat','🎩'],['bus','🚌'],['bee','🐝'],['egg','🥚'],['fox','🦊'],
        ['pig','🐷'],['cow','🐄'],['owl','🦉'],['ant','🐜'],['bed','🛏️'],['box','📦'],['car','🚗'],['ice','🧊'],
        ['fish','🐟'],['frog','🐸'],['duck','🦆'],['lion','🦁'],['bear','🐻'],['milk','🥛'],['cake','🎂'],['tree','🌳'],
        ['star','⭐'],['moon','🌙'],['rain','🌧️'],['kite','🪁'],['nose','👃'],['goat','🐐'],['yarn','🧶'],['apple','🍎'],
        ['lemon','🍋'],['pear','🍐'],['grapes','🍇'],['juice','🧃'],['house','🏠'],['horse','🐴'],['mouse','🐭'],['snake','🐍'],
        ['tiger','🐯'],['zebra','🦓'],['whale','🐳'],['queen','👸'],['banana','🍌'],['carrot','🥕'],['rocket','🚀'],['pencil','✏️'],
        ['turtle','🐢'],['rabbit','🐰'],['monkey','🐒'],['violin','🎻'],['octopus','🐙'],['umbrella','☂️'],['elephant','🐘'],['butterfly','🦋'],
      ],
      sentences: [
        ['It is yellow, sour and grows on a tree.','🍋','🍌','🍎'],
        ['It lives in the sea and swims with fins.','🐟','🐦','🐸'],
        ['At night it shines high in the sky.','🌙','☀️','☁️'],
        ['This animal has a very long trunk.','🐘','🦁','🐒'],
        ['It moves slowly and carries its house on its back.','🐌','🐝','🐸'],
        ['In winter it falls from the sky, white and cold.','❄️','🌧️','🌸'],
        ['You use it to open a door.','🔑','📖','💡'],
        ['It flies over flowers and makes honey.','🐝','🦋','🦉'],
        ['It is orange, clever and has a fluffy tail.','🦊','🐺','🐻'],
        ['You write and draw with it.','✏️','🔑','☂️'],
        ['It flies up to the stars.','🚀','🚗','⛵'],
        ['This bird stays awake at night and has big eyes.','🦉','🦆','🐔'],
        ['It is spiky and hides under leaves in the forest.','🦔','🐰','🐢'],
        ['You open it when it rains.','☂️','📖','⏰'],
      ],
      // справжні слова, які генератор помилок не має показувати як «помилку» (див. шапку);
      // наприкінці — грубі/страшні слова, які могли б утворитися в «Якої літери не вистачає?»
      avoid: [
        'frag','frig','fog','deck','dick','dock','loin','lino','loon','lien','boar','beer',
        'bar','coke','true','tee','stir','mono','moan','rein','ruin','ran','noes','noose',
        'gout','got','peer','par','per','gripes','gropes','gapes','hose','moues','moose','mousse',
        'muse','moue','sake','tier','while','whole','wale','racket','rabbet','money','fuck','milf',
        'kike','wog','coon','nig','pee','pis','pox','pus','queer','suck','bum','demon',
        'gun','stab','crapes','mick','fat','war','fist',
      ],
    },
    // ---- стартові дані: абетка + ~15 слів (носіям — розширити words, додати sentences) ----
    pl: {
      speech: 'pl-PL',
      alphabet: ['A','Ą','B','C','Ć','D','E','Ę','F','G','H','I','J','K','L','Ł','M','N','Ń','O','Ó','P','R','S','Ś','T','U','W','Y','Z','Ź','Ż'],
      vowels: 'AĄEĘIOÓUY',
      words: [
        ['kot','🐱'],['dom','🏠'],['ser','🧀'],['lis','🦊'],['koń','🐴'],['lew','🦁'],['jeż','🦔'],['oko','👁️'],
        ['nos','👃'],['but','👟'],['pies','🐶'],['ryba','🐟'],['sowa','🦉'],['żaba','🐸'],['tort','🎂'],['auto','🚗'],
        ['ucho','👂'],['mysz','🐭'],['kura','🐔'],['owca','🐑'],['foka','🦭'],['ręka','✋'],['słoń','🐘'],['krowa','🐄'],
        ['banan','🍌'],['małpa','🐒'],['zebra','🦓'],['motyl','🦋'],['indyk','🦃'],['grzyb','🍄'],['chleb','🍞'],['mleko','🥛'],
        ['jajko','🥚'],['kwiat','🌸'],['śnieg','❄️'],['tęcza','🌈'],['rower','🚲'],['piłka','⚽'],['klucz','🔑'],['lampa','💡'],
        ['łódka','⛵'],['jabłko','🍎'],['słońce','☀️'],['drzewo','🌳'],['kaczka','🦆'],['świnia','🐷'],['żyrafa','🦒'],['tygrys','🐯'],
        ['królik','🐰'],['ślimak','🐌'],['wiśnia','🍒'],['chmura','☁️'],['ołówek','✏️'],['gwiazda','⭐'],['pingwin','🐧'],['gruszka','🍐'],
        ['cytryna','🍋'],['marchew','🥕'],['księżyc','🌙'],['autobus','🚌'],['samolot','✈️'],['rakieta','🚀'],['książka','📖'],['parasol','☂️'],
        ['pszczoła','🐝'],['latawiec','🪁'],['hipopotam','🦛'],['biedronka','🐞'],['czekolada','🍫'],['truskawka','🍓'],
      ],
      sentences: [
        ['Jest żółta, kwaśna i rośnie na drzewie.','🍋','🍌','🍎'],
        ['Żyje w morzu, pływa i ma płetwy.','🐟','🐦','🐸'],
        ['Nocą świeci wysoko na niebie.','🌙','☀️','☁️'],
        ['To zwierzę ma bardzo długą trąbę.','🐘','🦁','🐒'],
        ['Pełza powoli i nosi swój domek na plecach.','🐌','🐝','🐸'],
        ['Zimą pada z nieba, jest biały i zimny.','❄️','🌧️','🌸'],
        ['Służy do otwierania drzwi.','🔑','📖','💡'],
        ['Lata od kwiatka do kwiatka i robi miód.','🐝','🦋','🦉'],
        ['Jest rudy, sprytny i ma puszysty ogon.','🦊','🐶','🐻'],
        ['Służy do pisania i rysowania w zeszycie.','✏️','🔑','☂️'],
        ['Leci aż do gwiazd, w kosmos.','🚀','🚗','⛵'],
        ['Ten ptak nie śpi w nocy i ma duże oczy.','🦉','🦆','🐔'],
        ['Ma kolce i chowa się w lesie pod liśćmi.','🦔','🐰','🐢'],
        ['Otwieramy go, kiedy pada deszcz.','☂️','📖','⏰'],
      ],
      // справжні слова, які генератор помилок не має показувати як «помилку» (див. шапку)
      avoid: [
        'kara','kora','siwa','masz','zera','mała','mapa','piła','półka','pałka','pułka','lama',
        'łydka','kacza','motel','jako','klacz','kwit','chmara',
        // грубі/страшні слова, які могли б утворитися в «Якої літери не вистачає?»
        'kupa','wódka',
      ],
    },
    de: {
      speech: 'de-DE',
      // ß — лише мала літера, тому в абетці (великі) її немає
      alphabet: ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','Ä','Ö','Ü'],
      vowels: 'AEIOUÄÖÜ',
      words: [
        ['Ei','🥚'],['Bär','🐻'],['Kuh','🐄'],['Ohr','👂'],['Zug','🚂'],['Bus','🚌'],['Eis','🍦'],['Uhr','⏰'],
        ['Hund','🐶'],['Maus','🐭'],['Haus','🏠'],['Mond','🌙'],['Baum','🌳'],['Ente','🦆'],['Eule','🦉'],['Igel','🦔'],
        ['Auto','🚗'],['Ball','⚽'],['Käse','🧀'],['Auge','👁️'],['Nase','👃'],['Hand','✋'],['Boot','⛵'],['Huhn','🐔'],
        ['Affe','🐒'],['Hase','🐰'],['Brot','🍞'],['Buch','📖'],['Löwe','🦁'],['Schaf','🐑'],['Katze','🐱'],['Fisch','🐟'],
        ['Sonne','☀️'],['Stern','⭐'],['Apfel','🍎'],['Birne','🍐'],['Ziege','🐐'],['Pferd','🐴'],['Tiger','🐯'],['Zebra','🦓'],
        ['Biene','🐝'],['Fuchs','🦊'],['Vogel','🐦'],['Milch','🥛'],['Möhre','🥕'],['Blume','🌸'],['Wolke','☁️'],['Regen','🌧️'],
        ['Lampe','💡'],['Jacke','🧥'],['Stift','✏️'],['Banane','🍌'],['Kuchen','🍰'],['Frosch','🐸'],['Delfin','🐬'],['Traube','🍇'],
        ['Schnee','❄️'],['Schirm','☂️'],['Rakete','🚀'],['Kirsche','🍒'],['Giraffe','🦒'],['Elefant','🐘'],['Pinguin','🐧'],['Zitrone','🍋'],
        ['Gitarre','🎸'],['Fahrrad','🚲'],['Schwein','🐷'],['Schnecke','🐌'],['Erdbeere','🍓'],['Flugzeug','✈️'],['Schlüssel','🔑'],
      ],
      sentences: [
        ['Sie ist gelb, sauer und wächst am Baum.','🍋','🍌','🍎'],
        ['Er lebt im Meer, schwimmt und hat Flossen.','🐟','🐦','🐸'],
        ['Nachts leuchtet er hoch am Himmel.','🌙','☀️','☁️'],
        ['Dieses Tier hat einen sehr langen Rüssel.','🐘','🦁','🐒'],
        ['Sie kriecht langsam und trägt ihr Haus auf dem Rücken.','🐌','🐝','🐸'],
        ['Im Winter fällt er weiß und kalt vom Himmel.','❄️','🌧️','🌸'],
        ['Damit schließt man die Tür auf.','🔑','📖','💡'],
        ['Sie fliegt von Blüte zu Blüte und macht Honig.','🐝','🦋','🦉'],
        ['Er ist rot, schlau und hat einen buschigen Schwanz.','🦊','🐶','🐻'],
        ['Damit schreibt und malt man im Heft.','✏️','🔑','☂️'],
        ['Sie fliegt bis zu den Sternen ins Weltall.','🚀','🚗','⛵'],
        ['Dieser Vogel ist nachts wach und hat große Augen.','🦉','🦆','🐔'],
        ['Er hat Stacheln und versteckt sich im Wald unter dem Laub.','🦔','🐰','🐢'],
        ['Man spannt ihn auf, wenn es regnet.','☂️','📖','⏰'],
      ],
      // справжні слова, які генератор помилок не має показувати як «помилку» (див. шапку)
      avoid: [
        'Maas','Mais','Mus','Hais','Heus','Mund','Eile','Bill','Bull','Aue','Nasse','Bot',
        'Hahn','Hohn','Hasse','Hose','Brat','Brut','Brät','Bach','Schuf','Kotze','Fesch','Sinne',
        'Stirn','Zeige','Tier','Beine','Fachs','Vögel','Mich','Mehre','Welke','Ragen','Regne','Rügen',
        'Jucke','Stuft','Banne','Kochen','Köchen','Küchen','Forsch','Frisch','Taube','Trabe','Traue','Kirche',
        'Schein','Schüssel',
        // грубі/страшні слова, які могли б утворитися в «Якої літери не вистачає?»
        'Kacke','Mord',
      ],
    },
    ro: {
      speech: 'ro-RO',
      alphabet: ['A','Ă','Â','B','C','D','E','F','G','H','I','Î','J','K','L','M','N','O','P','Q','R','S','Ș','T','Ț','U','V','W','X','Y','Z'],
      vowels: 'AĂÂEIÎOU',
      words: [
        ['ou','🥚'],['urs','🐻'],['măr','🍎'],['nas','👃'],['cal','🐴'],['leu','🦁'],['porc','🐷'],['casă','🏠'],
        ['lună','🌙'],['stea','⭐'],['pară','🍐'],['rață','🦆'],['tort','🎂'],['ochi','👁️'],['mână','✋'],['oaie','🐑'],
        ['vacă','🐄'],['melc','🐌'],['tren','🚂'],['ceas','⏰'],['soare','☀️'],['copac','🌳'],['minge','⚽'],['lapte','🥛'],
        ['pește','🐟'],['câine','🐶'],['capră','🐐'],['găină','🐔'],['tigru','🐯'],['zebră','🦓'],['vulpe','🦊'],['arici','🦔'],
        ['koala','🐨'],['pâine','🍞'],['carte','📖'],['cheie','🔑'],['avion','✈️'],['barcă','⛵'],['pisică','🐱'],['floare','🌸'],
        ['banană','🍌'],['mașină','🚗'],['ureche','👂'],['iepure','🐰'],['girafă','🦒'],['albină','🐝'],['balenă','🐳'],['delfin','🐬'],
        ['morcov','🥕'],['brânză','🧀'],['zăpadă','❄️'],['ploaie','🌧️'],['creion','✏️'],['lămâie','🍋'],['bufniță','🦉'],['maimuță','🐒'],
        ['elefant','🐘'],['broască','🐸'],['fluture','🦋'],['pinguin','🐧'],['cireașă','🍒'],['căpșună','🍓'],['umbrelă','☂️'],['rachetă','🚀'],
        ['șoarece','🐭'],['țestoasă','🐢'],['struguri','🍇'],['ciupercă','🍄'],['curcubeu','🌈'],['ciocolată','🍫'],
      ],
      sentences: [
        ['Este galbenă, acră și crește în copac.','🍋','🍌','🍎'],
        ['Trăiește în mare, înoată și are înotătoare.','🐟','🐦','🐸'],
        ['Noaptea strălucește sus pe cer.','🌙','☀️','☁️'],
        ['Acest animal are o trompă foarte lungă.','🐘','🦁','🐒'],
        ['Se târăște încet și își poartă casa în spate.','🐌','🐝','🐸'],
        ['Iarna cade din cer, albă și rece.','❄️','🌧️','🌸'],
        ['Cu ea descuiem ușa.','🔑','📖','💡'],
        ['Zboară din floare în floare și face miere.','🐝','🦋','🦉'],
        ['Este roșcată, isteață și are coada stufoasă.','🦊','🐶','🐻'],
        ['Cu el scriem și desenăm în caiet.','✏️','🔑','☂️'],
        ['Zboară până la stele, în spațiu.','🚀','🚗','⛵'],
        ['Această pasăre stă trează noaptea și are ochi mari.','🦉','🦆','🐔'],
        ['Are țepi și se ascunde în pădure, sub frunze.','🦔','🐰','🐢'],
        ['O deschidem când plouă.','☂️','📖','⏰'],
      ],
      // справжні слова, які генератор помилок не має показувати як «помилку» (див. шапку)
      avoid: [
        'parc','cosă','lână','lînă','sta','pură','tot','mînă','ten','tron','sare','mine',
        'lupte','late','paște','cine','cîine','cară','arii','pîine','care','curte','certe','bară',
        'lămîie','brînză','alină',
        // грубі/страшні слова, які могли б утворитися в «Якої літери не вистачає?»
        'mort',
      ],
    },
    kk: {
      speech: 'kk-KZ',
      alphabet: ['А','Ә','Б','В','Г','Ғ','Д','Е','Ё','Ж','З','И','Й','К','Қ','Л','М','Н','Ң','О','Ө','П','Р','С','Т','У','Ұ','Ү','Ф','Х','Һ','Ц','Ч','Ш','Щ','Ъ','Ы','І','Ь','Э','Ю','Я'],
      vowels: 'АӘЕЁИІОӨҰҮЫЭЮЯУ',
      words: [
        ['ит','🐶'],['үй','🏠'],['ай','🌙'],['аю','🐻'],['күн','☀️'],['нан','🍞'],['сүт','🥛'],['гүл','🌸'],
        ['көз','👁️'],['қол','✋'],['қой','🐑'],['піл','🐘'],['кит','🐳'],['үкі','🦉'],['ұлу','🐌'],['ара','🐝'],
        ['қар','❄️'],['шам','💡'],['доп','⚽'],['тәж','👑'],['алма','🍎'],['ағаш','🌳'],['сиыр','🐄'],['қоян','🐰'],
        ['ешкі','🐐'],['түйе','🐫'],['бақа','🐸'],['кілт','🔑'],['бұлт','☁️'],['әтеш','🐓'],['ұшақ','✈️'],['робот','🤖'],
        ['мысық','🐱'],['балық','🐟'],['банан','🍌'],['үйрек','🦆'],['жылқы','🐴'],['мұрын','👃'],['құлақ','👂'],['тауық','🐔'],
        ['зебра','🦓'],['жираф','🦒'],['түлкі','🦊'],['кірпі','🦔'],['лимон','🍋'],['жүзім','🍇'],['сәбіз','🥕'],['кітап','📖'],
        ['сағат','⏰'],['алмұрт','🍐'],['жұлдыз','⭐'],['тышқан','🐭'],['маймыл','🐒'],['қарбыз','🍉'],['жаңбыр','🌧️'],['машина','🚗'],
        ['арыстан','🦁'],['тасбақа','🐢'],['орындық','🪑'],['көбелек','🦋'],['пингвин','🐧'],['ірімшік','🧀'],['зымыран','🚀'],['жолбарыс','🐯'],
        ['құлпынай','🍓'],['қарындаш','✏️'],['қолшатыр','☂️'],['фламинго','🦩'],['жұмыртқа','🥚'],['велосипед','🚲'],
      ],
      sentences: [
        ['Ол сары, қышқыл және ағашта өседі.','🍋','🍌','🍎'],
        ['Ол суда тұрады және жүзбеқанаттарымен жүзеді.','🐟','🐦','🐸'],
        ['Түнде ол аспанда жоғары жарқырайды.','🌙','☀️','☁️'],
        ['Бұл жануардың ұзын тұмсығы бар.','🐘','🦁','🐒'],
        ['Ол баяу жорғалайды және үйін арқасында алып жүреді.','🐌','🐝','🐸'],
        ['Қыста аспаннан ақ әрі суық нәрсе жауады.','❄️','🌧️','🌸'],
        ['Онымен есікті ашады.','🔑','📖','💡'],
        ['Ол гүлден гүлге ұшып, бал жинайды.','🐝','🦋','🦉'],
        ['Ол қу, құйрығы ұзын әрі үлпілдек.','🦊','🐶','🐻'],
        ['Онымен дәптерге жазамыз және сурет саламыз.','✏️','🔑','☂️'],
        ['Ол жұлдыздарға, ғарышқа ұшады.','🚀','🚗','⛵'],
        ['Бұл құс түнде ұйықтамайды және көздері үлкен.','🦉','🦆','🐔'],
        ['Ол тікенді және орманда жапырақтардың астында тұрады.','🦔','🐰','🐢'],
        ['Жаңбыр жауғанда оны ашамыз.','☂️','📖','⏰'],
      ],
      // справжні слова, які генератор помилок не має показувати як «помилку» (див. шапку)
      avoid: [
        'ала','сыр','қоын','екі','буқа','болт','бұт','балақ','қалақ','құлық','лиман','қарыз',
        // грубі/страшні слова, які могли б утворитися в «Якої літери не вистачає?»
        'көт','қан',
      ],
    },
    fr: {
      speech: 'fr-FR',
      alphabet: ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'],
      vowels: 'AEIOUY',
      words: [
        ['nez','👃'],['bus','🚌'],['jus','🧃'],['sac','🎒'],['chat','🐱'],['ours','🐻'],['lune','🌙'],['lait','🥛'],
        ['main','✋'],['pied','🦶'],['lion','🦁'],['kiwi','🥝'],['pain','🍞'],['yoyo','🪀'],['chien','🐶'],['pomme','🍎'],
        ['poire','🍐'],['arbre','🌳'],['fleur','🌸'],['hibou','🦉'],['vache','🐄'],['poule','🐔'],['lapin','🐰'],['tigre','🐯'],
        ['singe','🐒'],['koala','🐨'],['glace','🍦'],['nuage','☁️'],['neige','❄️'],['pluie','🌧️'],['livre','📖'],['lampe','💡'],
        ['train','🚂'],['avion','✈️'],['maison','🏠'],['soleil','☀️'],['canard','🦆'],['banane','🍌'],['cochon','🐷'],['mouton','🐑'],
        ['cheval','🐴'],['souris','🐭'],['girafe','🦒'],['tortue','🐢'],['renard','🦊'],['citron','🍋'],['cerise','🍒'],['fraise','🍓'],
        ['raisin','🍇'],['crayon','✏️'],['bateau','⛵'],['iguane','🦎'],['oignon','🧅'],['poisson','🐟'],['voiture','🚗'],['abeille','🐝'],
        ['baleine','🐳'],['dauphin','🐬'],['carotte','🥕'],['fromage','🧀'],['horloge','🕰️'],['guitare','🎸'],['oreille','👂'],['papillon','🦋'],
        ['pingouin','🐧'],['escargot','🐌'],['chocolat','🍫'],['couronne','👑'],['parapluie','☂️'],['chaussure','👟'],
      ],
      sentences: [
        ['Il est jaune, acide et pousse sur un arbre.','🍋','🍌','🍎'],
        ['Il vit dans la mer, nage et a des nageoires.','🐟','🐦','🐸'],
        ['La nuit, elle brille haut dans le ciel.','🌙','☀️','☁️'],
        ['Cet animal a une très longue trompe.','🐘','🦁','🐒'],
        ['Il avance lentement et porte sa maison sur son dos.','🐌','🐝','🐸'],
        ['En hiver, elle tombe du ciel, blanche et froide.','❄️','🌧️','🌸'],
        ["On s'en sert pour ouvrir la porte.",'🔑','📖','💡'],
        ['Elle vole de fleur en fleur et fabrique du miel.','🐝','🦋','🦉'],
        ['Il est roux, rusé et a une queue touffue.','🦊','🐶','🐻'],
        ["On s'en sert pour écrire et dessiner dans le cahier.",'✏️','🔑','☂️'],
        ["Elle vole jusqu'aux étoiles, dans l'espace.",'🚀','🚗','⛵'],
        ['Cet oiseau ne dort pas la nuit et a de grands yeux.','🦉','🦆','🐔'],
        ['Il a des piquants et se cache dans la forêt sous les feuilles.','🦔','🐰','🐢'],
        ["On l'ouvre quand il pleut.",'☂️','📖','⏰'],
      ],
      // справжні слова, які генератор помилок не має показувати як «помилку» (див. шапку)
      avoid: [
        'chut','ors','lue','lit','luit','man','min','lien','lin','lino','loin','pan',
        'paon','pin','chine','paire','pire','pore','lopin','lupin','tige','tire','signe','songe',
        'kola','nage','plaie','plie','ploie','lire','lame','tain','cocon','crise','fraie','frise',
        'raison','poison','crotte',
        // грубі/страшні слова, які могли б утворитися в «Якої літери не вистачає?»
        'chier',
      ],
    },
    es: {
      speech: 'es-ES',
      alphabet: ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','Ñ','O','P','Q','R','S','T','U','V','W','X','Y','Z'],
      vowels: 'AEIOU',
      words: [
        ['sol','☀️'],['pez','🐟'],['oso','🐻'],['ojo','👁️'],['pie','🦶'],['uva','🍇'],['pan','🍞'],['flor','🌸'],
        ['gato','🐱'],['casa','🏠'],['luna','🌙'],['pera','🍐'],['pato','🦆'],['mano','✋'],['vaca','🐄'],['mono','🐒'],
        ['rana','🐸'],['seta','🍄'],['nube','☁️'],['tren','🚂'],['piña','🍍'],['isla','🏝️'],['dado','🎲'],['kiwi','🥝'],
        ['perro','🐶'],['coche','🚗'],['leche','🥛'],['nariz','👃'],['oreja','👂'],['cerdo','🐷'],['oveja','🐑'],['cabra','🐐'],
        ['tigre','🐯'],['cebra','🦓'],['abeja','🐝'],['zorro','🦊'],['erizo','🦔'],['fresa','🍓'],['queso','🧀'],['huevo','🥚'],
        ['nieve','❄️'],['libro','📖'],['llave','🔑'],['reloj','⏰'],['barco','⛵'],['pastel','🎂'],['conejo','🐰'],['jirafa','🦒'],
        ['banana','🍌'],['cereza','🍒'],['helado','🍦'],['lluvia','🌧️'],['cohete','🚀'],['zapato','👟'],['manzana','🍎'],['caballo','🐴'],
        ['gallina','🐔'],['tortuga','🐢'],['caracol','🐌'],['ballena','🐳'],['lechuza','🦉'],['estrella','⭐'],['elefante','🐘'],['mariposa','🦋'],
        ['paraguas','☂️'],['guitarra','🎸'],['chocolate','🍫'],['zanahoria','🥕'],['mariquita','🐞'],['bicicleta','🚲'],
      ],
      sentences: [
        ['Es amarillo, ácido y crece en un árbol.','🍋','🍌','🍎'],
        ['Vive en el mar, nada y tiene aletas.','🐟','🐦','🐸'],
        ['Por la noche brilla alta en el cielo.','🌙','☀️','☁️'],
        ['Este animal tiene una trompa muy larga.','🐘','🦁','🐒'],
        ['Se arrastra despacio y lleva su casa a cuestas.','🐌','🐝','🐸'],
        ['En invierno cae del cielo, blanca y fría.','❄️','🌧️','🌸'],
        ['Sirve para abrir la puerta.','🔑','📖','💡'],
        ['Vuela de flor en flor y hace miel.','🐝','🦋','🦉'],
        ['Es rojizo, astuto y tiene una cola muy peluda.','🦊','🐶','🐻'],
        ['Sirve para escribir y dibujar en el cuaderno.','✏️','🔑','☂️'],
        ['Vuela hasta las estrellas, al espacio.','🚀','🚗','⛵'],
        ['Este pájaro no duerme de noche y tiene ojos grandes.','🦉','🦆','🐔'],
        ['Tiene púas y se esconde en el bosque bajo las hojas.','🦔','🐰','🐢'],
        ['Lo abrimos cuando llueve.','☂️','📖','⏰'],
      ],
      // справжні слова, які генератор помилок не має показувати як «помилку» (див. шапку)
      avoid: [
        'cosa','lana','lena','lona','para','pea','perra','pira','pora','prea','pura','peto',
        'pito','puto','mino','runa','sita','sota','ten','peña','dedo','parro','pero','porro',
        'coce','loche','luche','cardo','cedo','cedro','cero','credo','curdo','cara','cobra','ceba',
        'cebar','cera','frisa','nueve','lave','cabello','cabillo','caracal','hilado',
        // грубі/страшні слова, які могли б утворитися в «Якої літери не вистачає?»
        'caca','caga','teta','cono',
      ],
    },
    it: {
      speech: 'it-IT',
      alphabet: ['A','B','C','D','E','F','G','H','I','L','M','N','O','P','Q','R','S','T','U','V','Z'],
      vowels: 'AEIOU',
      words: [
        ['ape','🐝'],['uva','🍇'],['sole','☀️'],['mela','🍎'],['gatto','🐱'],['cane','🐶'],['luna','🌙'],['pera','🍐'],
        ['casa','🏠'],['uovo','🥚'],['orso','🐻'],['topo','🐭'],['pane','🍞'],['rana','🐸'],['naso','👃'],['mano','✋'],
        ['gufo','🦉'],['lupo','🐺'],['nave','🚢'],['dado','🎲'],['neve','❄️'],['palla','⚽'],['torta','🎂'],['pesce','🐟'],
        ['fiore','🌸'],['latte','🥛'],['treno','🚂'],['leone','🦁'],['mucca','🐄'],['volpe','🦊'],['tigre','🐯'],['zebra','🦓'],
        ['zucca','🎃'],['razzo','🚀'],['libro','📖'],['fungo','🍄'],['pizza','🍕'],['isola','🏝️'],['anatra','🦆'],['banana','🍌'],
        ['limone','🍋'],['stella','⭐'],['albero','🌳'],['chiave','🔑'],['nuvola','☁️'],['carota','🥕'],['maiale','🐷'],['riccio','🦔'],
        ['lumaca','🐌'],['matita','✏️'],['gelato','🍦'],['balena','🐳'],['scimmia','🐒'],['lampada','💡'],['fragola','🍓'],['cavallo','🐴'],
        ['gallina','🐔'],['delfino','🐬'],['pinguino','🐧'],['quaderno','📓'],['coniglio','🐰'],['ombrello','☂️'],['farfalla','🦋'],['elefante','🐘'],
        ['orologio','⏰'],['formaggio','🧀'],['tartaruga','🐢'],['cioccolato','🍫'],
      ],
      sentences: [
        ["È gialla, aspra e cresce sull'albero.",'🍋','🍌','🍎'],
        ['Vive nel mare e nuota con le pinne.','🐟','🐦','🐸'],
        ['Di notte brilla alta nel cielo.','🌙','☀️','☁️'],
        ['Questo animale ha una proboscide lunghissima.','🐘','🦁','🐒'],
        ['Va piano piano e porta la casetta sulla schiena.','🐌','🐝','🐸'],
        ["D'inverno scende dal cielo, bianca e fredda.",'❄️','🌧️','🌸'],
        ['Serve per aprire la porta.','🔑','📖','💡'],
        ['Vola sui fiori e fa il miele.','🐝','🦋','🦉'],
        ['È rossa, furba e ha una coda folta.','🦊','🐺','🐻'],
        ['Serve per scrivere e disegnare sul quaderno.','✏️','🔑','☂️'],
        ['Vola fino alle stelle, nello spazio.','🚀','🚗','⛵'],
        ['Questo uccello sta sveglio di notte e ha occhi grandi.','🦉','🦆','🐔'],
        ['Ha gli aculei e vive nel bosco sotto le foglie.','🦔','🐰','🐢'],
        ['Si apre quando piove.','☂️','📖','⏰'],
      ],
      // справжні слова, які генератор помилок не має показувати як «помилку» (див. шапку);
      // наприкінці — грубі/страшні слова, які могли б утворитися в «Якої літери не вистачає?»
      avoid: [
        'sale','sule','solee','mala','mila','mola','mula','getto','gitto','gotto','gato','cene',
        'cune','canne','canee','lana','lena','para','pira','pura','cosa','cassa','oso','oro',
        'tipo','pene','pone','panne','rena','runa','meno','mino','mono','mao','nove','dodo',
        'pilla','polla','pala','trota','tota','pasce','pisce','pece','pese','fiere','lette','lotte',
        'late','lattee','terno','trino','trono','teno','lene','mecca','vole','zecca','rezzo','rizzo',
        'rozzo','ruzzo','libo','fango','fingo','fugo','pazza','pezza','pozza','puzza','anitra','banna',
        'limane','limine','stalla','stilla','sella','carata','carta','ricco','mattia','matta','fregola','frugola',
        'cavillo','cavalo','gallona','foraggio','coccolato','cazzo','caca','caga','palle','morta','peste','orco',
        'zizza',
      ],
    },
    pt: {
      speech: 'pt-PT',
      // Á Ã Ç É — не окремі літери португальської абетки, але є в наших словах (pão, maçã, pé, lápis…):
      // без них «Якої літери не вистачає?» на місці Ã дала б приголосні замість голосних. Тому вони —
      // окремі плитки, а Á Ã É — ще й голосні (варіанти для Ã: A, É, U… — справжній вибір написання).
      alphabet: ['A','Á','Ã','B','C','Ç','D','E','É','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'],
      vowels: 'AÁÃEÉIOU',
      words: [
        ['sol','☀️'],['pão','🍞'],['mão','✋'],['pé','🦶'],['cão','🐶'],['mar','🌊'],['lua','🌙'],['ovo','🥚'],
        ['uva','🍇'],['gato','🐱'],['rato','🐭'],['pato','🦆'],['urso','🐻'],['leão','🦁'],['flor','🌸'],['casa','🏠'],
        ['bola','⚽'],['vaca','🐄'],['pera','🍐'],['bolo','🎂'],['sapo','🐸'],['olho','👁️'],['maçã','🍎'],['peixe','🐟'],
        ['porco','🐷'],['leite','🥛'],['chave','🔑'],['carro','🚗'],['cobra','🐍'],['tigre','🐯'],['zebra','🦓'],['livro','📖'],
        ['lápis','✏️'],['nariz','👃'],['nuvem','☁️'],['chuva','🌧️'],['polvo','🐙'],['limão','🍋'],['árvore','🌳'],['coelho','🐰'],
        ['coruja','🦉'],['abelha','🐝'],['banana','🍌'],['raposa','🦊'],['baleia','🐳'],['girafa','🦒'],['macaco','🐒'],['gelado','🍦'],
        ['ouriço','🦔'],['caracol','🐌'],['estrela','⭐'],['cenoura','🥕'],['comboio','🚂'],['foguetão','🚀'],['elefante','🐘'],['borboleta','🦋'],
        ['tartaruga','🐢'],['autocarro','🚌'],
      ],
      sentences: [
        ['É amarelo, azedo e cresce numa árvore.','🍋','🍌','🍎'],
        ['Vive no mar e nada com as barbatanas.','🐟','🐦','🐸'],
        ['À noite brilha lá no alto do céu.','🌙','☀️','☁️'],
        ['Este animal tem uma tromba muito comprida.','🐘','🦁','🐒'],
        ['Anda muito devagar e leva a casa às costas.','🐌','🐝','🐸'],
        ['No inverno cai do céu, branca e fria.','❄️','🌧️','🌸'],
        ['Serve para abrir a porta.','🔑','📖','💡'],
        ['Voa por cima das flores e faz mel.','🐝','🦋','🦉'],
        ['É cor de laranja, esperta e tem uma cauda fofa.','🦊','🐺','🐻'],
        ['Serve para escrever e desenhar no caderno.','✏️','🔑','☂️'],
        ['Voa até às estrelas, no espaço.','🚀','🚗','⛵'],
        ['Esta ave não dorme à noite e tem olhos grandes.','🦉','🦆','🐔'],
        ['Tem picos e esconde-se debaixo das folhas.','🦔','🐰','🐢'],
        ['Abre-se quando chove.','☂️','📖','⏰'],
      ],
      // справжні слова, які генератор помилок не має показувати як «помилку» (див. шапку);
      // наприкінці — грубі/страшні слова, які могли б утворитися в «Якої літери не вистачає?»
      avoid: [
        'goto','reto','rito','roto','pito','puto','uso','leio','for','cisa','cosa','bala',
        'bela','bula','boa','para','pira','pura','perra','belo','bulo','parco','perco','poro',
        'chove','cave','cerro','corro','curro','caro','cabra','cubra','cora','tire','lavro','chova',
        'povo','polo','limo','coalho','colho','caruja','corja','baleai','boleia','balia','grafa','galado',
        'geado','cenoira','caca','caga','rabo','chula','chupa','peru','cio','porca','tolo','tola',
        'gago',
      ],
    },
    nl: {
      speech: 'nl-NL',
      alphabet: ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'],
      vowels: 'AEIOU',
      words: [
        ['kat','🐱'],['vis','🐟'],['zon','☀️'],['bus','🚌'],['bal','⚽'],['uil','🦉'],['koe','🐄'],['vos','🦊'],
        ['aap','🐒'],['hond','🐶'],['maan','🌙'],['ster','⭐'],['boom','🌳'],['huis','🏠'],['auto','🚗'],['eend','🦆'],
        ['geit','🐐'],['muis','🐭'],['beer','🐻'],['peer','🍐'],['kaas','🧀'],['melk','🥛'],['wolk','☁️'],['egel','🦔'],
        ['slak','🐌'],['boek','📖'],['appel','🍎'],['brood','🍞'],['taart','🎂'],['bloem','🌸'],['raket','🚀'],['zebra','🦓'],
        ['paard','🐴'],['kikker','🐸'],['banaan','🍌'],['varken','🐷'],['wortel','🥕'],['citroen','🍋'],['sleutel','🔑'],['potlood','✏️'],
        ['vlinder','🦋'],['olifant','🐘'],['paraplu','☂️'],['schildpad','🐢'],
      ],
      sentences: [
        ['Hij is geel en zuur en groeit aan een boom.','🍋','🍌','🍎'],
        ['Hij woont in de zee en zwemt met zijn vinnen.','🐟','🐦','🐸'],
        ['In de nacht schijnt hij hoog aan de hemel.','🌙','☀️','☁️'],
        ['Dit dier heeft een heel lange slurf.','🐘','🦁','🐒'],
        ['Hij kruipt langzaam en draagt zijn huisje op zijn rug.','🐌','🐝','🐸'],
        ['In de winter valt het wit en koud uit de lucht.','❄️','🌧️','🌸'],
        ['Daarmee maak je een deur open.','🔑','📖','💡'],
        ['Hij vliegt van bloem naar bloem en maakt honing.','🐝','🦋','🦉'],
        ['Hij is oranje, slim en heeft een pluizige staart.','🦊','🐺','🐻'],
        ['Daarmee schrijf en teken je in je schrift.','✏️','🔑','☂️'],
        ['Hij vliegt naar de sterren in de ruimte.','🚀','🚗','⛵'],
        ['Deze vogel is in de nacht wakker en heeft grote ogen.','🦉','🦆','🐔'],
        ['Hij heeft stekels en verstopt zich onder de bladeren.','🦔','🐰','🐢'],
        ['Die doe je open als het regent.','☂️','📖','⏰'],
      ],
      // справжні слова, які генератор помилок не має показувати як «помилку» (див. шапку);
      // наприкінці — грубі/страшні слова, які могли б утворитися в «Якої літери не вистачає?»
      avoid: [
        'hand','mana','man','star','boem','bom','hus','eind','end','eed','giet','guit',
        'geat','geut','git','get','mais','meis','mis','mus','bier','boer','beur','pier',
        'poer','peur','per','kas','milk','molk','mek','walk','welk','wulk','wok','eel',
        'slik','slok','slaak','sak','beek','bek','bok','broed','bood','tart','blom','kakker',
        'kekker','kokker','verken','vorken','varen','wartel','citrien','pootlood','vlonder','vinder','kut','kak',
        'geil','bil','pis','bloed','dolk','zot',
      ],
    },
    cs: {
      speech: 'cs-CZ',
      alphabet: ['A','Á','B','C','Č','D','Ď','E','É','Ě','F','G','H','CH','I','Í','J','K','L','M','N','Ň','O','Ó','P','Q','R','Ř','S','Š','T','Ť','U','Ú','Ů','V','W','X','Y','Ý','Z','Ž'],
      vowels: 'AÁEÉĚIÍOÓUÚŮYÝ',
      words: [
        ['pes','🐶'],['dům','🏠'],['sýr','🧀'],['lev','🦁'],['kůň','🐴'],['nos','👃'],['oko','👁️'],['myš','🐭'],
        ['čaj','🍵'],['vlk','🐺'],['míč','⚽'],['loď','⛵'],['klíč','🔑'],['sníh','❄️'],['déšť','🌧️'],['dort','🎂'],
        ['slon','🐘'],['tygr','🐯'],['ryba','🐟'],['sova','🦉'],['žába','🐸'],['auto','🚗'],['ruka','✋'],['noha','🦵'],
        ['mrak','☁️'],['šnek','🐌'],['vlak','🚂'],['ovce','🐑'],['koza','🐐'],['kuře','🐥'],['brouk','🪲'],['strom','🌳'],
        ['kočka','🐱'],['liška','🦊'],['kráva','🐄'],['banán','🍌'],['jablko','🍎'],['slunce','☀️'],['hvězda','⭐'],['měsíc','🌙'],
        ['medvěd','🐻'],['ježek','🦔'],['kachna','🦆'],['prase','🐷'],['opice','🐒'],['hruška','🍐'],['citron','🍋'],['mrkev','🥕'],
        ['okurka','🥒'],['cibule','🧅'],['houba','🍄'],['kniha','📖'],['lampa','💡'],['květina','🌸'],['raketa','🚀'],['želva','🐢'],
        ['motýl','🦋'],['deštník','☂️'],['tužka','✏️'],['hodiny','⏰'],['včela','🐝'],['vejce','🥚'],['mléko','🥛'],['chléb','🍞'],['ucho','👂'],['ananas','🍍'],
        ['meloun','🍉'],['žirafa','🦒'],['zebra','🦓'],['dveře','🚪'],['třešně','🍒'],['slepice','🐔'],['dinosaurus','🦕'],
      ],
      sentences: [
        ['Je žlutý, kyselý a roste na stromě.','🍋','🍌','🍎'],
        ['Žije v moři, plave a má ploutve.','🐟','🐦','🐸'],
        ['V noci svítí vysoko na obloze.','🌙','☀️','☁️'],
        ['Toto zvíře má dlouhý chobot.','🐘','🦁','🐒'],
        ['Leze pomalu a na zádech nosí domeček.','🐌','🐝','🐸'],
        ['V zimě padá z nebe, je bílý a studený.','❄️','🌧️','🌸'],
        ['Odemykáme jím dveře.','🔑','📖','💡'],
        ['Létá nad květinami a dělá med.','🐝','🦋','🦉'],
        ['Je rezavá, chytrá a má huňatý ocas.','🦊','🐺','🐻'],
        ['Píšeme a kreslíme jí do sešitu.','✏️','🔑','☂️'],
        ['Letí ke hvězdám do vesmíru.','🚀','🚗','⛵'],
        ['Tento pták v noci nespí a má velké oči.','🦉','🦆','🐔'],
        ['Je pichlavý a žije v lese pod listím.','🦔','🐰','🐢'],
        ['Otvíráme ho, když prší.','☂️','📖','⏰'],
      ],
      // справжні слова, які генератор помилок не має показувати як «помилку» (див. шапку);
      // наприкінці — грубі/страшні слова, які могли б утворитися в «Якої літери не вистачає?»
      avoid: [
        'kleč','klič','kluč','snah','síh','slin','slín','raba','róba','sůva','raka','reka',
        'roka','naha','něha','šenk','šek','vlka','vlek','vak','káře','keře','kúře','kůře',
        'kře','broku','brok','strum','kačka','káčka','koka','káva','slánce','slince','sluce','ježík',
        'pase','prse','opuce','opce','huška','citran','citrín','citrón','mrkve','huba','lumpa','lama',
        'květena','května','motal','motel','deštík','tížka','hodny','vela','vojce','vece','chlub','zubra',
        'dvoře','třeně','slepce','píč','mrtev','moč','leb','šlak',
      ],
    },
    el: {
      speech: 'el-GR',
      alphabet: ['Α','Β','Γ','Δ','Ε','Ζ','Η','Θ','Ι','Κ','Λ','Μ','Ν','Ξ','Ο','Π','Ρ','Σ','Τ','Υ','Φ','Χ','Ψ','Ω'],
      vowels: 'ΑΕΗΙΟΥΩ',
      words: [
        ['γάτα','🐱'],['γάλα','🥛'],['μήλο','🍎'],['ψάρι','🐟'],['τυρί','🧀'],['νερό','💧'],['αυγό','🥚'],['κότα','🐔'],
        ['ψωμί','🍞'],['ρύζι','🍚'],['πάπια','🦆'],['σπίτι','🏠'],['μπάλα','⚽'],['χιόνι','❄️'],['ήλιος','☀️'],['ζέβρα','🦓'],
        ['τρένο','🚂'],['βροχή','🌧️'],['τίγρη','🐯'],['τούρτα','🎂'],['δέντρο','🌳'],['καρότο','🥕'],['λεμόνι','🍋'],['αχλάδι','🍐'],
        ['κεράσι','🍒'],['αστέρι','⭐'],['χελώνα','🐢'],['μολύβι','✏️'],['κλειδί','🔑'],['παγωτό','🍦'],['καράβι','⛵'],['σκύλος','🐶'],
        ['βιβλίο','📖'],['μπανάνα','🍌'],['ντομάτα','🍅'],['μέλισσα','🐝'],['αρκούδα','🐻'],['ομπρέλα','☂️'],['θάλασσα','🌊'],['φράουλα','🍓'],
        ['σύννεφο','☁️'],['αγελάδα','🐄'],['γουρούνι','🐷'],['φεγγάρι','🌙'],['λουλούδι','🌸'],['καρπούζι','🍉'],['δελφίνι','🐬'],['λιοντάρι','🦁'],
        ['βάτραχος','🐸'],['πύραυλος','🚀'],['ρινόκερος','🦏'],['ελέφαντας','🐘'],['πεταλούδα','🦋'],['κουκουβάγια','🦉'],['αυτοκίνητο','🚗'],
      ],
      sentences: [
        ['Είναι κίτρινο, ξινό και φυτρώνει σε δέντρο.','🍋','🍌','🍎'],
        ['Ζει στη θάλασσα και κολυμπάει με πτερύγια.','🐟','🐦','🐸'],
        ['Τη νύχτα λάμπει ψηλά στον ουρανό.','🌙','☀️','☁️'],
        ['Αυτό το ζώο έχει πολύ μακριά προβοσκίδα.','🐘','🦁','🐒'],
        ['Προχωράει αργά και κουβαλάει το σπιτάκι του στην πλάτη.','🐌','🐝','🐸'],
        ['Τον χειμώνα πέφτει από τον ουρανό, άσπρο και κρύο.','❄️','🌧️','🌸'],
        ['Με αυτό ανοίγουμε την πόρτα.','🔑','📖','💡'],
        ['Πετάει πάνω από τα λουλούδια και φτιάχνει μέλι.','🐝','🦋','🦉'],
        ['Είναι πορτοκαλί, πονηρή και έχει φουντωτή ουρά.','🦊','🐺','🐻'],
        ['Με αυτό γράφουμε και ζωγραφίζουμε στο τετράδιο.','✏️','🔑','☂️'],
        ['Πετάει ψηλά, ως τα αστέρια.','🚀','🚗','⛵'],
        ['Αυτό το πουλί δεν κοιμάται τη νύχτα και έχει μεγάλα μάτια.','🦉','🦆','🐔'],
        ['Έχει αγκάθια και κρύβεται κάτω από τα φύλλα στο δάσος.','🦔','🐰','🐢'],
        ['Το ανοίγουμε όταν βρέχει.','☂️','📖','⏰'],
      ],
      // справжні слова, які генератор помилок не має показувати як «помилку» (див. шапку);
      // наприкінці — грубі/страшні слова, які могли б утворитися в «Якої літери не вистачає?»
      avoid: [
        'πάπα','μάλα','μπλα','ήλος','τούτα','κρότο','κοράσι','παγετό','σκύλας','σκύλες','ελέφαντες','γερο',
      ],
    },
    sv: {
      speech: 'sv-SE',
      alphabet: ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','Å','Ä','Ö'],
      vowels: 'AEIOUYÅÄÖ',
      words: [
        ['katt','🐱'],['hund','🐶'],['sol','☀️'],['mus','🐭'],['bil','🚗'],['hus','🏠'],['ägg','🥚'],['ost','🧀'],
        ['orm','🐍'],['get','🐐'],['apa','🐒'],['bok','📖'],['räv','🦊'],['örn','🦅'],['öga','👁️'],['snö','❄️'],
        ['gris','🐷'],['fisk','🐟'],['anka','🦆'],['häst','🐴'],['träd','🌳'],['måne','🌙'],['regn','🌧️'],['glass','🍦'],
        ['uggla','🦉'],['groda','🐸'],['lejon','🦁'],['björn','🐻'],['mjölk','🥛'],['tårta','🎂'],['äpple','🍎'],['banan','🍌'],
        ['päron','🍐'],['morot','🥕'],['raket','🚀'],['penna','✏️'],['kanin','🐰'],['tiger','🐯'],['zebra','🦓'],['citron','🍋'],
        ['nyckel','🔑'],['lampa','💡'],['blomma','🌸'],['fjäril','🦋'],['stjärna','⭐'],['elefant','🐘'],['paraply','☂️'],['igelkott','🦔'],
        ['bläckfisk','🐙'],['sköldpadda','🐢'],
      ],
      sentences: [
        ['Den är gul, sur och växer på ett träd.','🍋','🍌','🍎'],
        ['Den bor i havet och simmar med fenor.','🐟','🐦','🐸'],
        ['På natten lyser den högt uppe på himlen.','🌙','☀️','☁️'],
        ['Det här djuret har en lång snabel.','🐘','🦁','🐒'],
        ['Den kryper långsamt och bär sitt hus på ryggen.','🐌','🐝','🐸'],
        ['På vintern faller det från himlen, vitt och kallt.','❄️','🌧️','🌸'],
        ['Med den låser man upp dörren.','🔑','📖','💡'],
        ['Det flyger mellan blommorna och gör honung.','🐝','🦋','🦉'],
        ['Den är röd, listig och har en yvig svans.','🦊','🐺','🐻'],
        ['Med den skriver och ritar man.','✏️','🔑','☂️'],
        ['Den flyger upp till stjärnorna.','🚀','🚗','⛵'],
        ['Den här fågeln är vaken på natten och har stora ögon.','🦉','🦆','🐔'],
        ['Den är taggig och gömmer sig under löven i skogen.','🦔','🐰','🐢'],
        ['Man fäller upp det när det regnar.','☂️','📖','⏰'],
      ],
      // справжні слова, які генератор помилок не має показувати як «помилку» (див. шапку);
      // наприкінці — грубі/страшні слова, які могли б утворитися в «Якої літери не вистачає?»
      avoid: [
        'kitt','kött','hand','hind','hud','girs','grus','gräs','fiks','fusk','fik','ana',
        'hast','hest','hyst','höst','tärd','trad','tråd','trädd','månne','ren','gass','glas',
        'gröda','grodda','goda','tårat','banna','benan','bönan','riket','rakat','rakit','rakt','panna',
        'pinna','kinin','kanon','tager','tyger','tigger','citrin','nickel','limpa','lämpa','lapa','lama',
        'blemma','bomma','blockfisk','bläckfusk','bäckfisk','skuldpadda','röv','niger','pisk',
      ],
    },
    hu: {
      speech: 'hu-HU',
      alphabet: ['A','Á','B','C','CS','D','DZ','DZS','E','É','F','G','GY','H','I','Í','J','K','L','LY','M','N','NY','O','Ó','Ö','Ő','P','Q','R','S','SZ','T','TY','U','Ú','Ü','Ű','V','W','X','Y','Z','ZS'],
      vowels: 'AÁEÉIÍOÓÖŐUÚÜŰ',
      words: [
        ['ló','🐴'],['hal','🐟'],['sün','🦔'],['tej','🥛'],['nap','☀️'],['ház','🏠'],['íj','🏹'],['őz','🦌'],
        ['orr','👃'],['fül','👂'],['kéz','✋'],['láb','🦵'],['tűz','🔥'],['víz','💧'],['tök','🎃'],['méh','🐝'],
        ['ing','👕'],['dob','🥁'],['cica','🐱'],['maci','🧸'],['alma','🍎'],['eper','🍓'],['hold','🌙'],['autó','🚗'],
        ['hajó','🚢'],['béka','🐸'],['róka','🦊'],['sajt','🧀'],['óra','⏰'],['eső','🌧️'],['répa','🥕'],['cipő','👟'],
        ['üveg','🍾'],['egér','🐭'],['medve','🐻'],['körte','🍐'],['banán','🍌'],['tojás','🥚'],['torta','🎂'],['labda','⚽'],
        ['virág','🌸'],['felhő','☁️'],['zebra','🦓'],['majom','🐒'],['tigris','🐯'],['tehén','🐄'],['bálna','🐳'],['polip','🐙'],
        ['malac','🐷'],['kakas','🐓'],['kalap','👒'],['gitár','🎸'],['vonat','🚂'],['lámpa','💡'],['citrom','🍋'],['ceruza','✏️'],
        ['teknős','🐢'],['uborka','🥒'],['pingvin','🐧'],['traktor','🚜'],['elefánt','🐘'],['űrhajó','🚀'],['pillangó','🦋'],
        // слова з диграфами (CS, GY, LY, NY, SZ, TY, ZS — одна літера = одна плитка)
        ['szem','👁️'],['szív','❤️'],['csiga','🐌'],['gyík','🦎'],['nyúl','🐰'],['tyúk','🐔'],['kutya','🐶'],['zsiráf','🦒'],
        ['szőlő','🍇'],['kecske','🐐'],['hagyma','🧅'],['király','👑'],['csillag','⭐'],['gyertya','🕯️'],['sárkány','🐉'],
      ],
      sentences: [
        ['Sárga, savanyú, és fán terem.','🍋','🍌','🍎'],
        ['A tengerben él, úszik, és uszonyai vannak.','🐟','🐦','🐸'],
        ['Éjszaka magasan világít az égen.','🌙','☀️','☁️'],
        ['Ennek az állatnak hosszú ormánya van.','🐘','🦁','🐒'],
        ['Lassan mászik, és a hátán viszi a házát.','🐌','🐝','🐸'],
        ['Télen hullik az égből, fehér és hideg.','❄️','🌧️','🌸'],
        ['Ezzel nyitjuk ki az ajtót.','🔑','📖','💡'],
        ['Virágról virágra repül, és mézet készít.','🐝','🦋','🦉'],
        ['Vörös bundája van, ravasz, és bolyhos a farka.','🦊','🐺','🐻'],
        ['Ezzel írunk és rajzolunk a füzetbe.','✏️','🔑','☂️'],
        ['Fel, egészen a csillagokig repül.','🚀','🚗','⛵'],
        ['Ez a madár éjjel ébren van, és nagy a szeme.','🦉','🦆','🐔'],
        ['Tüskés, és az erdőben, a levelek alatt bújik meg.','🦔','🐰','🐢'],
        ['Akkor nyitjuk ki, amikor esik az eső.','☂️','📖','⏰'],
      ],
      // справжні слова, які генератор помилок не має показувати як «помилку» (див. шапку);
      // наприкінці — грубі/страшні слова, які могли б утворитися в «Якої літери не вистачає?»
      avoid: [
        'coca','moci','muci','mai','macii','ama','epre','háld','baka','bika','boka','sejt',
        'sújt','köret','kérte','köre','bénán','tujás','tojós','tárta','túrta','tora','varág','várág',
        'vérág','falhő','félhő','fülhő','zabra','majam','majám','teén','bálan','bála','kőkas','kakás',
        'kakis','kőlap','gátár','gotár','gótár','gittár','vonta','vénat','vonít','vonót','vont','lápa',
        'láma','cetrom','toknős','töknős','teknőős','tráktor','szám','szóm','szúm','sem','szíív','gyök',
        'nyal','nyál','nyel','nyél','nyíl','szelő','szülő','kecsek','kecse','csillog','sárkény','cici',
        'kakak','kakad','kakam','kakan','kakat','szex','béna','bűz','kéj','holt',
      ],
    },
    bg: {
      speech: 'bg-BG',
      alphabet: ['А','Б','В','Г','Д','Е','Ж','З','И','Й','К','Л','М','Н','О','П','Р','С','Т','У','Ф','Х','Ц','Ч','Ш','Щ','Ъ','Ь','Ю','Я'],
      vowels: 'АЕИОУЪЮЯ',
      words: [
        ['нос','👃'],['око','👁️'],['лъв','🦁'],['чай','🍵'],['лук','🧅'],['кит','🐳'],['рак','🦀'],['кон','🐴'],
        ['куче','🐶'],['слон','🐘'],['вълк','🐺'],['гъба','🍄'],['хляб','🍞'],['сова','🦉'],['риба','🐟'],['жаба','🐸'],
        ['ръка','✋'],['крак','🦵'],['сняг','❄️'],['дъжд','🌧️'],['къща','🏠'],['луна','🌙'],['кола','🚗'],['елха','🎄'],
        ['диня','🍉'],['яйце','🥚'],['заек','🐰'],['овца','🐑'],['котка','🐱'],['торта','🎂'],['тигър','🐯'],['лимон','🍋'],
        ['банан','🍌'],['круша','🍐'],['прасе','🐷'],['крава','🐄'],['пчела','🐝'],['дърво','🌳'],['книга','📖'],['ключ','🔑'],
        ['лампа','💡'],['цвете','🌸'],['облак','☁️'],['зебра','🦓'],['жираф','🦒'],['акула','🦈'],['чадър','☂️'],['молив','✏️'],
        ['ягода','🍓'],['шапка','🧢'],['звезда','⭐'],['слънце','☀️'],['череша','🍒'],['патица','🦆'],['охлюв','🐌'],['морков','🥕'],
        ['ябълка','🍎'],['ракета','🚀'],['мечка','🐻'],['делфин','🐬'],['ананас','🍍'],['маймуна','🐒'],['кокошка','🐔'],['таралеж','🦔'],
        ['шоколад','🍫'],['пеперуда','🦋'],['фламинго','🦩'],['часовник','⏰'],['костенурка','🐢'],['краставица','🥒'],
      ],
      sentences: [
        ['Той е жълт, кисел и расте на дърво.','🍋','🍌','🍎'],
        ['Живее в морето, плува и има перки.','🐟','🐦','🐸'],
        ['През нощта тя свети високо в небето.','🌙','☀️','☁️'],
        ['Това животно има дълъг хобот.','🐘','🦁','🐒'],
        ['Пълзи бавно и носи къщичката си на гърба.','🐌','🐝','🐸'],
        ['През зимата от небето пада нещо бяло и студено.','❄️','🌧️','🌸'],
        ['С него отключваме вратата.','🔑','📖','💡'],
        ['Тя лети над цветята и прави мед.','🐝','🦋','🦉'],
        ['Той е рижав, хитър и има пухкава опашка.','🦊','🐺','🐻'],
        ['С него пишем и рисуваме в тетрадката.','✏️','🔑','☂️'],
        ['Тя лети към звездите в космоса.','🚀','🚗','⛵'],
        ['Тази птица не спи през нощта и има големи очи.','🦉','🦆','🐔'],
        ['Той е бодлив и живее в гората под листата.','🦔','🐰','🐢'],
        ['Отваряме го, когато вали дъжд.','☂️','📖','⏰'],
      ],
      // справжні слова, які генератор помилок не має показувати як «помилку» (див. шапку);
      // наприкінці — грубі/страшні слова, які могли б утворитися в «Якої літери не вистачає?»
      avoid: [
        'каче','кече','коче','слян','сива','роба','ръба','рака','река','рока','крик','как',
        'лена','лина','лона','лунна','кила','кула','кла','еха','ела','деня','дъня','котак',
        'китка','кътка','кока','кота','тота','тора','пасе','крива','лапа','лама','облик','забра',
        'акъла','аула','чедър','шипка','шопка','шапа','петица','птица','ракита','мачка','мека','меча',
        'кокоша','красавица','шиба','гъза','кокотка','дърто','гола','нож',
      ],
    },
    uz: {
      speech: 'uz-UZ',
      alphabet: ['A','B','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','X','Y','Z','Oʻ','Gʻ','Sh','Ch','Ng'],
      vowels: 'AEIOU',
      words: [
        ['it','🐶'],['uy','🏠'],['oy','🌙'],['ot','🐴'],['non','🍞'],['sut','🥛'],['gul','🌸'],['fil','🐘'],
        ['kit','🐳'],['nok','🍐'],['qor','❄️'],['toj','👑'],['olma','🍎'],['baqa','🐸'],['ilon','🐍'],['tort','🎂'],
        ['ayiq','🐻'],['uzum','🍇'],['soat','⏰'],['tuya','🐫'],['baliq','🐟'],['sigir','🐄'],['quyon','🐰'],['tulki','🦊'],
        ['tuxum','🥚'],['limon','🍋'],['banan','🍌'],['sabzi','🥕'],['kitob','📖'],['kalit','🔑'],['bulut','☁️'],['qalam','✏️'],
        ['tovuq','🐔'],['burun','👃'],['yurak','❤️'],['zebra','🦓'],['akula','🦈'],['piyoz','🧅'],['jirafa','🦒'],['delfin','🐬'],
        ['daraxt','🌳'],['yulduz','⭐'],['tarvuz','🍉'],['ananas','🍍'],['maymun','🐒'],['raketa','🚀'],['avtobus','🚌'],['kapalak','🦋'],
        ['pomidor','🍅'],['soyabon','☂️'],['asalari','🐝'],['velosiped','🚲'],['muzqaymoq','🍦'],['tipratikan','🦔'],
        // слова з Oʻ Gʻ Sh Ch Ng (одна літера = одна плитка; ʻ — U+02BB)
        ['choy','🍵'],['sher','🦁'],['qoʻl','✋'],['koʻz','👁️'],['qoʻy','🐑'],['mushuk','🐱'],['oʻrdak','🦆'],['qoshiq','🥄'],
        ['gʻisht','🧱'],['bodring','🥒'],['choʻchqa','🐷'],['shaftoli','🍑'],
      ],
      sentences: [
        ['U sariq, nordon va daraxtda oʻsadi.','🍋','🍌','🍎'],
        ['U dengizda yashaydi va suzgichlari bilan suzadi.','🐟','🐦','🐸'],
        ['Kechasi u osmonda baland porlaydi.','🌙','☀️','☁️'],
        ['Bu hayvonning uzun xartumi bor.','🐘','🦁','🐒'],
        ['U sekin sudraladi va uychasini orqasida olib yuradi.','🐌','🐝','🐸'],
        ['Qishda osmondan oppoq va sovuq narsa yogʻadi.','❄️','🌧️','🌸'],
        ['U bilan eshikni ochishadi.','🔑','📖','💡'],
        ['U gullar ustida uchadi va asal tayyorlaydi.','🐝','🦋','🦉'],
        ['U malla rangli, ayyor va dumi paxmoq.','🦊','🐺','🐻'],
        ['U bilan daftarga yozamiz va rasm chizamiz.','✏️','🔑','☂️'],
        ['U yulduzlar sari koinotga uchadi.','🚀','🚗','⛵'],
        ['Bu qush tunda uxlamaydi va koʻzlari katta.','🦉','🦆','🐔'],
        ['U tikanli va oʻrmonda barglar ostida yashaydi.','🦔','🐰','🐢'],
        ['Yomgʻir yogʻganda uni ochishadi.','☂️','📖','⏰'],
      ],
      // справжні слова, які генератор помилок не має показувати як «помилку» (див. шапку);
      // наприкінці — грубі/страшні слова, які могли б утворитися в «Якої літери не вистачає?»
      avoid: [
        'qol','olam','ola','shar','shor','sot','tot','yarak','buqa','boring','mushak','oʻrak',
        'sehr','ser','tilki','kitab','liman','koʻt','kot','qon','gor',
      ],
    },
    az: {
      speech: 'az-AZ',
      alphabet: ['A','B','C','Ç','D','E','Ə','F','G','Ğ','H','X','I','İ','J','K','Q','L','M','N','O','Ö','P','R','S','Ş','T','U','Ü','V','Y','Z'],
      vowels: 'AEƏIİOÖUÜ',
      words: [
        ['ev','🏠'],['it','🐶'],['at','🐴'],['ay','🌙'],['əl','✋'],['göz','👁️'],['çay','🍵'],['qar','❄️'],
        ['arı','🐝'],['ayı','🐻'],['şir','🦁'],['fil','🐘'],['top','⚽'],['gül','🌸'],['süd','🥛'],['tort','🎂'],
        ['alma','🍎'],['saat','⏰'],['ilan','🐍'],['inək','🐄'],['ağac','🌳'],['açar','🔑'],['üzüm','🍇'],['lampa','💡'],
        ['pişik','🐱'],['limon','🍋'],['banan','🍌'],['armud','🍐'],['kitab','📖'],['bulud','☁️'],['xiyar','🥒'],['soğan','🧅'],
        ['toyuq','🐔'],['ördək','🦆'],['ulduz','⭐'],['günəş','☀️'],['kirpi','🦔'],['ilbiz','🐌'],['zebra','🦓'],['çörək','🍞'],
        ['yağış','🌧️'],['maşın','🚗'],['raket','🚀'],['siçan','🐭'],['çətir','☂️'],['gilas','🍒'],['balıq','🐟'],['burun','👃'],
        ['pələng','🐯'],['pendir','🧀'],['meymun','🐒'],['qarpız','🍉'],['dovşan','🐰'],['balina','🐳'],['bayquş','🦉'],['canavar','🐺'],
        ['göbələk','🍄'],['qurbağa','🐸'],['kəpənək','🦋'],['şokolad','🍫'],['tısbağa','🐢'],['yumurta','🥚'],['ıldırım','⚡'],['yerkökü','🥕'],
        ['karandaş','✏️'],
      ],
      sentences: [
        ['Sarıdır, turşdur və ağacda bitir.','🍋','🍌','🍎'],
        ['Dənizdə yaşayır, üzür və üzgəcləri var.','🐟','🐦','🐸'],
        ['Gecələr göydə yüksəkdə parlayır.','🌙','☀️','☁️'],
        ['Bu heyvanın uzun xortumu var.','🐘','🦁','🐒'],
        ['Yavaş-yavaş sürünür və evini belində daşıyır.','🐌','🐝','🐸'],
        ['Qışda göydən ağ və soyuq bir şey yağır.','❄️','🌧️','🌸'],
        ['Onunla qapını açırlar.','🔑','📖','💡'],
        ['Çiçəklərin üstündə uçur və bal hazırlayır.','🐝','🦋','🦉'],
        ['Kürəndir, hiyləgərdir və quyruğu tüklüdür.','🦊','🐺','🐻'],
        ['Onunla dəftərdə yazır və şəkil çəkirlər.','✏️','🔑','☂️'],
        ['Ulduzlara, kosmosa uçur.','🚀','🚗','⛵'],
        ['Bu quş gecə yatmır və gözləri iridir.','🦉','🦆','🐔'],
        ['Tikanlıdır və meşədə yarpaqların altında yaşayır.','🦔','🐰','🐢'],
        ['Yağış yağanda onu açırlar.','☂️','📖','⏰'],
      ],
      // справжні слова, які генератор помилок не має показувати як «помилку» (див. шапку);
      // наприкінці — грубі/страшні слова, які могли б утворитися в «Якої літери не вистачає?»
      avoid: [
        'ala','ama','buran','lama','liman','sat','yığış','amı','göt','qan',
      ],
    },
  };

  const MEDALS = [   // id = ключ тексту назви медалі
    { id: 'edu.read.mFirst',   test: p => p.solved >= 1 },
    { id: 'edu.read.mStreak',  test: p => (p.best || 0) >= 10 },
    { id: 'edu.read.mLevel5',  test: p => p.level >= 5 },
    { id: 'edu.read.mSolved',  test: p => p.solved >= 50 },
  ];
  const PER_LEVEL = 5;

  /* ===================== УТИЛІТИ ===================== */
  const rnd = n => Math.floor(Math.random() * n);
  const pick = a => a[rnd(a.length)];
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function sample(a, n, not) { return shuffle(a.filter(x => !(not || []).includes(x))).slice(0, n); }

  /* ===================== ГОЛОС (Web Speech API) ===================== */
  const Speech = {
    ok() { try { return 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function'; } catch (e) { return false; } },
    voice(code) {
      if (!this.ok()) return null;
      try {
        const vs = window.speechSynthesis.getVoices() || [];
        const base = code.slice(0, 2).toLowerCase();
        return vs.find(v => (v.lang || '').toLowerCase().replace('_', '-') === code.toLowerCase()) ||
               vs.find(v => (v.lang || '').toLowerCase().slice(0, 2) === base) || null;
      } catch (e) { return null; }
    },
    say(text, code) {
      const v = this.voice(code); if (!v || !text) return false;
      try {
        window.speechSynthesis.cancel();
        const u = new window.SpeechSynthesisUtterance(text);
        u.voice = v; u.lang = v.lang; u.rate = 0.85; u.pitch = 1.1;
        window.speechSynthesis.speak(u);
        return true;
      } catch (e) { return false; }
    },
    stop() { try { if (this.ok()) window.speechSynthesis.cancel(); } catch (e) {} },
  };

  /* ===================== ГРА ===================== */
  let host = null, ctx = null, D = null, task = null, timers = [], onVoices = null, pendingMedals = [];

  function later(fn, ms) { const id = setTimeout(fn, ms); timers.push(id); return id; }
  function muted() { const s = BO.state; return !!(s && s.sound && s.sound.muted); }
  function up(s) { return s.toLocaleUpperCase(ctx.lang); }
  function el(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  function dataFor(lang) { return READ_DATA[lang] || READ_DATA.en; }
  // Літери з кількох знаків (CS, DZS, CH, Oʻ, Sh…): ВЕЛИКИМИ, найдовші — першими
  const MARKS = /^[ʻʼ'’]/;
  function multiOf(d) {
    if (!d._multi) d._multi = d.alphabet.filter(x => [...x].length > 1).map(x => x.toUpperCase()).sort((a, b) => b.length - a.length);
    return d._multi;
  }
  // слово → літери абетки (ВЕЛИКИМИ): найдовший збіг, але не забираємо знак, після якого йде ʻ
  // (узб. «qoʻngʻiz» = … N + Gʻ …, а не Ng + ʻ)
  function units(w, d) {
    d = d || D;
    const lang = Object.keys(READ_DATA).find(k => READ_DATA[k] === d) || 'en';
    const W = w.toLocaleUpperCase(lang), multi = multiOf(d), out = [];
    for (let i = 0; i < W.length;) {
      const m = multi.find(x => W.startsWith(x, i) && !MARKS.test(W.slice(i + x.length)));
      const u = m || String.fromCodePoint(W.codePointAt(i));
      out.push(u); i += u.length;
    }
    return out;
  }
  // слово можна надійно поділити на літери? (угор. ssz/ccs/ggy… = подвоєний диграф; ʼ ' — роздільник)
  function unitSafe(w, d) {
    d = d || D;
    if (/[ʼ'’]/.test(w)) return false;
    if (multiOf(d).length && /(ssz|ccs|ggy|lly|nny|tty|zzs|ddz)/i.test(w)) return false;
    return units(w, d).every(u => !MARKS.test(u));
  }
  function wordList() { return D.words.filter(x => unitSafe(x[0])); }
  // літера абетки в тому вигляді, як вона записана в alphabet (SH → Sh)
  function canon(u) { return D.alphabet.find(x => x.toUpperCase() === u.toUpperCase()) || u; }
  // перша літера слова як літера абетки (É → E, Á → A); Й, Ї, Ё лишаються, бо вони є в абетці
  function firstLetter(w) {
    let L = canon(units(w)[0]);
    if (!D.alphabet.includes(L)) L = up(L).normalize('NFD').charAt(0);
    return L;
  }
  function wordsBy(min, max) {
    let ws = wordList().filter(x => { const n = units(x[0]).length; return n >= min && n <= max; });
    if (ws.length < 3) ws = wordList();
    return ws;
  }

  function lvl() { return ctx.progress.level || 1; }

  // які типи завдань доступні для віку
  function taskTypes() {
    const b = ctx.band;
    if (b <= 5) return ['find', 'find', 'first'];
    if (b <= 8) return ['build', 'miss'];
    return D.sentences && D.sentences.length ? ['scram', 'spell', 'sent'] : ['scram', 'spell'];
  }

  /* ---------- генератори завдань ---------- */
  const GEN = {
    find() {
      const n = Math.min(6, 3 + Math.floor((lvl() - 1) / 2));
      const pool = D.alphabet.filter(x => x !== 'Ь' && x !== 'Ъ');
      const target = pick(pool);
      return { type: 'find', prompt: ctx.t('task.find'), big: target, say: target.toLocaleLowerCase(ctx.lang),
               opts: shuffle([target].concat(sample(pool, n - 1, [target]))), answer: target, cls: 'rdOptsLetters' };
    },
    first() {
      const n = Math.min(4, 3 + Math.floor((lvl() - 1) / 3));
      const w = pick(wordList().filter(x => D.alphabet.includes(firstLetter(x[0]))));
      const L = firstLetter(w[0]);
      // не ставимо поруч «двійників» (árvore → Á, тож без A; їжак → Ї, тож без І): дитина не мусить
      // вгадувати, чи наголос/крапки «рахуються»
      const base = x => x.normalize('NFD').charAt(0), twin = x => x !== L && base(x) === base(L);
      const firsts = [...new Set(wordList().map(x => firstLetter(x[0])))].filter(x => x !== L && D.alphabet.includes(x) && !twin(x));
      const extra = sample(firsts.length >= n - 1 ? firsts : D.alphabet.filter(x => x.length === 1 && !twin(x)), n - 1, [L]);
      return { type: 'first', prompt: ctx.t('task.first'), big: w[1], bigCls: 'rdEmoji', say: w[0],
               opts: shuffle([L].concat(extra)), answer: L, cls: 'rdOptsLetters' };
    },
    build() {
      const max = Math.min(6, 3 + Math.floor((lvl() - 1) / 2));
      const w = pick(wordsBy(3, max));
      const letters = units(w[0]);
      return { type: 'build', prompt: ctx.t('task.build'), big: w[1], bigCls: 'rdEmoji', say: w[0],
               word: letters, tiles: shuffleNotSame(letters) };
    },
    miss() {
      const max = Math.min(7, 4 + Math.floor((lvl() - 1) / 2));
      // пропуск — лише на місці одиночної літери, яка є плиткою абетки (диграф не вміщається в одну клітинку,
      // а літера поза абеткою дала б варіанти не того типу)
      const holes = ls => ls.map((c, k) => c.length === 1 && D.alphabet.includes(c) ? k : -1).filter(k => k >= 0);
      const ws = wordsBy(3, max).filter(x => holes(units(x[0])).length);
      // диграфи (GY, Sh…) не пасують до однієї клітинки; голосна ↔ голосні, приголосна ↔ приголосні
      const poolFor = L => D.alphabet.filter(x => x.length === 1 && x !== L && (D.vowels.includes(x) === D.vowels.includes(L)));
      // шукаємо слово й пропуск, де є щонайменше 2 «чисті» хибні літери (D_CK: E, I, O дають DECK, DICK, DOCK —
      // такий пропуск краще не брати); якщо за 30 спроб не знайшли — останній варіант із найкращими пастками
      let w, letters, i;
      for (let k = 0; k < 30; k++) {
        w = pick(ws); letters = units(w[0]); i = pick(holes(letters));
        if (poolFor(letters[i]).filter(x => trapRank(letters, i, x) === 0).length >= 2) break;
      }
      const L = letters[i];
      const pool = poolFor(L);
      const n = lvl() >= 4 ? 4 : 3;
      const extra = missTraps(letters, i, pool, n - 1);
      const shown = letters.map((c, k) => k === i ? '_' : c).join('');
      return { type: 'miss', prompt: ctx.t('task.miss'), big: w[1], bigCls: 'rdEmoji', say: w[0], word2: shown,
               opts: shuffle([L].concat(extra)), answer: L, cls: 'rdOptsLetters' };
    },
    scram() {
      const min = Math.min(7, 4 + Math.floor((lvl() - 1) / 3));
      const all = wordList(), n = x => units(x[0]).length;
      let ws = all.filter(x => n(x) >= min);
      if (ws.length < 3) ws = all.filter(x => n(x) >= 4);
      if (!ws.length) ws = all;
      const w = pick(ws);
      const letters = units(w[0]);
      const tiles = shuffleNotSame(letters);
      if (lvl() >= 3) tiles.splice(rnd(tiles.length + 1), 0, pick(D.alphabet.filter(x => x.length === 1 && !letters.includes(x))));
      return { type: 'scram', prompt: ctx.t('task.scram'), big: w[1], bigCls: 'rdEmoji', say: w[0], word: letters, tiles };
    },
    spell() {
      const w = pick(D.words.filter(x => x[0].length >= 4).length >= 3 ? D.words.filter(x => x[0].length >= 4) : D.words);
      const wrong = misspell(w[0], 2);
      return { type: 'spell', prompt: ctx.t('task.spell'), big: w[1], bigCls: 'rdEmoji', say: null,
               opts: shuffle([w[0]].concat(wrong)), answer: w[0], cls: 'rdOptsWords' };
    },
    sent() {
      const s = pick(D.sentences);
      return { type: 'sent', prompt: ctx.t('task.sent'), sentence: s[0], say: s[0],
               opts: shuffle(s.slice(1, 4)), answer: s[1], cls: 'rdOptsEmoji' };
    },
  };

  // «Якої літери не вистачає?»: хибні літери. Пастка, що утворює інше справжнє слово (P_RA + U = PURA),
  // гірша за звичайну: спершу беремо «чисті» літери; слово зі списку words — запасний варіант,
  // слово з avoid (сюди потрапляють і грубі слова) — найостанніший. Пастку відкидаємо, лише якщо
  // після цього лишається щонайменше 3 варіанти (правильна + 2 хибні); інакше — найкращі з наявних.
  // 0 — літера не утворює справжнього слова; 1 — утворює інше слово зі списку words; 2 — слово з avoid
  function trapRank(letters, i, x) {
    if (!D._own) D._own = new Set(D.words.map(w => w[0].toLocaleUpperCase(ctx.lang)));
    if (!D._bad) D._bad = new Set((D.avoid || []).map(w => w.toLocaleUpperCase(ctx.lang)));
    const t = letters.slice(); t[i] = x; const s = up(t.join(''));
    return D._bad.has(s) ? 2 : D._own.has(s) ? 1 : 0;
  }
  function missTraps(letters, i, pool, want) {
    const rank = x => trapRank(letters, i, x);
    const byRank = [[], [], []];
    shuffle(pool).forEach(x => byRank[rank(x)].push(x));
    const out = byRank[0].slice(0, want);
    for (const r of [1, 2]) byRank[r].forEach(x => { if (out.length < Math.min(2, want)) out.push(x); });
    if (out.length < Math.min(2, want)) {   // дуже мала група літер — додаємо будь-які інші одиночні літери
      const L = letters[i];
      shuffle(D.alphabet.filter(x => x.length === 1 && x !== L && !out.includes(x) && rank(x) < 2))
        .forEach(x => { if (out.length < Math.min(2, want)) out.push(x); });
    }
    return out;
  }

  function shuffleNotSame(letters) {
    let t = letters;
    for (let k = 0; k < 8 && t.join('') === letters.join(''); k++) t = shuffle(letters);
    return t;
  }

  // помилкові варіанти слова: переставити сусідні літери / замінити голосну / подвоїти / пропустити літеру.
  // Першу й останню літеру не чіпаємо: заміна закінчення дає справжню форму слова (зірка → зірку).
  function misspell(word, n) {
    // «помилка» не може збігатися зі словом зі списку чи зі справжнім словом із avoid (без різниці великі/малі)
    const out = new Set(), all = new Set(D.words.map(x => x[0]).concat(D.avoid || []).map(x => x.toLocaleLowerCase(ctx.lang)));
    const lowV = [...D.vowels].map(v => v.toLocaleLowerCase(ctx.lang));
    const ops = [
      w => { const i = w.length > 2 ? 1 + rnd(w.length - 2) : 0; const a = [...w]; [a[i], a[i + 1]] = [a[i + 1], a[i]]; return a.join(''); },
      w => { const a = [...w]; const idx = a.map((c, i) => i > 0 && i < a.length - 1 && lowV.includes(c.toLocaleLowerCase(ctx.lang)) ? i : -1).filter(i => i >= 0);
             if (!idx.length) return w; const i = pick(idx); const isCap = a[i] !== a[i].toLocaleLowerCase(ctx.lang);
             let v = pick(lowV.filter(x => x !== a[i].toLocaleLowerCase(ctx.lang))); a[i] = isCap ? up(v) : v; return a.join(''); },
      w => { const i = 1 + rnd(Math.max(1, w.length - 2)); return w.slice(0, i) + w.charAt(i) + w.slice(i); },
      w => { if (w.length < 4) return w; const i = 1 + rnd(w.length - 2); return w.slice(0, i) + w.slice(i + 1); },
    ];
    for (let k = 0; k < 60 && out.size < n; k++) {
      const v = pick(ops)(word);
      if (v && v !== word && !all.has(v.toLocaleLowerCase(ctx.lang)) && v.length >= 2) out.add(v);
    }
    let pad = 0;
    while (out.size < n) out.add(word + word.charAt(word.length - 1).repeat(++pad)); // запасний варіант (дуже короткі слова)
    return [...out];
  }

  /* ---------- малювання ---------- */
  function render() {
    host.innerHTML = '';
    const root = el('div', 'rdRoot');
    const top = el('div', 'rdTop');
    top.appendChild(el('span', 'rdLevel', BO.t('edu.level', { n: lvl() })));
    const dots = el('span', 'rdDots');
    const done = (ctx.progress.inLevel || 0);
    for (let i = 0; i < PER_LEVEL; i++) dots.appendChild(el('i', i < done ? 'on' : ''));
    top.appendChild(dots);
    const sp = el('button', 'rdSpeak', '🔊'); sp.type = 'button';
    sp.setAttribute('aria-label', ctx.t('listen'));
    sp.addEventListener('click', () => speak(true));
    top.appendChild(sp);
    root.appendChild(top);

    root.appendChild(el('p', 'rdPrompt fit', task.prompt));
    if (task.big) root.appendChild(el('div', 'rdBig ' + (task.bigCls || 'rdLetterBig'), task.big));
    if (task.word2) root.appendChild(el('div', 'rdWord', task.word2));
    if (task.sentence) root.appendChild(el('p', 'rdSentence', task.sentence));

    if (task.word) {   // скласти слово з плиток
      if (task.tiles.length > 7) root.classList.add('rdLong');
      const slots = el('div', 'rdSlots');
      task.word.forEach(c => slots.appendChild(el('span', 'rdSlot' + (c.length > 1 ? ' rdMulti' : ''))));
      root.appendChild(slots);
      const tiles = el('div', 'rdTiles');
      task.tiles.forEach(c => { const b = el('button', 'rdTile' + (c.length > 1 ? ' rdMulti' : ''), c); b.type = 'button'; b.addEventListener('click', () => tapTile(b, c)); tiles.appendChild(b); });
      root.appendChild(tiles);
      task.pos = 0;
    } else {
      const opts = el('div', 'rdOpts ' + task.cls);
      task.opts.forEach(o => { const b = el('button', 'rdOpt', o); b.type = 'button'; b.dataset.v = o; b.addEventListener('click', () => tapOpt(b, o)); opts.appendChild(b); });
      root.appendChild(opts);
    }
    root.appendChild(el('div', 'rdFeedback'));
    host.appendChild(root);
    updateSpeakBtn();
  }

  function updateSpeakBtn() {
    const b = host && host.querySelector('.rdSpeak'); if (!b) return;
    b.classList.toggle('rdHide', !task || !task.say || !Speech.voice(D.speech));
  }
  function speak(force) {
    if (!task || !task.say || (!force && muted())) return;
    Speech.say(task.say, D.speech);
  }

  function feedback(txt, cls) {
    const f = host.querySelector('.rdFeedback'); if (!f) return;
    f.textContent = txt; f.className = 'rdFeedback ' + (cls || '');
  }

  function wrong(btn) {
    task.mistakes = (task.mistakes || 0) + 1;
    ctx.progress.streak = 0;
    btn.classList.remove('rdShake'); void btn.offsetWidth; btn.classList.add('rdShake', 'rdBad');
    later(() => btn.classList.remove('rdBad'), 600);
    feedback(ctx.t('tryAgain'), 'bad');
  }

  function tapOpt(btn, v) {
    if (task.solved) return;
    if (v === task.answer) { btn.classList.add('rdGood'); solved(); } else wrong(btn);
  }

  function tapTile(btn, c) {
    if (task.solved || btn.disabled) return;
    if (c !== task.word[task.pos]) return wrong(btn);
    const slot = host.querySelectorAll('.rdSlot')[task.pos];
    slot.textContent = c; slot.classList.add('on');
    btn.disabled = true; btn.classList.add('rdUsed');
    task.pos++;
    if (task.pos >= task.word.length) solved();
  }

  function solved() {
    task.solved = true;
    const p = ctx.progress;
    p.streak = task.mistakes ? 0 : (p.streak || 0) + 1; // серія — лише завдання без помилки
    p.best = Math.max(p.best || 0, p.streak);
    p.inLevel = (p.inLevel || 0) + 1;
    let stars = 1, levelUp = false;
    if (p.inLevel >= PER_LEVEL) { p.inLevel = 0; p.level = (p.level || 1) + 1; stars += 1; levelUp = true; }
    // медалі: перевіряємо з урахуванням цього розв'язку (solved ще не збільшено хабом)
    const probe = Object.assign({}, p, { solved: (p.solved || 0) + 1 });
    MEDALS.forEach(m => { if (!p.medals.includes(m.id) && !pendingMedals.includes(m.id) && m.test(probe)) pendingMedals.push(m.id); });
    const medal = pendingMedals.shift() || null;   // хаб приймає одну медаль за раз; решта — з наступними перемогами
    ctx.win({ stars, medal });
    ctx.save();
    const praise = ctx.t(pick(['good1', 'good2', 'good3']));
    feedback(levelUp ? ctx.t('levelUp', { n: p.level }) : praise + ' +' + stars + ' ⭐', 'good');
    if (task.type === 'build' || task.type === 'scram' || task.type === 'miss' || task.type === 'first') speak(false);
    if (medal) showMedal(medal);
    host.querySelectorAll('.rdDots i').forEach((d, i) => d.classList.toggle('on', levelUp || i < p.inLevel));
    later(next, medal ? 2200 : 1300);
  }

  function showMedal(id) {
    const m = el('div', 'rdMedal');
    m.appendChild(el('b', '', '🏅'));
    m.appendChild(el('span', '', ctx.t('medal', { name: BO.t(id) })));
    host.appendChild(m);
  }

  function next() {
    const types = taskTypes();
    let tp = pick(types);
    if (task && types.length > 1 && tp === task.type && Math.random() < 0.6) tp = pick(types.filter(x => x !== task.type));
    task = GEN[tp]();
    render();
    if (task.type === 'find' || task.type === 'sent') speak(false);
  }

  BO.edu.register({
    id: 'read', slot: 4, icon: '🔤', pilot: true,
    start(h, c) {
      host = h; ctx = c; D = dataFor(c.lang); task = null; timers = []; pendingMedals = [];
      const p = ctx.progress;
      if (!Array.isArray(p.medals)) p.medals = [];
      if (typeof p.inLevel !== 'number') p.inLevel = 0;
      if (Speech.ok()) {
        onVoices = () => updateSpeakBtn();
        try { window.speechSynthesis.addEventListener('voiceschanged', onVoices); window.speechSynthesis.getVoices(); } catch (e) { onVoices = null; }
      }
      next();
    },
    stop() {
      timers.forEach(clearTimeout); timers = [];
      Speech.stop();
      if (onVoices) { try { window.speechSynthesis.removeEventListener('voiceschanged', onVoices); } catch (e) {} onVoices = null; }
      if (host) host.innerHTML = '';
      host = null; task = null;
    },
  });

  // для тестів і для носіїв мов (перевірити свої дані в консолі)
  BO.eduRead = { data: READ_DATA, medals: MEDALS.map(m => m.id), current: () => task,
    units: (w, lang) => units(w, dataFor(lang)), unitSafe: (w, lang) => unitSafe(w, dataFor(lang)),
    // лише для тестів: згенерувати завдання поточної гри без показу (стрес-перевірка тисяч завдань)
    gen: type => (ctx && D && GEN[type]) ? GEN[type]() : null };
})();
