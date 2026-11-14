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
     caseless:  (необов'язково) true — письмо без великих/малих літер (грузинське мхедрулі): слова НЕ переводяться
                у великі (toUpperCase дав би Мтаврулі ᲐᲑᲒ, яких дітям не показуємо); alphabet і vowels — тими ж знаками, що й слова.
     sentences: (необов'язково) [[речення, правильне емодзі, хибне, хибне], …] — для віку 9–14.
     findPool:  (необов'язково) літери для «Знайди літеру», якщо не вся абетка (ko: склади 가나다…하 + 야어여…이).
     spellWrong:(необов'язково) { слово: [помилка, помилка, …] } — готові «помилкові» написання для «Яке слово
                написано правильно?» замість генератора (ko: склади змінювати генератором не можна).
     Корейська (ko): плитки — СКЛАДОВІ БЛОКИ 한글 (사·과), бо окремі jamo (ㅅㅏㄱㅘ) у клітинках розвалили б
                склад; так учать у корейському садочку (таблиця 가나다, «첫 글자» = перший склад). vowels: ''.
     avoid:     (необов'язково) справжні слова мови, які генератор помилок у «правильно написаному
                слові» міг би утворити з наших слів (Katze → Kotze, pato → puto, kura → kora): їх як
                «помилку» не показуємо; сюди ж — грубі/страшні слова, які могли б утворитися в «Якої
                літери не вистачає?» (P_TO + U = PUTO): така літера-пастка відкидається. Кожна літера слова
                в words має бути в alphabet (É, Ç, Ã… — теж, якщо вони є в словах; голосні — і у vowels):
                інакше «Якої літери не вистачає?» дасть хибні варіанти (перевіряє edu_read_check.py).
   Код гри при цьому не міняється. Повні дані (≈60–70 слів + 14 речень): усі 18 мов (pl, de, ro, kk, fr, es — дані чекають перевірки носієм мови, див. new_words_review.csv)
   + 'pt-BR' (португальська Бразилії: код мови з дефісом, тому ключ у лапках; теж чекає перевірки носієм)
   + tr id ja ko fi da nb sk hr sr bs lt lv hy ka (нові мови 15.11; чекають перевірки носієм мови). */
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
    tr: {
      speech: 'tr-TR',
      alphabet: ['A','B','C','Ç','D','E','F','G','Ğ','H','I','İ','J','K','L','M','N','O','Ö','P','R','S','Ş','T','U','Ü','V','Y','Z'],
      vowels: 'AEIİOÖUÜ',
      words: [
        ['ev','🏠'],['at','🐴'],['ay','🌙'],['el','✋'],['göz','👁️'],['çay','🍵'],['arı','🐝'],['ayı','🐻'],['fil','🐘'],
        ['top','⚽'],['gül','🌹'],['süt','🥛'],['bal','🍯'],['muz','🍌'],['kuş','🐦'],['gemi','🚢'],['kedi','🐱'],
        ['elma','🍎'],['saat','⏰'],['inek','🐄'],['ağaç','🌳'],['üzüm','🍇'],['uçak','✈️'],['lamba','💡'],['limon','🍋'],
        ['armut','🍐'],['kitap','📖'],['bulut','☁️'],['soğan','🧅'],['tavuk','🐔'],['ördek','🦆'],['yıldız','⭐'],
        ['güneş','☀️'],['kirpi','🦔'],['zebra','🦓'],['ekmek','🍞'],['yağmur','🌧️'],['araba','🚗'],['roket','🚀'],
        ['fare','🐭'],['kiraz','🍒'],['balık','🐟'],['burun','👃'],['kaplan','🐯'],['peynir','🧀'],['maymun','🐒'],
        ['karpuz','🍉'],['tavşan','🐰'],['balina','🐳'],['baykuş','🦉'],['mantar','🍄'],['kurbağa','🐸'],['kelebek','🦋'],
        ['çikolata','🍫'],['kaplumbağa','🐢'],['yumurta','🥚'],['havuç','🥕'],['kalem','✏️'],['aslan','🦁'],['tilki','🦊'],
        ['çilek','🍓'],['domates','🍅'],['penguen','🐧'],['deve','🐫'],['zürafa','🦒'],['ahtapot','🐙'],['dondurma','🍦'],
        ['şemsiye','☂️'],['salyangoz','🐌'],['anahtar','🔑'],['pasta','🎂'],['çiçek','🌸'],['gözlük','👓'],['kurt','🐺'],
        ['mısır','🌽'],
      ],
      sentences: [
        ['Sarıdır, ekşidir ve ağaçta yetişir.','🍋','🍌','🍎'],
        ['Denizde yaşar, yüzer ve yüzgeçleri vardır.','🐟','🐦','🐸'],
        ['Geceleri gökyüzünde yükseklerde parlar.','🌙','☀️','☁️'],
        ['Bu hayvanın uzun bir hortumu vardır.','🐘','🦁','🐒'],
        ['Yavaş yavaş sürünür ve evini sırtında taşır.','🐌','🐝','🐸'],
        ['Kışın gökten beyaz ve soğuk bir şey yağar.','❄️','🌧️','🌸'],
        ['Onunla kapıyı açarız.','🔑','📖','💡'],
        ['Çiçeklerin üstünde uçar ve bal yapar.','🐝','🦋','🦉'],
        ['Kızıl renklidir, kurnazdır ve kabarık bir kuyruğu vardır.','🦊','🐺','🐻'],
        ['Onunla deftere yazar ve resim çizeriz.','✏️','🔑','☂️'],
        ['Yıldızlara, uzaya uçar.','🚀','🚗','⛵'],
        ['Bu kuş geceleri uyumaz ve kocaman gözleri vardır.','🦉','🦆','🐔'],
        ['Dikenlidir ve ormanda yaprakların altında yaşar.','🦔','🐰','🐢'],
        ['Yağmur yağınca onu açarız.','☂️','📖','⏰'],
      ],
      // справжні слова, які генератор помилок не має показувати як «помилку» (див. шапку): усі реальні слова
      // (за hunspell-словником dictionary-tr), що утворюються з наших слів у «Якої літери не вистачає?» і «Яке слово
      // написано правильно?»; наприкінці — грубі/образливі/страшні слова та «підозрілі» на вигляд хибні варіанти
      avoid: [
        'ab','ablan','abı','acaba','acı','ad','adaba','adlan','adı','af','ah','ahlan','ahı','ak','akaç','aklan',
        'akı','al','alan','allan','alma','alsan','alı','amaç','amlan','amut','an','anaç','anlan','anı','ar','ara',
        'arabı','araca','arada','araka','arala','arama','arana','arasa','arata','araya','araza','araç','ari','arlan',
        'armuz','as','asaba','asan','aslar','aslat','aslen','aslin','aslın','asman','assan','astan','ası','atlan',
        'atı','av','avlan','avı','aya','aylan','az','azaba','azlan','azı','aç','açlan','açı','ağ','ağam','ağan',
        'ağar','ağlan','ağı','aş','aşlan','aşı','bad','bak','balem','balkı','ballık','balona','balım','balın',
        'balına','ban','bap','bar','bas','basta','basık','bat','batık','bav','bay','baz','baç','bağ','baş','bedi',
        'bel','bemi','bil','bilek','biraz','birun','bitap','bol','bop','borun','budun','bul','bulat','buluk','bulum',
        'bulun','bulup','bulur','buluz','buluş','bunun','buran','burnu','buruk','burul','burum','burup','buruş',
        'busun','buut','buyun','buz','buzun','buğun','böl','cal','cay','cemi','cop','dal','dede','dedi','defe',
        'dehe','deke','dele','deme','demi','dene','dere','dese','deva','devi','değe','dil','dilek','doldurma',
        'dondura','dondursa','doydurma','doğan','doğdurma','durun','duş','düve','eh','ek','ekmem','ekmen','ekmez',
        'eksek','ela','elam','em','emek','emmek','en','enek','er','ermek','es','esma','esmek','et','etmek','ey','ez',
        'ezmek','eğ','eğmek','eş','eşmek','fal','falık','fara','farı','fay','fel','fere','fiil','fire','fit','fiğ',
        'fiş','fol','ful','fısır','galem','gamba','gaz','gel','geme','geni','geri','gez','gezi','geçi','giz','gol',
        'gurun','gök','göl','göllük','gölük','göm','gön','gönlük','gör','gözdük','gözlüm','gözük','göç','göçlük',
        'güm','gün','güney','güneç','gür','güreş','güt','güz','güzlük','güç','hal','halem','haplan','hare','hasta',
        'havut','havuz','hay','hitap','hop','huş','il','inak','inen','iner','ineç','inik','ipek','isek','iv','jüt',
        'kadem','kafem','kaklan','kal','kalan','kalen','kalim','kallan','kalık','kalım','kantar','kapan','kaplar',
        'kaplat','kapman','kapsan','kaptan','kapuz','kare','karem','karlan','kart','kasem','kaslan','kasta','katlan',
        'kavlan','kavuk','kay','kaylan','kaş','kaşem','keki','kelem','keli','kemi','kepi','keri','kert','keti',
        'kezi','keçi','keşi','kil','kipi','kiram','kiran','kirci','kirdi','kiri','kiriz','kirli','kirsi','koket',
        'kondurma','kop','kort','koş','kul','kulem','kum','kunt','kup','kur','kurağa','kurs','kurun','kus','kut',
        'kuz','kölem','köz','kül','küt','kısır','kış','lal','lalem','lalık','lama','lamda','lamla','laplan','lasta',
        'liman','limen','limin','lop','mandar','masta','mastar','mazmun','mil','mum','murt','musır','mut','muş',
        'mıcır','mıdır','mıgır','mısın','mızır','naat','nal','nasta','nemi','neve','nurun','ol','olma','ot','ov',
        'oy','pafta','pahta','pakta','pal','pare','pasa','pasla','passa','pastı','pata','patta','pay','pil','pop',
        'posta','pusta','raket','rasta','ray','remi','rop','rozet','ruz','sal','salık','samba','saplan','sat','sata',
        'say','sağan','semi','semsiye','set','seve','sil','silki','sit','soban','sodan','sokan','soket','solan',
        'soman','soran','soyan','soğun','surun','sut','söz','sözlük','sün','sür','süs','süz','sığan','ta','taat',
        'tal','tap','tasta','tavan','tavdan','tavik','tavlan','tavsan','tavus','tay','taşan','temi','tep','tiki',
        'tikli','tili','tip','tok','tol','ton','tor','tos','toy','toz','turun','tuz','tuş','töz','tül','tüp','tüt',
        'tıp','ufak','ulak','uslan','ut','uy','uyak','uzak','uçan','uçar','uçuk','uşak','vaat','vay','ve','ya','yal',
        'yaldız','yare','yarpuz','yasta','yay','yedi','yemi','yumukta','yurt','yıldık','yıldım','yıldın','yıldır',
        'yılsız','yılız','zil','zül','zürefa','çak','çal','çalık','çam','çan','çap','çar','çare','çat','çav','çağ',
        'çelek','çil','çilem','çilen','çiler','çimek','çiy','çöz','ördük','örek','örmek','örnek','örsek','öt','öv',
        'özdek','özüm','ünüm','üt','ütüm','üzül','üzün','üzüp','üçüm','ırı','ıslan','şal','şalem','şemi','şemsiyi',
        'şeve',
        // грубі, образливі, страшні:
        'am','amı','göt','öl','keş','lavuk','mal','it','kanlan','kurbana','deşe','boğan','vurun','döve','kesi',
        'götlük','piçek','çükolata','kelebok','sikolata','şemsike',
      ],
    },
    id: {
      speech: 'id-ID',
      // індонезійська абетка: 26 латинських літер (ng, ny, sy, kh — сполучення літер, а не окремі літери)
      alphabet: ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'],
      vowels: 'AEIOU',
      words: [
        ['kucing','🐱'],['anjing','🐶'],['ikan','🐟'],['ayam','🐔'],['bebek','🦆'],['sapi','🐄'],['kuda','🐴'],['kambing','🐐'],
        ['gajah','🐘'],['singa','🦁'],['harimau','🐯'],['beruang','🐻'],['kelinci','🐰'],['tikus','🐭'],['katak','🐸'],['burung','🐦'],
        ['lebah','🐝'],['semut','🐜'],['siput','🐌'],['penyu','🐢'],['gurita','🐙'],['hiu','🦈'],['paus','🐳'],['kepiting','🦀'],
        ['zebra','🦓'],['jerapah','🦒'],['unta','🐪'],['rubah','🦊'],['landak','🦔'],['rusa','🦌'],['apel','🍎'],['pisang','🍌'],
        ['jeruk','🍊'],['anggur','🍇'],['semangka','🍉'],['nanas','🍍'],['mangga','🥭'],['lemon','🍋'],['kelapa','🥥'],['wortel','🥕'],
        ['jagung','🌽'],['tomat','🍅'],['timun','🥒'],['bawang','🧅'],['jamur','🍄'],['roti','🍞'],['keju','🧀'],['telur','🥚'],
        ['susu','🥛'],['madu','🍯'],['bola','⚽'],['buku','📖'],['pensil','✏️'],['kunci','🔑'],['lampu','💡'],['payung','☂️'],
        ['topi','🧢'],['sepatu','👟'],['mobil','🚗'],['kapal','🚢'],['roket','🚀'],['sepeda','🚲'],['rumah','🏠'],['pohon','🌳'],
        ['bunga','🌸'],['matahari','☀️'],['bulan','🌙'],['bintang','⭐'],['awan','☁️'],['pelangi','🌈'],['mata','👁️'],['hidung','👃'],
        ['gigi','🦷'],['kue','🎂'],['balon','🎈'],['gitar','🎸'],['jam','⏰'],['kado','🎁'],['pesawat','✈️'],['kereta','🚂'],
      ],
      sentences: [
        ['Warnanya kuning, rasanya asam, dan tumbuh di pohon.','🍋','🍌','🍎'],
        ['Ia hidup di laut, berenang, dan punya sirip.','🐟','🐦','🐸'],
        ['Pada malam hari ia bersinar tinggi di langit.','🌙','☀️','☁️'],
        ['Hewan ini punya belalai yang panjang.','🐘','🦁','🐒'],
        ['Ia merayap pelan dan membawa rumahnya di punggung.','🐌','🐝','🐸'],
        ['Saat musim dingin, ia turun dari langit, putih dan dingin.','❄️','🌧️','🌸'],
        ['Dengan benda ini kita membuka pintu.','🔑','📖','💡'],
        ['Ia terbang di antara bunga-bunga dan membuat madu.','🐝','🦋','🦉'],
        ['Bulunya jingga, ia cerdik, dan ekornya lebat.','🦊','🐺','🐻'],
        ['Dengan benda ini kita menulis dan menggambar di buku tulis.','✏️','🔑','☂️'],
        ['Ia terbang ke bintang-bintang di luar angkasa.','🚀','🚗','⛵'],
        ['Burung ini tidak tidur pada malam hari dan matanya besar.','🦉','🦆','🐔'],
        ['Tubuhnya berduri dan ia bersembunyi di bawah daun di hutan.','🦔','🐰','🐢'],
        ['Kita membukanya saat hujan turun.','☂️','📖','⏰'],
      ],
      // справжні слова, які генератор помилок не має показувати як «помилку» (див. шапку);
      // наприкінці — грубі/страшні слова, які могли б утворитися в «Якої літери не вистачає?»
      avoid: [
        'anggar','anjang','anjung','awin','ayem','ayom','ayum','baku','bala','balan','balen','balun',
        'beku','bela','belan','belon','bentang','berang','beriang','biku','bila','boku','buna','buntang',
        'bureng','gajih','gejah','getar','hidang','ikon','jagang','jegung','jemur','kada','kambang','kapel',
        'katek','katik','katok','katuk','kelici','kepal','ketak','koda','kopal','kotak','kuing','kutak',
        'landuk','lebih','lebuh','lindak','mau','medu','mengga','meta','mota','paes','pais','pas',
        'pasang','pasu','paung','payang','pelanggi','piang','puas','pus','pusang','raket','ramah','rasa',
        'rebah','remah','resa','risa','roi','rua','ruah','ruas','sai','sanga','saput','semat',
        'sepada','sepi','seput','singga','sipat','sipi','sipit','siut','sopi','tamat','tapi','teler',
        'telor','tepi','tikas','tipi','mati','nanah','kahak','teluh','beruk','toket','pentil','demon',
        'serapah','nahas','tifus','kecu','babon',
      ],
    },
    ja: {   // 日本語 — хіраґана: 46 основних знаків + 25 з дакутен/хандакутен (порядок 五十音). Слова без маленьких ゃゅょっ і без ー
      speech: 'ja-JP',
      alphabet: ['あ','い','う','え','お','か','き','く','け','こ','さ','し','す','せ','そ','た','ち','つ','て','と','な','に','ぬ','ね','の','は','ひ','ふ','へ','ほ','ま','み','む','め','も','や','ゆ','よ','ら','り','る','れ','ろ','わ','を','ん',
                 'が','ぎ','ぐ','げ','ご','ざ','じ','ず','ぜ','ぞ','だ','ぢ','づ','で','ど','ば','び','ぶ','べ','ぼ','ぱ','ぴ','ぷ','ぺ','ぽ'],
      vowels: 'あいうえお',
      words: [
        ['ねこ','🐱'],['いぬ','🐶'],['うし','🐄'],['うま','🐴'],['さる','🐒'],['くま','🐻'],['かに','🦀'],['たこ','🐙'],
        ['いか','🦑'],['かめ','🐢'],['はち','🐝'],['あり','🐜'],['かさ','☂️'],['ほし','⭐'],['つき','🌙'],['くも','☁️'],
        ['みみ','👂'],['はな','👃'],['くち','👄'],['ゆき','❄️'],['あめ','🌧️'],['もも','🍑'],['なし','🍐'],['くり','🌰'],
        ['いす','🪑'],['かぎ','🔑'],['ふね','🚢'],['くつ','👟'],['ほん','📖'],['いえ','🏠'],['やま','⛰️'],['うみ','🌊'],
        ['にじ','🌈'],['すし','🍣'],['はし','🥢'],['ぞう','🐘'],['やぎ','🐐'],['ぶた','🐷'],['りす','🐿️'],['わし','🦅'],
        ['さめ','🦈'],['えび','🦐'],['かい','🐚'],['うさぎ','🐰'],['きつね','🦊'],['ぶどう','🍇'],['みかん','🍊'],['りんご','🍎'],
        ['いちご','🍓'],['すいか','🍉'],['たまご','🥚'],['さかな','🐟'],['くじら','🐳'],['いるか','🐬'],['あひる','🦆'],['ひよこ','🐤'],
        ['かえる','🐸'],['ぼうし','🧢'],['めがね','👓'],['たいこ','🥁'],['とけい','⏰'],['でんわ','☎️'],['てがみ','✉️'],['はさみ','✂️'],
        ['まど','🪟'],['きりん','🦒'],['ひつじ','🐑'],['ねずみ','🐭'],['きのこ','🍄'],['さくら','🌸'],['もみじ','🍁'],['ゆびわ','💍'],
        ['かがみ','🪞'],['くるま','🚗'],['だんご','🍡'],['にわとり','🐔'],['ふくろう','🦉'],['しまうま','🦓'],['ひまわり','🌻'],['おにぎり','🍙'],
        ['せんべい','🍘'],['くつした','🧦'],['てぶくろ','🧤'],['ふうせん','🎈'],['えんぴつ','✏️'],['ひこうき','✈️'],['かみなり','⚡'],['たまねぎ','🧅'],
        ['にんじん','🥕'],['にんにく','🧄'],['はぶらし','🪥'],['たいよう','☀️'],['ながぐつ','👢'],['かんむり','👑'],['ろうそく','🕯️'],['かたつむり','🐌'],
        ['かぶとむし','🪲'],['ゆきだるま','⛄'],['さくらんぼ','🍒'],['てんとうむし','🐞'],['とうもろこし','🌽'],
      ],
      sentences: [
        ['きいろくて すっぱくて、木に なるよ。','🍋','🍌','🍎'],
        ['うみに すんでいて、ひれで およぐよ。','🐟','🐦','🐸'],
        ['よるに 空の たかい ところで ひかるよ。','🌙','☀️','☁️'],
        ['この どうぶつは とても ながい はなを もっているよ。','🐘','🦁','🐒'],
        ['ゆっくり すすんで、せなかに おうちを のせているよ。','🐌','🐝','🐸'],
        ['ふゆに 空から ふってくる、しろくて つめたい もの。','❄️','🌧️','🌸'],
        ['これで ドアを あけるよ。','🔑','📖','💡'],
        ['花の うえを とんで、はちみつを つくるよ。','🐝','🦋','🦉'],
        ['オレンジいろで かしこくて、ふさふさの しっぽが あるよ。','🦊','🐺','🐻'],
        ['これで じを かいたり、えを かいたり するよ。','✏️','🔑','☂️'],
        ['うちゅうの ほしまで とんでいくよ。','🚀','🚗','⛵'],
        ['この とりは よるに おきていて、おおきな 目を しているよ。','🦉','🦆','🐔'],
        ['とげとげで、森の はっぱの したに かくれているよ。','🦔','🐰','🐢'],
        ['あめが ふったら ひらくよ。','☂️','📖','⏰'],
      ],
      // справжні слова, які генератор помилок не має показувати як «помилку» (див. шапку);
      // далі — грубі/образливі/страшні слова, які могли б утворитися в «Якої літери не вистачає?» (перевірено словником IPAdic)
      avoid: [
        'かなり','かんり','せんい','たよう','ふうん','ふせん','ふろう','ひわり','ろうく','めくら','めくらんぼ','さくつんぼ',
        'しねうま','くつしね','めしね','たしねぎ','しぬうま','くつしぬ','とうもころし','くそした','くそま','くそら','さくそ','さくそんぼ',
        'てぶくそ','ろうくそ','かたつげり','にわげり','ひまげり','かみげり','かんげり','げりん','とうげろこし','てぶげろ','ふげろう','いばか',
        'ばかな','ばかん','あほる','でぶくろ','でぶとむし','でぶらし','でぶわ','かぶすむし','ぶすう','はぶすし','てぶすろ','はげらし',
        'くずした','くずま','くずみ','くずら','さくず','さくずんぼ','てぶくず','ふくずう','かすつむり','かすとむし','みかす','ちびわ',
        'てどくろ','どくろう','しけい','けつした','けつじ','けつね','えんけつ','ながけつ','えろぴつ','さまら','さまらんぼ','はまらし',
        'くまら','れずみ','こかん','ちかん','たいま','たいほ','たいん','げかん','げどう','さりん','ふりん','ねかん',
        'ひつぎ','のうし','ぼうと','りんち','りんし','ろうごく','よみじ','るけい',
      ],
    },
    // ---- ko: 한글. Плитки = СКЛАДОВІ БЛОКИ (글자), а не окремі jamo: див. NOTES/шапку ----
    ko: {
      speech: 'ko-KR',
      // «абетка» гри = усі склади зі слів + склади таблиці 가나다 (반절표), у порядку 가나다 (= порядок Unicode)
      alphabet: [
        '가','감','개','거','게','경','계','고','곰','공','과','구','귄','근','급','기','꽃','끼','나','넛',
        '노','눈','다','달','닭','당','대','도','돌','동','드','딸','라','람','랑','래','레','로','룡','루',
        '룩','름','리','린','림','릿','마','말','망','메','몬','무','문','물','미','바','박','방','버','벌',
        '별','병','보','복','부','북','브','비','빵','사','산','상','샌','선','섯','소','손','쇠','수','숭',
        '스','슴','시','아','안','애','야','양','어','얼','엉','여','연','열','오','옥','올','요','우','원',
        '위','유','으','의','이','인','자','전','쥐','즈','지','집','차','책','초','치','침','카','캥','케',
        '켓','코','콜','콥','쿠','크','키','타','탕','터','텔','토','티','파','팬','팽','펭','포','풍','플',
        '피','필','하','해','햄','행','헬','호',
      ],
      vowels: '',   // склади не діляться на голосні/приголосні: «Якої літери бракує?» бере будь-який інший склад
      // «Знайди літеру» (3–5 р.): перший стовпчик і перший рядок таблиці 가나다 — 14 приголосних + 10 голосних у складі
      findPool: ['가','나','다','라','마','바','사','아','자','차','카','타','파','하','야','어','여','오','요','우','유','으','이'],
      words: [
        ['개','🐶'],['곰','🐻'],['닭','🐔'],['게','🦀'],['해','☀️'],['달','🌙'],['별','⭐'],['꽃','🌸'],
        ['코','👃'],['손','✋'],['빵','🍞'],['집','🏠'],['책','📖'],['공','⚽'],['사과','🍎'],['포도','🍇'],
        ['딸기','🍓'],['수박','🍉'],['버섯','🍄'],['우유','🥛'],['치즈','🧀'],['사자','🦁'],['여우','🦊'],['토끼','🐰'],
        ['오리','🦆'],['펭귄','🐧'],['기린','🦒'],['하마','🦛'],['문어','🐙'],['고래','🐳'],['상어','🦈'],['나비','🦋'],
        ['개미','🐜'],['우산','☂️'],['연필','✏️'],['시계','⏰'],['열쇠','🔑'],['안경','👓'],['양말','🧦'],['구름','☁️'],
        ['나무','🌳'],['의자','🪑'],['침대','🛏️'],['버스','🚌'],['기차','🚂'],['로켓','🚀'],['풍선','🎈'],['선물','🎁'],
        ['당근','🥕'],['오이','🥒'],['양파','🧅'],['감자','🥔'],['레몬','🍋'],['쿠키','🍪'],['사탕','🍬'],['피자','🍕'],
        ['공룡','🦕'],['달팽이','🐌'],['부엉이','🦉'],['호랑이','🐯'],['원숭이','🐒'],['거북이','🐢'],['고양이','🐱'],['다람쥐','🐿️'],
        ['돌고래','🐬'],['코끼리','🐘'],['개구리','🐸'],['병아리','🐤'],['무지개','🌈'],['눈사람','⛄'],['바나나','🍌'],['토마토','🍅'],
        ['옥수수','🌽'],['자동차','🚗'],['비행기','✈️'],['자전거','🚲'],['소방차','🚒'],['복숭아','🍑'],['카메라','📷'],['망원경','🔭'],
        ['구급차','🚑'],['고구마','🍠'],['코코넛','🥥'],['피아노','🎹'],['햄버거','🍔'],['초콜릿','🍫'],['캥거루','🦘'],['얼룩말','🦓'],
        ['케이크','🎂'],['고슴도치','🦔'],['해바라기','🌻'],['무당벌레','🐞'],['파인애플','🍍'],['브로콜리','🥦'],['헬리콥터','🚁'],['텔레비전','📺'],
        ['스파게티','🍝'],['샌드위치','🥪'],['팬케이크','🥞'],['바이올린','🎻'],['오토바이','🏍️'],['크레파스','🖍️'],['아보카도','🥑'],['아이스크림','🍦'],
      ],
      sentences: [
        ['노랗고 시고, 나무에서 자라요.','🍋','🍌','🍎'],
        ['바다에 살고, 지느러미로 헤엄쳐요.','🐟','🐦','🐸'],
        ['밤이 되면 하늘 높이 빛나요.','🌙','☀️','☁️'],
        ['이 동물은 코가 아주 길어요.','🐘','🦁','🐒'],
        ['천천히 기어가고, 등에 집을 지고 다녀요.','🐌','🐝','🐸'],
        ['겨울에 하늘에서 하얗고 차가운 것이 내려요.','❄️','🌧️','🌸'],
        ['이것으로 문을 열어요.','🔑','📖','💡'],
        ['꽃 위를 날아다니며 꿀을 만들어요.','🐝','🦋','🦉'],
        ['털이 붉은 갈색이고 꾀가 많으며, 꼬리가 복슬복슬해요.','🦊','🐺','🐻'],
        ['이것으로 공책에 글씨를 쓰고 그림을 그려요.','✏️','🔑','☂️'],
        ['별을 향해 우주로 날아가요.','🚀','🚗','⛵'],
        ['이 새는 밤에 잠을 자지 않고 눈이 커요.','🦉','🦆','🐔'],
        ['가시가 많고, 숲속 나뭇잎 밑에 살아요.','🦔','🐰','🐢'],
        ['비가 올 때 이것을 펴요.','☂️','📖','⏰'],
      ],
      // «Яке слово написано правильно?»: готові помилки, які справді роблять діти (звукове письмо:
      // 시게, 열쇄, 무지게, 거부기, 옥쑤수, 케익, 초콜렛, 텔레비젼…); жодна не є справжнім словом (перевірено словником)
      spellWrong: {
        '꽃':['꼳','꼿'], '닭':['닥','닯'], '사과':['싸과','사꽈'], '포도':['포또','포더'], '딸기':['딸끼','달기'],
        '수박':['수빡','쑤박'], '버섯':['버섣','버썻'], '우유':['으유','우요'], '치즈':['치쯔','치주'], '사자':['사짜','싸자'],
        '여우':['여으','요우'], '토끼':['터끼','톡기'], '오리':['어리','올이'], '펭귄':['팽귄','펭긴'], '기린':['기링','끼린'],
        '문어':['무너','문오'], '고래':['고레','꼬래'], '상어':['상오','쌍어'], '나비':['나삐','나피'], '개미':['게미','깨미'],
        '우산':['우싼','으산'], '연필':['연삘','연빌'], '시계':['시게','시개'], '열쇠':['열쇄','열쐬'], '안경':['앙경','안꼉'],
        '양말':['앙말','얌말'], '구름':['구룸','그름'], '나무':['나므','나모'], '의자':['으자','의짜'], '침대':['침데','침때'],
        '버스':['뻐스','버쓰'], '기차':['끼차','기챠'], '로켓':['로캣','로켇'], '풍선':['풍썬','퐁선'], '선물':['썬물','선믈'],
        '당근':['당끈','단근'], '양파':['양바','앙파'], '감자':['감짜','깜자'], '레몬':['래몬','레먼'], '쿠키':['쿠끼','쿠기'],
        '사탕':['사땅','싸탕'], '피자':['피짜','삐자'], '공룡':['공뇽','꽁룡'], '달팽이':['달펭이','달팽니'], '부엉이':['부헝이','부옹이'],
        '호랑이':['호랭이','호랑니'], '원숭이':['원승이','원숭니'], '거북이':['거부기','거북기'], '고양이':['고얭이','고앙이'], '다람쥐':['다람지','따람쥐'],
        '돌고래':['돌꼬래','돌고레'], '코끼리':['코기리','코끼래'], '개구리':['게구리','개꾸리'], '병아리':['병알이','뼝아리'], '무지개':['무지게','무찌개'],
        '눈사람':['눈싸람','눈사란'], '바나나':['빠나나','바난아'], '토마토':['토마도','도마도'], '옥수수':['옥쑤수','옥수스'], '자동차':['자동짜','자동자'],
        '비행기':['비행끼','비헹기'], '자전거':['자정거','자전꺼'], '소방차':['소빵차','소방자'], '피아노':['삐아노','피아너'], '햄버거':['헴버거','햄뻐거'],
        '초콜릿':['초콜렛','쪼콜릿'], '캥거루':['캉가루','캥거르'], '얼룩말':['얼룽말','얼록말'], '케이크':['케익','캐이크'], '고슴도치':['고슴도찌','고씀도치'],
        '해바라기':['헤바라기','해바라끼'], '무당벌레':['무당뻘레','무당벌래'], '파인애플':['파인에플','파이내플'], '브로콜리':['브로컬리','부로콜리'], '헬리콥터':['헬리곱터','핼리콥터'],
        '스파게티':['스빠게티','스파개티'], '샌드위치':['센드위치','샌드위찌'], '팬케이크':['펜케이크','팬케익'], '바이올린':['바이얼린','빠이올린'], '오토바이':['오도바이','오토빠이'],
        '크레파스':['크래파스','크레빠스'], '아보카도':['아보까도','아보카토'], '복숭아':['복슝아','복쑹아'], '카메라':['카매라','까메라'], '망원경':['망원겅','만원경'],
        '구급차':['구굽차','구급짜'], '고구마':['고구머','꼬구마'], '코코넛':['코코낫','꼬꼬넛'], '텔레비전':['텔레비젼','텔래비전'], '아이스크림':['아이스끄림','아이스크린'],
      },
      // справжні слова, які утворює «Якої літери бракує?» (개구리 + 소 → 개소리…), і склади-пастки,
      // у яких з'являється грубе слово (바보, 고자, 애비, 호구): такий варіант не показуємо
      avoid: [
        '가랑이','개나리','개소리','거북선','거북해','고구해','고나마','고사이','고양해','기지개','노랑이','눈바람','동아리','딸랑이',
        '마이크','메아리','무지해','바람나','보행기','비동기','비수기','비행사','비행선','비행해','소방수','수북이','안사람','여행기',
        '우수수','자동문','자동사','자전해','전동차','집사람','케이스','코코아','크레바스','키메라','고자도치','고자마','고자이','돌고자',
        '바보나','바보올린','바보카도','오토바보','텔애비전','파인애미','파인애비','해바보기','호구리','호구마','호구이',
      ],
    },
    fi: {
      speech: 'fi-FI',
      // фінська абетка: 29 літер (B C D F G Q W X Z Å — запозичені, але входять до абетки, їх учать у школі)
      alphabet: ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','Å','Ä','Ö'],
      // Å — шведська голосна: серед голосних, щоб ніколи не потрапляла в пастки замість приголосної
      vowels: 'AEIOUYÄÖÅ',
      words: [
        ['kuu','🌙'],['puu','🌳'],['hai','🦈'],['tee','🍵'],['suu','👄'],['jää','🧊'],['luu','🦴'],['ovi','🚪'],
        ['kala','🐟'],['kana','🐔'],['talo','🏠'],['auto','🚗'],['juna','🚂'],['vene','⛵'],['nenä','👃'],['käsi','✋'],
        ['muna','🥚'],['lumi','❄️'],['sade','🌧️'],['susi','🐺'],['kynä','✏️'],['mehu','🧃'],['kissa','🐱'],['koira','🐶'],
        ['hiiri','🐭'],['lehmä','🐄'],['possu','🐷'],['ankka','🦆'],['pöllö','🦉'],['karhu','🐻'],['kettu','🦊'],['siili','🦔'],
        ['orava','🐿️'],['jänis','🐰'],['apina','🐒'],['etana','🐌'],['norsu','🐘'],['valas','🐳'],['omena','🍎'],['leipä','🍞'],
        ['maito','🥛'],['kakku','🎂'],['kukka','🌸'],['sieni','🍄'],['pilvi','☁️'],['tähti','⭐'],['kuusi','🎄'],['bussi','🚌'],
        ['laiva','🚢'],['pyörä','🚲'],['avain','🔑'],['kirja','📖'],['kello','⏰'],['pallo','⚽'],['silmä','👁️'],['korva','👂'],
        ['jalka','🦵'],['sydän','❤️'],['hattu','🎩'],['rumpu','🥁'],['leija','🪁'],['nalle','🧸'],['sukka','🧦'],['paita','👕'],
        ['kenkä','👟'],['tuoli','🪑'],['sänky','🛏️'],['lammas','🐑'],['kameli','🐫'],['seepra','🦓'],['juusto','🧀'],['kurkku','🥒'],
        ['sipuli','🧅'],['suklaa','🍫'],['kruunu','👑'],['kitara','🎸'],['lamppu','💡'],['aurinko','☀️'],['kirahvi','🦒'],['banaani','🍌'],
        ['jäätelö','🍦'],['hevonen','🐴'],['leijona','🦁'],['tiikeri','🐯'],['raketti','🚀'],['lusikka','🥄'],['päärynä','🍐'],['sitruuna','🍋'],
        ['kirsikka','🍒'],['mansikka','🍓'],['porkkana','🥕'],['tomaatti','🍅'],['sammakko','🐸'],['perhonen','🦋'],['mustekala','🐙'],['pingviini','🐧'],
        ['lentokone','✈️'],['kilpikonna','🐢'],['mehiläinen','🐝'],['sateenvarjo','☂️'],['sateenkaari','🌈'],
      ],
      sentences: [
        ['Se on keltainen ja hapan ja kasvaa puussa.','🍋','🍌','🍎'],
        ['Se asuu meressä ja ui evillään.','🐟','🐦','🐸'],
        ['Yöllä se loistaa korkealla taivaalla.','🌙','☀️','☁️'],
        ['Tällä eläimellä on pitkä kärsä.','🐘','🦁','🐒'],
        ['Se liikkuu hitaasti ja kantaa taloaan selässään.','🐌','🐝','🐸'],
        ['Talvella sitä sataa taivaalta, valkoista ja kylmää.','❄️','🌧️','🌸'],
        ['Sillä avataan ovi.','🔑','📖','💡'],
        ['Se lentää kukasta kukkaan ja tekee hunajaa.','🐝','🦋','🦉'],
        ['Se on punaruskea, ovela ja sillä on tuuhea häntä.','🦊','🐺','🐻'],
        ['Sillä kirjoitetaan ja piirretään vihkoon.','✏️','🔑','☂️'],
        ['Se lentää tähtiin asti, avaruuteen.','🚀','🚗','⛵'],
        ['Tämä lintu valvoo öisin, ja sillä on isot silmät.','🦉','🦆','🐔'],
        ['Se on piikikäs ja piiloutuu metsässä lehtien alle.','🦔','🐰','🐢'],
        ['Se avataan, kun sataa.','☂️','📖','⏰'],
      ],
      // справжні слова, які генератор помилок не має показувати як «помилку» (див. шапку);
      // наприкінці — грубі/страшні слова, які могли б утворитися в «Якої літери не вистачає?»
      avoid: [
        'aina','tuli','kuka','kova','kausi','mua','avoin','aito','tuuli','kela','kisa','palo',
        'täti','omana','tulo','puita','apuna','pullo','sulaa','paeta','kaa','sini','side','karu',
        'jona','tahti','polvi','lappu','kassa','kanna','lava','avaan','kikka','etuna','tomaatit','sedän',
        'kurja','mato','säde','karja','pata','koria','tuhti','sokka','omina','muuna','karva','tao',
        'kalla','raketit','kosi','kuosi','jana','kasi','hatut','kola','jäis','koura','kaan','ketut',
        'loiva','laava','suusi','jousto','kaira','kelo','huttu','sakka','pita','kina','limppu','pälvi',
        'sopuli','bassi','karahvi','kussa','telo','kokka','seni','sysi','suka','kitaa','tohti','kirva',
        'kuttu','jänes','lieja',
        // грубі/страшні слова (kakka, kusi, nussi, kuoli, kallo …)
        'akka','kakka','kaka','kakki','kakko','kusi','kurva','kallo','pissa','pissu','nussi','tussi',
        'palli','kalu','kossu','hamppu','ripuli','kuoli','tuoni','hiisi','kaheli','pölhö',
      ],
    },
    da: {   // dansk (CoLaba Production): Æ Ø Å — egne bogstaver efter Z
      speech: 'da-DK',
      alphabet: ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','Æ','Ø','Å'],
      vowels: 'AEIOUYÆØÅ',
      words: [
        ['kat','🐱'],['hund','🐶'],['sol','☀️'],['mus','🐭'],['bil','🚗'],['hus','🏠'],['æg','🥚'],['ost','🧀'],
        ['ged','🐐'],['abe','🐒'],['bog','📖'],['ræv','🦊'],['ørn','🦅'],['øje','👁️'],['sne','❄️'],['tog','🚂'],
        ['bus','🚌'],['båd','⛵'],['sko','👟'],['kop','☕'],['gris','🐷'],['fisk','🐟'],['and','🦆'],['hest','🐴'],
        ['træ','🌳'],['måne','🌙'],['regn','🌧️'],['ugle','🦉'],['frø','🐸'],['løve','🦁'],['bjørn','🐻'],['mælk','🥛'],
        ['kage','🎂'],['æble','🍎'],['banan','🍌'],['pære','🍐'],['drue','🍇'],['tomat','🍅'],['agurk','🥒'],['løg','🧅'],
        ['brød','🍞'],['raket','🚀'],['kanin','🐰'],['tiger','🐯'],['zebra','🦓'],['citron','🍋'],['nøgle','🔑'],['lampe','💡'],
        ['blomst','🌸'],['stjerne','⭐'],['elefant','🐘'],['paraply','☂️'],['pindsvin','🦔'],['snegl','🐌'],['hval','🐳'],['delfin','🐬'],
        ['pingvin','🐧'],['giraf','🦒'],['høne','🐔'],['gulerod','🥕'],['svamp','🍄'],['kaktus','🌵'],['hjerte','❤️'],['sky','☁️'],
        ['tromme','🥁'],['krone','👑'],['næse','👃'],['hånd','✋'],['bold','⚽'],['cykel','🚲'],['ananas','🍍'],['jordbær','🍓'],
        ['traktor','🚜'],['vækkeur','⏰'],['sommerfugl','🦋'],['skildpadde','🐢'],['blæksprutte','🐙'],
      ],
      sentences: [
        ['Den er gul, sur og vokser på et træ.','🍋','🍌','🍎'],
        ['Den bor i havet og svømmer med finner.','🐟','🐦','🐸'],
        ['Om natten lyser den højt oppe på himlen.','🌙','☀️','☁️'],
        ['Dette dyr har en lang snabel.','🐘','🦁','🐒'],
        ['Den kravler langsomt og bærer sit hus på ryggen.','🐌','🐝','🐸'],
        ['Om vinteren falder den fra himlen, hvid og kold.','❄️','🌧️','🌸'],
        ['Med den låser man døren op.','🔑','📖','💡'],
        ['Den flyver mellem blomsterne og laver honning.','🐝','🦋','🦉'],
        ['Den er rød, snu og har en busket hale.','🦊','🐺','🐻'],
        ['Med den skriver og tegner man.','✏️','🔑','☂️'],
        ['Den flyver helt op til stjernerne.','🚀','🚗','⛵'],
        ['Denne fugl er vågen om natten og har store øjne.','🦉','🦆','🐔'],
        ['Den er stikkende og gemmer sig under bladene i skoven.','🦔','🐰','🐢'],
        ['Man slår den op, når det regner.','☂️','📖','⏰'],
      ],
      // справжні слова, які генератор помилок не має показувати як «помилку» (див. шапку);
      // наприкінці — грубі/страшні слова, які могли б утворитися в «Якої літери не вистачає?»
      avoid: [
        'ananis','anans','aninas','annas','banen','banin','bild','bjorn','bliksprutte','blod','bloksprutte','blækprutte',
        'blækspritte','blæksprætte','bod','brad','bred','brod','brud','bryd','byld','bæksprutte','bød','børn',
        'citrin','cykl','cykle','defin','delfan','delfon','delføn','due','dure','fik','fiks','fusk',
        'galerod','gelerod','gis','graf','gros','grus','grys','grås','græs','gælerod','hal','hane',
        'hast','herte','het','hets','hind','hine','hist','hjorte','host','hud','hune','hvil',
        'håne','hænd','hæst','høst','jodbær','jordbar','jordbor','jordbræ','jordbur','jordbør','kain','kanen',
        'kanni','kanon','kige','kinin','koge','kone','korne','krane','kroen','kåge','køge','lame',
        'lave','lempe','leve','live','love','luve','lyve','løvve','malk','mane','mene','mine',
        'mone','nagle','negle','nese','nogle','nyse','nøle','paraly','parapply','parapy','pare','pingvan',
        'pingvæn','pore','pungvin','pure','ragn','rakket','rakt','rakte','reegn','ren','rogn','segl',
        'skiildpadde','skyldpadde','sommerful','soommerfugl','tager','temat','tier','tigger','tigre','toamt','toger','tomme',
        'tomt','tomut','tomæt','trakter','traktro','traktør','tremme','trimme','tryktor','træktor','tåger','tæger',
        'tøger','uge','vikkeur','vækker','zeba','zera','røv','røve','pisk','niger','møg','ræb',
        'pus','grim','fjerte','lig','gud','spy','ond','kræ','bæs','pest','nøgne','fed',
        'ækle','usle',
      ],
    },
    nb: {
      speech: 'nb-NO',   // норвезька (букмол); деякі пристрої позначають голос як 'no-NO' — Speech.voice() приймає обидва
      alphabet: ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','Æ','Ø','Å'],
      vowels: 'AEIOUYÆØÅ',
      words: [
        ['katt','🐱'],['hund','🐶'],['sol','☀️'],['mus','🐭'],['bil','🚗'],['hus','🏠'],['egg','🥚'],['ost','🧀'],
        ['orm','🐍'],['ape','🐒'],['bok','📖'],['rev','🦊'],['ørn','🦅'],['øye','👁️'],['snø','❄️'],['sau','🐑'],
        ['bie','🐝'],['tog','🚂'],['fly','✈️'],['båt','⛵'],['fot','🦶'],['øre','👂'],['sky','☁️'],['tre','🌳'],
        ['geit','🐐'],['gris','🐷'],['fisk','🐟'],['hest','🐴'],['måne','🌙'],['regn','🌧️'],['ugle','🦉'],['løve','🦁'],
        ['melk','🥛'],['kake','🎂'],['eple','🍎'],['pære','🍐'],['hane','🐓'],['høne','🐔'],['sopp','🍄'],['brød','🍞'],
        ['nese','👃'],['hånd','✋'],['buss','🚌'],['ball','⚽'],['hval','🐳'],['drue','🍇'],['løk','🧅'],['gave','🎁'],
        ['frosk','🐸'],['bjørn','🐻'],['banan','🍌'],['kanin','🐰'],['tiger','🐯'],['sebra','🦓'],['lampe','💡'],['tomat','🍅'],
        ['agurk','🥒'],['ekorn','🐿️'],['krone','👑'],['blomst','🌸'],['gulrot','🥕'],['rakett','🚀'],['blyant','✏️'],['sitron','🍋'],
        ['nøkkel','🔑'],['klokke','⏰'],['sykkel','🚲'],['krabbe','🦀'],['hjerte','❤️'],['snegle','🐌'],['ananas','🍍'],['pingvin','🐧'],
        ['sjiraff','🦒'],['stjerne','⭐'],['elefant','🐘'],['paraply','☂️'],['jordbær','🍓'],['pinnsvin','🦔'],['kirsebær','🍒'],['skilpadde','🐢'],
        ['vannmelon','🍉'],['blekksprut','🐙'],['sommerfugl','🦋'],
      ],
      sentences: [
        ['Den er gul og sur og vokser på et tre.','🍋','🍌','🍎'],
        ['Den bor i havet og svømmer med finner.','🐟','🐦','🐸'],
        ['Om natten lyser den høyt oppe på himmelen.','🌙','☀️','☁️'],
        ['Dette dyret har en lang snabel.','🐘','🦁','🐒'],
        ['Den kryper sakte og bærer huset sitt på ryggen.','🐌','🐝','🐸'],
        ['Om vinteren faller det fra himmelen, hvitt og kaldt.','❄️','🌧️','🌸'],
        ['Med den låser man opp døren.','🔑','📖','💡'],
        ['Den flyr fra blomst til blomst og lager honning.','🐝','🦋','🦉'],
        ['Den er rød, lur og har en lodden hale.','🦊','🐺','🐻'],
        ['Med den skriver og tegner man.','✏️','🔑','☂️'],
        ['Den flyr helt opp til stjernene.','🚀','🚗','⛵'],
        ['Denne fuglen er våken om natten og har store øyne.','🦉','🦆','🐔'],
        ['Den er piggete og gjemmer seg under bladene i skogen.','🦔','🐰','🐢'],
        ['Man slår den opp når det regner.','☂️','📖','⏰'],
      ],
      // справжні слова, які генератор помилок не має показувати як «помилку» (див. шапку);
      // наприкінці — грубі/страшні слова, які могли б утворитися в «Якої літери не вистачає?»
      avoid: [
        'kitt','kott','kutt','kytt','kat','hand','hend','hind','hud','girs','gras','gres',
        'gros','grus','grys','grøs','gis','fiks','fusk','fik','hets','hast','hist','host',
        'hust','høst','håst','het','mane','mene','mine','møne','rogn','ren','ule','lave',
        'leve','live','love','luve','lyve','låve','løe','mekl','mek','kike','koke','kakke',
        'ele','pare','pore','pure','pre','hine','håne','hanne','høen','sipp','sop','bred',
        'brud','bød','nase','nise','nyse','nøse','nesse','bass','boss','byss','bøss','bus',
        'bill','bull','byll','bal','hvil','hal','dure','due','gove','gyve','forsk','fresk',
        'frisk','banna','banen','bann','kinin','kanen','kanon','kain','tigre','teger','toger','tæger',
        'tåger','tigger','tier','sabra','sera','lempe','lompe','lumpe','tomta','tomt','ekern','korne',
        'krane','kryne','kone','rakitt','raket','blant','nikkel','klakke','klekke','klikke','klukke','kløkke',
        'kokke','kloke','sikkel','sokkel','sukkel','sykel','krybbe','kabbe','segle','annas','kåt','røv',
        'ræv','fiss','pisk','tuss','niger','grim','teit','keit','geil','pest','lik','rus',
        'spy','bums','dau','gale','feit','fjerte','nøkken',
      ],
    },
    sk: {
      speech: 'sk-SK',
      // CH, DZ, DŽ — samostatné písmená slovenskej abecedy (46 písmen); slová sa delia najdlhšou zhodou: džús = DŽ+Ú+S
      alphabet: ['A','Á','Ä','B','C','Č','D','Ď','DZ','DŽ','E','É','F','G','H','CH','I','Í','J','K','L','Ĺ','Ľ','M','N','Ň','O','Ó','Ô','P','Q','R','Ŕ','S','Š','T','Ť','U','Ú','V','W','X','Y','Ý','Z','Ž'],
      vowels: 'AÁÄEÉIÍOÓÔUÚYÝ',
      words: [
        ['pes','🐶'],['dom','🏠'],['syr','🧀'],['lev','🦁'],['kôň','🐴'],['nos','👃'],['oko','👁️'],['myš','🐭'],
        ['čaj','🍵'],['vlk','🐺'],['loď','⛵'],['ľad','🧊'],['kľúč','🔑'],['sneh','❄️'],['dážď','🌧️'],['džús','🧃'],
        ['ťava','🐫'],['torta','🎂'],['slon','🐘'],['tiger','🐯'],['ryba','🐟'],['sova','🦉'],['žaba','🐸'],['auto','🚗'],
        ['ruka','✋'],['noha','🦵'],['mrak','☁️'],['vlak','🚂'],['ovca','🐑'],['koza','🐐'],['jež','🦔'],['hríb','🍄'],
        ['strom','🌳'],['mačka','🐱'],['líška','🦊'],['krava','🐄'],['banán','🍌'],['jablko','🍎'],['slnko','☀️'],['hviezda','⭐'],
        ['mesiac','🌙'],['medveď','🐻'],['kačica','🦆'],['prasa','🐷'],['opica','🐒'],['hruška','🍐'],['citrón','🍋'],['mrkva','🥕'],
        ['uhorka','🥒'],['cibuľa','🧅'],['kniha','📖'],['lampa','💡'],['kvet','🌸'],['raketa','🚀'],['slimák','🐌'],['motýľ','🦋'],
        ['dáždnik','☂️'],['ceruzka','✏️'],['hodiny','⏰'],['včela','🐝'],['vajce','🥚'],['mlieko','🥛'],['chlieb','🍞'],['ucho','👂'],
        ['ananás','🍍'],['melón','🍉'],['žirafa','🦒'],['zebra','🦓'],['dvere','🚪'],['čerešne','🍒'],['sliepka','🐔'],['chrobák','🪲'],
        ['jahoda','🍓'],['gitara','🎸'],['zemiak','🥔'],['kuriatko','🐥'],['korytnačka','🐢'],['dinosaurus','🦕'],['ďatelina','☘️'],['mäso','🥩'],
      ],
      sentences: [
        ['Je žltý, kyslý a rastie na strome.','🍋','🍌','🍎'],
        ['Žije v mori, pláva a má plutvy.','🐟','🐦','🐸'],
        ['V noci svieti vysoko na oblohe.','🌙','☀️','☁️'],
        ['Toto zviera má dlhý chobot.','🐘','🦁','🐒'],
        ['Lezie pomaly a na chrbte nosí domček.','🐌','🐝','🐸'],
        ['V zime padá z neba, je biely a studený.','❄️','🌧️','🌸'],
        ['Odomykáme ním dvere.','🔑','📖','💡'],
        ['Lieta nad kvetmi a robí med.','🐝','🦋','🦉'],
        ['Je ryšavá, prefíkaná a má huňatý chvost.','🦊','🐺','🐻'],
        ['Píšeme a kreslíme ňou do zošita.','✏️','🔑','☂️'],
        ['Letí ku hviezdam do vesmíru.','🚀','🚗','⛵'],
        ['Tento vták v noci nespí a má veľké oči.','🦉','🦆','🐔'],
        ['Je pichľavý a žije v lese pod lístím.','🦔','🐰','🐢'],
        ['Otvárame ho, keď prší.','☂️','📖','⏰'],
      ],
      // справжні слова, які генератор помилок не має показувати як «помилку» (див. шапку);
      // наприкінці — грубі/страшні слова (і грубі на вигляд), які могли б утворитися в «Якої літери не вистачає?»
      avoid: [
        'banon','ceruza','citrín','dvore','dáždik','džus','hodny','hrab','hrb','hrbí','hreb','hrob',
        'hrub','hráška','hydiny','kava','krova','kríva','kuriatok','kvit','kvót','kľač','kľuč','lama',
        'lumpa','mak','mača','močka','mrk','mrka','mrva','musiac','myčka','máčka','múčka','neha',
        'oca','opcia','presa','prosa','raba','raka','rakyta','roba','roka','ryka','róba','rúba',
        'rúka','siva','slín','snáh','son','stom','strm','strmo','strúm','sáva','tier','tigre',
        'uhora','vajec','vak','vlek','vlka','zubra','čerene','jeb','suka','ruja','baba','kofa',
        'jed','niger','opila','ťapa','bes','boha','jeblko','čurešne','kakica','srak','srava','srasa',
        'zesra','šuka','mrdva','jebra','jedveď','serešne',
      ],
    },
    hr: {
      speech: 'hr-HR',
      // DŽ, LJ, NJ — jedno slovo hrvatske abecede (30 slova): jedna pločica
      alphabet: ['A','B','C','Č','Ć','D','DŽ','Đ','E','F','G','H','I','J','K','L','LJ','M','N','NJ','O','P','R','S','Š','T','U','V','Z','Ž'],
      vowels: 'AEIOU',
      words: [
        ['pas','🐶'],['lav','🦁'],['sir','🧀'],['nos','👃'],['oko','👁️'],['uho','👂'],['miš','🐭'],['čaj','🍵'],
        ['jež','🦔'],['puž','🐌'],['vuk','🐺'],['zec','🐰'],['sat','⏰'],['kit','🐳'],['luk','🧅'],['bor','🎄'],
        ['konj','🐴'],['džip','🚙'],['kuća','🏠'],['sova','🦉'],['riba','🐟'],['žaba','🐸'],['ruka','✋'],['noga','🦵'],
        ['kiša','🌧️'],['slon','🐘'],['kruh','🍞'],['jaje','🥚'],['ovca','🐑'],['koza','🐐'],['brod','🚢'],['vlak','🚂'],
        ['auto','🚗'],['drvo','🌳'],['srce','❤️'],['ključ','🔑'],['mačka','🐱'],['torta','🎂'],['tigar','🐯'],['limun','🍋'],
        ['kruška','🍐'],['patka','🦆'],['svinja','🐷'],['kokoš','🐔'],['sunce','☀️'],['knjiga','📖'],['lampa','💡'],['cvijet','🌸'],
        ['oblak','☁️'],['jabuka','🍎'],['mrkva','🥕'],['krava','🐄'],['pčela','🐝'],['raketa','🚀'],['mjesec','🌙'],['olovka','✏️'],
        ['leptir','🦋'],['medvjed','🐻'],['gljiva','🍄'],['lopta','⚽'],['zebra','🦓'],['žirafa','🦒'],['majmun','🐒'],['banana','🍌'],
        ['ananas','🍍'],['snijeg','❄️'],['lisica','🦊'],['grožđe','🍇'],['svijeća','🕯️'],['ljestve','🪜'],['trešnja','🍒'],['pingvin','🐧'],
        ['tulipan','🌷'],['mlijeko','🥛'],['kornjača','🐢'],['lubenica','🍉'],['čokolada','🍫'],['kišobran','☂️'],['krastavac','🥒'],['hobotnica','🐙'],
      ],
      sentences: [
        ['Žut je, kiseo i raste na drvetu.','🍋','🍌','🍎'],
        ['Živi u moru, pliva i ima peraje.','🐟','🐦','🐸'],
        ['Noću sja visoko na nebu.','🌙','☀️','☁️'],
        ['Ova životinja ima dugu surlu.','🐘','🦁','🐒'],
        ['Polako puže i na leđima nosi kućicu.','🐌','🐝','🐸'],
        ['Zimi pada s neba, bijel je i hladan.','❄️','🌧️','🌸'],
        ['Njime otključavamo vrata.','🔑','📖','💡'],
        ['Leti s cvijeta na cvijet i pravi med.','🐝','🦋','🦉'],
        ['Riđa je, lukava i ima čupav rep.','🦊','🐺','🐻'],
        ['Njome pišemo i crtamo u bilježnicu.','✏️','🔑','☂️'],
        ['Leti prema zvijezdama, u svemir.','🚀','🚗','⛵'],
        ['Ova ptica noću ne spava i ima velike oči.','🦉','🦆','🐔'],
        ['Bodljikav je i živi u šumi pod lišćem.','🦔','🐰','🐢'],
        ['Otvaramo ga kad pada kiša.','☂️','📖','⏰'],
      ],
      // справжні слова, які генератор помилок не має показувати як «помилку» (див. шапку);
      // наприкінці — грубі/страшні слова, які могли б утворитися в «Якої літери не вистачає?»
      avoid: [
        'bod','brdo','brid','džep','grože','jauka','kava','kaza','kaša','keša','koća','koša',
        'krah','krastavca','kraška','kriva','kriška','krova','krška','kuša','lama','lasica','limen','lisaca',
        'lisca','lota','lumpa','maka','mača','mačak','mečka','mrka','mrva','mučka','naga','oblik',
        'oca','olova','ova','paka','pakta','pata','patak','petka','pitka','potka','raba','raka',
        'reketa','rika','roba','roka','ruba','sinja','sinjeg','siva','slan','suce','sune','sva',
        'svija','tigra','tora','trenja','trta','zeba','zera','kita','kura','kuja','piša','piš',
        'rit','rita','sis','sisica','fuk','fuka','jafuka','jeb','jebra','jebuka','cvijeb','medvjeb',
        'mjebec','mlijebo','snijeb','svijeba','ljebtve','pičgvin','pišgvin','kakoš','kaketa','obkak','vkak','kurh',
        'kurška','kurnjača','lisisa','rakita','ćor','ćorta','ćornjača','mrtva','krvo','krva','krvaa','mkrva',
        'kuga','nož','noža','rat','ubo','lud','tat','krađa','čir','bog','boga','crkva',
      ],
    },
    // српски: ћирилица (званично писмо), екавски. Азбука — 30 слова, свако слово = један знак (Љ, Њ, Џ… без диграфа).
    sr: {
      speech: 'sr-RS',
      alphabet: ['А','Б','В','Г','Д','Ђ','Е','Ж','З','И','Ј','К','Л','Љ','М','Н','Њ','О','П','Р','С','Т','Ћ','У','Ф','Х','Ц','Ч','Џ','Ш'],
      vowels: 'АЕИОУ',
      words: [
        ['пас','🐶'],['лав','🦁'],['сир','🧀'],['нос','👃'],['око','👁️'],['чај','🍵'],['миш','🐭'],['јеж','🦔'],
        ['кит','🐳'],['коњ','🐴'],['сат','⏰'],['лук','🧅'],['вук','🐺'],['сок','🧃'],['зец','🐰'],['пуж','🐌'],
        ['воз','🚂'],['мед','🍯'],['џип','🚙'],['риба','🐟'],['жаба','🐸'],['рука','✋'],['нога','🦵'],['снег','❄️'],
        ['киша','🌧️'],['слон','🐘'],['сова','🦉'],['кућа','🏠'],['хлеб','🍞'],['овца','🐑'],['коза','🐐'],['пиле','🐤'],
        ['кључ','🔑'],['дрво','🌳'],['цвет','🌸'],['ауто','🚗'],['брод','🚢'],['капа','🧢'],['јаје','🥚'],['тигар','🐯'],
        ['торта','🎂'],['крава','🐄'],['патка','🦆'],['лопта','⚽'],['књига','📖'],['лампа','💡'],['месец','🌙'],['облак','☁️'],
        ['јелка','🎄'],['лимун','🍋'],['свиња','🐷'],['пчела','🐝'],['авион','✈️'],['зебра','🦓'],['млеко','🥛'],['ћурка','🦃'],
        ['сунце','☀️'],['мачка','🐱'],['звезда','⭐'],['банана','🍌'],['крушка','🍐'],['трешња','🍒'],['јабука','🍎'],['ананас','🍍'],
        ['јагода','🍓'],['грожђе','🍇'],['мајмун','🐒'],['ракета','🚀'],['бицикл','🚲'],['лептир','🦋'],['делфин','🐬'],['ајкула','🦈'],
        ['жирафа','🦒'],['медвед','🐻'],['лисица','🦊'],['оловка','✏️'],['чарапа','🧦'],['ђеврек','🥯'],['гитара','🎸'],['кокошка','🐔'],
        ['корњача','🐢'],['пингвин','🐧'],['фламинго','🦩'],['лубеница','🍉'],['кишобран','☂️'],['чоколада','🍫'],['сладолед','🍦'],['шаргарепа','🥕'],
        ['краставац','🥒'],['хоботница','🐙'],
      ],
      sentences: [
        ['Жут је, кисео и расте на дрвету.','🍋','🍌','🍎'],
        ['Живи у мору, плива и има пераја.','🐟','🐦','🐸'],
        ['Ноћу сија високо на небу.','🌙','☀️','☁️'],
        ['Ова животиња има дугачку сурлу.','🐘','🦁','🐒'],
        ['Пузи полако и носи кућицу на леђима.','🐌','🐝','🐸'],
        ['Зими са неба пада нешто бело и хладно.','❄️','🌧️','🌸'],
        ['Њиме откључавамо врата.','🔑','📖','💡'],
        ['Лети изнад цвећа и прави мед.','🐝','🦋','🦉'],
        ['Риђа је, лукава и има чупав реп.','🦊','🐺','🐻'],
        ['Њоме пишемо и цртамо у свесци.','✏️','🔑','☂️'],
        ['Она лети ка звездама у свемир.','🚀','🚗','⛵'],
        ['Ова птица не спава ноћу и има велике очи.','🦉','🦆','🐔'],
        ['Бодљикав је и живи у шуми испод лишћа.','🦔','🐰','🐢'],
        ['Отварамо га када пада киша.','☂️','📖','⏰'],
      ],
      // справжні слова, які генератор помилок не має показувати як «помилку» (див. шапку);
      // наприкінці — грубі/страшні слова, які могли б утворитися в «Якої літери не вистачає?»
      avoid: [
        'бод','борд','брдо','бред','брид','вез','век','вик','гатара','зеба','кава','каза',
        'кат','каша','кепа','кет','кеша','кипа','кића','копа','корача','кот','коша','краставца',
        'крива','кришка','крова','круша','купа','кут','куша','лак','лама','ласица','лев','лек',
        'лесица','лив','лик','лиман','лимен','лисца','лов','лок','лота','мака','мача','мачак',
        'меко','мечка','млако','млео','мод','мучка','муш','нага','нас','нега','нес','нис',
        'нус','облик','облук','ова','олак','олова','оца','паж','пака','пакта','пале','пата',
        'патак','пела','пеле','пес','петка','пис','питка','поле','пос','потка','пса','раба',
        'рака','ракита','река','рекета','рика','роба','рока','руба','сар','сва','сева','сек',
        'сер','сет','сива','сик','сит','сиња','слан','сон','сот','ста','сува','суне',
        'сур','тигра','тора','трења','трта','цват','цет','чуј','јаука','јека','јела','ћерка',
        'ћука','ћурак','џеп','кита','кака','кура','пиша','јеб','нож','ножа','рат','куга',
        'мука','луд','шиба','чир','куја','крађа','пиве','ћушка','броз','турка','сис','кама',
        'коб','кома','рига','сука','киф',
      ],
    },
    bs: {   // bosanski: latinica, ijekavski standard; DŽ, LJ, NJ — jedno slovo (kao CH u češkoj, CS u mađarskoj)
      speech: 'bs-BA',
      alphabet: ['A','B','C','Č','Ć','D','DŽ','Đ','E','F','G','H','I','J','K','L','LJ','M','N','NJ','O','P','R','S','Š','T','U','V','Z','Ž'],
      vowels: 'AEIOU',
      words: [
        ['pas','🐶'],['lav','🦁'],['sir','🧀'],['nos','👃'],['oko','👁️'],['uho','👂'],['miš','🐭'],['čaj','🍵'],
        ['vuk','🐺'],['zub','🦷'],['sat','⏰'],['jež','🦔'],['puž','🐌'],['voz','🚂'],['luk','🧅'],['zec','🐰'],
        ['kit','🐳'],['konj','🐴'],['džip','🚙'],['mrav','🐜'],['kuća','🏠'],['ključ','🔑'],['lopta','⚽'],['torta','🎂'],
        ['slon','🐘'],['tigar','🐯'],['riba','🐟'],['sova','🦉'],['žaba','🐸'],['ruka','✋'],['noga','🦵'],['oblak','☁️'],
        ['ovca','🐑'],['koza','🐐'],['pile','🐥'],['buba','🪲'],['drvo','🌳'],['krava','🐄'],['voda','💧'],['pita','🥧'],
        ['duga','🌈'],['sunce','☀️'],['jaje','🥚'],['kiša','🌧️'],['dinja','🍈'],['kralj','🤴'],['kruna','👑'],['srce','❤️'],
        ['patka','🦆'],['kahva','☕'],['mačka','🐱'],['lisica','🦊'],['banana','🍌'],['jabuka','🍎'],['kruška','🍐'],['limun','🍋'],
        ['mrkva','🥕'],['gljiva','🍄'],['knjiga','📖'],['lampa','💡'],['cvijet','🌸'],['raketa','🚀'],['leptir','🦋'],['olovka','✏️'],
        ['pčela','🐝'],['hljeb','🍞'],['ananas','🍍'],['zebra','🦓'],['vrata','🚪'],['kokoš','🐔'],['svinja','🐷'],['majmun','🐒'],
        ['medvjed','🐻'],['snijeg','❄️'],['mjesec','🌙'],['zvijezda','⭐'],['trešnja','🍒'],['grožđe','🍇'],['jagoda','🍓'],['žirafa','🦒'],
        ['kornjača','🐢'],['kišobran','☂️'],['lubenica','🍉'],['krompir','🥔'],['čarapa','🧦'],['čokolada','🍫'],['auto','🚗'],['bubanj','🥁'],
      ],
      sentences: [
        ['Žut je, kiseo i raste na drvetu.','🍋','🍌','🍎'],
        ['Živi u moru, pliva i ima peraje.','🐟','🐦','🐸'],
        ['Noću sija visoko na nebu.','🌙','☀️','☁️'],
        ['Ova životinja ima dugu surlu.','🐘','🦁','🐒'],
        ['Polako puzi i nosi kućicu na leđima.','🐌','🐝','🐸'],
        ['Zimi pada s neba, bijel je i hladan.','❄️','🌧️','🌸'],
        ['Njime otključavamo vrata.','🔑','📖','💡'],
        ['Leti iznad cvijeća i pravi med.','🐝','🦋','🦉'],
        ['Riđa je, lukava i ima čupav rep.','🦊','🐺','🐻'],
        ['Njome pišemo i crtamo u svesci.','✏️','🔑','☂️'],
        ['Leti prema zvijezdama u svemir.','🚀','🚗','⛵'],
        ['Ova ptica noću ne spava i ima velike oči.','🦉','🦆','🐔'],
        ['Bodljikav je i živi u šumi ispod lišća.','🦔','🐰','🐢'],
        ['Otvaramo ga kad pada kiša.','☂️','📖','⏰'],
      ],
      // справжні слова, які генератор помилок не має показувати як «помилку» (див. шапку);
      // наприкінці — грубі/страшні слова, які могли б утворитися в «Якої літери не вистачає?»
      avoid: [
        'koj', 'knoj', 'knj', 'dip', 'džep', 'mrva', 'kića', 'koća', 'lota', 'tora', 'trta', 'slan', 'son', 'tigra',
        'tiger', 'raba', 'ria', 'ruba', 'roba', 'suva', 'sava', 'siva', 'sva', 'seva', 'rua', 'reka', 'roka', 'rika',
        'raka', 'nega', 'naga', 'noa', 'olak', 'obluk', 'oblik', 'ova', 'oca', 'kaza', 'pule', 'pole', 'pale', 'pie',
        'pele', 'ple', 'biba', 'boba', 'beba', 'baba', 'dvo', 'dro', 'kava', 'krova', 'kriva', 'vida', 'voa', 'pota',
        'puta', 'peta', 'pia', 'pata', 'daga', 'dega', 'dua', 'doga', 'suce', 'sune', 'kaša', 'keša', 'koša', 'kuša',
        'dina', 'dunja', 'donja', 'danja', 'kraj', 'krana', 'kuna', 'krina', 'sre', 'sce', 'petka', 'pakta', 'paka',
        'patak', 'potka', 'pitka', 'maka', 'mača', 'mačak', 'mučka', 'mečka', 'lasica', 'lisca', 'lesica', 'lisaca',
        'jauka', 'kriška', 'kruša', 'kraška', 'krška', 'liman', 'limen', 'mrka', 'lumpa', 'lama', 'reketa', 'rakita',
        'olova', 'pela', 'hleb', 'zera', 'zeba', 'vrta', 'vata', 'kokaš', 'kikoš', 'svija', 'sinja', 'mamun',
        'medved', 'sinjeg', 'mesec', 'trenja', 'tešnja', 'grože', 'lubnica', 'krumpir', 'bubaj', 'jeb', 'kita',
        'piša', 'kuja', 'kura', 'suka', 'pica', 'pice', 'fuk', 'lud', 'crkva', 'boga', 'vraga', 'vrača', 'mrtva',
        'kuga', 'nož', 'noža', 'šuga', 'cuga', 'riga',
      ],
    },
    lt: {
      speech: 'lt-LT',
      alphabet: ['A','Ą','B','C','Č','D','E','Ę','Ė','F','G','H','I','Į','Y','J','K','L','M','N','O','P','R','S','Š','T','U','Ų','Ū','V','Z','Ž'],
      vowels: 'AĄEĘĖIĮYOUŲŪ',
      words: [
        ['šuo','🐶'],['akis','👁️'],['avis','🐑'],['ožka','🐐'],['lapė','🦊'],['pelė','🐭'],['katė','🐱'],['bitė','🐝'],
        ['ežys','🦔'],['koja','🦵'],['ūdra','🦦'],['pica','🍕'],['gėlė','🌸'],['kėdė','🪑'],['lova','🛏️'],['kava','☕'],
        ['mėsa','🥩'],['jūra','🌊'],['dėžė','📦'],['rožė','🌹'],['sala','🏝️'],['ausis','👂'],['nosis','👃'],['sūris','🧀'],
        ['namas','🏠'],['antis','🦆'],['višta','🐔'],['varlė','🐸'],['meška','🐻'],['žuvis','🐟'],['karvė','🐄'],['morka','🥕'],
        ['duona','🍞'],['medus','🍯'],['bulvė','🥔'],['saulė','☀️'],['medis','🌳'],['knyga','📖'],['lempa','💡'],['ranka','✋'],
        ['durys','🚪'],['ledai','🍦'],['žvakė','🕯️'],['ugnis','🔥'],['pilis','🏰'],['batas','👞'],['lapas','🍁'],['tortas','🎂'],
        ['skėtis','☂️'],['raktas','🔑'],['raketa','🚀'],['mašina','🚗'],['laivas','⛵'],['liūtas','🦁'],['arklys','🐴'],['kiaulė','🐷'],
        ['vilkas','🐺'],['pelėda','🦉'],['sraigė','🐌'],['vėžlys','🐢'],['tigras','🐯'],['zebras','🦓'],['žirafa','🦒'],['ryklys','🦈'],
        ['gaidys','🐓'],['vyšnia','🍒'],['grybas','🍄'],['pienas','🥛'],['arbata','🍵'],['lietus','🌧️'],['eglutė','🎄'],['braškė','🍓'],
        ['mėlynė','🫐'],['ąsotis','🏺'],['varpas','🔔'],['gitara','🎸'],['karūna','👑'],['dovana','🎁'],['kepurė','🧢'],['triušis','🐰'],
        ['vabalas','🪲'],['obuolys','🍎'],['kriaušė','🍐'],['citrina','🍋'],['bananas','🍌'],['arbūzas','🍉'],['agurkas','🥒'],['mėnulis','🌙'],
        ['debesis','☁️'],['sniegas','❄️'],['ananasas','🍍'],['svogūnas','🧅'],['žvaigždė','⭐'],['kamuolys','⚽'],['drugelis','🦋'],['dramblys','🐘'],
        ['banginis','🐳'],['vynuogės','🍇'],['kiaušinis','🥚'],['pieštukas','✏️'],['laikrodis','⏰'],['traukinys','🚂'],['beždžionė','🐒'],['pomidoras','🍅'],
      ],
      sentences: [
        ['Ji geltona, rūgšti ir auga ant medžio.','🍋','🍌','🍎'],
        ['Ji gyvena jūroje, plaukioja ir turi pelekus.','🐟','🐦','🐸'],
        ['Naktį jis šviečia aukštai danguje.','🌙','☀️','☁️'],
        ['Šis gyvūnas turi ilgą straublį.','🐘','🦁','🐒'],
        ['Ji šliaužia lėtai ir neša namelį ant nugaros.','🐌','🐝','🐸'],
        ['Žiemą jis krinta iš dangaus – baltas ir šaltas.','❄️','🌧️','🌸'],
        ['Juo atrakiname duris.','🔑','📖','💡'],
        ['Ji skraido virš gėlių ir neša medų.','🐝','🦋','🦉'],
        ['Ji rusva, gudri ir turi purią uodegą.','🦊','🐺','🐻'],
        ['Juo rašome ir piešiame sąsiuvinyje.','✏️','🔑','☂️'],
        ['Ji skrenda į kosmosą pas žvaigždes.','🚀','🚗','⛵'],
        ['Šis paukštis naktį nemiega ir turi dideles akis.','🦉','🦆','🐔'],
        ['Jis dygliuotas ir gyvena miške po lapais.','🦔','🐰','🐢'],
        ['Jį išskleidžiame, kai lyja.','☂️','📖','⏰'],
      ],
      // tikri žodžiai, kurių klaidų generatorius neturi rodyti kaip „klaidos“ (patikrinta su hunspell lt);
      // pabaigoje — grubūs / baisūs žodžiai, kurie galėtų atsirasti užduotyje „Kurios raidės trūksta?“
      avoid: [
        'agurkus','aklys','aks','aksi','akus','akys','akės','akęs','ananasus','antys','arbūzus','arklas',
        'arklus','ausys','avus','avys','avės','avęs','avįs','bananus','batus','betas','bitas','botas',
        'butas','būtas','darys','dažė','debesys','dramblos','duris','durs','dyžė','gaidas','gaidos','galė',
        'gaudys','gilė','grabas','grobas','grybus','gulė','gylė','karina','karna','kaulė','kaušinis','kiaušins',
        'kiaušinsi','kiaušinus','kiaušinąs','kiaušinęs','kova','kva','kėtė','kūtė','laives','laivus','laivės','lapes',
        'lapos','lapus','lapės','lava','lavas','lavias','ledui','lema','lietas','lietis','lietos','lietęs',
        'lietūs','limpa','lipė','litas','litus','liūtes','liūtis','liūtus','liūtys','liūtės','lodai','lopas',
        'lopė','lupas','lydai','lūpas','marka','medės','medūs','midus','misa','moka','molynė','namus',
        'nesis','nosys','palis','penas','peštukas','pienes','pienus','pienės','pieštukus','pils','pilsi','pilys',
        'piląs','pinas','plis','polis','pomidorus','pylė','raka','rakta','raktis','raktos','raktus','ratas',
        'renka','riktas','rinka','ruktas','runka','rykles','ryklus','ryklės','ryklūs','rėklys','rėktas','rėžė',
        'ręžė','rūklys','rūktas','salė','skėtos','skėtus','skėtęs','sniegus','sula','suris','svogūnus','sąla',
        'sėtis','sūrs','sūrsi','sūrus','sūrės','sūręs','sūrįs','sūrūs','tartas','tigres','tigrus','tigrės',
        'tiras','tirtas','tortus','traukins','traukinus','traukinąs','traukinės','traukinęs','triašis','triušes','triušus','triušąs',
        'triušės','triušęs','turtas','ugnys','vabalus','valkas','valė','vapas','varas','varpos','varpus','varpys',
        'varpąs','varpęs','varė','vilas','vilkes','vilkis','vilks','vilkus','vilkės','vilkęs','vilkįs','vynuoges',
        'vėžys','zebrus','ąsotas','ąsotos','ąsotus','žuvus','žuvys','žuvęs','žvikė','kaka','kakė','kakvė',
        'kalė','kurvė','papas','pipis','pisa','pisis','piza','pizis','vempa','kapas','žudis','dūris',
        'vėplys','triušik',
      ],
    },
    lv: {
      speech: 'lv-LV',
      alphabet: ['A','Ā','B','C','Č','D','E','Ē','F','G','Ģ','H','I','Ī','J','K','Ķ','L','Ļ','M','N','Ņ','O','P','R','S','Š','T','U','Ū','V','Z','Ž'],
      vowels: 'AĀEĒIĪOUŪ',
      words: [
        ['suns','🐶'],['kaķis','🐱'],['lauva','🦁'],['siers','🧀'],['māja','🏠'],['deguns','👃'],['acs','👁️'],['vabole','🪲'],
        ['torte','🎂'],['zilonis','🐘'],['vilks','🐺'],['sēne','🍄'],['maize','🍞'],['pūce','🦉'],['zivs','🐟'],['varde','🐸'],
        ['roka','✋'],['kāja','🦵'],['tēja','🍵'],['sniegs','❄️'],['lietus','🌧️'],['tīģeris','🐯'],['citrons','🍋'],['banāns','🍌'],
        ['bumbieris','🍐'],['ķirsis','🍒'],['arbūzs','🍉'],['pīle','🦆'],['pērtiķis','🐒'],['cūka','🐷'],['vista','🐔'],['zvaigzne','⭐'],
        ['saule','☀️'],['grāmata','📖'],['atslēga','🔑'],['lampa','💡'],['zieds','🌸'],['mākonis','☁️'],['ezis','🦔'],['tītars','🦃'],
        ['haizivs','🦈'],['ananāss','🍍'],['ābols','🍎'],['burkāns','🥕'],['gurķis','🥒'],['sīpols','🧅'],['govs','🐄'],['bite','🐝'],
        ['koks','🌳'],['egle','🎄'],['raķete','🚀'],['mašīna','🚗'],['mēness','🌙'],['gliemezis','🐌'],['šokolāde','🍫'],['bruņurupucis','🐢'],
        ['zīmulis','✏️'],['flamingo','🦩'],['lācis','🐻'],['tauriņš','🦋'],['lietussargs','☂️'],['pulkstenis','⏰'],['zaķis','🐰'],['lapsa','🦊'],
        ['auss','👂'],['ola','🥚'],['piens','🥛'],['zirgs','🐴'],['kuģis','🚢'],['bumba','⚽'],['zebra','🦓'],['žirafe','🦒'],
        ['delfīns','🐬'],['ģitāra','🎸'],['vilciens','🚂'],['pingvīns','🐧'],['kaza','🐐'],['aita','🐑'],['pele','🐭'],['ūdens','💧'],
        ['uguns','🔥'],['ķirbis','🎃'],['zemene','🍓'],['sirds','❤️'],['kronis','👑'],['svece','🕯️'],['valis','🐳'],['gailis','🐓'],
        ['cepure','👒'],['traktors','🚜'],['astoņkājis','🐙'],['olīva','🫒'],
      ],
      sentences: [
        ['Tas ir dzeltens, skābs un aug kokā.','🍋','🍌','🍎'],
        ['Tā dzīvo jūrā, peld, un tai ir spuras.','🐟','🐦','🐸'],
        ['Naktī tas spīd augstu debesīs.','🌙','☀️','☁️'],
        ['Šim dzīvniekam ir garš snuķis.','🐘','🦁','🐒'],
        ['Tas rāpo lēnām un nes mājiņu uz muguras.','🐌','🐝','🐸'],
        ['Ziemā no debesīm krīt kaut kas balts un auksts.','❄️','🌧️','🌸'],
        ['Ar to atslēdz durvis.','🔑','📖','💡'],
        ['Tā lido pār ziediem un taisa medu.','🐝','🦋','🦉'],
        ['Tā ir ruda, viltīga, un tai ir pūkaina aste.','🦊','🐺','🐻'],
        ['Ar to raksta un zīmē burtnīcā.','✏️','🔑','☂️'],
        ['Tā lido pie zvaigznēm kosmosā.','🚀','🚗','⛵'],
        ['Šis putns naktī neguļ, un tam ir lielas acis.','🦉','🦆','🐔'],
        ['Tas ir dzeloņains un dzīvo mežā zem lapām.','🦔','🐰','🐢'],
        ['To atver, kad līst lietus.','☂️','📖','⏰'],
      ],
      // справжні слова, які генератор помилок не має показувати як «помилку» (див. шапку);
      // наприкінці — грубі/страшні слова, які могли б утворитися в «Якої літери не вистачає?»
      avoid: [
        'ananās','ass','astoņkājos','astoņkājus','asus','atslīga','aus','auta','bote','bruņrupucis','buma','bumbieres',
        'bumbieros','bumbierus','bumbierēs','burkās','bute','caka','gailēs','guris','gurķos','gurķus','kaķes','kaķos',
        'kaķus','kaķēs','kija','koja','kronas','kronās','kronēs','kuģos','kuģus','kāķis','kēks','kūja',
        'lacis','laiva','lama','lapa','lapas','lasa','lava','licis','lietas','lietos','liets','lietās',
        'litus','locis','lucis','lēcis','līcis','mazie','mija','mēja','pens','pile','pions','pērtiķos',
        'pērtiķus','raka','rika','ruka','rīka','sens','sers','sidrs','sies','snigs','sus','sāns',
        'traktos','tītas','tīģeros','tīģerus','tūja','valks','valsi','velis','velks','vesta','vils','visa',
        'vēlis','vēsta','vīlis','vīsta','zaķos','zaķus','kaka','kaks','kakis','pista','pirds','pirsis',
        'dirsis','pisgvīns','elle','kapa','kara','sista','cista','mele',
      ],
    },
    hy: {
      speech: 'hy-AM',
      // абетка Вірменії (39 літер, як у букварі «Այբբենարան»): ՈՒ і և (велика — ԵՎ) — окремі літери з двох знаків
      alphabet: ['Ա','Բ','Գ','Դ','Ե','Զ','Է','Ը','Թ','Ժ','Ի','Լ','Խ','Ծ','Կ','Հ','Ձ','Ղ','Ճ','Մ','Յ','Ն','Շ','Ո','Չ','Պ','Ջ','Ռ','Ս','Վ','Տ','Ր','Ց','ՈՒ','Փ','Ք','ԵՎ','Օ','Ֆ'],
      vowels: 'ԱԵԷԸԻՈՕ',   // ՈՒ теж голосна, але це диграф: у пропуск «Якої літери бракує?» і в заміну голосних не йде
      words: [
        ['բու','🦉'],['ձու','🥚'],['ձի','🐴'],['տուն','🏠'],['շուն','🐶'],['քիթ','👃'],['աչք','👁️'],['հաց','🍞'],
        ['թեյ','🍵'],['բալ','🍒'],['բադ','🦆'],['խոզ','🐷'],['հավ','🐔'],['կով','🐄'],['ամպ','☁️'],['սոխ','🧅'],
        ['ծառ','🌳'],['նավ','🚢'],['արև','☀️'],['մուկ','🐭'],['ձուկ','🐟'],['ոտք','🦵'],['ձեռք','✋'],['կատու','🐱'],
        ['փիղ','🐘'],['գայլ','🐺'],['սունկ','🍄'],['գորտ','🐸'],['ձյուն','❄️'],['տորթ','🎂'],['վագր','🐯'],['բզեզ','🪲'],
        ['տանձ','🍐'],['արջ','🐻'],['ուղտ','🐫'],['ցուլ','🐂'],['ճուտ','🐥'],['կաթ','🥛'],['ջուր','💧'],['աստղ','⭐'],
        ['գիրք','📖'],['լամպ','💡'],['քար','🪨'],['զանգ','🔔'],['օճառ','🧼'],['ոզնի','🦔'],['կրիա','🐢'],['տերև','🍃'],
        ['ելակ','🍓'],['զեբր','🦓'],['դդում','🎃'],['բանան','🍌'],['գազար','🥕'],['մեղու','🐝'],['կապիկ','🐒'],['ծաղիկ','🌸'],
        ['լուսին','🌙'],['անձրև','🌧️'],['կիտրոն','🍋'],['խնձոր','🍎'],['խաղող','🍇'],['բանալի','🔑'],['մատիտ','✏️'],['հրթիռ','🚀'],
        ['մեքենա','🚗'],['գնդակ','⚽'],['աղվես','🦊'],['եղնիկ','🦌'],['թութակ','🦜'],['թիթեռ','🦋'],['փուչիկ','🎈'],['ծիածան','🌈'],
        ['խխունջ','🐌'],['վարունգ','🥒'],['ձմերուկ','🍉'],['շնաձուկ','🦈'],['ընձուղտ','🦒'],['հովանոց','☂️'],['տոնածառ','🎄'],['նապաստակ','🐰'],
        ['պաղպաղակ','🍦'],['ինքնաթիռ','✈️'],['ութոտնուկ','🐙'],['ֆլամինգո','🦩'],['ժամացույց','⏰'],['արքայախնձոր','🍍'],
      ],
      sentences: [
        ['Այն դեղին է, թթու և աճում է ծառի վրա։','🍋','🍌','🍎'],
        ['Այն ապրում է ծովում, լողում է և լողակներ ունի։','🐟','🐦','🐸'],
        ['Գիշերը այն փայլում է բարձր երկնքում։','🌙','☀️','☁️'],
        ['Այս կենդանին շատ երկար կնճիթ ունի։','🐘','🦁','🐒'],
        ['Այն դանդաղ սողում է և իր տնակը մեջքին է կրում։','🐌','🐝','🐸'],
        ['Ձմռանը երկնքից սպիտակ ու սառը փաթիլներ են թափվում։','❄️','🌧️','🌸'],
        ['Դրանով դուռն են բացում։','🔑','📖','💡'],
        ['Այն թռչում է ծաղիկների վրայով և մեղր է պատրաստում։','🐝','🦋','🦉'],
        ['Այն շիկակարմիր է, խորամանկ և փափուկ պոչ ունի։','🦊','🐺','🐻'],
        ['Դրանով գրում և նկարում են տետրում։','✏️','🔑','☂️'],
        ['Այն թռչում է դեպի աստղերը՝ տիեզերք։','🚀','🚗','⛵'],
        ['Այս թռչունը գիշերը չի քնում և մեծ աչքեր ունի։','🦉','🦆','🐔'],
        ['Այն փշոտ է և ապրում է անտառում՝ տերևների տակ։','🦔','🐰','🐢'],
        ['Այն բացում են, երբ անձրև է գալիս։','☂️','📖','⏰'],
      ],
      // справжні слова, які генератор помилок не має показувати як «помилку» (звірено зі словником hunspell hy-arevela);
      // наприкінці — грубі/страшні слова, які могли б утворитися в «Якої літери не вистачає?» (ԲՈԶ, ՔԱՔ, ՔՈՒՍԻՆ…)
      avoid: [
        'աղես','անձև','բանելի','բանեն','բանին','բանն','բինան','գազեր','գալ','գդակ','գնդիկ','դում',
        'եղնկի','զընգ','լոսին','լուին','լուսան','լուսնի','խաղաղ','խեղող','խնձեր','ծածան','ծաղկի','ծղիկ',
        'կապկի','կտրոն','հավանոց','ձուն','ուտ','վար','վարգ','տարթ','տոթ','տոն','ցոլ','փուչկի',
        'ծիծան','բոզ','քաք','քուսին','ծակ','տուտ','փիս','ցավ','սով','խոց','թուր','սուր',
        'դավ','գազան','կաղ','խուլ','չար','սուտ','շառ','տանկ','արկ','բանակ','կոծ','թաղող',
        'քած','գանգ','մորթ','փուտ',
      ],
    },
    ka: {
      speech: 'ka-GE',
      caseless: true,   // мхедрулі без регістру: слова й плитки — тими самими знаками, без Мтаврулі (див. шапку)
      alphabet: ['ა','ბ','გ','დ','ე','ვ','ზ','თ','ი','კ','ლ','მ','ნ','ო','პ','ჟ','რ','ს','ტ','უ','ფ','ქ','ღ','ყ','შ','ჩ','ც','ძ','წ','ჭ','ხ','ჯ','ჰ'],
      vowels: 'აეიოუ',
      words: [
        ['კატა','🐱'],['ძაღლი','🐶'],['ლომი','🦁'],['ყველი','🧀'],['სახლი','🏠'],['ცხვირი','👃'],['თვალი','👁️'],['ხოჭო','🪲'],
        ['ტორტი','🎂'],['სპილო','🐘'],['მგელი','🐺'],['სოკო','🍄'],['პური','🍞'],['ბუ','🦉'],['თევზი','🐟'],['ბაყაყი','🐸'],
        ['ხელი','✋'],['ფეხი','🦵'],['ჩაი','🍵'],['თოვლი','❄️'],['წვიმა','🌧️'],['ვეფხვი','🐯'],['ლიმონი','🍋'],['ბანანი','🍌'],
        ['მსხალი','🍐'],['ალუბალი','🍒'],['საზამთრო','🍉'],['იხვი','🦆'],['მაიმუნი','🐒'],['ღორი','🐷'],['ქათამი','🐔'],['ვარსკვლავი','⭐'],
        ['მზე','☀️'],['წიგნი','📖'],['გასაღები','🔑'],['ნათურა','💡'],['ყვავილი','🌸'],['ღრუბელი','☁️'],['ზღარბი','🦔'],['ინდაური','🦃'],
        ['ზვიგენი','🦈'],['ანანასი','🍍'],['ვაშლი','🍎'],['სტაფილო','🥕'],['კიტრი','🥒'],['ხახვი','🧅'],['ძროხა','🐄'],['ფუტკარი','🐝'],
        ['ხე','🌳'],['ნაძვი','🎄'],['რაკეტა','🚀'],['მანქანა','🚗'],['მთვარე','🌙'],['ლოკოკინა','🐌'],['შოკოლადი','🍫'],['კუ','🐢'],
        ['ფანქარი','✏️'],['პეპელა','🦋'],['ქოლგა','☂️'],['საათი','⏰'],['დათვი','🐻'],['მელია','🦊'],['კურდღელი','🐰'],['ცხენი','🐴'],
        ['ყურძენი','🍇'],['კვერცხი','🥚'],['რძე','🥛'],['ნავი','⛵'],['ჟირაფი','🦒'],['ზებრა','🦓'],['დელფინი','🐬'],['გველი','🐍'],
        ['ჩიტი','🐦'],['ელვა','⚡'],['ორცხობილა','🍪'],['ჭიანჭველა','🐜'],['ჯინსი','👖'],['ჰიპოპოტამი','🦛'],['ბურთი','⚽'],['ყური','👂'],
        ['თხა','🐐'],
      ],
      sentences: [
        ['ის ყვითელია, მჟავეა და ხეზე იზრდება.','🍋','🍌','🍎'],
        ['ის ზღვაში ცხოვრობს, ცურავს და ფარფლები აქვს.','🐟','🐦','🐸'],
        ['ღამით ის ცაში მაღლა ანათებს.','🌙','☀️','☁️'],
        ['ამ ცხოველს გრძელი ხორთუმი აქვს.','🐘','🦁','🐒'],
        ['ის ნელა დაცოცავს და სახლს ზურგით დაატარებს.','🐌','🐝','🐸'],
        ['ზამთარში ციდან თეთრი და ცივი რამ მოდის.','❄️','🌧️','🌸'],
        ['მისით კარს აღებენ.','🔑','📖','💡'],
        ['ის ყვავილებზე დაფრინავს და თაფლს აკეთებს.','🐝','🦋','🦉'],
        ['ის წითურია, ცბიერია და ფუმფულა კუდი აქვს.','🦊','🐺','🐻'],
        ['მისით რვეულში წერენ და ხატავენ.','✏️','🔑','☂️'],
        ['ის ვარსკვლავებისკენ, კოსმოსში მიფრინავს.','🚀','🚗','⛵'],
        ['ეს ფრინველი ღამით ფხიზლობს და დიდი თვალები აქვს.','🦉','🦆','🐔'],
        ['ის ეკლიანია და ტყეში, ფოთლების ქვეშ ცხოვრობს.','🦔','🐰','🐢'],
        ['მას მაშინ შლიან, როცა წვიმს.','☂️','📖','⏰'],
      ],
      // справжні слова, які генератор помилок не має показувати як «помилку» (перевірено словником hunspell ka_GE);
      // наприкінці — грубі/страшні слова й сполуки, які могли б утворитися в «Якої літери не вистачає?» (пури → პუწი)
      avoid: [
        'ბანნი','ბური','გელი','დელფინნი','ევა','ელა','ვალი','ვალში','ვაში','ვეფხი','ვუშლი','თვლი',
        'თოლი','ინაური','ინდოური','ინდური','კეტა','კირი','კიტა','კიტი','კოტა','ლამი','ლემი','ლიმანი',
        'ლიმონნი','ლიონი','მაიმუნნი','მალია','მანანა','მელა','მელაა','მელი','მელუა','მილია','მოლია','მსხილი',
        'მხალი','ნოვი','პარი','პერი','პირი','სათი','სალი','სახილ','სეკო','სიკო','ტორი','ტოტი',
        'ფანარი','ფახი','ფეი','ღარი','ღერი','ყელი','ყრუი','ცხენნი','ცხვარი','ძალი','წვამა','წიგნნი',
        'ხალი','ხეი','ხილი','ხლი','ხხვი','ჯინი','ჯინის','ჯონსი','პუწი','კაკა','ქაქამი','მანქაქა',
        'ფანქაქი','ცხედი','ყლავილი','ყლელი','ვაყლი','თოყლი','საყლი','ძაყლი','სირაფი','პედელა','ლოთი','დაწვი',
        'ყული',
      ],
    },
    'pt-BR': {
      speech: 'pt-BR',
      // Variante brasileira (vocabulário do Brasil: cachorro, sorvete, trem, foguete, avião…).
      // Á Ã Ç É — як у pt: не окремі літери абетки, але є в наших словах (pão, maçã, pé, lápis…),
      // тому вони — окремі плитки, а Á Ã É — ще й голосні.
      alphabet: ['A','Á','Ã','B','C','Ç','D','E','É','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'],
      vowels: 'AÁÃEÉIOU',
      words: [
        ['sol','☀️'],['pão','🍞'],['mão','✋'],['pé','🦶'],['mar','🌊'],['lua','🌙'],['ovo','🥚'],['uva','🍇'],
        ['gato','🐱'],['rato','🐭'],['pato','🦆'],['urso','🐻'],['leão','🦁'],['flor','🌸'],['casa','🏠'],['bola','⚽'],
        ['vaca','🐄'],['pera','🍐'],['bolo','🎂'],['sapo','🐸'],['olho','👁️'],['maçã','🍎'],['trem','🚂'],['peixe','🐟'],
        ['porco','🐷'],['leite','🥛'],['chave','🔑'],['carro','🚗'],['cobra','🐍'],['tigre','🐯'],['zebra','🦓'],['livro','📖'],
        ['lápis','✏️'],['nariz','👃'],['nuvem','☁️'],['chuva','🌧️'],['polvo','🐙'],['limão','🍋'],['avião','✈️'],['árvore','🌳'],
        ['coelho','🐰'],['coruja','🦉'],['abelha','🐝'],['banana','🍌'],['raposa','🦊'],['baleia','🐳'],['girafa','🦒'],['macaco','🐒'],
        ['cavalo','🐴'],['caracol','🐌'],['estrela','⭐'],['cenoura','🥕'],['sorvete','🍦'],['foguete','🚀'],['elefante','🐘'],['cachorro','🐶'],
        ['borboleta','🦋'],['tartaruga','🐢'],
      ],
      sentences: [
        ['É amarelo, azedo e cresce em uma árvore.','🍋','🍌','🍎'],
        ['Vive no mar e nada com as nadadeiras.','🐟','🐦','🐸'],
        ['De noite brilha lá no alto do céu.','🌙','☀️','☁️'],
        ['Este animal tem uma tromba bem comprida.','🐘','🦁','🐒'],
        ['Anda bem devagar e leva a casa nas costas.','🐌','🐝','🐸'],
        ['No inverno cai do céu, branca e fria.','❄️','🌧️','🌸'],
        ['Serve para abrir a porta.','🔑','📖','💡'],
        ['Voa por cima das flores e faz mel.','🐝','🦋','🦉'],
        ['É cor de laranja, esperta e tem um rabo fofo.','🦊','🐺','🐻'],
        ['Serve para escrever e desenhar no caderno.','✏️','🔑','☂️'],
        ['Voa até as estrelas, no espaço.','🚀','🚗','⛵'],
        ['Esta ave não dorme de noite e tem olhos grandes.','🦉','🦆','🐔'],
        ['Tem espinhos e se esconde debaixo das folhas.','🦔','🐰','🐢'],
        ['A gente abre quando chove.','☂️','📖','⏰'],
      ],
      // справжні слова, які генератор помилок не має показувати як «помилку» (див. шапку);
      // наприкінці — грубі/страшні слова (з бразильським сленгом), які могли б утворитися в «Якої літери не вистачає?»
      avoid: [
        'goto','reto','rito','roto','pito','uso','leio','for','cisa','cosa','bala','bela','bula',
        'boa','para','pira','pura','perra','belo','bulo','parco','perco','poro','chove','cave','cerro',
        'corro','curro','caro','cabra','cubra','cora','tire','lavro','chova','povo','polo','limo','coalho',
        'colho','caruja','corja','baleai','boleia','balia','grafa','cenoira','sal','sul','pexe','estela',
        'abela','caracal','sorbete','cavala','bobo',
        'puto','caca','caga','rabo','chula','chupa','peru','cio','porca','tolo','tola','gago','porno',
        'porro','rola','nua','saco','faca','cachorra','machorro',
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
        // норвезька: голос буває позначений 'nb-NO', 'no-NO' або 'nn-NO' — це та сама мова для озвучки
        const alias = { nb: ['no', 'nn'], no: ['nb', 'nn'] }[base] || [];
        return vs.find(v => (v.lang || '').toLowerCase().replace('_', '-') === code.toLowerCase()) ||
               vs.find(v => (v.lang || '').toLowerCase().slice(0, 2) === base) ||
               vs.find(v => alias.includes((v.lang || '').toLowerCase().slice(0, 2))) || null;
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
  // вірм. և велика — ԵՎ (у Вірменії), а не ԵՒ, яку дає toLocaleUpperCase
  const hyUp = s => s.replace(/և/g, 'եվ');
  function up(s) { return hyUp(s).toLocaleUpperCase(ctx.lang); }
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
    const W = d.caseless ? w : hyUp(w).toLocaleUpperCase(lang), multi = multiOf(d), out = [];   // caseless: груз. мхедрулі — без Мтаврулі
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
    // замало слів такої довжини (лит. майже не має слів із 3 літер) — розширюємо межу поступово,
    // а не одразу до всього списку (інакше на рівні 1 трапляються слова з 9 літер)
    for (let m = max + 1; ws.length < 3 && m <= max + 6; m++) ws = wordList().filter(x => { const n = units(x[0]).length; return n >= min && n <= m; });
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
      const pool = (D.findPool || D.alphabet).filter(x => x !== 'Ь' && x !== 'Ъ');   // findPool — свій набір (ko: 가나다…)
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
      // spellWrong (ko) — готові помилки носія мови замість генератора misspell (він не вміє складові блоки)
      const sw = D.spellWrong, ready = sw ? D.words.filter(x => (sw[x[0]] || []).length >= 2) : [];
      const w = ready.length >= 3 ? pick(ready) : pick(D.words.filter(x => x[0].length >= 4).length >= 3 ? D.words.filter(x => x[0].length >= 4) : D.words);
      const wrong = ready.length >= 3 ? sample(sw[w[0]], 2) : misspell(w[0], 2);
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
      // вірм. ւ буває лише в ու: «помилка» з окремою ւ (ւո, աւ) — не слово взагалі, такої не показуємо
      if (v && v !== word && !all.has(v.toLocaleLowerCase(ctx.lang)) && v.length >= 2 && !/(^|[^ո])ւ/.test(v)) out.add(v);
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
