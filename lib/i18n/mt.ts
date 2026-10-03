/**
 * Maltese UI copy — DRAFT. Every string needs a native-speaker review before launch.
 * Game words and glosses are never translated and never live here.
 */
export const mt = {
  // --- meta ---
  siteDescription: "Logħba tal-kliem bil-Malti. Kelma ġdida kuljum, f'żewġ livelli.", // REVIEW
  howTitle: "Kif taħdem", // REVIEW

  // --- shared chrome ---
  switchLang: "Switch to English", // REVIEW (deliberately in English: it's for English readers)
  langShort: "EN", // REVIEW
  homeAria: "Lura d-dar", // REVIEW
  helpAria: "Kif tilgħab", // REVIEW
  statsAria: "Statistika u riżultat", // REVIEW
  settingsAria: "Issettjar", // REVIEW
  close: "Agħlaq", // REVIEW

  // --- home ---
  tagline: "6 tentattivi biex taqta' kelma b'ħames ittri", // REVIEW
  modeNormali: "Normali", // REVIEW
  modeTqila: "Tqila", // REVIEW
  howLink: "Kif taħdem?", // REVIEW
  doneToday: "lesta llum", // REVIEW
  wordOfDayTitle: "Kelma ta' kuljum", // REVIEW

  // --- game ---
  notEnough: "Ittri mhux biżżejjed", // REVIEW
  notInList: "Mhux fil-lista", // REVIEW
  winToasts: ["Ġenju!", "Brillanti!", "Prosit!", "Tajjeb ħafna!", "Tajjeb!", "Uff, għal ftit!"], // REVIEW
  lostToast: "Għal darb'oħra", // REVIEW
  enterKey: "DAĦĦAL", // REVIEW
  enterAria: "Daħħal it-tentattiv", // REVIEW
  backspaceAria: "Ħassar ittra", // REVIEW
  boardAria: "Il-bord", // REVIEW
  keyboardAria: "Tastiera", // REVIEW
  stateCorrect: "f'postha", // REVIEW
  statePresent: "fil-kelma, f'post ieħor", // REVIEW
  stateAbsent: "mhux fil-kelma", // REVIEW
  stateEmpty: "vojta", // REVIEW
  guessAnnouncement: (n: number, detail: string) => `Tentattiv ${n}: ${detail}`, // REVIEW
  puzzleNumber: (n: number) => `Nru ${n}`, // REVIEW
  noPuzzleBeforeTitle: "Kelma għadha ma bdietx", // REVIEW
  noPuzzleBeforeBody: "L-ewwel kelma toħroġ f'nofsillejl, ħin Malta.", // REVIEW
  noPuzzleAfterTitle: "M'hemmx kelma llum", // REVIEW
  noPuzzleAfterBody: "Qed inħejju l-kelmiet li jmiss. Erġa' ara għada.", // REVIEW

  // --- end of game ---
  wordWas: "Il-kelma kienet", // REVIEW
  todaysWord: "Il-kelma tal-lum", // REVIEW
  rootLabel: "Għerq", // REVIEW
  didYouKnow: "Kont taf?", // REVIEW
  credit: "Ġabra, L-Università ta' Malta", // REVIEW
  meaningFrom: "Tifsira minn", // REVIEW
  nextWordIn: "Kelma ġdida fi", // REVIEW
  newWordReady: "Il-kelma l-ġdida lesta", // REVIEW
  playNew: "Ilgħab", // REVIEW
  tryOther: { normali: "Ipprova t-Tqila", tqila: "Ipprova n-Normali" }, // REVIEW
  share: "Aqsam", // REVIEW
  copied: "Ikkupjat. Waħħlu fejn trid.", // REVIEW
  copiedShort: "Ikkupjat", // REVIEW
  copyFailed: "Ma setax jiġi kkupjat", // REVIEW
  resultTitleWon: "Rbaħt!", // REVIEW
  seeResult: "Ir-riżultat", // REVIEW

  // --- stats ---
  statsFor: (mode: string) => `Statistika · ${mode}`, // REVIEW
  played: "Logħbiet", // REVIEW
  winPct: "% rebħ", // REVIEW
  streak: "Sekwenza", // REVIEW
  maxStreak: "L-aqwa sekwenza", // REVIEW
  distribution: "Kemm-il tentattiv", // REVIEW
  emptyStats: "Ilgħab l-ewwel logħba tiegħek", // REVIEW
  emptyStatsBody: "Hawn tara kemm rbaħt, is-sekwenza tiegħek u kemm-il tentattiv ħadt.", // REVIEW

  // --- settings ---
  settingsTitle: "Issettjar", // REVIEW
  highContrast: "Kuntrast għoli", // REVIEW
  highContrastBody: "Oranġjo u blu minflok aħdar u isfar, għal min isibha iebsa jagħżel bejn il-kuluri.", // REVIEW

  // --- help modal (short) ---
  helpTitle: "Kif tilgħab", // REVIEW
  helpIntro: "Aqta' l-kelma f'6 tentattivi. Kull tentattiv irid ikun kelma Maltija ta' ħames ittri.", // REVIEW
  helpCorrect: "Aħdar: l-ittra fil-post it-tajjeb.", // REVIEW
  helpPresent: "Isfar: l-ittra fil-kelma, imma f'post ieħor.", // REVIEW
  helpAbsent: "Griż: l-ittra mhix fil-kelma.", // REVIEW
  helpMore: "Aktar dwar kif taħdem", // REVIEW

  // --- how it works page ---
  howHeading: "Kif taħdem", // REVIEW
  howPlayTitle: "Kif tilgħab", // REVIEW
  howPlayBody: "Għandek 6 tentattivi biex taqta' kelma Maltija ta' ħames ittri. Wara kull tentattiv, il-kaxxi jinbidlu kulur biex juruk kemm qrib inti.", // REVIEW
  howExampleCorrect: "Il-B tinsab fil-kelma u fil-post it-tajjeb.", // REVIEW
  howExamplePresent: "Il-M tinsab fil-kelma, imma mhux f'dan il-post.", // REVIEW
  howExampleAbsent: "Il-O mhix fil-kelma xejn.", // REVIEW
  howDoublesTitle: "Ittri doppji", // REVIEW
  howDoublesBody: "Ittra tixgħel daqs kemm hemm kopji tagħha fil-kelma. Jekk tikteb żewġ A u l-kelma għandha A waħda biss, waħda biss tieħu l-kulur; l-oħra tibqa' griża.", // REVIEW
  howDoublesExample: "Jekk il-kelma hi SODDA, DAWRA tieħu A waħda biss: dik fil-post it-tajjeb. Id-D tixgħel isfar għax SODDA fiha D.", // REVIEW
  howModesTitle: "Żewġ livelli", // REVIEW
  howNormaliBody: "Kliem komuni ta' kuljum. Għal min qed jitgħallem il-Malti jew għadu qed jibnih.", // REVIEW
  howTqilaBody: "Kliem inqas komuni, għal min jitkellem il-Malti sew. Kultant tiltaqa' ma' kelma rari u antika li qed tintilef mill-użu. Dawk il-jiem jiġu, imma ma nwissukx meta.", // REVIEW
  howModesShared: "Kull livell għandu l-kelma tiegħu, l-istatistika tiegħu u s-sekwenza tiegħu.", // REVIEW
  howLettersTitle: "L-ittri Maltin", // REVIEW
  howLettersDigraphs: "GĦ u IE jieħdu żewġ kaxxi: waħda għal kull ittra.", // REVIEW
  howLettersKeys: "Ġ, Ħ, Ż u Ċ tinsabhom fuq it-tastiera tal-iskrin, ħdejn l-ittri mingħajr tikka.", // REVIEW
  howLettersPhysical: "Fuq tastiera fiżika, jekk tikteb C toħroġ Ċ, għax il-Malti m'għandux C. Għal Ġ, Ħ u Ż uża t-tastiera tal-iskrin jew tastiera bil-layout Malti.", // REVIEW
  howDailyTitle: "Kelma ġdida kuljum", // REVIEW
  howDailyBody: "Il-kelma tinbidel f'nofsillejl, ħin Malta, fiż-żewġ livelli.", // REVIEW
  howSourceTitle: "Id-dizzjunarju", // REVIEW
  howSourceBody: "Il-kliem u t-tifsiriet ġejjin minn Ġabra, il-lessiku Malti miftuħ tal-Università ta' Malta, taħt il-liċenzja CC BY 4.0.", // REVIEW
  howSourceLink: "Ġabra fuq GitHub", // REVIEW
  howLicenceLink: "Il-liċenzja CC BY 4.0", // REVIEW

  // --- Sellum (word ladder) ---
  sellumTagline: "Inżel is-sellum: ittra waħda kull darba", // REVIEW
  sellumPlay: "Ilgħab", // REVIEW
  sellumNumber: (n: number) => `Sellum #${n}`, // REVIEW
  changeOne: "Biddel ittra waħda biss", // REVIEW
  alreadyUsed: "Din diġà użajtha", // REVIEW
  deadEnd: "Kelma tajba, imma ma twasslekx", // REVIEW
  livesLeft: (n: number) => (n === 0 ? "Ma fadallek l-ebda ħajja" : n === 1 ? "Ħajja waħda fadal" : `${n} ħajjiet fadal`), // REVIEW
  lifeLost: (n: number) => (n === 0 ? "Tlift l-aħħar ħajja." : n === 1 ? "Tlift ħajja. Ħajja waħda fadal." : `Tlift ħajja. ${n} ħajjiet fadal.`), // REVIEW
  floorOf: (n: number, total: number) => `Ringiela ${n} minn ${total}`, // REVIEW
  galleryLocked: (i: number, letter: string) => `Ittra ${i}: ${letter}`, // REVIEW
  galleryClosed: "vojta", // REVIEW
  inPlace: "f'postha", // REVIEW
  wordAccepted: (w: string, row: number) => `${w}, tajba. Ringiela ${row}.`, // REVIEW
  sellumWon: "Wasalt!", // REVIEW
  sellumLost: "Ir-rotta kienet…", // REVIEW
  yourLadder: "Is-sellum tiegħek", // REVIEW
  routesCount: (n: number) => `Kien hemm ${n} rotot`, // REVIEW
  otherRoute: "Rotta li ma ħadtx", // REVIEW
  formOf: (x: string) => `forma ta' ${x}`, // REVIEW
  playKelma: "Ilgħab Kelma", // REVIEW
  livesDist: "Ħajjiet fadal meta rbaħt", // REVIEW
  livesLost: "Tlift", // REVIEW
  sellumHelpIntro: "Mill-kelma ta' fuq sal-kelma t'isfel f'4 tarġiet. F'kull tarġa biddel ittra waħda, u kull kelma trid tkun Maltija.", // REVIEW
  sellumHelpEdit: "Ikteb il-kelma sħiħa, li tibdel ittra waħda biss mill-kelma ta' fuqha, u agħfas DAĦĦAL.", // REVIEW
  sellumHelpLives: "Għandek 3 ħajjiet. Kelma li mhix fil-lista, jew kelma tajba li ma twasslekx, tieħdok ħajja.", // REVIEW
  sellumHelpGreen: "Ittra ħadra tfisser li diġà qiegħda f'postha fil-kelma t'isfel.", // REVIEW
  sellumHowTitle: "Kif taħdem Sellum", // REVIEW
  sellumHowIntro: "Kuljum ikollok kelma fuq nett u kelma isfel nett. Mur minn waħda għall-oħra f'4 tarġiet eżatt, u f'kull tarġa biddel ittra waħda biss. Kull kelma li tuża trid tkun kelma Maltija.", // REVIEW
  sellumHowExample: "Eżempju: kull ringiela tibdel ittra waħda minn ta' fuqha.", // REVIEW
  sellumHowEditTitle: "Kif tikteb kelma", // REVIEW
  sellumHowEdit: "Kull ringiela tibda vojta. Ikteb il-kelma sħiħa, bl-istess ittri tal-kelma ta' fuqha ħlief waħda, u agħfas DAĦĦAL. ⌫ tħassar l-aħħar ittra. Jekk tbiddel l-ebda ittra jew aktar minn waħda, il-ringiela titħawwad u ma titlifx ħajja.", // REVIEW
  sellumHowLivesTitle: "Il-ħajjiet", // REVIEW
  sellumHowLivesSlip: "Tbiddel l-ebda ittra, jew aktar minn waħda, jew terġa' tuża kelma: ma titlifx ħajja, erġa' pprova.", // REVIEW
  sellumHowLivesWord: "Kelma li mhix fil-lista: titlef ħajja.", // REVIEW
  sellumHowLivesDead: "Kelma tajba imma li minnha ma tistax tasal fit-tarġiet li fadal: titlef ħajja.", // REVIEW
  sellumHowLivesEnd: "Jekk titlef it-3 ħajjiet, il-logħba tispiċċa u naraw rotta sħiħa.", // REVIEW
  sellumHowRoutesTitle: "Aktar minn triq waħda", // REVIEW
  sellumHowRoutes: "Ma hemmx tweġiba waħda. Kull puzzle għandu mill-inqas 3 rotot, u kull rotta li taħdem tgħodd. Fl-aħħar naraw kemm kien hemm rotot.", // REVIEW
  sellumHowGreen: "Wara kull kelma, l-ittri li diġà qegħdin f'posthom fil-kelma t'isfel isiru ħodor, b'linja taħthom.", // REVIEW

  // --- home carousel ---
  carouselLabel: "Il-logħob", // REVIEW
  gameOf: (i: number, n: number, name: string) => `Logħba ${i} minn ${n}: ${name}`, // REVIEW
  prevGame: "Il-logħba ta' qabel", // REVIEW
  nextGame: "Il-logħba li jmiss", // REVIEW
  newBadge: "Ġdid!", // REVIEW

  // --- 404 ---
  notFoundTitle: "Din il-paġna ma teżistix", // REVIEW
  notFoundHome: "Lura d-dar", // REVIEW
};
